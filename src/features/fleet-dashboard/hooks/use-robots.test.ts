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
    .mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20 });
  const { result } = renderHook(() => useRobots());
  const signal = vi.mocked(getRobots).mock.calls[0][2];
  act(() => result.current.setPage(1));
  expect(signal?.aborted).toBe(true);
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  await act(async () => {
    resolveOld({ items: [], total: 100, page: 0, pageSize: 20 });
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
  expect(getRobots).toHaveBeenLastCalledWith(0, 10, expect.any(AbortSignal));
});

test("failed page correction never presents previous-page rows under the new pager", async () => {
  vi.mocked(getRobots)
    .mockResolvedValueOnce({ items: [], total: 21, page: 0, pageSize: 20 })
    .mockResolvedValueOnce({ items: [], total: 21, page: 1, pageSize: 20 })
    .mockResolvedValueOnce({ items: [], total: 20, page: 1, pageSize: 20 })
    .mockRejectedValueOnce(new Error("correction failed"));
  const { result } = renderHook(() => useRobots());
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  act(() => result.current.setPage(1));
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.state.status).toBe("error"));
  expect(result.current.page).toBe(0);
  expect(getRobots).toHaveBeenLastCalledWith(0, 20, expect.any(AbortSignal));
});
