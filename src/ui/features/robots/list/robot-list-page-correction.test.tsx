import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { testRobot, testRobotPage } from "@/ui/features/robots/test-robots";
import { render } from "@/ui/test-render";

import { robotListPollIntervalMs } from "../api/robot-queries";

import RobotList from "./robot-list";
import { setRobotListFilters } from "./robot-list-url-params";

const robot = testRobot({ id: "one", name: "Atlas", manufacturer: "Maker" });

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function requestedPage(url: string) {
  return new URL(url, "http://localhost").searchParams.get("page");
}

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

test("an out-of-range page in the URL is corrected to the last page", async () => {
  window.history.replaceState(null, "", "/robots?page=9");
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      Promise.resolve(
        Response.json(
          testRobotPage([robot], {
            total: 15,
            page: Number(requestedPage(url)),
          }),
        ),
      ),
    ),
  );
  render(<RobotList />);

  await waitFor(() => expect(window.location.search).toBe("?page=1"));
  await waitFor(() =>
    expect(screen.getByTestId("fleet-page-summary")).toHaveTextContent(
      "11–15 of 15",
    ),
  );
});

test("zero matching results correct a later page and preserve filters", async () => {
  window.history.replaceState(null, "", "/robots?view=low-battery&page=1");
  const fetcher = vi.fn<(url: string) => Promise<Response>>(() =>
    Promise.resolve(
      Response.json(testRobotPage([], { total: 0, fleetTotal: 21 })),
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  render(<RobotList />);

  await waitFor(() => expect(window.location.search).toBe("?view=low-battery"));
  await waitFor(() =>
    expect(requestedPage(fetcher.mock.lastCall![0])).toBe("0"),
  );
  expect(
    new URL(fetcher.mock.lastCall![0], "http://localhost").searchParams.get(
      "view",
    ),
  ).toBe("low-battery");
});

test("a failed correction keeps the cached page under the corrected pager", async () => {
  vi.useFakeTimers();
  let total = 11;
  let firstPageFails = false;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const page = Number(requestedPage(url));
      return Promise.resolve(
        firstPageFails && page === 0
          ? new Response(null, { status: 500 })
          : Response.json(testRobotPage([robot], { total, page })),
      );
    }),
  );
  render(<RobotList />);
  await tick();
  fireEvent.click(screen.getByTestId("fleet-next-page"));
  await tick();

  total = 10;
  firstPageFails = true;
  await tick(robotListPollIntervalMs);
  await tick();

  expect(window.location.search).toBe("");
  expect(screen.getByTestId("fleet-refresh-warning")).toBeInTheDocument();
  expect(screen.getByTestId("fleet-page-summary")).toHaveTextContent(
    "1–10 of 11",
  );
});

test("a correction after a hidden fleet shrinks verifies the destination page", async () => {
  vi.useFakeTimers();
  window.history.replaceState(null, "", "/robots?page=2");
  let total = 21;
  const fetcher = vi.fn((url: string) =>
    Promise.resolve(
      Response.json(
        testRobotPage([robot], { total, page: Number(requestedPage(url)) }),
      ),
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  render(<RobotList />);
  await tick();
  expect(screen.getByTestId("fleet-page-summary")).toHaveTextContent(
    "21–21 of 21",
  );

  setPageVisibility(true);
  await tick();
  total = 1;
  setPageVisibility(false);
  await tick();
  await tick();

  expect(window.location.search).toBe("");
  expect(screen.getByTestId("fleet-page-summary")).toHaveTextContent(
    "1–1 of 1",
  );
  expect(screen.getByTestId("robot-row-one")).toBeInTheDocument();
  expect(screen.queryByTestId("fleet-refresh-warning")).not.toBeInTheDocument();
  expect(requestedPage(fetcher.mock.lastCall![0])).toBe("0");
});

test("a poll for the previous view does not move a newer filter to its page", async () => {
  vi.useFakeTimers();
  window.history.replaceState(null, "", "/robots?page=3");
  let total = 40;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      Promise.resolve(
        Response.json(
          testRobotPage([robot], { total, page: Number(requestedPage(url)) }),
        ),
      ),
    ),
  );
  render(<RobotList />);
  await tick();

  // Next re-renders URL readers in a later transition: hold that signal.
  const dispatch = window.dispatchEvent.bind(window);
  vi.spyOn(window, "dispatchEvent").mockImplementation((event) =>
    event.type === "test:url-change" ? true : dispatch(event),
  );
  setRobotListFilters({ site: "Munich" });

  total = 25;
  await tick(robotListPollIntervalMs);

  expect(window.location.search).toBe("?site=Munich");
});
