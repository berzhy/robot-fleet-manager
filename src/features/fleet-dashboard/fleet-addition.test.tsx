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
import { createRobotSchema } from "@/modules/robots/robot-validation";

import FleetDashboard from "./fleet-dashboard";

const robot: Robot = {
  problemCode: null,
  controlTarget: "work",
  controlRevision: 0,
  appliedControlRevision: 0,
  id: "new",
  name: "New robot",
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
    pageSize: 20,
    ...pageMetadata(total),
  });
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
  render(<FleetDashboard />);
  await screen.findByTestId("fleet-empty");
  const emptyAdd = screen.getByTestId("fleet-empty-add-robot");
  const toolbarAdd = screen.getByTestId("fleet-add-robot");
  for (const button of [emptyAdd, toolbarAdd]) {
    expect(button).toHaveRole("button");
    expect(button).toHaveAccessibleName("Add robot");
  }
  fireEvent.click(emptyAdd);
  fireEvent.click(toolbarAdd);
  expect(emptyAdd).toBeDisabled();
  expect(toolbarAdd).toBeDisabled();
  expect(fetcher).toHaveBeenCalledTimes(2);
  const options = fetcher.mock.calls[1][1] as RequestInit;
  expect(fetcher).toHaveBeenNthCalledWith(
    2,
    "/api/robots",
    expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }),
  );
  expect(
    createRobotSchema.safeParse(JSON.parse(options.body as string)).success,
  ).toBe(true);
  act(() => complete(Response.json(robot, { status: 201 })));
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
    screen.getByRole("columnheader", { name: "Added" }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByTestId("robot-row-new")).getByTestId("robot-added-at"),
  ).toHaveAttribute("datetime", robot.createdAt);
});

test.each(["HTTP", "network"])(
  "%s creation failure preserves rows, restores focus and supports another attempt",
  async (kind) => {
    const fetcher = vi.fn().mockResolvedValueOnce(response([robot]));
    if (kind === "HTTP")
      fetcher.mockResolvedValueOnce(new Response(null, { status: 500 }));
    else fetcher.mockRejectedValueOnce(new TypeError("Network failed"));
    fetcher
      .mockResolvedValueOnce(response([robot]))
      .mockResolvedValueOnce(Response.json(robot, { status: 201 }))
      .mockResolvedValue(response([robot]));
    vi.stubGlobal("fetch", fetcher);
    render(<FleetDashboard />);
    await screen.findByTestId("robot-row-new");
    const add = screen.getByTestId("fleet-add-robot");
    fireEvent.click(add);
    const notice = await screen.findByTestId("fleet-notification");
    expect(notice).toHaveRole("alert");
    expect(notice).toHaveTextContent("Unable to add robot. Please try again.");
    expect(
      within(screen.getByTestId("robot-row-new")).getByTestId("robot-link"),
    ).toBeInTheDocument();
    await waitFor(() => expect(add).toHaveFocus());
    expect(fetcher).toHaveBeenCalledTimes(3);
    fireEvent.click(add);
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
    .mockResolvedValueOnce(response([robot], 21))
    .mockResolvedValueOnce(response([robot], 21, 1))
    .mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve;
      }),
    )
    .mockResolvedValueOnce(response([robot], 22, 1));
  vi.stubGlobal("fetch", fetcher);
  render(<FleetDashboard />);
  await screen.findByTestId("robot-row-new");
  fireEvent.click(screen.getByTestId("fleet-next-page"));
  await waitFor(() =>
    expect(screen.getByTestId("fleet-page-summary")).toHaveTextContent(
      "21–21 of 21",
    ),
  );
  await waitFor(() =>
    expect(screen.getByTestId("fleet-add-robot")).toBeEnabled(),
  );
  fireEvent.click(screen.getByTestId("fleet-add-robot"));
  expect(screen.getByTestId("fleet-previous-page")).toBeDisabled();
  expect(
    within(screen.getByTestId("robot-row-new")).getByTestId("robot-actions"),
  ).toBeDisabled();
  act(() => complete(Response.json(robot, { status: 201 })));
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
    "/api/robots?page=1&pageSize=20",
    expect.anything(),
  );
  expect(screen.getByTestId("fleet-page-summary")).toHaveTextContent(
    "21–22 of 22",
  );
});

test("successful creation followed by failed reload keeps success and restores focus", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(Response.json(robot, { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 })),
  );
  render(<FleetDashboard />);
  await screen.findByTestId("fleet-empty");
  fireEvent.click(screen.getByTestId("fleet-empty-add-robot"));
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
    render(<FleetDashboard />);
    await screen.findByTestId("robot-row-new");
    const more = screen.getByTestId("fleet-add-options");
    expect(more).toHaveAccessibleName("More add options");
    vi.spyOn(more, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 40, 40),
    );
    fireEvent.click(more);
    const option = screen.getByTestId(`fleet-add-robots-${count}`);
    expect(option).toHaveRole("menuitem");
    expect(option).toHaveAccessibleName(`Add ${count} robots`);
    fireEvent.click(option);
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
  render(<FleetDashboard />);
  await screen.findByTestId("robot-row-new");
  const more = screen.getByTestId("fleet-add-options");
  vi.spyOn(more, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 40, 40),
  );
  fireEvent.click(more);
  fireEvent.click(screen.getByTestId("fleet-add-robots-10"));
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
      pageSize: 20,
      ...pageMetadata(1),
    });
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response([robot]))
    .mockResolvedValueOnce(filtered())
    .mockResolvedValueOnce(Response.json(robot, { status: 201 }))
    .mockImplementation(() => Promise.resolve(filtered()));
  vi.stubGlobal("fetch", fetcher);
  render(<FleetDashboard />);
  await screen.findByTestId("robot-row-new");
  fireEvent.click(screen.getByRole("button", { name: "Offline" }));
  await screen.findByText("No robots match these filters.");
  fireEvent.click(screen.getByTestId("fleet-add-robot"));
  await waitFor(() =>
    expect(screen.getByTestId("fleet-notification")).toHaveTextContent("added"),
  );
  await waitFor(() =>
    expect(screen.getByTestId("fleet-add-robot")).not.toBeDisabled(),
  );
  expect(
    screen.getByRole("button", { name: "Offline", pressed: true }),
  ).toBeVisible();
  expect(screen.getByText("Connection: Offline")).toBeVisible();
  expect(screen.queryByTestId("robot-row-new")).not.toBeInTheDocument();
  expect(fetcher).toHaveBeenLastCalledWith(
    expect.stringContaining("view=offline"),
    expect.any(Object),
  );
});
