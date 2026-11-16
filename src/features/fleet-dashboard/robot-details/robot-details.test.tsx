import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { expect, test, vi, afterEach } from "vitest";

import type { Robot } from "@/modules/robots/robot";
import RobotDetails from "@/features/fleet-dashboard/robot-details/robot-details";

const robot: Robot = {
  problemCode: null,
  controlTarget: "work",
  controlRevision: 0,
  appliedControlRevision: 0,
  id: "test",
  name: "Test robot",
  manufacturer: "Test manufacturer",
  type: "inspection" as const,
  integrationType: "vendor-api" as const,
  site: "Munich",
  area: null,
  activity: "charging",
  batteryPercent: null,
  lastTelemetryAt: null,
  lastReceivedAt: null,
  createdAt: "2026-11-14T12:00:00.000Z",
};

test("details show fields, missing values, and breadcrumbs", () => {
  render(<RobotDetails robot={robot} siteRobots={[]} verifiedAt={0} />);
  const details = within(screen.getByTestId("robot-details"));
  expect(
    screen.getByRole("heading", { level: 1, name: robot.name }),
  ).toBeInTheDocument();
  const breadcrumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
  expect(
    within(breadcrumbs).getByRole("link", { name: "Fleet dashboard" }),
  ).toHaveAttribute("href", "/");
  expect(within(breadcrumbs).getByText(robot.name)).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(
    screen.getByRole("region", { name: "Robot information" }),
  ).toHaveTextContent("Vendor API");
  expect(screen.getByRole("region", { name: "Location" })).toHaveTextContent(
    "Reported area: Unknown",
  );
  expect(details.getByTestId("robot-activity")).toHaveTextContent(/^Charging$/);
  expect(details.getByTestId("robot-battery")).toHaveTextContent(/^Unknown$/);
  expect(details.getByTestId("robot-connection")).toHaveTextContent(
    /^Unknown$/,
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test.each([
  ["Start activity", "idle", null],
  ["Stop activity", "working", null],
  ["Return to base", "working", null],
  ["Retry activity", "needs-attention", "path-blocked"],
  ["Retry activity", "needs-attention", "position-lost"],
  ["Retry activity", "needs-attention", "sensor-obstructed"],
] as const)(
  "%s preserves reported status while requesting and refreshing, then dismisses success",
  async (action, activity, problemCode) => {
    const online: Robot = {
      ...robot,
      activity,
      problemCode,
      area: "Lobby",
      batteryPercent: 80,
      lastReceivedAt: new Date().toISOString(),
    };
    const context = () =>
      Response.json({ robot: online, siteRobots: [], verifiedAt: Date.now() });
    let resolveAction!: (response: Response) => void;
    let resolveRefresh!: (response: Response) => void;
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(context())
      .mockImplementationOnce(
        () => new Promise<Response>((resolve) => (resolveAction = resolve)),
      )
      .mockImplementationOnce(
        () => new Promise<Response>((resolve) => (resolveRefresh = resolve)),
      )
      .mockImplementation(() => Promise.resolve(context()));
    vi.stubGlobal("fetch", fetcher);
    render(
      <RobotDetails robot={online} siteRobots={[]} verifiedAt={Date.now()} />,
    );
    await act(async () => {});
    vi.useFakeTimers();
    const button = screen.getByRole("button", { name: action });
    fireEvent.click(button);
    expect(screen.getByTestId("robot-connection")).toHaveTextContent(
      /^Online$/,
    );
    expect(screen.getByText("Activity", { exact: true })).toBeVisible();
    expect(screen.getByText("Battery", { exact: true })).toBeVisible();
    expect(screen.queryByText(/Last reported/)).not.toBeInTheDocument();
    await act(async () => {
      resolveAction(new Response(null, { status: 202 }));
      await Promise.resolve();
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      `${action} requested.`,
    );
    expect(screen.getByTestId("robot-connection")).toHaveTextContent(
      /^Online$/,
    );
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);
    expect(fetcher).toHaveBeenCalledTimes(3);
    await act(async () => {
      resolveRefresh(context());
      await Promise.resolve();
    });
    expect(button).toHaveAttribute("aria-disabled", "false");
    await act(async () => vi.advanceTimersByTimeAsync(6000));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  },
);

test("activity requests are guarded while pending and telemetry confirms the change", async () => {
  const online: Robot = {
    ...robot,
    activity: "working" as const,
    batteryPercent: 80,
    lastReceivedAt: new Date().toISOString(),
  };
  let resolveAction!: (value: Response) => void;
  let observed: Robot = online;
  const fetcher = vi
    .fn()
    .mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "POST")
        return new Promise<Response>((resolve) => {
          resolveAction = resolve;
        });
      return Promise.resolve(
        Response.json({
          robot: observed,
          siteRobots: [],
          verifiedAt: Date.now(),
        }),
      );
    });
  vi.stubGlobal("fetch", fetcher);
  render(
    <RobotDetails robot={online} siteRobots={[]} verifiedAt={Date.now()} />,
  );
  const stop = screen.getByRole("button", {
    name: "Stop activity",
  });
  await waitFor(() => expect(stop).toHaveAttribute("aria-disabled", "false"));
  fireEvent.click(stop);
  fireEvent.click(stop);
  expect(
    fetcher.mock.calls.filter(
      (call) => (call[1] as RequestInit)?.method === "POST",
    ),
  ).toHaveLength(1);
  expect(stop).toHaveAttribute("aria-disabled", "true");
  observed = { ...online, activity: "idle" };
  resolveAction(new Response(null, { status: 202 }));
  await waitFor(() =>
    expect(screen.getByTestId("robot-activity")).toHaveTextContent("Idle"),
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "Stop activity requested.",
  );
});

test("failed action keeps reported activity and explains the failure", async () => {
  const online: Robot = {
    ...robot,
    activity: "working" as const,
    batteryPercent: 80,
    lastReceivedAt: new Date().toISOString(),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((_url: string, init?: RequestInit) =>
      Promise.resolve(
        init?.method === "POST"
          ? new Response(null, { status: 409 })
          : Response.json({
              robot: online,
              siteRobots: [],
              verifiedAt: Date.now(),
            }),
      ),
    ),
  );
  render(
    <RobotDetails robot={online} siteRobots={[]} verifiedAt={Date.now()} />,
  );
  fireEvent.click(screen.getByRole("button", { name: /^Stop activity$/ }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to request activity change",
    ),
  );
  expect(screen.getByTestId("robot-activity")).toHaveTextContent("Working");
});
