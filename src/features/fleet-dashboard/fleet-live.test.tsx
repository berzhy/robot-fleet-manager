import { pageMetadata } from "./test-fixtures";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { renderHook, render } from "@/query/test-utils";
import type { Robot } from "@/modules/robots/robot";
import FleetDashboard from "./fleet-dashboard";
import RobotDetails from "./robot-details/robot-details";
import useRobots from "./hooks/use-robots";
import useLiveRobot from "./hooks/use-live-robot";

const robot: Robot = {
  problemCode: null,
  controlTarget: "work",
  controlRevision: 0,
  appliedControlRevision: 0,
  id: "live",
  name: "Live robot",
  manufacturer: "Maker",
  type: "inspection" as const,
  integrationType: "vendor-api" as const,
  site: "Munich",
  createdAt: "2026-01-01T00:00:00.000Z",
  batteryPercent: 50,
  activity: "working",
  area: "Lobby",
  lastTelemetryAt: "2026-01-01T00:00:00.000Z",
  lastReceivedAt: "2026-01-01T00:00:00.000Z",
};

const page = (battery = 50) =>
  Response.json({
    items: [{ ...robot, batteryPercent: battery }],
    total: 1,
    page: 0,
    pageSize: 20,
    ...pageMetadata(1),
  });

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function tick(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function setPageVisibility(hidden: boolean) {
  vi.spyOn(document, "hidden", "get").mockReturnValue(hidden);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue(
    hidden ? "hidden" : "visible",
  );
  fireEvent(document, new Event("visibilitychange", { bubbles: true }));
}

test("quiet polling preserves DOM and focus, retains failed data, and recovers", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(robot.lastReceivedAt!));
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(page())
    .mockResolvedValueOnce(page(49))
    .mockRejectedValueOnce(new Error("offline"))
    .mockImplementation(() => Promise.resolve(page(48)));
  vi.stubGlobal("fetch", fetcher);
  render(<FleetDashboard />);
  await tick();

  const row = within(screen.getByTestId("robot-row-live"));
  expect(row.queryByTestId("robot-report-age")).not.toBeInTheDocument();
  const link = row.getByTestId("robot-link");
  link.focus();

  await tick(4000);
  expect(fetcher).toHaveBeenCalledTimes(1);

  await tick(1000);
  expect(row.getByTestId("robot-battery")).toHaveTextContent("49%");
  expect(row.getByTestId("robot-link")).toBe(link);
  expect(link).toHaveFocus();
  expect(screen.getByTestId("fleet-loading")).toBeEmptyDOMElement();

  await tick(5000);
  expect(screen.getByTestId("fleet-refresh-warning")).toHaveRole("alert");
  expect(screen.getByTestId("fleet-refresh-warning")).toHaveTextContent(
    "Live updates interrupted",
  );
  expect(row.getByTestId("robot-battery")).toHaveTextContent("49%");

  await tick(5000);
  expect(screen.queryByTestId("fleet-refresh-warning")).not.toBeInTheDocument();
  expect(row.getByTestId("robot-battery")).toHaveTextContent("48%");
});

test("visibility and open action menus suspend polling and resume immediately", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(robot.lastReceivedAt!));
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => Promise.resolve(page())),
  );
  render(<FleetDashboard />);
  await tick();

  const row = within(screen.getByTestId("robot-row-live"));
  const trigger = row.getByTestId("robot-actions");
  vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 40, 40),
  );
  const connection = row.getByTestId("robot-connection");

  fireEvent.click(trigger);
  expect(connection).toHaveTextContent(/^Online$/);
  expect(connection).not.toHaveTextContent(/unverified/);

  await tick(20000);
  expect(connection).toHaveTextContent(/^Online$/);
  expect(connection).not.toHaveTextContent("Delayed");
  expect(connection).not.toHaveTextContent("Offline");
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Updates paused")).not.toBeInTheDocument();

  fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
  await tick(300);
  expect(fetch).toHaveBeenCalledTimes(2);

  setPageVisibility(true);
  await tick(5000);
  expect(fetch).toHaveBeenCalledTimes(2);

  setPageVisibility(false);
  await tick();
  expect(fetch).toHaveBeenCalledTimes(3);
});

