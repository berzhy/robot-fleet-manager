import { z } from "zod";

import { robotPageSize } from "./robot";
import {
  fleetViews,
  robotFiltersSchema,
  type RobotFilters,
} from "./robot-filters";
import { robotPageSchema, robotPageSizeSchema } from "./robot-validation";

export type RobotListParams = {
  page: number;
  pageSize: number;
  filters: RobotFilters;
};

// The URL is user input: each invalid field falls back to its default
// instead of failing the whole view.
const robotListParamsSchema = z.object({
  page: robotPageSchema.catch(0),
  pageSize: robotPageSizeSchema.catch(robotPageSize),
  search: robotFiltersSchema.shape.search.catch(undefined),
  site: robotFiltersSchema.shape.site.catch(undefined),
  manufacturer: robotFiltersSchema.shape.manufacturer.catch(undefined),
  integrationType: robotFiltersSchema.shape.integrationType.catch(undefined),
  type: robotFiltersSchema.shape.type.catch(undefined),
  view: z.enum(fleetViews).catch("all"),
});

export function parseRobotListParams(
  searchParams: URLSearchParams,
): RobotListParams {
  const { page, pageSize, ...filters } = robotListParamsSchema.parse(
    // A repeated key keeps its last value.
    Object.fromEntries(searchParams),
  );

  return { page, pageSize, filters };
}

/** Filters as query parameters; the "all" view and empty values are left out. */
export function robotFilterSearchParams(filters: RobotFilters) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && !(key === "view" && value === "all")) {
      searchParams.set(key, value);
    }
  }

  return searchParams;
}
