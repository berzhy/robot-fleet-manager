import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { renderHook, render } from "@/query/test-utils";
import type { Robot, RobotContext } from "@/modules/robots/robot";
import type { CreateRobotInput } from "@/modules/robots/robot-validation";

import { useCreateRobots, useSendRobotAction } from "./api/robot-mutations";
import { robotKeys } from "./api/robot-queries";

import RobotDetails from "./details/robot-details";
import useLiveRobot from "./details/use-live-robot";
import RobotList from "./list/robot-list";
import useRobotList, {
  useRobotListPageCorrection,
} from "./list/use-robot-list";
import {
  setRobotListFilters,
  setRobotListPage,
} from "./list/use-robot-list-view";
import { pageMetadata } from "./test-fixtures";

const robot: Robot = {
  problemCode: null,
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

const robotContext = (batteryPercent: number) =>
  Response.json({
    robot: { ...robot, batteryPercent },
    siteRobots: [],
    evaluatedAt: Date.now(),
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

// Answers fleet and detail polls with the same robot snapshot.
function liveFetcher() {
  return vi.fn<(url: string, init?: RequestInit) => Promise<Response>>((url) =>
    Promise.resolve(url.includes("/context") ? robotContext(50) : page(50)),
  );
}

function robotNotFound() {
  return Response.json(
    { error: { code: "NOT_FOUND", message: "Robot not found." } },
    { status: 404 },
  );
}

function renderDetails(context: RobotContext) {
  return render(<RobotDetails robotId={context.robot.id} />, {
    queryData: [[robotKeys.context(context.robot.id), context]],
  });
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
  render(<RobotList />);
  await tick();

  const row = within(screen.getByTestId("robot-row-live"));
  expect(row.queryByTestId("robot-last-report")).not.toBeInTheDocument();
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

test("an open action menu receives fleet updates while a hidden tab stops polling", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.parse(robot.lastReceivedAt!) + 10000));
  const fetcher = vi
    .fn()
    .mockImplementationOnce(() => Promise.resolve(page()))
    .mockImplementation(() => Promise.resolve(page(49)));
  vi.stubGlobal("fetch", fetcher);
  render(<RobotList />);
  await tick();

  const row = within(screen.getByTestId("robot-row-live"));
  const trigger = row.getByTestId("robot-actions");
  vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 40, 40),
  );
  const connection = row.getByTestId("robot-connection");

  fireEvent.click(trigger);
  expect(connection).toHaveTextContent(/^Online$/);
  const stop = screen.getByRole("menuitem", { name: "Stop activity" });
  expect(stop).not.toHaveAttribute("aria-disabled", "true");

  await tick(5000);
  expect(connection).toHaveTextContent(/^Delayed$/);
  expect(row.getByTestId("robot-battery")).toHaveTextContent("49%");
  expect(screen.getByRole("menu")).toBeVisible();
  expect(stop).toHaveAttribute("aria-disabled", "true");

  setPageVisibility(true);
  await tick(5000);
  expect(fetcher).toHaveBeenCalledTimes(2);

  setPageVisibility(false);
  await tick();
  expect(fetcher).toHaveBeenCalledTimes(3);
});

test.each(["fleet", "detail"] as const)(
  "%s blocks a command when the report expires between polls",
  async (surface) => {
    vi.useFakeTimers();
    const evaluatedAt = Date.parse(robot.lastReceivedAt!) + 9_500;
    vi.setSystemTime(new Date(evaluatedAt));
    const fetcher = liveFetcher();
    vi.stubGlobal("fetch", fetcher);

    if (surface === "fleet") {
      render(<RobotList />);
    } else {
      renderDetails({ robot, siteRobots: [], evaluatedAt: evaluatedAt });
    }
    await tick();

    if (surface === "fleet") {
      const trigger = screen.getByRole("button", {
        name: `Actions for ${robot.name}`,
      });
      vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(
        new DOMRect(0, 0, 40, 40),
      );
      fireEvent.click(trigger);
    }

    const stop = screen.getByRole(surface === "fleet" ? "menuitem" : "button", {
      name: "Stop activity",
    });
    expect(stop).not.toHaveAttribute("aria-disabled", "true");
    await tick(600);
    fireEvent.click(stop);

    expect(screen.getByRole("alert")).toHaveTextContent("Robot must be online");
    expect(screen.getByTestId("robot-connection")).toHaveTextContent(
      /^Online$/,
    );
    expect(fetcher.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
      false,
    );
  },
);