test("a stale in-flight poll cannot overwrite a mutation refresh", async () => {
  vi.useFakeTimers();
  let stale!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(page())
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            stale = resolve;
          }),
      )
      .mockResolvedValueOnce(page(40)),
  );
  const { result } = renderHook(() => useRobots());
  await tick();

  await tick(5000);

  act(() => {
    result.current.cancelRefresh();
    result.current.refresh();
  });
  await tick();

  await act(async () => {
    stale(page(99));
    await Promise.resolve();
  });
  expect(result.current.state).toMatchObject({
    status: "success",
    robots: [{ batteryPercent: 40 }],
  });
  expect(result.current.interrupted).toBe(false);
});

test("detail refreshes quietly and stops when its robot is deleted", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          robot: { ...robot, batteryPercent: 45 },
          siteRobots: [],
          verifiedAt: Date.now(),
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 404 })),
  );
  render(<RobotDetails robot={robot} siteRobots={[]} verifiedAt={0} />);
  await tick();

  expect(
    within(screen.getByTestId("robot-details")).getByTestId("robot-battery"),
  ).toHaveTextContent("45%");

  await tick(5000);
  expect(screen.getByTestId("robot-unavailable")).toHaveTextContent(
    "Robot is no longer available.",
  );

  setPageVisibility(true);
  setPageVisibility(false);
  await tick(10000);
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("detail action refresh cancels older polls without relabeling verified data", async () => {
  vi.useFakeTimers();
  const context = (batteryPercent: number) => ({
    robot: { ...robot, batteryPercent },
    siteRobots: [],
    verifiedAt: Date.now(),
  });
  let stale!: (response: Response) => void;
  let fresh!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementationOnce(
        () => new Promise<Response>((resolve) => (stale = resolve)),
      )
      .mockImplementationOnce(
        () => new Promise<Response>((resolve) => (fresh = resolve)),
      )
      .mockRejectedValue(new Error("unavailable")),
  );
  const { result, rerender } = renderHook(
    ({ paused }) => useLiveRobot(context(50), paused),
    { initialProps: { paused: false } },
  );

  act(() => {
    result.current.cancelRefresh();
    rerender({ paused: true });
  });

  rerender({ paused: false });
  await act(async () => {
    stale(Response.json(context(99)));
    await Promise.resolve();
  });
  expect(result.current.robot.batteryPercent).toBe(50);
  expect(result.current.refreshing).toBe(true);
  expect(result.current.unverified).toBe(false);
  expect(result.current.interrupted).toBe(false);

  await act(async () => {
    fresh(Response.json(context(40)));
    await Promise.resolve();
  });
  expect(result.current.robot.batteryPercent).toBe(40);
  expect(result.current.refreshing).toBe(false);

  await tick(5000);
  expect(result.current.interrupted).toBe(true);
  expect(result.current.unverified).toBe(true);
  expect(result.current.robot.batteryPercent).toBe(40);
});

test("connection classification stays on the last fleet snapshot between refreshes", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.parse(robot.lastReceivedAt!) + 10000));
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => Promise.resolve(page())),
  );
  render(<FleetDashboard />);
  await tick();

  const row = within(screen.getByTestId("robot-row-live"));
  expect(row.getByTestId("robot-connection")).toHaveTextContent(/^Online$/);
  expect(row.queryByTestId("robot-report-age")).not.toBeInTheDocument();

  await tick(1000);
  expect(row.getByTestId("robot-connection")).toHaveTextContent(/^Online$/);
  expect(row.queryByTestId("robot-report-age")).not.toBeInTheDocument();
});

test("a confirmed detail deletion clears an earlier refresh warning", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 })),
  );
  render(<RobotDetails robot={robot} siteRobots={[]} verifiedAt={0} />);
  await tick();

  expect(screen.getByTestId("robot-refresh-warning")).toHaveTextContent(
    "Live updates interrupted",
  );

  await tick(5000);
  expect(screen.getByTestId("robot-unavailable")).toHaveTextContent(
    "Robot is no longer available.",
  );
  expect(screen.queryByTestId("robot-refresh-warning")).not.toBeInTheDocument();
});

