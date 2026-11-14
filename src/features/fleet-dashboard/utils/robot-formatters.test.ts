import { expect, test } from "vitest";

import { formatActivity, formatBattery } from "./robot-formatters";

test("battery formatting distinguishes missing data from zero and rounds percentages", () => {
  expect(formatBattery(null)).toBe("Unknown");
  expect(formatBattery(0)).toBe("0%");
  expect(formatBattery(82.6)).toBe("83%");
});

test("activity formatting includes charging and unknown states", () => {
  expect(formatActivity("charging")).toBe("Charging");
  expect(formatActivity("unknown")).toBe("Unknown");
});