test("a stale in-flight poll cannot overwrite an explicit refresh", async () => {
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
  const { result } = renderHook(() => useRobotList());
  await tick();

  await tick(5000);

  act(() => {
    result.current.refresh();
  });
  await tick();

  await act(async () => {
    stale(page(99));
    await Promise.resolve();
  });
  expect(result.current.status).toBe("success");
  expect(result.current.snapshot?.items).toMatchObject([
    { batteryPercent: 40 },
  ]);
  expect(result.current.refreshFailed).toBe(false);
});

test("details render with the page's data and first ask again at the next poll", async () => {
  vi.useFakeTimers();
  const fetcher = liveFetcher();
  vi.stubGlobal("fetch", fetcher);
  renderDetails({ robot, siteRobots: [], evaluatedAt: Date.now() });
  await tick();

  expect(screen.getByTestId("robot-details")).toBeInTheDocument();
  expect(fetcher).not.toHaveBeenCalled();

  await tick(5000);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test("detail refreshes while Logs is selected and stops when its robot is deleted", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          robot: { ...robot, batteryPercent: 42, site: "Berlin" },
          siteRobots: [],
          evaluatedAt: Date.now(),
        }),
      )
      .mockResolvedValueOnce(robotNotFound()),
  );
  renderDetails({
    robot: { ...robot, batteryPercent: 45 },
    siteRobots: [],
    evaluatedAt: 0,
  });
  await tick();

  expect(
    within(screen.getByTestId("robot-details")).getByTestId("robot-battery"),
  ).toHaveTextContent("45%");

  const logs = screen.getByRole("tab", { name: "Logs" });
  fireEvent.click(logs);
  await tick(5000);
  expect(logs).toHaveAttribute("aria-selected", "true");
  expect(screen.getByTestId("robot-battery")).toHaveTextContent("42%");
  expect(screen.getByRole("tabpanel", { name: "Logs" })).toHaveTextContent(
    "Location configuration loaded: Berlin",
  );

  await tick(5000);
  expect(screen.getByTestId("robot-unavailable")).toHaveTextContent(
    "Robot is no longer available.",
  );

  setPageVisibility(true);
  setPageVisibility(false);
  await tick(10000);
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("connection classification stays on the last fleet snapshot between refreshes", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.parse(robot.lastReceivedAt!) + 10000));
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => Promise.resolve(page())),
  );
  render(<RobotList />);
  await tick();

  const row = within(screen.getByTestId("robot-row-live"));
  expect(row.getByTestId("robot-connection")).toHaveTextContent(/^Online$/);
  expect(row.queryByTestId("robot-last-report")).not.toBeInTheDocument();
  expect(row.getByTestId("robot-activity")).toHaveTextContent(/^Working$/);

  await tick(1000);
  expect(row.getByTestId("robot-connection")).toHaveTextContent(/^Online$/);

  await tick(4000);
  expect(row.getByTestId("robot-connection")).toHaveTextContent(/^Delayed$/);
  const report = row.getByTestId("robot-last-report");
  expect(report).toHaveTextContent(/^15 sec ago$/);
  expect(report.querySelector("time")).toHaveAttribute(
    "datetime",
    robot.lastReceivedAt,
  );
  expect(row.getByTestId("robot-activity")).toHaveTextContent(
    /^Last: Working$/,
  );

  await tick(5000);
  expect(row.getByTestId("robot-connection")).toHaveTextContent(/^Offline$/);
  expect(report).toHaveTextContent(/^20 sec ago$/);
});

test("a confirmed detail deletion clears an earlier refresh warning", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(robotNotFound()),
  );
  renderDetails({ robot: robot, siteRobots: [], evaluatedAt: 0 });
  await tick(5000);

  expect(screen.getByTestId("robot-refresh-warning")).toHaveTextContent(
    "Live updates interrupted",
  );

  await tick(5000);
  expect(screen.getByTestId("robot-unavailable")).toHaveTextContent(
    "Robot is no longer available.",
  );
  expect(screen.queryByTestId("robot-refresh-warning")).not.toBeInTheDocument();
});

