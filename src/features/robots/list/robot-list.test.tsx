import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Activity } from "react";
import { afterEach, expect, test, vi } from "vitest";

import { render } from "@/query/test-utils";
import type { Robot, RobotPage } from "@/modules/robots/robot";

import { pageMetadata } from "../test-fixtures";
import RobotList from "./robot-list";

const robot: Robot = {
  problemCode: null,
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
  queuedControlTarget: null,
  lastReceivedAt: null,
  createdAt: "2026-11-14T12:00:00.000Z",
};

const page = (items: Robot[], total = items.length, index = 0): RobotPage => ({
  items,
  total,
  page: index,
  pageSize: 10,
  ...pageMetadata(total),
});

afterEach(() => vi.unstubAllGlobals());

test("renders the API response with accessible loading status", async () => {
  let resolve!: (response: Response) => void;
  const fetcher = vi.fn().mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  render(<RobotList />);

  const status = screen.getByRole("status", {
    name: "Robot list loading status",
  });
  expect(status).toHaveTextContent("Loading robots");
  expect(status.closest("[aria-busy]")).toBeNull();

  act(() => resolve(Response.json(page([robot]))));
  expect(
    within(await screen.findByTestId("robot-row-one")).getByTestId(
      "robot-link",
    ),
  ).toHaveAttribute("href", "/robots/one");
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
  render(<RobotList />);

  expect(await screen.findByTestId("fleet-load-error")).toHaveTextContent(
    "Unable to load robots",
  );

  fireEvent.click(screen.getByTestId("fleet-retry"));
  const empty = await screen.findByTestId("fleet-empty");
  expect(empty).toHaveRole("status");
  expect(empty).toHaveTextContent("No robots available.");
});

test.each(["Clear search", "Clear filters"])(
  "%s returns focus to search from the no-results view",
  async (name) => {
    const noMatches = { ...page([]), fleetTotal: 1 };
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        const { searchParams } = new URL(url, "http://localhost");
        const result = searchParams.has("search") ? noMatches : page([robot]);
        return Promise.resolve(Response.json(result));
      }),
    );
    render(<RobotList />);
    await screen.findByTestId("robot-row-one");

    const search = screen.getByRole("textbox", { name: "Search robots" });
    fireEvent.change(search, { target: { value: "missing" } });

    const noResults = await screen.findByTestId("fleet-no-results");
    const reset = within(noResults).getByRole("button", { name });
    reset.focus();
    expect(reset).toHaveFocus();

    fireEvent.click(reset);

    expect(await screen.findByTestId("robot-row-one")).toBeVisible();
    expect(reset).not.toBeInTheDocument();
    expect(search).toHaveValue("");
    expect(search).toHaveFocus();
  },
);

test("requests pages and keeps the pager mounted while loading", async () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({
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
  render(<RobotList />);

  await screen.findByTestId("robot-row-0");
  const next = screen.getByTestId("fleet-next-page");
  fireEvent.click(next);
  expect(next).toBeInTheDocument();
  expect(next).toBeDisabled();

  act(() =>
    resolve(Response.json(page([{ ...robot, name: "Last robot" }], 21, 1))),
  );
  await waitFor(() =>
    expect(
      within(screen.getByTestId("robot-row-one")).getByTestId("robot-name"),
    ).toHaveTextContent("Last robot"),
  );
  expect(fetcher).toHaveBeenNthCalledWith(
    2,
    "/api/robots?page=1&pageSize=10",
    expect.objectContaining({ cache: "no-store" }),
  );
});

test("changing rows per page resets to the first page and requests the selected size", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(page([robot], 21)))
    .mockResolvedValueOnce(Response.json(page([robot], 21, 1)))
    .mockResolvedValueOnce(
      Response.json({
        items: [robot],
        total: 21,
        page: 0,
        pageSize: 50,
        ...pageMetadata(21),
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  render(<RobotList />);

  await screen.findByTestId("robot-row-one");
  fireEvent.click(screen.getByTestId("fleet-next-page"));
  await waitFor(() =>
    expect(screen.getByTestId("fleet-page-summary")).toHaveTextContent(
      "11–20 of 21",
    ),
  );
  await screen.findByTestId("robot-row-one");

  const size = screen.getByTestId("fleet-page-size");
  expect(size).toHaveRole("combobox");
  expect(size).toHaveAccessibleName(/Rows per page/);
  fireEvent.mouseDown(size);
  expect(
    screen.getAllByRole("option").map((option) => option.textContent),
  ).toEqual(["10", "20", "50"]);

  fireEvent.click(screen.getByRole("option", { name: "50" }));
  await waitFor(() =>
    expect(screen.getByTestId("fleet-page-summary")).toHaveTextContent(
      "1–21 of 21",
    ),
  );
  expect(fetcher).toHaveBeenNthCalledWith(
    3,
    "/api/robots?page=0&pageSize=50",
    expect.anything(),
  );
  expect(screen.getByTestId("fleet-previous-page")).toBeDisabled();
});

test("switching summary tiles preserves counts while refreshing and updates them on completion", async () => {
  let finish!: (response: Response) => void;
  const initial = {
    ...page([robot]),
    summary: { all: 10, "needs-attention": 3, offline: 2, "low-battery": 4 },
  };
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(initial))
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
  vi.stubGlobal("fetch", fetcher);
  render(<RobotList />);

  const tiles = screen.getByRole("group", { name: "Robot status filters" });
  const all = within(tiles).getByRole("button", {
    name: /All robots$/,
  });
  const offline = within(tiles).getByRole("button", {
    name: /Offline$/,
  });
  await waitFor(() => expect(all).toHaveTextContent("10"));

  fireEvent.click(offline);

  expect(tiles).toHaveAttribute("aria-busy", "true");
  expect(all).toHaveTextContent("10");
  expect(offline).toHaveTextContent("2");
  expect(offline).toHaveAttribute("aria-pressed", "true");
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

  await act(async () => {
    finish(
      Response.json({
        ...initial,
        summary: { ...initial.summary, all: 11, offline: 3 },
      }),
    );
    await Promise.resolve();
  });

  await waitFor(() => expect(tiles).toHaveAttribute("aria-busy", "false"));
  expect(all).toHaveTextContent("11");
  expect(offline).toHaveTextContent("3");
});

test("a shared search link fills the search box and keeps its search", async () => {
  window.history.replaceState(null, "", "/robots?search=Atlas&view=offline");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(Response.json(page([robot])))),
  );
  render(<RobotList />);

  await screen.findByTestId("robot-row-one");
  expect(screen.getByRole("textbox", { name: "Search robots" })).toHaveValue(
    "Atlas",
  );

  // Longer than the search debounce: the draft must not clear the URL's search.
  await act(() => new Promise((resolve) => setTimeout(resolve, 400)));

  expect(window.location.search).toBe("?search=Atlas&view=offline");
  expect(screen.getByText("Search: Atlas")).toBeVisible();
});

