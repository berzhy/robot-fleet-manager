import { pageMetadata } from "./test-fixtures";
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
  problemCode: null,
  controlTarget: "work",
  controlRevision: 0,
  appliedControlRevision: 0,
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
  return Response.json({
    items,
    total,
    page,
    pageSize: 10,
    ...pageMetadata(total),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function openDelete() {
  const row = await screen.findByTestId("robot-row-one");
  const trigger = within(row).getByTestId("robot-actions");
  vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 40, 40),
  );
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByTestId("robot-delete"));
  return screen.findByTestId("delete-robot-dialog");
}

test("menu targets the robot, cancellation sends no DELETE and restores focus", async () => {
  const fetcher = vi.fn().mockResolvedValue(response([robot]));
  vi.stubGlobal("fetch", fetcher);
  render(<FleetDashboard />);

  const dialog = await openDelete();
  expect(
    within(dialog).getByTestId("delete-robot-description"),
  ).toHaveTextContent("Delete “Atlas”? This cannot be undone.");
  expect(dialog).toHaveRole("dialog");
  expect(dialog).toHaveAccessibleName("Delete robot?");
  expect(within(dialog).getByTestId("delete-robot-cancel")).toHaveRole(
    "button",
  );
  expect(
    within(dialog).getByTestId("delete-robot-cancel"),
  ).toHaveAccessibleName("Cancel");
  expect(within(dialog).getByTestId("delete-robot-confirm")).toHaveRole(
    "button",
  );
  expect(
    within(dialog).getByTestId("delete-robot-confirm"),
  ).toHaveAccessibleName("Delete");
  await waitFor(() =>
    expect(within(dialog).getByTestId("delete-robot-cancel")).toHaveFocus(),
  );

  fireEvent.click(within(dialog).getByTestId("delete-robot-cancel"));
  await waitFor(() =>
    expect(screen.queryByTestId("delete-robot-dialog")).not.toBeInTheDocument(),
  );
  expect(
    within(screen.getByTestId("robot-row-one")).getByTestId("robot-actions"),
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
  const confirm = within(dialog).getByTestId("delete-robot-confirm");
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(confirm).toBeDisabled();
  expect(within(dialog).getByTestId("delete-robot-cancel")).toBeDisabled();
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(dialog).toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledTimes(2);

  act(() => resolve(new Response(null, { status: 404 })));
  const error = await screen.findByTestId("fleet-notification");
  expect(error).toHaveRole("alert");
  expect(error).toHaveTextContent(
    "Unable to delete “Atlas”. Please try again.",
  );
  expect(dialog).toBeInTheDocument();
  expect(confirm).toBeEnabled();
  vi.useFakeTimers();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60000);
  });
  expect(screen.getByTestId("fleet-notification")).toHaveTextContent(
    "Unable to delete",
  );
  vi.useRealTimers();

  fireEvent.click(
    within(screen.getByTestId("fleet-notification")).getByTestId(
      "fleet-notification-close",
    ),
  );
  expect(screen.queryByTestId("fleet-notification")).not.toBeInTheDocument();

  fireEvent.click(confirm);
  await screen.findByTestId("fleet-empty");
  await waitFor(() =>
    expect(screen.getByTestId("fleet-notification")).toHaveTextContent(
      "“Atlas” deleted.",
    ),
  );
  fireEvent.click(confirm);
  expect(fetcher).toHaveBeenCalledTimes(4);
  await waitFor(() =>
    expect(screen.queryByTestId("delete-robot-dialog")).not.toBeInTheDocument(),
  );
  expect(screen.getByTestId("fleet-heading")).toHaveFocus();
  expect(fetcher).toHaveBeenNthCalledWith(2, "/api/robots/one", {
    method: "DELETE",
  });
  expect(fetcher).toHaveBeenNthCalledWith(3, "/api/robots/one", {
    method: "DELETE",
  });
  const notice = screen.getByTestId("fleet-notification");
  const close = within(notice).getByTestId("fleet-notification-close");
  expect(close).toHaveAccessibleName("Close");
  fireEvent.click(close);
  await waitFor(() =>
    expect(screen.queryByTestId("fleet-notification")).not.toBeInTheDocument(),
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
  fireEvent.click(within(dialog).getByTestId("delete-robot-confirm"));
  await waitFor(() =>
    expect(screen.getByTestId("fleet-notification")).toHaveTextContent(
      "“Atlas” deleted.",
    ),
  );
  expect(await screen.findByTestId("fleet-refresh-warning")).toHaveTextContent(
    "Live updates interrupted",
  );
  await waitFor(() =>
    expect(screen.queryByTestId("delete-robot-dialog")).not.toBeInTheDocument(),
  );
});

