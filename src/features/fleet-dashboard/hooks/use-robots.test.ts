import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import * as data from "../api/robot-query";
import type { Robot } from "../types/robot";
import useRobots from "./use-robots";

afterEach(() => vi.restoreAllMocks());

test("late responses cannot overwrite a newly selected scenario", async () => {
  let resolveOld: (robots: Robot[]) => void = () => {};
  const oldRequest = new Promise<Robot[]>((resolve) => {
    resolveOld = resolve;
  });
  vi.spyOn(data, "getRobots")
    .mockReturnValueOnce(oldRequest)
    .mockResolvedValueOnce([]);
  const { result } = renderHook(() => useRobots());
  expect(result.current.state.status).toBe("loading");
  act(() => result.current.setScenario("empty"));
  await waitFor(() =>
    expect(result.current.state).toEqual({ status: "success", robots: [] }),
  );
  await act(async () => {
    resolveOld([
      {
        id: "old",
        name: "Old robot",
        manufacturer: "Test",
        site: "Munich",
        area: null,
        activity: "idle",
        batteryPercent: 50,
      },
    ]);
    await oldRequest;
  });
  expect(result.current.state).toEqual({ status: "success", robots: [] });
});
