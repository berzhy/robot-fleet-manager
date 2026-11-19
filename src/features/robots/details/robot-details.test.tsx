import {
  screen,
  within,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { expect, test, vi, afterEach } from "vitest";

import { render } from "@/query/test-utils";
import type { Robot, RobotContext } from "@/modules/robots/robot";

import { robotKeys } from "../api/robot-queries";

import ActivityControls from "./activity-controls";
import RobotDetails from "./robot-details";

const robot: Robot = {
  problemCode: null,
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

function renderDetails(context: RobotContext) {
  return render(<RobotDetails robotId={context.robot.id} />, {
    queryData: [[robotKeys.context(context.robot.id), context]],
  });
}

test("details show fields, missing values, and breadcrumbs", async () => {
  renderDetails({ robot: robot, siteRobots: [], verifiedAt: 0 });

  const details = within(screen.getByTestId("robot-details"));
  expect(
    screen.getByRole("heading", { level: 1, name: robot.name }),
  ).toBeInTheDocument();
  const breadcrumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
  expect(
    within(breadcrumbs).getByRole("link", { name: "Robots" }),
  ).toHaveAttribute("href", "/robots");
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
  expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByRole("tabpanel", { name: "Overview" })).toBeVisible();

  await act(async () => {
    fireEvent.click(screen.getByRole("tab", { name: "Logs" }));
    await Promise.resolve();
  });

  const logs = screen.getByRole("tabpanel", { name: "Logs" });
  expect(logs).toHaveTextContent(`Initializing ${robot.name}`);
  expect(logs).toHaveTextContent("Integration initialized: Vendor API");
  expect(logs).toHaveTextContent("Location configuration loaded: Munich");
  expect(
    screen.queryByRole("region", { name: "Location" }),
  ).not.toBeInTheDocument();

  await act(async () => {
    fireEvent.click(screen.getByRole("tab", { name: "Overview" }));
    await Promise.resolve();
  });

  expect(screen.getByRole("region", { name: "Location" })).toBeVisible();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test.each([
  ["idle", "Start activity", false],
  ["working", "Stop activity", false],
  ["returning", "Stop activity", false],
  ["charging", "Start activity", true],
  ["needs-attention", "Start activity", true],
  ["unknown", "Start activity", true],
] as const)(
  "%s shows one start/stop control with the correct availability",
  async (activity, label, disabled) => {
    const now = Date.now();
    const onAction = vi.fn();
    render(
      <ActivityControls
        robot={{
          ...robot,
          activity,
          batteryPercent: 80,
          lastReceivedAt: new Date(now).toISOString(),
        }}
        evaluatedAt={now}
        unverified={false}
        pending={false}
        onAction={onAction}
      />,
    );

    const buttons = screen.getAllByRole("button", {
      name: /^(Start|Stop) activity$/,
    });
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName(label);
    expect(buttons[0]).toHaveAttribute("aria-disabled", String(disabled));

    await act(async () => {
      fireEvent.click(buttons[0]);
      await Promise.resolve();
    });

    if (disabled) {
      expect(onAction).not.toHaveBeenCalled();
    } else {
      expect(onAction).toHaveBeenCalledWith(
        activity === "idle" ? "start" : "stop",
      );
    }
  },
);

test.each([
  [
    "path-blocked",
    "Path blocked",
    "Clear the obstruction before retrying activity.",
  ],
  [
    "position-lost",
    "Position lost",
    "Check the robot’s position before retrying activity.",
  ],
  [
    "sensor-obstructed",
    "Sensor obstructed",
    "Clear the sensor obstruction before retrying activity.",
  ],
] as const)(
  "%s explains the problem and recovery guidance",
  async (problemCode, label, guidance) => {
    const online: Robot = {
      ...robot,
      activity: "needs-attention",
      problemCode,
      batteryPercent: 80,
      lastReceivedAt: new Date().toISOString(),
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          robot: online,
          siteRobots: [],
          verifiedAt: Date.now(),
        }),
      ),
    );
    renderDetails({ robot: online, siteRobots: [], verifiedAt: Date.now() });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(`${label}. ${guidance}`);
    expect(
      screen.getByRole("button", { name: "Retry activity" }),
    ).toHaveAttribute("aria-disabled", "false");
  },
);

