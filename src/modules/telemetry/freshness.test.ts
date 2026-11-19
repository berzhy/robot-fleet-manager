import { expect, test } from "vitest";
import { connectionStatus } from "./freshness";
test("connection freshness has explicit boundaries and unknown state", () => {
  const stamp = "2026-01-01T00:00:00.000Z";
  const start = Date.parse(stamp);
  expect(connectionStatus(null, start)).toBe("Unknown");
  for (const [age, status] of [
    [0, "Online"],
    [10000, "Online"],
    [10001, "Delayed"],
    [15000, "Delayed"],
    [15001, "Offline"],
  ] as const) {
    expect(connectionStatus(stamp, start + age)).toBe(status);
  }
});