async function waitPastSearchDebounce() {
  await act(() => new Promise((resolve) => setTimeout(resolve, 400)));
}

test("the search box follows a search change from outside", async () => {
  window.history.replaceState(null, "", "/robots?search=Atlas");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(Response.json(page([robot])))),
  );
  render(<RobotList />);
  const box = screen.getByRole("textbox", { name: "Search robots" });
  expect(box).toHaveValue("Atlas");

  // A link to the plain list, as the back link on details does.
  act(() => window.history.replaceState(null, "", "/robots"));

  expect(box).toHaveValue("");
  await waitPastSearchDebounce();
  expect(window.location.search).toBe("");
});

test("unsent search text is dropped while the list is hidden", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(Response.json(page([robot])))),
  );
  const { rerender } = render(
    <Activity mode="visible">
      <RobotList />
    </Activity>,
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Search robots" }), {
    target: { value: "Zed" },
  });

  // Leave before the debounce applies it, then come back.
  rerender(
    <Activity mode="hidden">
      <RobotList />
    </Activity>,
  );
  rerender(
    <Activity mode="visible">
      <RobotList />
    </Activity>,
  );
  await waitPastSearchDebounce();

  expect(screen.getByRole("textbox", { name: "Search robots" })).toHaveValue(
    "",
  );
  expect(window.location.search).toBe("");
});

test("applying a search keeps the typed text, including a trailing space", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(Response.json(page([robot])))),
  );
  render(<RobotList />);
  const box = screen.getByRole("textbox", { name: "Search robots" });

  fireEvent.change(box, { target: { value: "Robot " } });
  await waitPastSearchDebounce();

  expect(window.location.search).toBe("?search=Robot");
  expect(box).toHaveValue("Robot ");
});

test("typing while an applied search reaches the router is kept", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(Response.json(page([robot])))),
  );
  render(<RobotList />);
  const box = screen.getByRole("textbox", { name: "Search robots" });

  // Hold the router's URL-change signal, as Next delivers it in a later transition.
  const dispatch = window.dispatchEvent.bind(window);
  const held: Event[] = [];
  const spy = vi
    .spyOn(window, "dispatchEvent")
    .mockImplementation((event) =>
      event.type === "test:url-change"
        ? (held.push(event), true)
        : dispatch(event),
    );

  fireEvent.change(box, { target: { value: "Atl" } });
  await waitPastSearchDebounce();
  expect(window.location.search).toBe("?search=Atl");

  fireEvent.change(box, { target: { value: "Atla" } });
  spy.mockRestore();
  act(() => held.forEach((event) => window.dispatchEvent(event)));

  expect(box).toHaveValue("Atla");
});

test("an outside change clears a draft too short to apply", () => {
  window.history.replaceState(null, "", "/robots?search=Atlas");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(Response.json(page([robot])))),
  );
  render(<RobotList />);
  const box = screen.getByRole("textbox", { name: "Search robots" });

  fireEvent.change(box, { target: { value: "A" } });
  act(() => window.history.replaceState(null, "", "/robots"));

  expect(box).toHaveValue("");
});
