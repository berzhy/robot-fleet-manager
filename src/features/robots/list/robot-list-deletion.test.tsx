import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { render } from "@/test/render";
import type { Robot } from "@/common/robots/robot";

import { pageMetadata, testRobot } from "@/test/robots";
import RobotList from "./robot-list";

const robot = testRobot({ id: "one", name: "Atlas", manufacturer: "Maker" });
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
  await act(async () => {
    fireEvent.click(trigger);
    await Promise.resolve();
  });
  await act(async () => {
    fireEvent.click(await screen.findByTestId("robot-delete"));
    await Promise.resolve();
  });
  return screen.findByTestId("delete-robot-dialog");
}

test("menu targets the robot, cancellation sends no DELETE and restores focus", async () => {
  const fetcher = vi.fn().mockResolvedValue(response([robot]));
  vi.stubGlobal("fetch", fetcher);
  render(<RobotList />);

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

  await act(async () => {
    fireEvent.click(within(dialog).getByTestId("delete-robot-cancel"));
    await Promise.resolve();
  });
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
  let deleted = false;
  const fetcher = vi
    .fn((_: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        deleted = true;
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(response(deleted ? [] : [robot]));
    })
    .mockResolvedValueOnce(response([robot]))
    .mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  render(<RobotList />);

  const dialog = await openDelete();
  const confirm = within(dialog).getByTestId("delete-robot-confirm");
  await act(async () => {
    fireEvent.click(confirm);
    await Promise.resolve();
  });
  await act(async () => {
    fireEvent.click(confirm);
    await Promise.resolve();
  });
  expect(confirm).toBeDisabled();
  expect(within(dialog).getByTestId("delete-robot-cancel")).toBeDisabled();
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(dialog).toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledTimes(2);

  act(() => resolve(new Response(null, { status: 500 })));
  const error = await within(dialog).findByRole("alert");
  expect(error).toHaveAttribute("data-testid", "fleet-notification");
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

  await act(async () => {
    fireEvent.click(confirm);
    await Promise.resolve();
  });
  await screen.findByTestId("fleet-empty");
  await waitFor(() =>
    expect(screen.getByTestId("fleet-notification")).toHaveTextContent(
      "“Atlas” deleted.",
    ),
  );
  await act(async () => {
    fireEvent.click(confirm);
    await Promise.resolve();
  });
  await waitFor(() =>
    expect(screen.queryByTestId("delete-robot-dialog")).not.toBeInTheDocument(),
  );
  expect(screen.getByRole("textbox", { name: "Search robots" })).toHaveFocus();
  const deleteCall = [
    "/api/robots/one",
    {
      method: "DELETE",
      signal: expect.any(AbortSignal) as AbortSignal,
    },
  ];
  expect(
    fetcher.mock.calls.filter(([, init]) => init?.method === "DELETE"),
  ).toEqual([deleteCall, deleteCall]);
  const notice = screen.getByTestId("fleet-notification");
  const close = within(notice).getByTestId("fleet-notification-close");
  expect(close).toHaveAccessibleName("Close");
  await act(async () => {
    fireEvent.click(close);
    await Promise.resolve();
  });
  await waitFor(() =>
    expect(screen.queryByTestId("fleet-notification")).not.toBeInTheDocument(),
  );
});

test("successful deletion stays successful when the table refresh fails", async () => {
  let finishRefresh!: (value: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(response([robot]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          finishRefresh = resolve;
        }),
      ),
  );
  render(<RobotList />);

  const dialog = await openDelete();
  const confirm = within(dialog).getByTestId("delete-robot-confirm");
  await act(async () => {
    fireEvent.click(confirm);
    await Promise.resolve();
  });

  // The deletion is accepted, but the dialog stays pending until the refresh settles.
  await waitFor(() => expect(finishRefresh).toBeDefined());
  expect(confirm).toBeDisabled();
  expect(screen.queryByTestId("fleet-notification")).not.toBeInTheDocument();

  act(() => finishRefresh(new Response(null, { status: 500 })));
  await waitFor(() =>
    expect(screen.getByTestId("fleet-notification")).toHaveTextContent(
      "“Atlas” deleted.",
    ),
  );
  await waitFor(() =>
    expect(screen.queryByTestId("delete-robot-dialog")).not.toBeInTheDocument(),
  );
  expect(screen.getByTestId("fleet-refresh-warning")).toHaveTextContent(
    "Live updates interrupted",
  );
  expect(screen.getByTestId("robot-row-one")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Search robots" })).toHaveFocus();
});

