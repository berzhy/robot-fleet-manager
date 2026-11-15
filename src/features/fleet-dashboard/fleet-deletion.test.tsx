import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import type { Robot } from "@/modules/robots/robot";

import FleetDashboard from "./fleet-dashboard";

const robot: Robot = {
  id: "one",
  name: "Atlas",
  manufacturer: "Maker",
  type: "inspection" as const,
  integrationType: "vendor-api" as const,
  site: "Munich",
  area: null,
  activity: "unknown",
  batteryPercent: null,
  lastTelemetryAt: null,
  lastReceivedAt: null,
  createdAt: "2026-11-14T12:00:00.000Z",
};
function response(items: Robot[], total = items.length, page = 0) {
  return Response.json({ items, total, page, pageSize: 20 });
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function openDelete() {
  const trigger = await screen.findByRole("button", {
    name: "Actions for Atlas",
  });
  vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 40, 40),
  );
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
  return screen.findByRole("dialog", { name: "Delete robot?" });
}

test("menu targets the robot, cancellation sends no DELETE and restores focus", async () => {
  const fetcher = vi.fn().mockResolvedValue(response([robot]));
  vi.stubGlobal("fetch", fetcher);
  render(<FleetDashboard />);
  const dialog = await openDelete();
  expect(
    within(dialog).getByText("Delete “Atlas”? This cannot be undone."),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toHaveFocus(),
  );
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(
    screen.getByRole("button", { name: "Actions for Atlas" }),
  ).toHaveFocus();
  expect(
    fetcher.mock.calls.filter(
      (call: unknown[]) => (call[1] as RequestInit)?.method === "DELETE",
    ),
  ).toHaveLength(0);
});

test("pending deletion blocks duplicate submission and dismissal; failure permits retry", async () => {
  let resolve!: (value: Response) => void;
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response([robot]))
    .mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    )
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(response([]));
  vi.stubGlobal("fetch", fetcher);
  render(<FleetDashboard />);
  const dialog = await openDelete();
  const confirm = within(dialog).getByRole("button", { name: "Delete" });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(confirm).toBeDisabled();
  expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(dialog).toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledTimes(2);
  act(() => resolve(new Response(null, { status: 404 })));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to delete “Atlas”. Please try again.",
  );
  expect(dialog).toBeInTheDocument();
  expect(confirm).toBeEnabled();
  vi.useFakeTimers();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60000);
  });
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to delete");
  vi.useRealTimers();
  fireEvent.click(
    within(screen.getByRole("alert")).getByRole("button", { name: "Close" }),
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  fireEvent.click(confirm);
  await screen.findByText("No robots available.");
  expect(await screen.findByText("“Atlas” deleted.")).toBeInTheDocument();
  fireEvent.click(confirm);
  expect(fetcher).toHaveBeenCalledTimes(4);
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(
    screen.getByRole("heading", { name: "Fleet dashboard" }),
  ).toHaveFocus();
  expect(fetcher).toHaveBeenNthCalledWith(2, "/api/robots/one", {
    method: "DELETE",
  });
  expect(fetcher).toHaveBeenNthCalledWith(3, "/api/robots/one", {
    method: "DELETE",
  });
  const notice = screen
    .getByText("“Atlas” deleted.")
    .closest('[role="status"]')!;
  fireEvent.click(
    within(notice as HTMLElement).getByRole("button", { name: "Close" }),
  );
  await waitFor(() =>
    expect(screen.queryByText("“Atlas” deleted.")).not.toBeInTheDocument(),
  );
});

test("successful deletion stays successful when the table refresh fails", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(response([robot]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 })),
  );
  render(<FleetDashboard />);
  const dialog = await openDelete();
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
  expect(await screen.findByText("“Atlas” deleted.")).toBeInTheDocument();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Live updates interrupted",
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
});

test("deleting the last robot on a page requests the previous page", async () => {
  const previous = { ...robot, id: "previous", name: "Bishop" };
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response([previous], 21))
    .mockResolvedValueOnce(response([robot], 21, 1))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(response([], 20, 1))
    .mockResolvedValueOnce(response([previous], 20));
  vi.stubGlobal("fetch", fetcher);
  render(<FleetDashboard />);
  await screen.findByRole("link", { name: "Bishop" });
  fireEvent.click(screen.getByRole("button", { name: "Go to next page" }));
  const dialog = await openDelete();
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
  await screen.findByRole("link", { name: "Bishop" });
  expect(fetcher).toHaveBeenNthCalledWith(
    4,
    "/api/robots?page=1&pageSize=20",
    expect.anything(),
  );
  expect(fetcher).toHaveBeenNthCalledWith(
    5,
    "/api/robots?page=0&pageSize=20",
    expect.anything(),
  );
});

test("success notification closes automatically after six seconds", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(response([robot]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(response([])),
  );
  render(<FleetDashboard />);
  const dialog = await openDelete();
  vi.useFakeTimers();
  await act(async () => {
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await Promise.resolve();
  });
  expect(screen.getByText("“Atlas” deleted.")).toBeInTheDocument();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(6000);
  });
  expect(screen.queryByText("“Atlas” deleted.")).not.toBeInTheDocument();
});
