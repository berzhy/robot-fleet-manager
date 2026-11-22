import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { render } from "@/test/render";
import type { Robot } from "@/modules/robots/robot";
import {
  createRobotBatchSchema,
  createRobotSchema,
} from "@/modules/robots/robot-validation";

import { pageMetadata, testRobot } from "@/test/robots";
import RobotList from "./robot-list";

const robot = testRobot({
  id: "new",
  name: "New robot",
  manufacturer: "Maker",
});
function response(items: Robot[], total = items.length, page = 0) {
  return Response.json({
    items,
    total,
    page,
    pageSize: 10,
    ...pageMetadata(total),
  });
}

function createdResponse(robots: Robot[]) {
  return Response.json({ items: robots }, { status: 201 });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("both add buttons share pending state; empty creation reloads and restores focus", async () => {
  let complete!: (response: Response) => void;
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response([]))
    .mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve;
      }),
    )
    .mockResolvedValueOnce(response([robot]));
  vi.stubGlobal("fetch", fetcher);
  render(<RobotList />);

  await screen.findByTestId("fleet-empty");
  const emptyAdd = screen.getByTestId("fleet-empty-add-robot");
  const toolbarAdd = screen.getByTestId("fleet-add-robot");
  for (const button of [emptyAdd, toolbarAdd]) {
    expect(button).toHaveRole("button");
    expect(button).toHaveAccessibleName("Add robot");
  }

  await act(async () => {
    fireEvent.click(emptyAdd);
    await Promise.resolve();
  });
  await act(async () => {
    fireEvent.click(toolbarAdd);
    await Promise.resolve();
  });
  expect(emptyAdd).toBeDisabled();
  expect(toolbarAdd).toBeDisabled();
  expect(fetcher).toHaveBeenCalledTimes(2);
  const options = fetcher.mock.calls[1][1] as RequestInit;
  expect(fetcher).toHaveBeenNthCalledWith(
    2,
    "/api/robots/batch",
    expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }),
  );
  expect(
    createRobotBatchSchema.safeParse(JSON.parse(options.body as string))
      .success,
  ).toBe(true);

  act(() => complete(createdResponse([robot])));
  await screen.findByTestId("robot-row-new");
  expect(screen.getByTestId("fleet-notification")).toHaveRole("status");
  expect(screen.getByTestId("fleet-notification")).toHaveTextContent(
    "“New robot” added.",
  );
  await waitFor(() =>
    expect(screen.getByTestId("fleet-add-robot")).toHaveFocus(),
  );
  expect(screen.queryByTestId("fleet-empty")).not.toBeInTheDocument();
  expect(
    screen.getByRole("columnheader", { name: "Registered" }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByTestId("robot-row-new")).getByTestId("robot-added-at"),
  ).toHaveAttribute("datetime", robot.createdAt);
});

test.each(["HTTP", "network"])(
  "%s creation failure preserves rows, restores focus and supports another attempt",
  async (kind) => {
    const fetcher = vi.fn().mockResolvedValueOnce(response([robot]));
    if (kind === "HTTP") {
      fetcher.mockResolvedValueOnce(new Response(null, { status: 500 }));
    } else {
      fetcher.mockRejectedValueOnce(new TypeError("Network failed"));
    }
    fetcher
      .mockResolvedValueOnce(response([robot]))
      .mockResolvedValueOnce(createdResponse([robot]))
      .mockResolvedValue(response([robot]));
    vi.stubGlobal("fetch", fetcher);
    render(<RobotList />);

    await screen.findByTestId("robot-row-new");
    const add = screen.getByTestId("fleet-add-robot");
    await act(async () => {
      fireEvent.click(add);
      await Promise.resolve();
    });

    const notice = await screen.findByTestId("fleet-notification");
    expect(notice).toHaveRole("alert");
    expect(notice).toHaveTextContent("Unable to add robot. Please try again.");
    expect(
      within(screen.getByTestId("robot-row-new")).getByTestId("robot-link"),
    ).toBeInTheDocument();
    await waitFor(() => expect(add).toHaveFocus());
    expect(fetcher).toHaveBeenCalledTimes(3);

    await act(async () => {
      fireEvent.click(add);
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(screen.getByTestId("fleet-notification")).toHaveTextContent(
        "“New robot” added.",
      ),
    );
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(5));
  },
);