test("an already removed robot closes confirmation and refreshes the fleet", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(response([robot]))
      .mockResolvedValueOnce(
        Response.json(
          { error: { message: "Robot not found." } },
          { status: 404 },
        ),
      )
      .mockResolvedValueOnce(response([])),
  );
  render(<RobotList />);

  const dialog = await openDelete();
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

  expect(await screen.findByText("“Atlas” was already removed.")).toBeVisible();
  expect(await screen.findByTestId("fleet-empty")).toBeInTheDocument();
  await waitFor(() => expect(dialog).not.toBeInTheDocument());
  expect(screen.getByRole("textbox", { name: "Search robots" })).toHaveFocus();
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
  render(<RobotList />);

  await screen.findByTestId("robot-row-previous");
  await act(async () => {
    fireEvent.click(screen.getByTestId("fleet-next-page"));
    await Promise.resolve();
  });
  const dialog = await openDelete();
  await act(async () => {
    fireEvent.click(within(dialog).getByTestId("delete-robot-confirm"));
    await Promise.resolve();
  });

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
  render(<RobotList />);

  const dialog = await openDelete();
  vi.useFakeTimers();
  await act(async () => {
    await act(async () => {
      fireEvent.click(within(dialog).getByTestId("delete-robot-confirm"));
      await Promise.resolve();
    });
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
  await act(async () => {
    fireEvent.click(trigger);
    await Promise.resolve();
  });
  fireEvent.click(
    await screen.findByRole("menuitem", { name: "Delete all robots" }),
  );
  return screen.findByRole("dialog", { name: "Delete all robots?" });
}

test("opening the delete dialog clears an earlier notice", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) =>
      Promise.resolve(
        url === "/api/robots/batch" && init?.method === "POST"
          ? Response.json({ items: [robot] }, { status: 201 })
          : response([robot]),
      ),
    ),
  );
  render(<RobotList />);

  await screen.findByTestId("robot-row-one");
  await act(async () => {
    fireEvent.click(screen.getByTestId("fleet-add-robot"));
    await Promise.resolve();
  });
  expect(await screen.findByTestId("fleet-notification")).toHaveTextContent(
    "“Atlas” added.",
  );

  await openDelete();

  expect(screen.queryByTestId("fleet-notification")).not.toBeInTheDocument();
});

test("bulk deletion explains fleet-wide scope and cancellation makes no DELETE request", async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(() => Promise.resolve(response([robot])));
  vi.stubGlobal("fetch", fetcher);
  render(<RobotList />);

  const dialog = await openDeleteAll();
  expect(dialog).toHaveTextContent("including those hidden by filters");
  await waitFor(() =>
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toHaveFocus(),
  );

  await act(async () => {
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await Promise.resolve();
  });
  await waitFor(() => expect(dialog).not.toBeInTheDocument());
  await waitFor(() =>
    expect(screen.getByTestId("fleet-add-options")).toHaveFocus(),
  );
  expect(
    fetcher.mock.calls.some(
      (call: unknown[]) => (call[1] as RequestInit)?.method === "DELETE",
    ),
  ).toBe(false);
});

