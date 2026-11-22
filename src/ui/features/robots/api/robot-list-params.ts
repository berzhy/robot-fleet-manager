import { robotFiltersSchema, type RobotFilters } from "@/common/schemas";

/** One page of the robot list, as the list API takes it. */
export type RobotListParams = {
  page: number;
  pageSize: number;
  filters: RobotFilters;
};

/** Filters as query parameters; the "all" view and unset filters are left out. */
export function robotFilterSearchParams(filters: RobotFilters) {
  const searchParams = new URLSearchParams();

  // Schema order, so the same view always gives the same URL.
  for (const key of robotFiltersSchema.keyof().options) {
    const value = filters[key];
    if (value !== undefined && !(key === "view" && value === "all")) {
      searchParams.set(key, value);
    }
  }

  return searchParams;
}
