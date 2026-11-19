import { expect, test } from "vitest";

import {
  formatActivity,
  formatBattery,
  formatRobotTimestamp,
  formatAddedParts,
  formatResultCount,
} from "./robot-formatters";

test("battery formatting distinguishes missing data from zero and rounds percentages", () => {
  expect(formatBattery(null)).toBe("Unknown");
  expect(formatBattery(0)).toBe("0%");
  expect(formatBattery(82.6)).toBe("83%");
});

test("activity formatting includes charging and unknown states", () => {
  expect(formatActivity("charging")).toBe("Charging");
  expect(formatActivity("unknown")).toBe("Unknown");
});

test("Registered uses a consistent Berlin date and time across server and browser locales", () => {
  expect(formatRobotTimestamp("2026-11-14T12:34:56.000Z")).toBe(
    "14 Nov 2026, 13:34:56 CET",
  );
  expect(formatRobotTimestamp("2026-07-14T12:34:56.000Z")).toBe(
    "14 Jul 2026, 14:34:56 CEST",
  );
});

test("Registered parts split the same Berlin date and time for two-line display", () => {
  const parts = formatAddedParts("2026-11-14T12:34:56.000Z");
  expect(parts).toEqual({ date: "14 Nov 2026", time: "13:34:56 CET" });
  expect(`${parts.date}, ${parts.time}`).toBe(
    formatRobotTimestamp("2026-11-14T12:34:56.000Z"),
  );
});

test("result count describes the selected view within the matching scope", () => {
  expect(formatResultCount(215, 215, { view: "all" })).toBe(
    "215 robots · Newest first",
  );
  expect(formatResultCount(12, 12, { view: "all", site: "Munich" })).toBe(
    "12 matching robots · Newest first",
  );
  expect(
    formatResultCount(3, 12, { view: "needs-attention", site: "Munich" }),
  ).toBe("3 of 12 matching robots · Newest first");
  expect(formatResultCount(1, 1, { view: "all" })).toBe(
    "1 robot · Newest first",
  );
});