test("bulk deletion blocks duplicate clicks and dismissal, supports retry and refreshes to empty", async () => {
  let resolve!: (value: Response) => void;
  let deleted = false;
  const fetcher = vi
    .fn((_: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        deleted = true;
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(response(deleted ? [] : [robot]));
    })
    .mockResolvedValueOnce(response([robot]))
    .mockReturnValueOnce(
      new Promise<Response>((r) => {
        resolve = r;
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  render(<RobotList />);

  const dialog = await openDeleteAll();
  const confirm = within(dialog).getByRole("button", {
    name: "Delete all robots",
  });
  await act(async () => {
    fireEvent.click(confirm);
    await Promise.resolve();
  });
  await act(async () => {
    fireEvent.click(confirm);
    await Promise.resolve();
  });
  expect(confirm).toBeDisabled();
  expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(dialog).toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledTimes(2);

  act(() => resolve(new Response(null, { status: 500 })));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "Unable to delete all robots. Please try again.",
  );
  expect(screen.getByTestId("robot-row-one")).toBeInTheDocument();
  expect(confirm).toBeEnabled();

  await act(async () => {
    fireEvent.click(confirm);
    await Promise.resolve();
  });
  // The retry starts without the previous attempt's error.
  expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  await screen.findByTestId("fleet-empty");
  await waitFor(() => expect(dialog).not.toBeInTheDocument());
  expect(screen.getByTestId("fleet-notification")).toHaveTextContent(
    "All robots deleted.",
  );
  expect(screen.getByRole("textbox", { name: "Search robots" })).toHaveFocus();
  const deleteCall = [
    "/api/robots",
    {
      method: "DELETE",
      signal: expect.any(AbortSignal) as AbortSignal,
    },
  ];
  expect(
    fetcher.mock.calls.filter(([, init]) => init?.method === "DELETE"),
  ).toEqual([deleteCall, deleteCall]);
});

test("an uncertain delete timeout refreshes the fleet with the dialog still open", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response([robot]))
    .mockRejectedValueOnce(new DOMException("Timed out", "TimeoutError"))
    .mockImplementation(() => Promise.resolve(response([])));
  vi.stubGlobal("fetch", fetcher);
  render(<RobotList />);
  const dialog = await openDelete();
  await act(async () => {
    fireEvent.click(within(dialog).getByTestId("delete-robot-confirm"));
    await Promise.resolve();
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "outcome is uncertain",
  );
  expect(within(dialog).getByTestId("delete-robot-cancel")).toBeEnabled();
  expect(await screen.findByTestId("fleet-empty")).toBeInTheDocument();
  expect(dialog).toBeInTheDocument();
  expect(within(dialog).getByRole("alert")).toHaveTextContent(
    "outcome is uncertain",
  );

  fireEvent.click(within(dialog).getByTestId("delete-robot-cancel"));
  await waitFor(() => expect(dialog).not.toBeInTheDocument());
  expect(screen.getByRole("textbox", { name: "Search robots" })).toHaveFocus();
  expect(
    fetcher.mock.calls.filter(
      (call: unknown[]) => (call[1] as RequestInit)?.method === "DELETE",
    ),
  ).toHaveLength(1);
});

test("deleting all robots from a later page never shows cached rows as current", async () => {
  const cached = { ...robot, id: "cached", name: "Bishop" };
  let deleted = false;
  let releaseFirstPage: ((response: Response) => void) | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        deleted = true;
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      const page = new URL(url, "http://localhost").searchParams.get("page");
      if (!deleted) {
        return Promise.resolve(
          page === "1" ? response([robot], 11, 1) : response([cached], 11),
        );
      }
      if (page === "1") {
        return Promise.resolve(response([], 0, 1));
      }
      // Hold the corrected first page so the cached rows would be visible.
      return new Promise<Response>((resolve) => (releaseFirstPage = resolve));
    }),
  );
  render(<RobotList />);

  await screen.findByTestId("robot-row-cached");
  await act(async () => {
    fireEvent.click(screen.getByTestId("fleet-next-page"));
    await Promise.resolve();
  });
  await screen.findByTestId("robot-row-one");

  const dialog = await openDeleteAll();
  await act(async () => {
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Delete all robots" }),
    );
    await Promise.resolve();
  });
  await waitFor(() => expect(releaseFirstPage).toBeDefined());
  expect(screen.queryByTestId("robot-row-cached")).not.toBeInTheDocument();

  act(() => releaseFirstPage!(response([])));
  expect(await screen.findByTestId("fleet-empty")).toBeInTheDocument();
  expect(screen.getByTestId("fleet-notification")).toHaveTextContent(
    "All robots deleted.",
  );
});