test("a failed first detail poll keeps server-verified connection information", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.parse(robot.lastReceivedAt!) + 20000));
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unavailable")));
  renderDetails({ robot: robot, siteRobots: [], evaluatedAt: Date.now() });
  await tick(5000);

  expect(
    within(screen.getByTestId("robot-details")).getByTestId("robot-connection"),
  ).toHaveTextContent(/^Offline \(unverified\)$/);
});

test("Escape closes a secondary select before More filters while polling continues", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(robot.lastReceivedAt!));
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(page()));
  vi.stubGlobal("fetch", fetcher);
  render(<RobotList />);
  await tick();

  fireEvent.click(screen.getByRole("button", { name: /More filters/ }));
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Manufacturer" }));
  await tick(5000);
  expect(fetcher).toHaveBeenCalledTimes(2);

  fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
  await tick(5000);
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Close more filters" }),
  ).toBeInTheDocument();

  fireEvent.keyDown(screen.getByRole("combobox", { name: "Manufacturer" }), {
    key: "Escape",
  });
  await tick(300);
  expect(
    screen.queryByRole("button", { name: "Close more filters" }),
  ).not.toBeInTheDocument();
});

test("fleet and detail retain snapshots after a request timeout and recover on the next poll", async () => {
  vi.useFakeTimers();
  let timeout = new AbortController();
  vi.spyOn(AbortSignal, "timeout").mockImplementation(() => timeout.signal);
  let stalled = false;
  const fetcher = vi.fn((url: string, init?: RequestInit) => {
    if (stalled) {
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
    }
    return Promise.resolve(
      url.includes("/context")
        ? Response.json({
            robot: { ...robot, batteryPercent: 45 },
            siteRobots: [],
            evaluatedAt: Date.now(),
          })
        : page(45),
    );
  });
  vi.stubGlobal("fetch", fetcher);
  const context = {
    robot: { ...robot, batteryPercent: 45 },
    siteRobots: [],
    evaluatedAt: Date.now(),
  };
  const { result } = renderHook(
    () => ({ fleet: useRobotList(), detail: useLiveRobot(robot.id) }),
    { queryData: [[robotKeys.context(robot.id), context]] },
  );
  await tick();

  // The details came with the page, so their first request is the first poll.
  stalled = true;
  await tick(5000);
  expect(fetcher).toHaveBeenCalledTimes(3);

  await act(async () => {
    timeout.abort(new DOMException("Request timed out", "TimeoutError"));
    await Promise.resolve();
  });
  expect(result.current.fleet.refreshFailed).toBe(true);
  expect(result.current.detail.refreshFailed).toBe(true);
  expect(result.current.fleet.status).toBe("success");
  expect(result.current.fleet.snapshot?.items).toMatchObject([
    { batteryPercent: 45 },
  ]);
  expect(result.current.detail.robot.batteryPercent).toBe(45);

  await tick(4999);
  expect(fetcher).toHaveBeenCalledTimes(3);

  stalled = false;
  timeout = new AbortController();
  await tick(1);
  expect(fetcher).toHaveBeenCalledTimes(5);
  expect(result.current.fleet.refreshFailed).toBe(false);
  expect(result.current.detail.refreshFailed).toBe(false);
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
  const { unmount } = renderHook(
    () => ({ fleet: useRobotList(), detail: useLiveRobot(robot.id) }),
    {
      queryData: [
        [
          robotKeys.context(robot.id),
          { robot, siteRobots: [], evaluatedAt: Date.now() },
        ],
      ],
    },
  );
  expect(signals).toHaveLength(1);

  // The details came with the page, so their first request is the first poll.
  await tick(5000);
  expect(signals).toHaveLength(2);
  expect(signals.every((signal) => !signal.aborted)).toBe(true);

  unmount();
  expect(signals.every((signal) => signal.aborted)).toBe(true);

  await tick(10000);
  expect(fetcher).toHaveBeenCalledTimes(2);
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
  const view = render(<RobotList />);
  await tick();
  expect(screen.getByTestId("robot-row-live")).toBeInTheDocument();
  view.rerender(<></>);
  view.rerender(<RobotList />);
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
            evaluatedAt: Date.now(),
          });
    }

    let completeRefresh!: (value: Response) => void;
    const fetcher = vi.fn();
    if (screenName === "fleet") {
      fetcher.mockResolvedValueOnce(response(45));
    }
    fetcher
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            completeRefresh = resolve;
          }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockImplementation(() => Promise.resolve(response(40)));

    vi.stubGlobal("fetch", fetcher);

    if (screenName === "fleet") {
      render(<RobotList />);
    } else {
      renderDetails({
        robot: { ...robot, batteryPercent: 45 },
        siteRobots: [],
        evaluatedAt: Date.now(),
      });
    }
    await tick();
    // The list fetches on mount, the details come with the page; count from here.
    fetcher.mockClear();

    const container = screen.getByTestId(
      screenName === "fleet" ? "robot-row-live" : "robot-details",
    );
    const battery = within(container).getByTestId("robot-battery");
    const warningId =
      screenName === "fleet"
        ? "fleet-refresh-warning"
        : "robot-refresh-warning";

    expect(battery).toHaveTextContent("45%");

    setPageVisibility(true);
    await tick(15000);
    expect(fetcher).not.toHaveBeenCalled();

    setPageVisibility(false);
    await tick();
    expect(fetcher).toHaveBeenCalledTimes(1);
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

    // Returning refreshes data older than one poll interval.
    setPageVisibility(true);
    await tick(5000);
    setPageVisibility(false);
    await tick();

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(battery).toBeInTheDocument();
    expect(battery).toHaveTextContent("44%");
    expect(screen.getByTestId(warningId)).toHaveTextContent(
      "Live updates interrupted",
    );

    setPageVisibility(true);
    await tick(5000);
    setPageVisibility(false);
    await tick();

    expect(fetcher).toHaveBeenCalledTimes(3);
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
            evaluatedAt: Date.now(),
          });
    }

    let complete!: (response: Response) => void;
    let signal!: AbortSignal;
    const fetcher = vi.fn();
    if (screenName === "fleet") {
      fetcher.mockResolvedValueOnce(response(45));
    }
    fetcher
      .mockImplementationOnce((_url: string, options: RequestInit) => {
        signal = options.signal!;
        return new Promise<Response>((resolve) => {
          complete = resolve;
        });
      })
      .mockImplementation(() => Promise.resolve(response(40)));

    vi.stubGlobal("fetch", fetcher);
    if (screenName === "fleet") {
      render(<RobotList />);
    } else {
      renderDetails({
        robot: { ...robot, batteryPercent: 45 },
        siteRobots: [],
        evaluatedAt: Date.now(),
      });
    }
    await tick();
    // The list fetches on mount, the details come with the page; count from here.
    fetcher.mockClear();
    await tick(5000);

    const container = screen.getByTestId(
      screenName === "fleet" ? "robot-row-live" : "robot-details",
    );
    const battery = within(container).getByTestId("robot-battery");

    expect(fetcher).toHaveBeenCalledTimes(1);
    setPageVisibility(true);
    await tick();
    expect(signal.aborted).toBe(false);

    await act(async () => {
      complete(response(44));
      await Promise.resolve();
    });
    expect(battery).toHaveTextContent("44%");

    await tick(10000);
    expect(fetcher).toHaveBeenCalledTimes(1);

    setPageVisibility(false);
    await tick();
    expect(fetcher).toHaveBeenCalledTimes(2);
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

  const { result } = renderHook(() => {
    const list = useRobotList();
    useRobotListPageCorrection(list);
    return list;
  });
  await tick();
  act(() => setRobotListPage(2));
  await tick();
  await tick(20000);
  expect(result.current.page).toBe(2);

  setPageVisibility(true);
  await tick();
  total = 1;
  setPageVisibility(false);
  await tick();

  expect(result.current.page).toBe(0);
  expect(result.current.status).toBe("success");
  expect(result.current.snapshot?.items).toMatchObject([{ id: robot.id }]);
  expect(result.current.refreshFailed).toBe(false);
  expect(
    new URL(fetcher.mock.lastCall![0], "http://localhost").searchParams.get(
      "page",
    ),
  ).toBe("0");
});

