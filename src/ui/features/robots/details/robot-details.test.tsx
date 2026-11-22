import {
  screen,
  within,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import type { ComponentProps } from "react";
import { expect, test, vi, afterEach, onTestFinished } from "vitest";

import { render } from "@/ui/test-render";
import { testRobot } from "@/ui/features/robots/test-robots";
import type { Robot, RobotContext } from "@/common/types";

import { actionLabels } from "../robot-action-display";
import { formatRobotTimestamp } from "../time-ago";
import { actionUnavailable } from "../use-robot-action";

import ActivityControls from "./activity-controls";
import RobotDetails from "./robot-details";

const robot = testRobot({ activity: "charging" });

function renderDetails(context: RobotContext) {
  return render(<RobotDetails initialContext={context} />);
}

test("details show the robot, missing values, and the way back", async () => {
  renderDetails({ robot: robot, peerCounts: [], evaluatedAt: Date.now() });

  const details = within(screen.getByTestId("robot-details"));
  expect(screen.getAllByRole("heading", { hidden: true })).toEqual([
    screen.getByRole("heading", { level: 1, name: robot.name }),
    screen.getByRole("heading", { level: 2, name: robot.site }),
  ]);
  expect(
    details.getByText("Test manufacturer · Inspection robot"),
  ).toBeVisible();
  expect(details.getByRole("link", { name: "Back to robots" })).toHaveAttribute(
    "href",
    "/robots",
  );
  expect(details.getByTestId("robot-activity")).toHaveTextContent(/^Charging$/);
  expect(details.getByTestId("robot-battery")).toHaveTextContent(/^Unknown$/);
  expect(details.getByTestId("robot-connection")).toHaveTextContent(
    /^Unknown$/,
  );
  expect(details.getByTestId("robot-last-report")).toHaveTextContent(
    /^No reports yet$/,
  );
  expect(details.getByTestId("robot-location")).toHaveTextContent(/^Unknown$/);
  expect(details.getByText(robot.id)).toBeVisible();
  expect(details.getByText("Vendor API")).toBeVisible();
  expect(screen.getByRole("tabpanel", { name: "Location" })).toHaveTextContent(
    "Area unknown: this robot",
  );
  expect(screen.getByRole("tab", { name: "Location" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByRole("tabpanel", { name: "Location" })).toBeVisible();

  await act(async () => {
    fireEvent.click(screen.getByRole("tab", { name: "Logs" }));
    await Promise.resolve();
  });

  const logs = screen.getByRole("tabpanel", { name: "Logs" });
  expect(logs).toHaveTextContent(`Initializing ${robot.name}`);
  expect(logs).toHaveTextContent("Integration initialized: Vendor API");
  expect(logs).toHaveTextContent("Location configuration loaded: Munich");
  expect(
    screen.queryByRole("tabpanel", { name: "Location" }),
  ).not.toBeInTheDocument();

  await act(async () => {
    fireEvent.click(screen.getByRole("tab", { name: "Location" }));
    await Promise.resolve();
  });

  expect(screen.getByRole("tabpanel", { name: "Location" })).toBeVisible();
});

test("a stale report is labelled as last reported, problem included", () => {
  const evaluatedAt = Date.parse("2026-11-14T12:03:00.000Z");
  renderDetails({
    robot: testRobot({
      ...robot,
      activity: "needs-attention",
      problemCode: "path-blocked",
      area: "Lobby",
      batteryPercent: 40,
      lastReceivedAt: "2026-11-14T12:00:00.000Z",
    }),
    peerCounts: [],
    evaluatedAt,
  });

  expect(screen.getByTestId("robot-connection")).toHaveTextContent(/^Offline$/);
  expect(screen.getByTestId("robot-last-report")).toHaveTextContent(
    /^Last report 3 min ago$/,
  );
  expect(screen.getByText("Last reported activity")).toBeVisible();
  expect(screen.getByText("Last reported location")).toBeVisible();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Last reported problem: Path blocked. Clear the obstruction before retrying activity.",
  );
});

test.each([
  ["idle", 61, "Battery60Icon"],
  ["charging", 61, "BatteryCharging60Icon"],
  ["idle", 100, "BatteryFullIcon"],
  ["working", 5, "Battery20Icon"],
  ["idle", null, "BatteryUnknownIcon"],
] as const)(
  "%s at %s%% shows %s beside the battery level",
  (activity, batteryPercent, icon) => {
    renderDetails({
      robot: testRobot({
        ...robot,
        activity,
        batteryPercent,
        lastReceivedAt: new Date().toISOString(),
      }),
      peerCounts: [],
      evaluatedAt: Date.now(),
    });

    expect(
      within(screen.getByTestId("robot-battery")).getByTestId(icon),
    ).toBeInTheDocument();
  },
);

test("the exact time of the last report is reachable by keyboard", async () => {
  const lastReceivedAt = "2026-11-14T12:00:00.000Z";
  renderDetails({
    robot: testRobot({ ...robot, lastReceivedAt }),
    peerCounts: [],
    evaluatedAt: Date.parse("2026-11-14T12:03:00.000Z"),
  });

  const time = within(screen.getByTestId("robot-last-report")).getByText(
    "3 min ago",
  );
  act(() => time.focus());

  expect(await screen.findByRole("tooltip")).toHaveTextContent(
    formatRobotTimestamp(lastReceivedAt),
  );
});

test("copying the ID puts it on the clipboard and says so", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  // jsdom has no clipboard; add one to the real navigator for this test.
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  onTestFinished(() => {
    Reflect.deleteProperty(navigator, "clipboard");
  });
  renderDetails({ robot: robot, peerCounts: [], evaluatedAt: Date.now() });

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Copy robot ID" }));
    await Promise.resolve();
  });

  expect(writeText).toHaveBeenCalledWith(robot.id);
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Robot ID copied.",
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderControls(
  overrides: Parameters<typeof testRobot>[0],
  props: Partial<ComponentProps<typeof ActivityControls>> = {},
) {
  const controlled = testRobot({
    ...robot,
    batteryPercent: 80,
    lastReceivedAt: new Date().toISOString(),
    ...overrides,
  });
  render(
    <ActivityControls
      robot={controlled}
      unavailableReason={(action) => actionUnavailable(controlled, action)}
      onAction={vi.fn()}
      {...props}
    />,
  );
}

test.each([
  ["idle", "start", false],
  ["working", "stop", false],
  ["returning", "stop", false],
  // An operator may cut charging short.
  ["charging", "start", false],
  // Without a problem code there is nothing to retry yet.
  ["needs-attention", "retry", true],
  [null, "start", true],
] as const)(
  "%s shows one activity control with the correct availability",
  async (activity, action, isUnavailable) => {
    const onAction = vi.fn();
    renderControls({ activity }, { onAction });

    const button = screen.getByRole("button", { name: actionLabels[action] });
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(button).toHaveAttribute("aria-disabled", String(isUnavailable));

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(onAction.mock.calls).toEqual(isUnavailable ? [] : [[action]]);
  },
);

test("one control follows the robot: Start, Stop or Retry", () => {
  renderControls({ activity: "needs-attention", problemCode: "path-blocked" });

  expect(
    screen.getAllByRole("button").map((button) => button.textContent),
  ).toEqual(["Retry activity", "Return to base"]);
});

test("Return to base at base says so to assistive technology", () => {
  renderControls({ activity: "idle", area: "Base" });

  const start = screen.getByRole("button", { name: "Start activity" });
  expect(start).toHaveAttribute("aria-disabled", "false");
  expect(start).not.toHaveAccessibleDescription();
  const returnToBase = screen.getByRole("button", { name: "Return to base" });
  expect(returnToBase).toHaveAttribute("aria-disabled", "true");
  expect(returnToBase).toHaveAccessibleDescription("Already at base");
});

test("an unavailable control says why on hover or focus, not on the card", async () => {
  renderControls({ activity: "idle", lastReceivedAt: null });

  const start = screen.getByRole("button", { name: "Start activity" });
  expect(start).toHaveAttribute("aria-disabled", "true");
  expect(start).toHaveAccessibleDescription("Robot isn't connected");
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

  act(() => start.focus());
  expect(await screen.findByRole("tooltip")).toHaveTextContent(
    "Robot isn't connected",
  );
});

test.each([
  ["work", "idle", "Start activity"],
  ["stop", "working", "Stop activity"],
  ["base", "working", "Return to base"],
] as const)(
  "a queued %s command spins on its slot until the robot applies it, leaving the other free",
  (queuedControlTarget, activity, spinning) => {
    renderControls({ activity, area: "Lobby", queuedControlTarget });

    const spinners = screen.getAllByRole("progressbar", { hidden: true });
    expect(spinners).toHaveLength(1);
    const queued = screen.getByRole("button", { name: spinning });
    expect(queued).toContainElement(spinners[0]);
    expect(queued).toHaveAttribute("aria-disabled", "true");
    expect(queued).toHaveAccessibleDescription("Waiting for the robot…");
    const other = screen
      .getAllByRole("button")
      .find((button) => button !== queued);
    expect(other).toHaveAttribute("aria-disabled", "false");
  },
);

test("a command a disconnected robot has yet to apply shows the connection instead", () => {
  renderControls({
    activity: "idle",
    queuedControlTarget: "work",
    lastReceivedAt: null,
  });

  expect(
    screen.queryByRole("progressbar", { hidden: true }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Start activity" }),
  ).toHaveAccessibleDescription("Robot isn't connected");
});

test.each([
  ["stop", "Stop activity"],
  ["start", "Stop activity"],
  ["return-to-base", "Return to base"],
] as const)(
  "a pending %s spins on its own slot, even after a poll swaps the label",
  (pendingAction, spinning) => {
    renderControls(
      { activity: "working" },
      { unavailableReason: () => "Sending command…", pendingAction },
    );

    const spinners = screen.getAllByRole("progressbar", { hidden: true });
    expect(spinners).toHaveLength(1);
    expect(screen.getByRole("button", { name: spinning })).toContainElement(
      spinners[0],
    );
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAccessibleDescription("Sending command…");
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
    const online: Robot = testRobot({
      ...robot,
      activity: "needs-attention",
      problemCode,
      batteryPercent: 80,
      lastReceivedAt: new Date().toISOString(),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          robot: online,
          peerCounts: [],
          evaluatedAt: Date.now(),
        }),
      ),
    );
    renderDetails({ robot: online, peerCounts: [], evaluatedAt: Date.now() });

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
    const online: Robot = testRobot({
      ...robot,
      activity,
      problemCode,
      area: "Lobby",
      batteryPercent: 80,
      lastReceivedAt: new Date().toISOString(),
    });
    const context = () =>
      Response.json({ robot: online, peerCounts: [], evaluatedAt: Date.now() });
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
    renderDetails({ robot: online, peerCounts: [], evaluatedAt: Date.now() });
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
  const online: Robot = testRobot({
    ...robot,
    activity: "working" as const,
    batteryPercent: 80,
    lastReceivedAt: new Date().toISOString(),
  });
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
          peerCounts: [],
          evaluatedAt: Date.now(),
        }),
      );
    });
  vi.stubGlobal("fetch", fetcher);
  renderDetails({ robot: online, peerCounts: [], evaluatedAt: Date.now() });

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

  observed = testRobot({ ...online, activity: "idle" });
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
  const online: Robot = testRobot({
    ...robot,
    activity: "working" as const,
    batteryPercent: 80,
    lastReceivedAt: new Date().toISOString(),
  });

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
              peerCounts: [],
              evaluatedAt: Date.now(),
            }),
          ),
    ),
  );
  const { rerender } = renderDetails({
    robot: online,
    peerCounts: [],
    evaluatedAt: Date.now(),
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
  const online: Robot = testRobot({
    ...robot,
    activity: "working" as const,
    batteryPercent: 80,
    lastReceivedAt: new Date().toISOString(),
  });

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
  renderDetails({ robot: online, peerCounts: [], evaluatedAt: Date.now() });

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
        robot: testRobot({ ...online, activity: "idle" }),
        peerCounts: [],
        evaluatedAt: Date.now(),
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
  const online: Robot = testRobot({
    ...robot,
    activity: "working" as const,
    batteryPercent: 80,
    lastReceivedAt: new Date().toISOString(),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((_url: string, init?: RequestInit) =>
      Promise.resolve(
        init?.method === "POST"
          ? new Response(null, { status: 500 })
          : Response.json({
              robot: online,
              peerCounts: [],
              evaluatedAt: Date.now(),
            }),
      ),
    ),
  );
  renderDetails({ robot: online, peerCounts: [], evaluatedAt: Date.now() });

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
  const online: Robot = testRobot({
    ...robot,
    activity: "working" as const,
    batteryPercent: 80,
    lastReceivedAt: new Date().toISOString(),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((_url: string, init?: RequestInit) =>
      Promise.resolve(
        init?.method === "POST"
          ? Response.json(
              {
                error: { message: "Robot isn't connected" },
              },
              { status: 409 },
            )
          : Response.json({
              robot: online,
              peerCounts: [],
              evaluatedAt: Date.now(),
            }),
      ),
    ),
  );
  renderDetails({ robot: online, peerCounts: [], evaluatedAt: Date.now() });

  fireEvent.click(screen.getByRole("button", { name: /^Stop activity$/ }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Robot isn't connected. Check the latest report before trying again.",
  );
});