test("creation locks pagination and deletion, then refreshes the current later page", async () => {
  let complete!: (response: Response) => void;
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response([robot], 11))
    .mockResolvedValueOnce(response([robot], 11, 1))
    .mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve;
      }),
    )
    .mockResolvedValueOnce(response([robot], 12, 1));
  vi.stubGlobal("fetch", fetcher);
  render(<RobotList />);

  await screen.findByTestId("robot-row-new");
  await act(async () => {
    fireEvent.click(screen.getByTestId("fleet-next-page"));
    await Promise.resolve();
  });
  await waitFor(() =>
    expect(screen.getByTestId("fleet-page-summary")).toHaveTextContent(
      "11–11 of 11",
    ),
  );
  await waitFor(() =>
    expect(screen.getByTestId("fleet-add-robot")).toBeEnabled(),
  );

  await act(async () => {
    fireEvent.click(screen.getByTestId("fleet-add-robot"));
    await Promise.resolve();
  });
  expect(screen.getByTestId("fleet-previous-page")).toBeDisabled();
  const actions = within(screen.getByTestId("robot-row-new")).getByTestId(
    "robot-actions",
  );
  vi.spyOn(actions, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 40, 40),
  );
  fireEvent.click(actions);
  expect(await screen.findByTestId("robot-delete")).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

  act(() => complete(createdResponse([robot])));
  await waitFor(() =>
    expect(screen.getByTestId("fleet-notification")).toHaveTextContent(
      "“New robot” added.",
    ),
  );
  await waitFor(() =>
    expect(screen.getByTestId("fleet-add-robot")).toBeEnabled(),
  );
  expect(fetcher).toHaveBeenNthCalledWith(
    4,
    "/api/robots?page=1&pageSize=10",
    expect.anything(),
  );
  expect(screen.getByTestId("fleet-page-summary")).toHaveTextContent(
    "11–12 of 12",
  );
});

test("successful creation followed by failed reload keeps success and restores focus", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(createdResponse([robot]))
      .mockResolvedValueOnce(new Response(null, { status: 500 })),
  );
  render(<RobotList />);

  await screen.findByTestId("fleet-empty");
  await act(async () => {
    fireEvent.click(screen.getByTestId("fleet-empty-add-robot"));
    await Promise.resolve();
  });
  await waitFor(() =>
    expect(screen.getByTestId("fleet-notification")).toHaveTextContent(
      "“New robot” added.",
    ),
  );
  expect(await screen.findByTestId("fleet-refresh-warning")).toHaveTextContent(
    "Live updates interrupted",
  );
  await waitFor(() =>
    expect(screen.getByTestId("fleet-add-robot")).toHaveFocus(),
  );
});

test.each([10, 100])(
  "split button adds %i robots with one batch request and one refresh",
  async (count) => {
    let complete!: (response: Response) => void;
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response([robot]))
      .mockReturnValueOnce(
        new Promise((resolve) => {
          complete = resolve;
        }),
      )
      .mockResolvedValueOnce(response([robot], count + 1));
    vi.stubGlobal("fetch", fetcher);
    render(<RobotList />);

    await screen.findByTestId("robot-row-new");
    const more = screen.getByTestId("fleet-add-options");
    expect(more).toHaveAccessibleName("More add options");
    vi.spyOn(more, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 40, 40),
    );
    await act(async () => {
      fireEvent.click(more);
      await Promise.resolve();
    });
    const option = screen.getByTestId(`fleet-add-robots-${count}`);
    expect(option).toHaveRole("menuitem");
    expect(option).toHaveAccessibleName(`Add ${count} robots`);

    await act(async () => {
      fireEvent.click(option);
      await Promise.resolve();
    });
    expect(more).toBeDisabled();
    expect(screen.getByTestId("fleet-add-robot")).toBeDisabled();
    expect(fetcher).toHaveBeenCalledTimes(2);
    const options = fetcher.mock.calls[1][1] as RequestInit;
    const body = JSON.parse(options.body as string) as { robots: unknown[] };
    expect(body.robots).toHaveLength(count);
    body.robots.forEach((input) =>
      expect(createRobotSchema.safeParse(input).success).toBe(true),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "/api/robots/batch",
      expect.objectContaining({ method: "POST" }),
    );

    act(() =>
      complete(
        Response.json(
          {
            items: Array.from({ length: count }, (_, i) => ({
              ...robot,
              id: String(i),
            })),
          },
          { status: 201 },
        ),
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId("fleet-notification")).toHaveTextContent(
        `${count} robots added.`,
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId("fleet-add-robot")).toHaveFocus(),
    );
    expect(fetcher).toHaveBeenCalledTimes(3);
  },
);

