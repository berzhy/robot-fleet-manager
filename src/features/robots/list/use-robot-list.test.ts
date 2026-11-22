import { act, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { renderHook } from "@/test/render";
import type { RobotPage } from "@/common/types";

import { getRobots } from "../api/robot-api";
import { pageMetadata } from "@/test/robots";
import useRobotList, {
  useRobotListAnnouncement,
  useRobotListPageCorrection,
} from "./use-robot-list";
import useRobotListView, {
  clearRobotListFilters,
  setRobotListFilters,
  setRobotListPage,
  setRobotListPageSize,
} from "./use-robot-list-view";

// The list hooks as RobotList composes them.
function useListUnderTest() {
  const view = useRobotListView();
  const list = useRobotList();
  useRobotListPageCorrection(list);

  return {
    ...view,
    ...list,
    announcement: useRobotListAnnouncement(view.filters, list),
  };
}

vi.mock("../api/robot-api");

afterEach(() => vi.resetAllMocks());

test("aborts old requests and ignores their late responses", async () => {
  let resolveOld!: (page: RobotPage) => void;
  vi.mocked(getRobots)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
    )
    .mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      ...pageMetadata(),
    });
  const { result } = renderHook(() => useListUnderTest());
  const signal = vi.mocked(getRobots).mock.calls[0][1];

  act(() => setRobotListPage(1));
  expect(signal?.aborted).toBe(true);
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  await act(async () => {
    resolveOld({
      items: [],
      total: 100,
      page: 0,
      pageSize: 10,
      ...pageMetadata(),
    });
    await Promise.resolve();
  });
  expect(result.current.data?.total).toBe(0);
  expect(result.current.page).toBe(0);
});

test("page size changes cancel old requests and reload preserves the selection", async () => {
  vi.mocked(getRobots).mockResolvedValue({
    items: [],
    total: 0,
    page: 0,
    pageSize: 20,
    ...pageMetadata(),
  });
  const { result } = renderHook(() => useListUnderTest());
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  act(() => setRobotListPageSize(20));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.pageSize).toBe(20);

  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(getRobots).toHaveBeenLastCalledWith(
    {
      page: 0,
      pageSize: 20,
      filters: {
        view: "all",
      },
    },
    expect.any(AbortSignal),
  );
});

test("failed page correction retains only cached destination data under the corrected pager", async () => {
  vi.mocked(getRobots)
    .mockResolvedValueOnce({
      items: [],
      total: 11,
      page: 0,
      pageSize: 10,
      ...pageMetadata(),
    })
    .mockResolvedValueOnce({
      items: [],
      total: 11,
      page: 1,
      pageSize: 10,
      ...pageMetadata(),
    })
    .mockResolvedValueOnce({
      items: [],
      total: 10,
      page: 1,
      pageSize: 10,
      ...pageMetadata(),
    })
    .mockRejectedValueOnce(new Error("correction failed"));
  const { result } = renderHook(() => useListUnderTest());
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  act(() => setRobotListPage(1));
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.refreshFailed).toBe(true));
  expect(result.current.isLoading).toBe(false);
  expect(result.current.data?.page).toBe(0);
  expect(result.current.page).toBe(0);
  expect(getRobots).toHaveBeenLastCalledWith(
    {
      page: 0,
      pageSize: 10,
      filters: {
        view: "all",
      },
    },
    expect.any(AbortSignal),
  );
});

