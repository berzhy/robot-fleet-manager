import { expect, test } from "vitest";

import { formatRobotTimestamp, formatTimeAgo } from "./time-ago";

test("timestamps use a consistent Berlin date and time across server and browser locales", () => {
  expect(formatRobotTimestamp("2026-11-14T12:34:56.000Z")).toBe(
    "14 Nov 2026, 13:34:56 CET",
  );
  expect(formatRobotTimestamp("2026-07-14T12:34:56.000Z")).toBe(
    "14 Jul 2026, 14:34:56 CEST",
  );
});

test.each([
  [0, "0 sec ago"],
  [59_999, "59 sec ago"],
  [60_000, "1 min ago"],
  [3_599_999, "59 min ago"],
  [3_600_000, "1 hr ago"],
  [86_399_999, "23 hr ago"],
  [86_400_000, "14 Nov 2026"],
  // Stamped after the snapshot time, as connection status also allows.
  [-2_000, "0 sec ago"],
])("a timestamp %i ms old reads %s", (ageMs, expected) => {
  const timestamp = "2026-11-14T12:00:00.000Z";
  expect(formatTimeAgo(timestamp, Date.parse(timestamp) + ageMs)).toBe(
    expected,
  );
});