type DeferredRead = {
  url: string;
  signal: AbortSignal;
  resolve: (response: Response) => void;
};

// Holds every GET in flight and the single POST until the test releases them.
function deferredFetch() {
  const reads: DeferredRead[] = [];
  let acceptWrite!: (response: Response) => void;

  const fetcher = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      return new Promise<Response>((resolve) => (acceptWrite = resolve));
    }

    return new Promise<Response>((resolve) =>
      reads.push({ url, signal: init!.signal!, resolve }),
    );
  });

  return {
    fetcher,
    reads,
    acceptWrite: (response: Response) => acceptWrite(response),
  };
}

test("a command cancels the poll in flight and stays pending until fresh data lands", async () => {
  vi.useFakeTimers();
  const { fetcher, reads, acceptWrite } = deferredFetch();
  vi.stubGlobal("fetch", fetcher);

  const { result } = renderHook(
    () => ({
      detail: useLiveRobot(robot.id),
      command: useSendRobotAction(),
    }),
    {
      queryData: [
        [
          robotKeys.context(robot.id),
          { robot, siteRobots: [], evaluatedAt: Date.now() },
        ],
      ],
    },
  );
  await tick(5000);
  expect(reads).toHaveLength(1);

  await act(async () => {
    result.current.command.mutate({ id: robot.id, action: "stop" });
    await vi.advanceTimersByTimeAsync(0);
  });
  await act(async () => {
    acceptWrite(new Response(null, { status: 202 }));
    await vi.advanceTimersByTimeAsync(0);
  });

  const [stalePoll, freshRead] = reads;
  expect(stalePoll.signal.aborted).toBe(true);
  expect(freshRead).toBeDefined();
  expect(result.current.command.isPending).toBe(true);

  await act(async () => {
    stalePoll.resolve(robotContext(99));
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(result.current.detail.robot.batteryPercent).toBe(50);
  expect(result.current.command.isPending).toBe(true);

  await act(async () => {
    freshRead.resolve(robotContext(40));
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(result.current.detail.robot.batteryPercent).toBe(40);
  expect(result.current.detail.refreshFailed).toBe(false);
  expect(result.current.command.isPending).toBe(false);
});

test("a write that settles during the first read for new filters refetches instead of reusing it", async () => {
  vi.useFakeTimers();
  const { fetcher, reads, acceptWrite } = deferredFetch();
  vi.stubGlobal("fetch", fetcher);

  const input: CreateRobotInput = {
    name: "New robot",
    manufacturer: "Maker",
    type: "inspection",
    integrationType: "vendor-api",
    site: "Munich",
  };
  const { result } = renderHook(() => ({
    list: useRobotList(),
    create: useCreateRobots(),
  }));
  await tick();
  await act(async () => {
    reads[0].resolve(page(50));
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(result.current.list.status).toBe("success");

  await act(async () => {
    result.current.create.mutate([input]);
    await vi.advanceTimersByTimeAsync(0);
  });
  await act(async () => {
    setRobotListFilters({ view: "offline" });
    await vi.advanceTimersByTimeAsync(0);
  });
  const firstOfflineRead = reads.at(-1)!;
  expect(firstOfflineRead.url).toContain("view=offline");

  await act(async () => {
    acceptWrite(Response.json({ items: [robot] }, { status: 201 }));
    await vi.advanceTimersByTimeAsync(0);
  });
  const freshOfflineRead = reads.at(-1)!;
  expect(firstOfflineRead.signal.aborted).toBe(true);
  expect(freshOfflineRead).not.toBe(firstOfflineRead);
  expect(freshOfflineRead.url).toContain("view=offline");

  await act(async () => {
    firstOfflineRead.resolve(page(10));
    freshOfflineRead.resolve(page(20));
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(result.current.list.snapshot?.items).toMatchObject([
    { batteryPercent: 20 },
  ]);
  expect(result.current.create.isPending).toBe(false);
});
