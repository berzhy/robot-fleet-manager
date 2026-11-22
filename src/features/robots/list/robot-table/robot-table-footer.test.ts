import { expect, test } from "vitest";

import type { RobotFilters } from "@/common/robots/robot-schemas";

import { formatResultCount } from "./robot-table-footer";

test.each<[number, number, RobotFilters, string]>([
  [215, 215, { view: "all" }, "215 robots · Newest first"],
  [
    12,
    12,
    { view: "all", site: "Munich" },
    "12 matching robots · Newest first",
  ],
  [
    3,
    12,
    { view: "needs-attention", site: "Munich" },
    "3 of 12 matching robots · Newest first",
  ],
  [1, 1, { view: "all" }, "1 robot · Newest first"],
])(
  "shows %i results out of %i matching robots",
  (total, matchingTotal, filters, expected) => {
    expect(formatResultCount(total, matchingTotal, filters)).toBe(expected);
  },
);
