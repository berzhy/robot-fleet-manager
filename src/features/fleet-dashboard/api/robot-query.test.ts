import { afterEach, expect, test, vi } from "vitest";

import * as data from "./robot-query";
import { robots } from "./robot-fixtures";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test("mock query delays results and supports success, empty, and error", async () => {
  vi.useFakeTimers();
  let settled = false;
  const success = data.getRobots("success");
  void success.then(() => {
    settled = true;
  });
  const empty = data.getRobots("empty");
  const error = expect(data.getRobots("error")).rejects.toThrow(
    "Unable to load robots.",
  );
  await vi.advanceTimersByTimeAsync(1499);
  expect(settled).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  const result = await success;
  expect(result).toHaveLength(10);
  expect(result[0]).not.toBe(robots[0]);
  expect(await empty).toEqual([]);
  await error;
});

test("details lookup returns the requested robot and handles unknown IDs", () => {
  expect(data.getRobot("robot-01")).toEqual(robots[0]);
  expect(data.getRobot("missing")).toBeUndefined();
});