test.each([
  ["Start activity", "idle", null],
  ["Stop activity", "working", null],
  ["Return to base", "working", null],
  ["Retry activity", "needs-attention", "path-blocked"],
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
      .mockImplementationOnce(
        () => new Promise<Response>((resolve) => (resolveAction = resolve)),
      )
      .mockImplementationOnce(
        () => new Promise<Response>((resolve) => (resolveRefresh = resolve)),
      )
      .mockImplementation(() => Promise.resolve(context()));
    vi.stubGlobal("fetch", fetcher);
    renderDetails({ robot: online, siteRobots: [], verifiedAt: Date.now() });
    await act(async () => {});

    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: "Logs" }));
      await Promise.resolve();
    });

    const logs = screen.getByRole("tabpanel", { name: "Logs" });
    const originalLogs = logs.textContent;
    vi.useFakeTimers();
    const button = screen.getByRole("button", { name: action });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

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

    // Accepted, but controls stay locked and quiet until the refresh lands.
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByTestId("robot-connection")).toHaveTextContent(
      /^Online$/,
    );
    expect(button).toHaveAttribute("aria-disabled", "true");

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(fetcher).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveRefresh(context());
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      `${action} requested for “Test robot”.`,
    );
    expect(button).toHaveAttribute("aria-disabled", "false");

    await act(async () => vi.advanceTimersByTimeAsync(6000));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Logs" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(logs.textContent).toBe(originalLogs);
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
      if (init?.method === "POST") {
        return new Promise<Response>((resolve) => {
          resolveAction = resolve;
        });
      }
      return Promise.resolve(
        Response.json({
          robot: observed,
          siteRobots: [],
          verifiedAt: Date.now(),
        }),
      );
    });
  vi.stubGlobal("fetch", fetcher);
  renderDetails({ robot: online, siteRobots: [], verifiedAt: Date.now() });

  const stop = screen.getByRole("button", {
    name: "Stop activity",
  });
  await waitFor(() => expect(stop).toHaveAttribute("aria-disabled", "false"));
  stop.focus();

  await act(async () => {
    fireEvent.click(stop);
    await Promise.resolve();
  });
  await act(async () => {
    fireEvent.click(stop);
    await Promise.resolve();
  });

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
    "Stop activity requested for “Test robot”.",
  );
  const start = screen.getByRole("button", { name: "Start activity" });
  expect(start).toBe(stop);
  expect(start).toHaveFocus();
  expect(start).toHaveAttribute("aria-disabled", "false");
  expect(
    screen.queryByRole("button", { name: "Stop activity" }),
  ).not.toBeInTheDocument();

  await act(async () => {
    fireEvent.click(start);
    await Promise.resolve();
  });

  expect(fetcher).toHaveBeenLastCalledWith(
    "/api/robots/test/actions",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ action: "start" }),
    }),
  );

  observed = online;
  resolveAction(new Response(null, { status: 202 }));

  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Stop activity" }),
    ).toHaveAttribute("aria-disabled", "false"),
  );
  expect(
    screen.queryByRole("button", { name: "Start activity" }),
  ).not.toBeInTheDocument();
});

test("a command result is reported after leaving the details screen", async () => {
  const online: Robot = {
    ...robot,
    activity: "working" as const,
    batteryPercent: 80,
    lastReceivedAt: new Date().toISOString(),
  };

  let resolveAction!: (value: Response) => void;

  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? new Promise<Response>((resolve) => {
            resolveAction = resolve;
          })
        : Promise.resolve(
            Response.json({
              robot: online,
              siteRobots: [],
              verifiedAt: Date.now(),
            }),
          ),
    ),
  );
  const { rerender } = renderDetails({
    robot: online,
    siteRobots: [],
    verifiedAt: Date.now(),
  });

  const stop = screen.getByRole("button", { name: "Stop activity" });
  await waitFor(() => expect(stop).toHaveAttribute("aria-disabled", "false"));
  await act(async () => {
    fireEvent.click(stop);
    await Promise.resolve();
  });

  // Navigating away unmounts the screen; the app-level provider stays.
  rerender(<></>);
  await act(async () => {
    resolveAction(new Response(null, { status: 202 }));
    await Promise.resolve();
  });

  expect(await screen.findByRole("status")).toHaveTextContent(
    "Stop activity requested for “Test robot”.",
  );
});

test("activity controls stay disabled until the command refresh lands", async () => {
  const online: Robot = {
    ...robot,
    activity: "working" as const,
    batteryPercent: 80,
    lastReceivedAt: new Date().toISOString(),
  };

  let resolveAction!: (value: Response) => void;
  let resolveRefresh: ((value: Response) => void) | undefined;

  const fetcher = vi.fn((_url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      return new Promise<Response>((resolve) => {
        resolveAction = resolve;
      });
    }
    // The page came with fresh data, so the only read is the command's refresh.
    return new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
  });
  vi.stubGlobal("fetch", fetcher);
  renderDetails({ robot: online, siteRobots: [], verifiedAt: Date.now() });

  const stop = screen.getByRole("button", { name: "Stop activity" });
  await waitFor(() => expect(stop).toHaveAttribute("aria-disabled", "false"));

  await act(async () => {
    fireEvent.click(stop);
    await Promise.resolve();
  });

  resolveAction(new Response(null, { status: 202 }));

  // The action was accepted, but the refresh it triggered is still in flight:
  // commands stay disabled against the pre-command activity until it lands.
  await waitFor(() => expect(resolveRefresh).toBeDefined());
  expect(stop).toHaveAttribute("aria-disabled", "true");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();

  await act(async () => {
    fireEvent.click(stop);
    await Promise.resolve();
  });
  expect(
    fetcher.mock.calls.filter(
      (call) => (call[1] as RequestInit)?.method === "POST",
    ),
  ).toHaveLength(1);

  await act(async () => {
    resolveRefresh!(
      Response.json({
        robot: { ...online, activity: "idle" },
        siteRobots: [],
        verifiedAt: Date.now(),
      }),
    );
    await Promise.resolve();
  });

  await waitFor(() =>
    expect(screen.getByTestId("robot-activity")).toHaveTextContent("Idle"),
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "Stop activity requested for “Test robot”.",
  );
  expect(
    screen.getByRole("button", { name: "Start activity" }),
  ).toHaveAttribute("aria-disabled", "false");
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
  renderDetails({ robot: online, siteRobots: [], verifiedAt: Date.now() });

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Stop activity$/ }));
    await Promise.resolve();
  });

  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to request stop activity for “Test robot”",
    ),
  );
  expect(screen.getByTestId("robot-activity")).toHaveTextContent("Working");
});

test("an action the server refuses shows the server's reason", async () => {
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
          ? Response.json(
              {
                error: {
                  code: "ACTION_UNAVAILABLE",
                  message: "Robot must be online",
                },
              },
              { status: 409 },
            )
          : Response.json({
              robot: online,
              siteRobots: [],
              verifiedAt: Date.now(),
            }),
      ),
    ),
  );
  renderDetails({ robot: online, siteRobots: [], verifiedAt: Date.now() });

  fireEvent.click(screen.getByRole("button", { name: /^Stop activity$/ }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Robot must be online. Check the latest report before trying again.",
  );
});
