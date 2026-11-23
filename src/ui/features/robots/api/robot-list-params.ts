import { robotFiltersSchema, type RobotFilters } from "@/common/schemas";

export type RobotListParams = {
  page: number;
  pageSize: number;
  filters: RobotFilters;
};

/** The "all" view and unset filters are left out. */
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