test("failed initial detail refresh keeps server-verified connection information", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.parse(robot.lastReceivedAt!) + 20000));
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unavailable")));
  render(
    <RobotDetails robot={robot} siteRobots={[]} verifiedAt={Date.now()} />,
  );
  await tick();

  expect(
    within(screen.getByTestId("robot-details")).getByTestId("robot-connection"),
  ).toHaveTextContent(/^Offline \(unverified\)$/);
  expect(screen.queryByText("Checking")).not.toBeInTheDocument();
});

test("filter dropdowns pause polling without hiding the current snapshot", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(robot.lastReceivedAt!));
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(page()));
  vi.stubGlobal("fetch", fetcher);
  render(<FleetDashboard />);
  await tick();

  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Location" }));
  await tick(20000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("robot-row-live")).toBeInTheDocument();

  fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
  await tick(300);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test("closing a secondary select keeps polling paused while More filters is open", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(robot.lastReceivedAt!));
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(page()));
  vi.stubGlobal("fetch", fetcher);
  render(<FleetDashboard />);
  await tick();

  fireEvent.click(screen.getByRole("button", { name: /More filters/ }));
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Manufacturer" }));
  await tick(20000);
  expect(fetcher).toHaveBeenCalledTimes(1);

  fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
  await tick(20000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(
    screen.getByRole("button", { name: "Close more filters" }),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Close more filters" }));
  await tick(300);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test("paused fleet retains cached data across visibility changes and refreshes on resume", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(page()));
  vi.stubGlobal("fetch", fetcher);
  const { result, rerender } = renderHook(({ paused }) => useRobots(paused), {
    initialProps: { paused: false },
  });
  await tick();

  rerender({ paused: true });
  setPageVisibility(true);
  expect(result.current.unverified).toBe(false);

  setPageVisibility(false);
  await tick(10000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(result.current.unverified).toBe(false);

  rerender({ paused: false });
  await tick();
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(result.current.unverified).toBe(false);
});

test("paused detail retains verification across visibility changes and refreshes on resume", async () => {
  vi.useFakeTimers();
  const initial = { robot, siteRobots: [], verifiedAt: Date.now() };
  const fetcher = vi
    .fn()
    .mockImplementation(() => Promise.resolve(Response.json(initial)));
  vi.stubGlobal("fetch", fetcher);
  const { result, rerender } = renderHook(
    ({ paused }) => useLiveRobot(initial, paused),
    {
      initialProps: { paused: false },
    },
  );
  await tick();

  rerender({ paused: true });
  setPageVisibility(true);
  expect(result.current.unverified).toBe(false);

  setPageVisibility(false);
  await tick(10000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(result.current.unverified).toBe(false);

  rerender({ paused: false });
  await tick();
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test("fleet and detail retain snapshots after a request timeout and recover on the next poll", async () => {
  vi.useFakeTimers();
  let timeout = new AbortController();
  vi.spyOn(AbortSignal, "timeout").mockImplementation(() => timeout.signal);
  let stalled = false;
  const fetcher = vi.fn((url: string, init?: RequestInit) => {
    if (stalled)
      return new Promise<Response>((_resolve, reject) => {
        const signal = init!.signal!;
        signal.addEventListener(
          "abort",
          () =>
            reject(
              signal.reason instanceof Error
                ? signal.reason
                : new Error("Request aborted"),
            ),
          {
            once: true,
          },
        );
      });
    return Promise.resolve(
      url.includes("/context")
        ? Response.json({
            robot: { ...robot, batteryPercent: 45 },
            siteRobots: [],
            verifiedAt: Date.now(),
          })
        : page(45),
    );
  });
  vi.stubGlobal("fetch", fetcher);
  const { result } = renderHook(() => ({
    fleet: useRobots(),
    detail: useLiveRobot({ robot, siteRobots: [], verifiedAt: Date.now() }),
  }));
  await tick();

  stalled = true;
  await tick(5000);
  expect(fetcher).toHaveBeenCalledTimes(4);

  await act(async () => {
    timeout.abort(new DOMException("Request timed out", "TimeoutError"));
    await Promise.resolve();
  });
  expect(result.current.fleet.interrupted).toBe(true);
  expect(result.current.detail.interrupted).toBe(true);
  expect(result.current.fleet.state).toMatchObject({
    status: "success",
    robots: [{ batteryPercent: 45 }],
  });
  expect(result.current.detail.robot.batteryPercent).toBe(45);

  await tick(4999);
  expect(fetcher).toHaveBeenCalledTimes(4);

  stalled = false;
  timeout = new AbortController();
  await tick(1);
  expect(fetcher).toHaveBeenCalledTimes(6);
  expect(result.current.fleet.interrupted).toBe(false);
  expect(result.current.detail.interrupted).toBe(false);
});

test("unmount cancels outstanding fleet and detail requests without restarting polling", async () => {
  vi.useFakeTimers();
  const signals: AbortSignal[] = [];
  const fetcher = vi.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init!.signal!;
        signals.push(signal);
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("Request cancelled", "AbortError")),
          { once: true },
        );
      }),
  );
  vi.stubGlobal("fetch", fetcher);
  const { unmount } = renderHook(() => ({
    fleet: useRobots(),
    detail: useLiveRobot({ robot, siteRobots: [], verifiedAt: Date.now() }),
  }));

  expect(signals).toHaveLength(2);
  expect(signals.every((signal) => !signal.aborted)).toBe(true);

  unmount();
  expect(signals.every((signal) => signal.aborted)).toBe(true);

  await tick(10000);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test("a debounced search unmounting an open row menu releases the polling pause", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(page()));
  vi.stubGlobal("fetch", fetcher);
  render(<FleetDashboard />);
  await tick();
  fireEvent.change(screen.getByRole("textbox", { name: /search/i }), {
    target: { value: "Live" },
  });
  const trigger = screen.getByTestId("robot-actions");
  vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 40, 40),
  );
  fireEvent.click(trigger);
  await tick(1000);
  expect(
    fetcher.mock.calls.some(([url]) => String(url).includes("search=Live")),
  ).toBe(true);
  expect(screen.getByTestId("robot-row-live")).toBeInTheDocument();
  const requests = fetcher.mock.calls.length;
  await tick(5000);
  expect(fetcher.mock.calls.length).toBeGreaterThan(requests);
});

