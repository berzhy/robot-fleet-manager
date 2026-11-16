import { expect, test } from "vitest";

import { formatActivity, formatBattery, formatAdded } from "./robot-formatters";

test("battery formatting distinguishes missing data from zero and rounds percentages", () => {
  expect(formatBattery(null)).toBe("Unknown");
  expect(formatBattery(0)).toBe("0%");
  expect(formatBattery(82.6)).toBe("83%");
});

test("activity formatting includes charging and unknown states", () => {
  expect(formatActivity("charging")).toBe("Charging");
  expect(formatActivity("unknown")).toBe("Unknown");
});

test("Added uses a consistent Berlin date and time across server and browser locales", () => {
  expect(formatAdded("2026-11-14T12:34:56.000Z")).toBe(
    "14 Nov 2026, 13:34:56 CET",
  );
  expect(formatAdded("2026-07-14T12:34:56.000Z")).toBe(
    "14 Jul 2026, 14:34:56 CEST",
  );
});
