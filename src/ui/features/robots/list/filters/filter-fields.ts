import { integrationTypes, robotTypes } from "@/common/constants";
import { integrationTypeLabels, robotTypeLabels } from "@/common/labels";
import type { RobotFilters } from "@/common/schemas";
import type { FilterOptions } from "@/common/types";

export type FilterField = {
  key: Exclude<keyof RobotFilters, "search" | "view">;
  label: string;
  allLabel: string;
  options: (available: FilterOptions) => readonly string[];
  /** Display names for coded values; other values are shown as they are. */
  optionLabels?: Readonly<Record<string, string>>;
};

export const toolbarFilterFields: FilterField[] = [
  {
    key: "site",
    label: "Location",
    allLabel: "All locations",
    options: (available) => available.sites,
  },
  {
    key: "type",
    label: "Type",
    allLabel: "All types",
    options: () => robotTypes,
    optionLabels: robotTypeLabels,
  },
];

export const moreFilterFields: FilterField[] = [
  {
    key: "manufacturer",
    label: "Manufacturer",
    allLabel: "All manufacturers",
    options: (available) => available.manufacturers,
  },
  {
    key: "integrationType",
    label: "Integration",
    allLabel: "All integrations",
    options: () => integrationTypes,
    optionLabels: integrationTypeLabels,
  },
];

export const fleetViewLabels = {
  all: "All robots",
  "needs-attention": "Needs attention",
  offline: "Offline",
  "low-battery": "Low battery",
} satisfies Record<RobotFilters["view"], string>;

export const searchFieldId = "fleet-search";
export const moreFiltersButtonId = "fleet-more-filters";

export function filterFieldId(key: FilterField["key"]) {
  return `fleet-filter-${key}`;
}

export function fleetViewId(view: RobotFilters["view"]) {
  return `fleet-view-${view}`;
}

/** The control that sets a filter, where focus goes once its chip is removed. */
export function filterControlId(key: keyof RobotFilters) {
  if (key === "search") {
    return searchFieldId;
  }
  if (key === "view") {
    return fleetViewId("all");
  }
  return moreFilterFields.some((field) => field.key === key)
    ? moreFiltersButtonId
    : filterFieldId(key);
}

export function formatFilterValue(field: FilterField, value: string) {
  return field.optionLabels?.[value] ?? value;
}

export type FilterChip = { key: keyof RobotFilters; label: string };

/** One removable chip per applied filter, in the order the controls appear. */
export function getFilterChips(filters: RobotFilters): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.search) {
    chips.push({ key: "search", label: `Search: ${filters.search}` });
  }
  for (const field of [...toolbarFilterFields, ...moreFilterFields]) {
    const value = filters[field.key];
    if (value) {
      chips.push({
        key: field.key,
        label: `${field.label}: ${formatFilterValue(field, value)}`,
      });
    }
  }
  // "Status", not the bare view name, so the chip and the view's toggle button
  // have different accessible names.
  if (filters.view !== "all") {
    chips.push({
      key: "view",
      label: `Status: ${fleetViewLabels[filters.view]}`,
    });
  }

  return chips;
}
