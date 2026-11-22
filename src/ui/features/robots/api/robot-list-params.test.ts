import { expect, test } from "vitest";

import { robotFilterSearchParams } from "./robot-list-params";

test("the all view and empty filters are left out of the query", () => {
  expect(
    robotFilterSearchParams({ view: "all", site: undefined }).toString(),
  ).toBe("");
  expect(
    robotFilterSearchParams({ view: "low-battery", search: "a&b" }).toString(),
  ).toBe("search=a%26b&view=low-battery");
});