test("batch failure preserves rows and resumes fleet updates", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response([robot]))
    .mockResolvedValueOnce(new Response(null, { status: 500 }))
    .mockResolvedValue(response([robot]));
  vi.stubGlobal("fetch", fetcher);
  render(<RobotList />);

  await screen.findByTestId("robot-row-new");
  const more = screen.getByTestId("fleet-add-options");
  vi.spyOn(more, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 40, 40),
  );
  await act(async () => {
    fireEvent.click(more);
    await Promise.resolve();
  });
  await act(async () => {
    fireEvent.click(screen.getByTestId("fleet-add-robots-10"));
    await Promise.resolve();
  });

  expect(await screen.findByTestId("fleet-notification")).toHaveTextContent(
    "Unable to add robots. Please try again.",
  );
  expect(
    within(screen.getByTestId("robot-row-new")).getByTestId("robot-link"),
  ).toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledTimes(3);
  await waitFor(() => expect(more).toHaveFocus());
});

test("addition outside the selected view retains filters and reports success without revealing the robot", async () => {
  const filtered = () =>
    Response.json({
      items: [],
      total: 0,
      page: 0,
      pageSize: 10,
      ...pageMetadata(1),
    });
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response([robot]))
    .mockResolvedValueOnce(filtered())
    .mockResolvedValueOnce(createdResponse([robot]))
    .mockImplementation(() => Promise.resolve(filtered()));
  vi.stubGlobal("fetch", fetcher);
  render(<RobotList />);

  await screen.findByTestId("robot-row-new");
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Offline$/ }));
    await Promise.resolve();
  });
  await screen.findByText("No robots match these filters.");

  await act(async () => {
    fireEvent.click(screen.getByTestId("fleet-add-robot"));
    await Promise.resolve();
  });
  await waitFor(() =>
    expect(screen.getByTestId("fleet-notification")).toHaveTextContent("added"),
  );
  await waitFor(() =>
    expect(screen.getByTestId("fleet-add-robot")).not.toBeDisabled(),
  );
  expect(
    screen.getByRole("button", { name: /Offline$/, pressed: true }),
  ).toBeVisible();
  expect(screen.getByText("Status: Offline")).toBeVisible();
  expect(screen.queryByTestId("robot-row-new")).not.toBeInTheDocument();
  expect(fetcher).toHaveBeenLastCalledWith(
    expect.stringContaining("view=offline"),
    expect.any(Object),
  );
});

test("an uncertain add timeout unlocks controls, does not retry, and reconciles the committed robot", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response([]))
    .mockRejectedValueOnce(new DOMException("Timed out", "TimeoutError"))
    .mockResolvedValue(response([robot]));
  vi.stubGlobal("fetch", fetcher);
  render(<RobotList />);
  const add = await screen.findByTestId("fleet-empty-add-robot");
  await act(async () => {
    fireEvent.click(add);
    await Promise.resolve();
  });
  expect(await screen.findByTestId("robot-row-new")).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("outcome is uncertain");
  expect(screen.getByTestId("fleet-add-robot")).toBeEnabled();
  expect(
    fetcher.mock.calls.filter(
      (call: unknown[]) => (call[1] as RequestInit)?.method === "POST",
    ),
  ).toHaveLength(1);
});