test("cached fleet remount preserves rows while refreshing and after refresh failure", async () => {
  vi.useFakeTimers();
  let rejectRefresh!: (error: Error) => void;
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(page())
    .mockImplementationOnce(
      () =>
        new Promise<Response>((_resolve, reject) => {
          rejectRefresh = reject;
        }),
    )
    .mockResolvedValue(page(40));
  vi.stubGlobal("fetch", fetcher);
  const view = render(<FleetDashboard />);
  await tick();
  expect(screen.getByTestId("robot-row-live")).toBeInTheDocument();
  view.rerender(<></>);
  view.rerender(<FleetDashboard />);
  expect(screen.getByTestId("fleet-loading")).not.toHaveTextContent(
    "Loading robots",
  );
  expect(screen.getByTestId("robot-row-live")).toBeInTheDocument();
  await act(async () => {
    rejectRefresh(new Error("offline"));
    await Promise.resolve();
  });
  expect(screen.getByTestId("fleet-refresh-warning")).toBeInTheDocument();
  expect(screen.queryByTestId("fleet-load-error")).not.toBeInTheDocument();
  expect(screen.getByTestId("robot-row-live")).toHaveTextContent("50%");
  await tick(5000);
  expect(screen.getByTestId("robot-row-live")).toHaveTextContent("40%");
});