test("deleting the last robot on a page requests the previous page", async () => {
  const previous = { ...robot, id: "previous", name: "Bishop" };
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response([previous], 11))
    .mockResolvedValueOnce(response([robot], 11, 1))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(response([], 10, 1))
    .mockResolvedValueOnce(response([previous], 10));
  vi.stubGlobal("fetch", fetcher);
  render(<FleetDashboard />);

  await screen.findByTestId("robot-row-previous");
  fireEvent.click(screen.getByTestId("fleet-next-page"));
  const dialog = await openDelete();
  fireEvent.click(within(dialog).getByTestId("delete-robot-confirm"));

  await screen.findByTestId("robot-row-previous");
  expect(fetcher).toHaveBeenNthCalledWith(
    4,
    "/api/robots?page=1&pageSize=10",
    expect.anything(),
  );
  expect(fetcher).toHaveBeenNthCalledWith(
    5,
    "/api/robots?page=0&pageSize=10",
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
    fireEvent.click(within(dialog).getByTestId("delete-robot-confirm"));
    await Promise.resolve();
  });
  expect(screen.getByTestId("fleet-notification")).toHaveTextContent(
    "“Atlas” deleted.",
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(6000);
  });
  expect(screen.queryByTestId("fleet-notification")).not.toBeInTheDocument();
});

async function openDeleteAll() {
  const trigger = await screen.findByTestId("fleet-add-options");
  await waitFor(() => expect(trigger).toBeEnabled());
  vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 40, 40),
  );
  fireEvent.click(trigger);
  fireEvent.click(
    await screen.findByRole("menuitem", { name: "Delete all robots" }),
  );
  return screen.findByRole("dialog", { name: "Delete all robots?" });
}

test("bulk deletion explains fleet-wide scope and cancellation makes no DELETE request", async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(() => Promise.resolve(response([robot])));
  vi.stubGlobal("fetch", fetcher);
  render(<FleetDashboard />);

  const dialog = await openDeleteAll();
  expect(dialog).toHaveTextContent("including those hidden by filters");
  await waitFor(() =>
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toHaveFocus(),
  );

  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(dialog).not.toBeInTheDocument());
  await waitFor(() =>
    expect(screen.getByTestId("fleet-add-robot")).toHaveFocus(),
  );
  expect(
    fetcher.mock.calls.some(
      (call: unknown[]) => (call[1] as RequestInit)?.method === "DELETE",
    ),
  ).toBe(false);
});

test("bulk deletion blocks duplicate clicks and dismissal, supports retry and refreshes to empty", async () => {
  let resolve!: (value: Response) => void;
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response([robot]))
    .mockReturnValueOnce(
      new Promise<Response>((r) => {
        resolve = r;
      }),
    )
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(response([]));
  vi.stubGlobal("fetch", fetcher);
  render(<FleetDashboard />);

  const dialog = await openDeleteAll();
  const confirm = within(dialog).getByRole("button", {
    name: "Delete all robots",
  });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(confirm).toBeDisabled();
  expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(dialog).toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledTimes(2);

  act(() => resolve(new Response(null, { status: 500 })));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to delete all robots. Please try again.",
  );
  expect(screen.getByTestId("robot-row-one")).toBeInTheDocument();
  expect(confirm).toBeEnabled();

  fireEvent.click(confirm);
  await screen.findByTestId("fleet-empty");
  await waitFor(() => expect(dialog).not.toBeInTheDocument());
  expect(screen.getByTestId("fleet-notification")).toHaveTextContent(
    "All robots deleted.",
  );
  expect(screen.getByTestId("fleet-heading")).toHaveFocus();
  expect(fetcher).toHaveBeenNthCalledWith(2, "/api/robots", {
    method: "DELETE",
  });
  expect(fetcher).toHaveBeenNthCalledWith(3, "/api/robots", {
    method: "DELETE",
  });
});
