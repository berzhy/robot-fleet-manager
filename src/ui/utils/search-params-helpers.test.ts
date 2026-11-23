import { expect, test } from "vitest";

import { robotListParamsSchema } from "@/common/schemas";
import {
  parseSearchParams,
  toSearchParams,
} from "@/ui/utils/search-params-helpers";

function parse(query: string) {
  return parseSearchParams(robotListParamsSchema, new URLSearchParams(query));
}

test("an empty query is the default view", () => {
  expect(parse("")).toEqual({
    page: 0,
    pageSize: 10,
    view: "all",
  });
});

test("valid values are read and survive a round trip", () => {
  const params = parse(
    "page=2&pageSize=20&view=offline&search=Atlas&site=Munich&manufacturer=Maker&integrationType=ros2&type=inspection",
  );

  expect(params).toEqual({
    page: 2,
    pageSize: 20,
    view: "offline",
    search: "Atlas",
    site: "Munich",
    manufacturer: "Maker",
    integrationType: "ros2",
    type: "inspection",
  });
  expect(
    parseSearchParams(
      robotListParamsSchema,
      toSearchParams(robotListParamsSchema, params),
    ),
  ).toEqual(params);
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
  expect(parse(query)).toEqual({ page: 0, pageSize: 10, ...expected });
});

test("one invalid field keeps the valid ones", () => {
  expect(parse("view=bogus&site=Munich&page=-1&pageSize=50")).toEqual({
    page: 0,
    pageSize: 50,
    view: "all",
    site: "Munich",
  });
});

test("search is trimmed", () => {
  expect(parse("search=%20%20Atlas%20").search).toBe("Atlas");
});

test("the first page at the default size adds nothing to the URL", () => {
  expect(
    toSearchParams(robotListParamsSchema, {
      page: 0,
      pageSize: 10,
      view: "all",
    }).toString(),
  ).toBe("");
  expect(
    toSearchParams(robotListParamsSchema, {
      page: 2,
      pageSize: 20,
      view: "offline",
    }).toString(),
  ).toBe("view=offline&pageSize=20&page=2");
});

test("unset filters are left out and values are encoded", () => {
  expect(
    toSearchParams(robotListParamsSchema, {
      page: 0,
      pageSize: 10,
      view: "low-battery",
      search: "a&b",
      site: undefined,
    }).toString(),
  ).toBe("search=a%26b&view=low-battery");
});
