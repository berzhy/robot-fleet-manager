import { expect, test } from "vitest";

import {
  batteryTone,
  formatBattery,
  formatRobotTimestamp,
  formatTimeAgo,
} from "./robot-formatters";

test("battery formatting distinguishes missing data from zero and rounds percentages", () => {
  expect(formatBattery(null)).toBe("Unknown");
  expect(formatBattery(0)).toBe("0%");
  expect(formatBattery(82.6)).toBe("83%");
});

test("timestamps use a consistent Berlin date and time across server and browser locales", () => {
  expect(formatRobotTimestamp("2026-11-14T12:34:56.000Z")).toBe(
    "14 Nov 2026, 13:34:56 CET",
  );
  expect(formatRobotTimestamp("2026-07-14T12:34:56.000Z")).toBe(
    "14 Jul 2026, 14:34:56 CEST",
  );
});

test("battery tone follows the Low battery and critical rules, ignoring charging robots", () => {
  expect(
    batteryTone({ batteryPercent: 21, activity: "working" }),
  ).toBeUndefined();
  expect(batteryTone({ batteryPercent: 20, activity: "returning" })).toBe(
    "warning",
  );
  expect(batteryTone({ batteryPercent: 10, activity: "working" })).toBe(
    "error",
  );
  expect(
    batteryTone({ batteryPercent: 5, activity: "charging" }),
  ).toBeUndefined();
  expect(
    batteryTone({ batteryPercent: null, activity: "unknown" }),
  ).toBeUndefined();
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
