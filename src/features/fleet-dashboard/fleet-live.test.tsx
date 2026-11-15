import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { Robot } from "@/modules/robots/robot";
import FleetDashboard from "./fleet-dashboard";
import RobotDetails from "./robot-details/robot-details";
import useRobots from "./hooks/use-robots";
const robot: Robot = {
  id: "live",
  name: "Live robot",
  manufacturer: "Maker",
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
  expect(screen.queryByText(/Last report/)).not.toBeInTheDocument();
  const link = screen.getByRole("link", { name: robot.name });
  link.focus();
  await tick(4000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await tick(1000);
  expect(screen.getByText("49%")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: robot.name })).toBe(link);
  expect(link).toHaveFocus();
  expect(
    screen.getByRole("status", { name: "Fleet loading status" }),
  ).toBeEmptyDOMElement();
  await tick(5000);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Live updates interrupted",
  );
  expect(screen.getByText("49%")).toBeInTheDocument();
  await tick(5000);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByText("48%")).toBeInTheDocument();
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
  const trigger = screen.getByRole("button", {
    name: "Actions for Live robot",
  });
  vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 40, 40),
  );
  const connection = screen.getByText("Online", { exact: true });
  fireEvent.click(trigger);
  expect(connection).toHaveTextContent(/^Online$/);
  expect(screen.queryByText(/unverified/)).not.toBeInTheDocument();
  await tick(20000);
  expect(connection).toHaveTextContent(/^Online$/);
  expect(
    screen.queryByText("Delayed", { exact: true }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText("Offline", { exact: true }),
  ).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Updates paused")).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
  await tick(300);
  expect(fetch).toHaveBeenCalledTimes(2);
  vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange"));
  await tick(5000);
  expect(fetch).toHaveBeenCalledTimes(2);
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  fireEvent(document, new Event("visibilitychange"));
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
    result.current.invalidate();
    result.current.reload();
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
});
test("detail refreshes quietly and stops when its robot is deleted", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ ...robot, batteryPercent: 45 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 })),
  );
  render(<RobotDetails robot={robot} />);
  await tick();
  expect(screen.getByText("45%")).toBeInTheDocument();
  await tick(5000);
  expect(screen.getByText(/Robot is no longer available/)).toBeInTheDocument();
  await tick(5000);
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("report age appears for delayed robots while online labels stay calm", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.parse(robot.lastReceivedAt!) + 10000));
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => Promise.resolve(page())),
  );
  render(<FleetDashboard />);
  await tick();
  expect(screen.getByText("Online", { exact: true })).toBeInTheDocument();
  expect(screen.queryByText(/Last report/)).not.toBeInTheDocument();
  await tick(1000);
  expect(screen.getByText("Delayed", { exact: true })).toBeInTheDocument();
  expect(screen.getByText("Last report 11s ago")).toBeInTheDocument();
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
  render(<RobotDetails robot={robot} />);
  await tick();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Live updates interrupted",
  );
  await tick(5000);
  expect(screen.getByText(/Robot is no longer available/)).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("failed initial detail refresh keeps server-verified connection information", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.parse(robot.lastReceivedAt!) + 20000));
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unavailable")));
  render(<RobotDetails robot={robot} verifiedAt={Date.now()} />);
  await tick();
  expect(
    screen.getByText("Offline (unverified)", { exact: true }),
  ).toBeInTheDocument();
  expect(screen.queryByText("Checking")).not.toBeInTheDocument();
});
