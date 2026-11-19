import { expect, test } from "vitest";
import { connectionStatus } from "./freshness";
test("connection freshness has explicit boundaries and unknown state", () => {
  const stamp = "2026-01-01T00:00:00.000Z";
  const start = Date.parse(stamp);
  expect(connectionStatus(null, start)).toBe("unknown");
  for (const [age, status] of [
    [0, "online"],
    [10000, "online"],
    [10001, "delayed"],
    [15000, "delayed"],
    [15001, "offline"],
  ] as const) {
    expect(connectionStatus(stamp, start + age)).toBe(status);
  }
});
