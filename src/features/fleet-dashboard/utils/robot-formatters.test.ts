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

test("Added shows localized date and time", () => {
  const timestamp = "2026-11-14T12:00:00.000Z";
  expect(formatAdded(timestamp)).toBe(
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp)),
  );
});
