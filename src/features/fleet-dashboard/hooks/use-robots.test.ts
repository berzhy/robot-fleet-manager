import { pageMetadata } from "../test-fixtures";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { RobotPage } from "@/modules/robots/robot";
import { getRobots } from "../api/robot-api";
import useRobots from "./use-robots";
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
      pageSize: 20,
      ...pageMetadata(),
    });
  const { result } = renderHook(() => useRobots());
  const signal = vi.mocked(getRobots).mock.calls[0][2];
  act(() => result.current.setPage(1));
  expect(signal?.aborted).toBe(true);
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  await act(async () => {
    resolveOld({
      items: [],
      total: 100,
      page: 0,
      pageSize: 20,
      ...pageMetadata(),
    });
    await Promise.resolve();
  });
  expect(result.current.total).toBe(0);
  expect(result.current.page).toBe(0);
});

test("page size changes cancel old requests and reload preserves the selection", async () => {
  vi.mocked(getRobots).mockResolvedValue({
    items: [],
    total: 0,
    page: 0,
    pageSize: 10,
    ...pageMetadata(),
  });
  const { result } = renderHook(() => useRobots());
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  const oldSignal = vi.mocked(getRobots).mock.calls[0][2];
  act(() => result.current.setPageSize(10));
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  expect(oldSignal?.aborted).toBe(true);
  expect(result.current.pageSize).toBe(10);
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  expect(getRobots).toHaveBeenLastCalledWith(0, 10, expect.any(AbortSignal), {
    view: "all",
  });
});

test("failed page correction never presents previous-page rows under the new pager", async () => {
  vi.mocked(getRobots)
    .mockResolvedValueOnce({
      items: [],
      total: 21,
      page: 0,
      pageSize: 20,
      ...pageMetadata(),
    })
    .mockResolvedValueOnce({
      items: [],
      total: 21,
      page: 1,
      pageSize: 20,
      ...pageMetadata(),
    })
    .mockResolvedValueOnce({
      items: [],
      total: 20,
      page: 1,
      pageSize: 20,
      ...pageMetadata(),
    })
    .mockRejectedValueOnce(new Error("correction failed"));
  const { result } = renderHook(() => useRobots());
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  act(() => result.current.setPage(1));
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.state.status).toBe("error"));
  expect(result.current.page).toBe(0);
  expect(getRobots).toHaveBeenLastCalledWith(0, 20, expect.any(AbortSignal), {
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
  const { result } = renderHook(() => useRobots());
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  act(() => result.current.setPageSize(10));
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  vi.mocked(getRobots).mockReturnValueOnce(
    new Promise((resolve) => {
      stale = resolve;
    }),
  );
  act(() => result.current.setPage(2));
  const oldSignal = vi.mocked(getRobots).mock.lastCall![2];
  act(() => result.current.setFilters({ view: "offline", site: "Berlin" }));
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  expect(oldSignal?.aborted).toBe(true);
  expect(getRobots).toHaveBeenLastCalledWith(0, 10, expect.any(AbortSignal), {
    view: "offline",
    site: "Berlin",
  });
  await act(async () => {
    stale({ ...response, total: 999 });
    await Promise.resolve();
  });
  expect(result.current.total).toBe(30);
});

test("zero matching results correct a later page and preserve filters", async () => {
  const response = {
    items: [],
    total: 21,
    page: 0,
    pageSize: 20,
    ...pageMetadata(21),
  };
  vi.mocked(getRobots).mockResolvedValue(response);
  const { result } = renderHook(() => useRobots());
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  act(() => result.current.setFilters({ view: "low-battery" }));
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  act(() => result.current.setPage(1));
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  vi.mocked(getRobots).mockResolvedValue({ ...response, items: [], total: 0 });
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  await waitFor(() => expect(result.current.page).toBe(0));
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  expect(result.current.filters.view).toBe("low-battery");
  expect(getRobots).toHaveBeenLastCalledWith(0, 20, expect.any(AbortSignal), {
    view: "low-battery",
  });
});
