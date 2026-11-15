import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { Robot, RobotPage } from "@/modules/robots/robot";
import FleetDashboard from "./fleet-dashboard";
const robot: Robot = {
  id: "one",
  name: "Atlas",
  manufacturer: "Maker",
  site: "Munich",
  area: null,
  activity: "unknown",
  batteryPercent: null,
  lastTelemetryAt: null,
  lastReceivedAt: null,
  createdAt: "2026-11-14T12:00:00.000Z",
};
const page = (items: Robot[], total = items.length, index = 0): RobotPage => ({
  items,
  total,
  page: index,
  pageSize: 20,
});
afterEach(() => vi.unstubAllGlobals());
test("loads real API data with accessible loading status", async () => {
  let resolve!: (response: Response) => void;
  const fetcher = vi.fn().mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  render(<FleetDashboard />);
  const status = screen.getByRole("status", { name: "Fleet loading status" });
  expect(status).toHaveTextContent("Loading robots");
  expect(screen.getByRole("table").closest("[aria-busy]")).not.toContainElement(
    status,
  );
  act(() => resolve(Response.json(page([robot]))));
  expect(await screen.findByRole("link", { name: "Atlas" })).toHaveAttribute(
    "href",
    "/robots/one",
  );
  expect(
    screen.queryByRole("button", { name: "Refresh" }),
  ).not.toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test("handles HTTP failure, retry, and empty fleet without demo controls", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(Response.json(page([]))),
  );
  render(<FleetDashboard />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to load robots",
  );
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("No robots available.")).toBeInTheDocument();
});
test("requests pages and keeps the pager mounted while loading", async () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({
    ...robot,
    id: String(i),
    name: `Robot ${i}`,
  }));
  let resolve!: (response: Response) => void;
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(page(rows, 21)))
    .mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  render(<FleetDashboard />);
  await screen.findByRole("link", { name: "Robot 0" });
  const next = screen.getByRole("button", { name: "Go to next page" });
  fireEvent.click(next);
  expect(next).toBeInTheDocument();
  expect(next).toBeDisabled();
  act(() =>
    resolve(Response.json(page([{ ...robot, name: "Last robot" }], 21, 1))),
  );
  await screen.findByRole("link", { name: "Last robot" });
  expect(fetcher).toHaveBeenNthCalledWith(
    2,
    "/api/robots?page=1&pageSize=20",
    expect.objectContaining({ cache: "no-store" }),
  );
});

test("changing rows per page resets to the first page and requests the selected size", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(page([robot], 21)))
    .mockResolvedValueOnce(Response.json(page([robot], 21, 1)))
    .mockResolvedValueOnce(
      Response.json({ items: [robot], total: 21, page: 0, pageSize: 10 }),
    );
  vi.stubGlobal("fetch", fetcher);
  render(<FleetDashboard />);
  await screen.findByRole("link", { name: "Atlas" });
  fireEvent.click(screen.getByRole("button", { name: "Go to next page" }));
  await screen.findByText("21–21 of 21");
  await screen.findByRole("link", { name: "Atlas" });
  fireEvent.mouseDown(screen.getByRole("combobox", { name: /Rows per page/ }));
  fireEvent.click(screen.getByRole("option", { name: "10" }));
  await screen.findByText("1–10 of 21");
  expect(fetcher).toHaveBeenNthCalledWith(
    3,
    "/api/robots?page=0&pageSize=10",
    expect.anything(),
  );
  expect(
    screen.getByRole("button", { name: "Go to previous page" }),
  ).toBeDisabled();
});