test("filter changes cancel old scope requests and reset page while retaining page size", async () => {
  let stale!: (value: RobotPage) => void;
  const response = {
    items: [],
    total: 30,
    page: 0,
    pageSize: 10,
    ...pageMetadata(30),
  };
  vi.mocked(getRobots).mockResolvedValue(response);
  const { result } = renderHook(() => useListUnderTest());
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  act(() => setRobotListPageSize(10));
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  vi.mocked(getRobots).mockReturnValueOnce(
    new Promise((resolve) => {
      stale = resolve;
    }),
  );
  act(() => setRobotListPage(2));
  const oldSignal = vi.mocked(getRobots).mock.lastCall![1];
  act(() =>
    setRobotListFilters({
      view: "offline",
      site: "Berlin",
      search: "Boston",
    }),
  );
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(oldSignal?.aborted).toBe(true);
  expect(getRobots).toHaveBeenLastCalledWith(
    {
      page: 0,
      pageSize: 10,
      filters: {
        view: "offline",
        site: "Berlin",
        search: "Boston",
      },
    },
    expect.any(AbortSignal),
  );

  await act(async () => {
    stale({ ...response, total: 999 });
    await Promise.resolve();
  });
  expect(result.current.data?.total).toBe(30);
  expect(result.current.announcement).toBe("30 robots found.");
});

test("zero matching results correct a later page and preserve filters", async () => {
  const response = {
    items: [],
    total: 11,
    page: 0,
    pageSize: 10,
    ...pageMetadata(21),
  };
  vi.mocked(getRobots).mockResolvedValue(response);
  const { result } = renderHook(() => useListUnderTest());
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  act(() => setRobotListFilters({ view: "low-battery" }));
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  act(() => setRobotListPage(1));
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  vi.mocked(getRobots).mockResolvedValue({ ...response, items: [], total: 0 });
  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  await waitFor(() => expect(result.current.page).toBe(0));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.filters.view).toBe("low-battery");
  expect(getRobots).toHaveBeenLastCalledWith(
    {
      page: 0,
      pageSize: 10,
      filters: {
        view: "low-battery",
      },
    },
    expect.any(AbortSignal),
  );
});

test("announces explicit search results but keeps background refreshes quiet", async () => {
  const response = {
    items: [],
    total: 2,
    page: 0,
    pageSize: 10,
    ...pageMetadata(2),
  };
  vi.mocked(getRobots).mockResolvedValue(response);
  const { result } = renderHook(() => useListUnderTest());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.announcement).toBe("");

  act(() => setRobotListFilters({ view: "all", search: "Boston" }));
  await waitFor(() =>
    expect(result.current.announcement).toBe("2 robots found."),
  );

  vi.mocked(getRobots).mockResolvedValue({ ...response, total: 1 });
  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.data?.total).toBe(1));
  expect(result.current.announcement).toBe("2 robots found.");
  expect(result.current.filters.search).toBe("Boston");
});

test("an uncached view keeps the previous result on screen until its own arrives", async () => {
  const initial: RobotPage = {
    items: [],
    total: 30,
    page: 0,
    pageSize: 10,
    ...pageMetadata(30),
  };
  let complete!: (response: RobotPage) => void;
  vi.mocked(getRobots)
    .mockResolvedValueOnce(initial)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );

  const { result } = renderHook(() => useListUnderTest());
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  act(() => setRobotListFilters({ view: "offline" }));

  expect(result.current.isLoading).toBe(true);
  expect(result.current.data?.summary).toEqual(initial.summary);
  expect(result.current.filters.view).toBe("offline");

  await act(async () => {
    complete({ ...initial, total: 5 });
    await Promise.resolve();
  });

  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.data?.total).toBe(5);
});

test("returning to a cached filter shows only that scope and retains it after refresh failure", async () => {
  const initial: RobotPage = {
    items: [],
    total: 30,
    page: 0,
    pageSize: 10,
    ...pageMetadata(30),
  };
  let failRefresh!: (error: Error) => void;
  vi.mocked(getRobots)
    .mockResolvedValueOnce(initial)
    .mockResolvedValueOnce({ ...initial, total: 5 })
    .mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          failRefresh = reject;
        }),
    );

  const { result } = renderHook(() => useListUnderTest());
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  act(() => setRobotListFilters({ view: "offline" }));
  await waitFor(() => expect(result.current.data?.total).toBe(5));

  act(() => setRobotListFilters({ view: "all" }));

  expect(result.current.isLoading).toBe(false);
  expect(result.current.data?.total).toBe(30);
  expect(result.current.filters.view).toBe("all");
  await waitFor(() => expect(getRobots).toHaveBeenCalledTimes(3));

  await act(async () => {
    failRefresh(new Error("offline"));
    await Promise.resolve();
  });

  await waitFor(() => expect(result.current.refreshFailed).toBe(true));
  expect(result.current.isLoading).toBe(false);
  expect(result.current.data?.total).toBe(30);
});

