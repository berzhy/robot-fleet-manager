import { expect, test } from "vitest";

import { formatBattery } from "./battery";

test("battery formatting distinguishes missing data from zero and rounds percentages", () => {
  expect(formatBattery(null)).toBe("Unknown");
  expect(formatBattery(0)).toBe("0%");
  expect(formatBattery(82.6)).toBe("83%");
});
