import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import type { Robot } from "@/modules/robots/robot";
import { createRobotSchema } from "@/modules/robots/robot-validation";

import FleetDashboard from "./fleet-dashboard";

const robot: Robot = {
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
  return Response.json({ items, total, page, pageSize: 20 });
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
  await screen.findByText("No robots available.");
  const buttons = screen.getAllByRole("button", { name: "Add robot" });
  fireEvent.click(buttons[1]);
  fireEvent.click(buttons[0]);
  buttons.forEach((button) => expect(button).toBeDisabled());
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
  await screen.findByRole("link", { name: "New robot" });
  expect(screen.getByText("“New robot” added.")).toBeInTheDocument();
  await waitFor(() =>
    expect(
      screen.getAllByRole("button", { name: "Add robot" })[0],
    ).toHaveFocus(),
  );
  expect(screen.queryByText("No robots available.")).not.toBeInTheDocument();
  expect(
    screen.getByRole("columnheader", { name: "Added" }),
  ).toBeInTheDocument();
  expect(
    screen
      .getByRole("link", { name: "New robot" })
      .closest("tr")
      ?.querySelector("time"),
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
    await screen.findByRole("link", { name: "New robot" });
    const add = screen.getByRole("button", { name: "Add robot" });
    fireEvent.click(add);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to add robot. Please try again.",
    );
    expect(screen.getByRole("link", { name: "New robot" })).toBeInTheDocument();
    await waitFor(() => expect(add).toHaveFocus());
    expect(fetcher).toHaveBeenCalledTimes(3);
    fireEvent.click(add);
    await screen.findByText("“New robot” added.");
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
  await screen.findByRole("link", { name: "New robot" });
  fireEvent.click(screen.getByRole("button", { name: "Go to next page" }));
  await screen.findByText("21–21 of 21");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Add robot" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Add robot" }));
  expect(
    screen.getByRole("button", { name: "Go to previous page" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Actions for New robot" }),
  ).toBeDisabled();
  act(() => complete(Response.json(robot, { status: 201 })));
  await screen.findByText("“New robot” added.");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Add robot" })).toBeEnabled(),
  );
  expect(fetcher).toHaveBeenNthCalledWith(
    4,
    "/api/robots?page=1&pageSize=20",
    expect.anything(),
  );
  expect(screen.getByText("21–22 of 22")).toBeInTheDocument();
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
  await screen.findByText("No robots available.");
  fireEvent.click(screen.getAllByRole("button", { name: "Add robot" })[1]);
  expect(await screen.findByText("“New robot” added.")).toBeInTheDocument();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Live updates interrupted",
  );
  await waitFor(() =>
    expect(
      screen.getAllByRole("button", { name: "Add robot" })[0],
    ).toHaveFocus(),
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
    await screen.findByRole("link", { name: "New robot" });
    const more = screen.getByRole("button", { name: "More add options" });
    vi.spyOn(more, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 40, 40),
    );
    fireEvent.click(more);
    fireEvent.click(
      screen.getByRole("menuitem", { name: `Add ${count} robots` }),
    );
    expect(more).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Add robot", hidden: true }),
    ).toBeDisabled();
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
    expect(
      await screen.findByText(`${count} robots added.`),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: "Add robot" })[0],
      ).toHaveFocus(),
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
  await screen.findByRole("link", { name: "New robot" });
  const more = screen.getByRole("button", { name: "More add options" });
  vi.spyOn(more, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 40, 40),
  );
  fireEvent.click(more);
  fireEvent.click(screen.getByRole("menuitem", { name: "Add 10 robots" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to add robots. Please try again.",
  );
  expect(screen.getByRole("link", { name: "New robot" })).toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledTimes(3);
  await waitFor(() => expect(more).toHaveFocus());
});