test("equivalent filters do not issue an extra request", async () => {
  vi.mocked(getRobots).mockResolvedValue({
    items: [],
    total: 0,
    page: 0,
    pageSize: 10,
    ...pageMetadata(),
  });
  const { result } = renderHook(() => useListUnderTest());
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  await act(async () => {
    setRobotListFilters({ view: "all" });
    await Promise.resolve();
  });

  expect(getRobots).toHaveBeenCalledTimes(1);
  expect(result.current.isLoading).toBe(false);
});

function emptyPage(total = 0): RobotPage {
  return {
    items: [],
    total,
    page: 0,
    pageSize: 10,
    ...pageMetadata(total),
  };
}

test("the URL's view drives the first request", () => {
  window.history.replaceState(
    null,
    "",
    "/robots?view=offline&site=Munich&pageSize=20&page=1",
  );
  vi.mocked(getRobots).mockResolvedValue(emptyPage(30));

  renderHook(() => useListUnderTest());

  expect(getRobots).toHaveBeenCalledWith(
    { page: 1, pageSize: 20, filters: { view: "offline", site: "Munich" } },
    expect.any(AbortSignal),
  );
});

test("a filter change writes a short URL and returns to the first page", async () => {
  window.history.replaceState(null, "", "/robots?page=2");
  vi.mocked(getRobots).mockResolvedValue(emptyPage(30));
  const { result } = renderHook(() => useListUnderTest());
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  act(() => setRobotListFilters({ view: "offline", search: "Atlas" }));

  expect(window.location.pathname).toBe("/robots");
  expect(window.location.search).toBe("?search=Atlas&view=offline");

  act(() => clearRobotListFilters());

  expect(window.location.search).toBe("");
});

test("two filter changes in the same tick both land", async () => {
  vi.mocked(getRobots).mockResolvedValue(emptyPage());
  const { result } = renderHook(() => useListUnderTest());
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  act(() => {
    setRobotListFilters({ search: "Atlas" });
    setRobotListFilters({ view: "offline" });
  });

  expect(result.current.filters).toEqual({
    view: "offline",
    search: "Atlas",
  });
});

test("an out-of-range page in the URL is corrected to the last page", async () => {
  window.history.replaceState(null, "", "/robots?page=9");
  vi.mocked(getRobots).mockResolvedValue(emptyPage(15));
  const { result } = renderHook(() => useListUnderTest());

  await waitFor(() => expect(window.location.search).toBe("?page=1"));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.page).toBe(1);
});

test("switching filters and back before results load still announces", async () => {
  let finishOffline!: (page: RobotPage) => void;
  vi.mocked(getRobots).mockImplementation(({ filters }) =>
    filters.view === "offline"
      ? new Promise((resolve) => {
          finishOffline = resolve;
        })
      : Promise.resolve(emptyPage(3)),
  );
  const { result } = renderHook(() => useListUnderTest());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.announcement).toBe("");

  act(() => setRobotListFilters({ view: "offline" }));
  act(() => setRobotListFilters({ view: "all" }));

  await waitFor(() =>
    expect(result.current.announcement).toBe("3 robots found."),
  );
  finishOffline(emptyPage());
});

test("a filter change keeps query parameters and the fragment the list does not own", async () => {
  window.history.replaceState(null, "", "/robots?source=bookmark#main-content");
  vi.mocked(getRobots).mockResolvedValue(emptyPage());
  const { result } = renderHook(() => useListUnderTest());
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  act(() => setRobotListFilters({ view: "offline" }));

  expect(window.location.search).toBe("?source=bookmark&view=offline");
  expect(window.location.hash).toBe("#main-content");
});