test.each(["fleet", "detail"] as const)(
  "%s stops background polling and preserves cached data through focus refresh, failure, and recovery",
  async (screenName) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(robot.lastReceivedAt!));

    function response(batteryPercent: number) {
      return screenName === "fleet"
        ? page(batteryPercent)
        : Response.json({
            robot: { ...robot, batteryPercent },
            siteRobots: [],
            verifiedAt: Date.now(),
          });
    }

    let completeRefresh!: (value: Response) => void;
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(45))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            completeRefresh = resolve;
          }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockImplementation(() => Promise.resolve(response(40)));

    vi.stubGlobal("fetch", fetcher);

    render(
      screenName === "fleet" ? (
        <FleetDashboard />
      ) : (
        <RobotDetails robot={robot} siteRobots={[]} verifiedAt={Date.now()} />
      ),
    );
    await tick();

    const container = screen.getByTestId(
      screenName === "fleet" ? "robot-row-live" : "robot-details",
    );
    const battery = within(container).getByTestId("robot-battery");
    const warningId =
      screenName === "fleet"
        ? "fleet-refresh-warning"
        : "robot-refresh-warning";

    expect(battery).toHaveTextContent("45%");
    expect(fetcher).toHaveBeenCalledTimes(1);

    setPageVisibility(true);
    await tick(15000);
    expect(fetcher).toHaveBeenCalledTimes(1);

    setPageVisibility(false);
    await tick();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(battery).toBeInTheDocument();
    expect(battery).toHaveTextContent("45%");

    if (screenName === "fleet") {
      expect(screen.getByTestId("fleet-loading")).not.toHaveTextContent(
        "Loading robots",
      );
    }

    await act(async () => {
      completeRefresh(response(44));
      await Promise.resolve();
    });
    expect(battery).toHaveTextContent("44%");

    setPageVisibility(true);
    await tick();
    setPageVisibility(false);
    await tick();

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(battery).toBeInTheDocument();
    expect(battery).toHaveTextContent("44%");
    expect(screen.getByTestId(warningId)).toHaveTextContent(
      "Live updates interrupted",
    );

    setPageVisibility(true);
    await tick();
    setPageVisibility(false);
    await tick();

    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(battery).toHaveTextContent("40%");
    expect(screen.queryByTestId(warningId)).not.toBeInTheDocument();
  },
);

test.each(["fleet", "detail"] as const)(
  "%s accepts an in-flight response while hidden and refreshes again on return",
  async (screenName) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(robot.lastReceivedAt!));

    function response(batteryPercent: number) {
      return screenName === "fleet"
        ? page(batteryPercent)
        : Response.json({
            robot: { ...robot, batteryPercent },
            siteRobots: [],
            verifiedAt: Date.now(),
          });
    }

    let complete!: (response: Response) => void;
    let signal!: AbortSignal;
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(45))
      .mockImplementationOnce((_url: string, options: RequestInit) => {
        signal = options.signal!;
        return new Promise<Response>((resolve) => {
          complete = resolve;
        });
      })
      .mockImplementation(() => Promise.resolve(response(40)));

    vi.stubGlobal("fetch", fetcher);
    render(
      screenName === "fleet" ? (
        <FleetDashboard />
      ) : (
        <RobotDetails robot={robot} siteRobots={[]} verifiedAt={Date.now()} />
      ),
    );
    await tick();
    await tick(5000);

    const container = screen.getByTestId(
      screenName === "fleet" ? "robot-row-live" : "robot-details",
    );
    const battery = within(container).getByTestId("robot-battery");

    expect(fetcher).toHaveBeenCalledTimes(2);
    setPageVisibility(true);
    await tick();
    expect(signal.aborted).toBe(false);

    await act(async () => {
      complete(response(44));
      await Promise.resolve();
    });
    expect(battery).toHaveTextContent("44%");

    await tick(10000);
    expect(fetcher).toHaveBeenCalledTimes(2);

    setPageVisibility(false);
    await tick();
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(battery).toHaveTextContent("40%");
  },
);

test("page correction after a hidden fleet shrinks immediately verifies the destination data", async () => {
  vi.useFakeTimers();
  let total = 21;
  const fetcher = vi.fn((url: string) => {
    const requestedPage = Number(
      new URL(url, "http://localhost").searchParams.get("page"),
    );
    return Promise.resolve(
      Response.json({
        items: [robot],
        total,
        page: requestedPage,
        pageSize: 10,
        ...pageMetadata(total),
      }),
    );
  });
  vi.stubGlobal("fetch", fetcher);

  const { result } = renderHook(() => useRobots());
  await tick();
  act(() => result.current.setPage(2));
  await tick();
  await tick(20000);
  expect(result.current.page).toBe(2);

  setPageVisibility(true);
  await tick();
  total = 1;
  setPageVisibility(false);
  await tick();

  expect(result.current.page).toBe(0);
  expect(result.current.state).toMatchObject({
    status: "success",
    robots: [{ id: robot.id }],
  });
  expect(result.current.unverified).toBe(false);
  expect(result.current.interrupted).toBe(false);
  expect(
    new URL(fetcher.mock.lastCall![0], "http://localhost").searchParams.get(
      "page",
    ),
  ).toBe("0");
});
