import { act, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { renderHook } from "@/query/test-utils";
import type { RobotPage } from "@/modules/robots/robot";

import { getRobots } from "../api/robot-api";
import { pageMetadata } from "../test-fixtures";
import useRobotList from "./use-robot-list";

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
  const { result } = renderHook(() => useRobotList());
  const signal = vi.mocked(getRobots).mock.calls[0][2];

  act(() => result.current.setPage(1));
  expect(signal?.aborted).toBe(true);
  await waitFor(() => expect(result.current.status).toBe("success"));

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
  expect(result.current.snapshot?.total).toBe(0);
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
  const { result } = renderHook(() => useRobotList());
  await waitFor(() => expect(result.current.status).toBe("success"));

  act(() => result.current.setPageSize(20));
  await waitFor(() => expect(result.current.status).toBe("success"));
  expect(result.current.pageSize).toBe(20);

  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.status).toBe("success"));
  expect(getRobots).toHaveBeenLastCalledWith(0, 20, expect.any(AbortSignal), {
    view: "all",
  });
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
  const { result } = renderHook(() => useRobotList());
  await waitFor(() => expect(result.current.status).toBe("success"));

  act(() => result.current.setPage(1));
  await waitFor(() => expect(result.current.status).toBe("success"));

  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.interrupted).toBe(true));
  expect(result.current.status).toBe("success");
  expect(result.current.snapshot?.page).toBe(0);
  expect(result.current.page).toBe(0);
  expect(getRobots).toHaveBeenLastCalledWith(0, 10, expect.any(AbortSignal), {
    view: "all",
  });
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
  const { result } = renderHook(() => useRobotList());
  await waitFor(() => expect(result.current.status).toBe("success"));

  act(() => result.current.setPageSize(10));
  await waitFor(() => expect(result.current.status).toBe("success"));

  vi.mocked(getRobots).mockReturnValueOnce(
    new Promise((resolve) => {
      stale = resolve;
    }),
  );
  act(() => result.current.setPage(2));
  const oldSignal = vi.mocked(getRobots).mock.lastCall![2];
  act(() =>
    result.current.setFilters({
      view: "offline",
      site: "Berlin",
      search: "Boston",
    }),
  );
  await waitFor(() => expect(result.current.status).toBe("success"));
  expect(oldSignal?.aborted).toBe(true);
  expect(getRobots).toHaveBeenLastCalledWith(0, 10, expect.any(AbortSignal), {
    view: "offline",
    site: "Berlin",
    search: "Boston",
  });

  await act(async () => {
    stale({ ...response, total: 999 });
    await Promise.resolve();
  });
  expect(result.current.snapshot?.total).toBe(30);
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
  const { result } = renderHook(() => useRobotList());
  await waitFor(() => expect(result.current.status).toBe("success"));

  act(() => result.current.setFilters({ view: "low-battery" }));
  await waitFor(() => expect(result.current.status).toBe("success"));

  act(() => result.current.setPage(1));
  await waitFor(() => expect(result.current.status).toBe("success"));

  vi.mocked(getRobots).mockResolvedValue({ ...response, items: [], total: 0 });
  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.status).toBe("success"));
  await waitFor(() => expect(result.current.page).toBe(0));
  await waitFor(() => expect(result.current.status).toBe("success"));
  expect(result.current.filters.view).toBe("low-battery");
  expect(getRobots).toHaveBeenLastCalledWith(0, 10, expect.any(AbortSignal), {
    view: "low-battery",
  });
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
  const { result } = renderHook(() => useRobotList());
  await waitFor(() => expect(result.current.status).toBe("success"));
  expect(result.current.announcement).toBe("");

  act(() => result.current.setFilters({ view: "all", search: "Boston" }));
  await waitFor(() =>
    expect(result.current.announcement).toBe("2 robots found."),
  );

  vi.mocked(getRobots).mockResolvedValue({ ...response, total: 1 });
  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.snapshot?.total).toBe(1));
  expect(result.current.announcement).toBe("2 robots found.");
  expect(result.current.filters.search).toBe("Boston");
});

test("uncached filters keep summary data while their previous rows remain hidden", async () => {
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

  const { result } = renderHook(() => useRobotList());
  await waitFor(() => expect(result.current.status).toBe("success"));

  act(() => result.current.setFilters({ view: "offline" }));

  expect(result.current.status).toBe("loading");
  expect(result.current.snapshot?.summary).toEqual(initial.summary);
  expect(result.current.filters.view).toBe("offline");

  await act(async () => {
    complete({ ...initial, total: 5 });
    await Promise.resolve();
  });

  await waitFor(() => expect(result.current.status).toBe("success"));
  expect(result.current.snapshot?.total).toBe(5);
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

  const { result } = renderHook(() => useRobotList());
  await waitFor(() => expect(result.current.status).toBe("success"));

  act(() => result.current.setFilters({ view: "offline" }));
  await waitFor(() => expect(result.current.snapshot?.total).toBe(5));

  act(() => result.current.setFilters({ view: "all" }));

  expect(result.current.status).toBe("success");
  expect(result.current.snapshot?.total).toBe(30);
  expect(result.current.filters.view).toBe("all");
  await waitFor(() => expect(getRobots).toHaveBeenCalledTimes(3));

  await act(async () => {
    failRefresh(new Error("offline"));
    await Promise.resolve();
  });

  await waitFor(() => expect(result.current.interrupted).toBe(true));
  expect(result.current.status).toBe("success");
  expect(result.current.snapshot?.total).toBe(30);
});

test("equivalent filters do not issue an extra request", async () => {
  vi.mocked(getRobots).mockResolvedValue({
    items: [],
    total: 0,
    page: 0,
    pageSize: 10,
    ...pageMetadata(),
  });
  const { result } = renderHook(() => useRobotList());
  await waitFor(() => expect(result.current.status).toBe("success"));

  await act(async () => {
    result.current.setFilters({ view: "all" });
    await Promise.resolve();
  });

  expect(getRobots).toHaveBeenCalledTimes(1);
  expect(result.current.status).toBe("success");
});
