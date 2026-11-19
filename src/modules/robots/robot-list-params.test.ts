import { expect, test } from "vitest";

import {
  parseRobotListParams,
  robotFilterSearchParams,
} from "./robot-list-params";

function parse(query: string) {
  return parseRobotListParams(new URLSearchParams(query));
}

test("an empty query is the default view", () => {
  expect(parse("")).toEqual({
    page: 0,
    pageSize: 10,
    filters: { view: "all" },
  });
});

test("valid values are read and survive a round trip", () => {
  const params = parse(
    "page=2&pageSize=20&view=offline&search=Atlas&site=Munich&manufacturer=Maker&integrationType=ros2&type=inspection",
  );

  expect(params).toEqual({
    page: 2,
    pageSize: 20,
    filters: {
      view: "offline",
      search: "Atlas",
      site: "Munich",
      manufacturer: "Maker",
      integrationType: "ros2",
      type: "inspection",
    },
  });
  expect(
    parseRobotListParams(robotFilterSearchParams(params.filters)).filters,
  ).toEqual(params.filters);
});

test.each([
  ["page=-3", { page: 0 }],
  ["page=1e3", { page: 0 }],
  ["page=abc", { page: 0 }],
  ["pageSize=20junk", { pageSize: 10 }],
  ["pageSize=15", { pageSize: 10 }],
])("an invalid %s falls back to its default", (query, expected) => {
  expect(parse(query)).toMatchObject(expected);
});

test.each([
  ["view=bogus", { view: "all" }],
  ["search=a", { view: "all" }],
  [`site=${"x".repeat(101)}`, { view: "all" }],
  ["type=drone", { view: "all" }],
])("an invalid filter %s is dropped", (query, expected) => {
  expect(parse(query).filters).toEqual(expected);
});

test("one invalid field keeps the valid ones", () => {
  expect(parse("view=bogus&site=Munich&page=-1&pageSize=50")).toEqual({
    page: 0,
    pageSize: 50,
    filters: { view: "all", site: "Munich" },
  });
});

test("search is trimmed", () => {
  expect(parse("search=%20%20Atlas%20").filters.search).toBe("Atlas");
});

test("the all view and empty filters are left out of the query", () => {
  expect(
    robotFilterSearchParams({ view: "all", site: undefined }).toString(),
  ).toBe("");
  expect(
    robotFilterSearchParams({ view: "low-battery", search: "a&b" }).toString(),
  ).toBe("view=low-battery&search=a%26b");
});
