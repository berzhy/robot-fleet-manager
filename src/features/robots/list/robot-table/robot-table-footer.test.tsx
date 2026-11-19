import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import type { RobotFilters } from "@/modules/robots/robot-filters";

import { pageMetadata } from "../../test-fixtures";

import RobotTableFooter from "./robot-table-footer";

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
    render(
      <RobotTableFooter
        snapshot={{ total, summary: pageMetadata(matchingTotal).summary }}
        filters={filters}
        showResultCount
        page={0}
        pageSize={10}
        onPageSizeChange={() => {}}
        onPageChange={() => {}}
        paginationDisabled={false}
      />,
    );

    expect(screen.getByTestId("fleet-result-count")).toHaveTextContent(
      expected,
    );
  },
);
