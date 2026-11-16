import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import useReportClock from "./use-report-clock";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test("clock suspends hidden-tab updates, refreshes on return, and cleans up", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  const { result, unmount } = renderHook(() => useReportClock());

  act(() => {
    vi.advanceTimersByTime(1000);
  });
  const visibleTime = result.current;

  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  act(() => {
    vi.advanceTimersByTime(10000);
  });
  expect(result.current).toBe(visibleTime);

  hidden.mockReturnValue(false);
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(result.current).toBe(visibleTime + 10000);

  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
