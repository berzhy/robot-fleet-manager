import { expect, test } from "vitest";

import { getFilterChips } from "./filter-fields";

test("no chips for the full fleet", () => {
  expect(getFilterChips({ view: "all" })).toEqual([]);
});

test("one chip per applied filter, in on-screen order, with display names", () => {
  expect(
    getFilterChips({
      view: "low-battery",
      integrationType: "vendor-api",
      manufacturer: "Acme",
      type: "delivery",
      site: "Berlin",
      search: "unit",
    }),
  ).toEqual([
    { key: "search", label: "Search: unit" },
    { key: "site", label: "Location: Berlin" },
    { key: "type", label: "Type: Delivery robot" },
    { key: "manufacturer", label: "Manufacturer: Acme" },
    { key: "integrationType", label: "Integration: Vendor API" },
    { key: "view", label: "Status: Low battery" },
  ]);
});
