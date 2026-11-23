import { useSearchParams } from "next/navigation";
import { z } from "zod";

import { fleetViews, robotPageSize } from "@/common/constants";
import {
  robotFiltersSchema,
  robotPageSchema,
  robotPageSizeSchema,
  type RobotFilters,
} from "@/common/schemas";

import {
  robotFilterSearchParams,
  type RobotListParams,
} from "../api/robot-list-params";

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

/** The query parameters this list owns; any others in the URL are left alone. */
const robotListParamKeys = robotListParamsSchema.keyof().options;

/** The search a typed text applies: trimmed, 2–100 characters, otherwise none. */
export function appliedSearch(text: string) {
  return robotFiltersSchema.shape.search.safeParse(text).data;
}

export function parseRobotListParams(
  searchParams: URLSearchParams,
): RobotListParams {
  const { page, pageSize, ...filters } = robotListParamsSchema.parse(
    // A repeated key keeps its last value.
    Object.fromEntries(searchParams),
  );

  return { page, pageSize, filters };
}

/** The view as a short, shareable query: default values are left out. */
export function robotListSearchParams({
  page,
  pageSize,
  filters,
}: RobotListParams) {
  const searchParams = robotFilterSearchParams(filters);

  if (pageSize !== robotPageSize) {
    searchParams.set("pageSize", String(pageSize));
  }
  if (page !== 0) {
    searchParams.set("page", String(page));
  }

  return searchParams;
}

export default function useRobotListParams(): RobotListParams {
  return parseRobotListParams(useSearchParams());
}

export function setRobotListPage(page: number) {
  updateUrl((current) => ({ ...current, page }));
}

export function setRobotListPageSize(pageSize: number) {
  updateUrl((current) => ({ ...current, page: 0, pageSize }));
}

export function setRobotListFilters(changes: Partial<RobotFilters>) {
  updateUrl((current) => ({
    ...current,
    page: 0,
    filters: { ...current.filters, ...changes },
  }));
}

export function clearRobotListFilters() {
  updateUrl((current) => ({ ...current, page: 0, filters: { view: "all" } }));
}

// The native history API, not router.replace: a router navigation re-renders the
// page on the server, while React Query already owns this data. Writes start
// from window.location rather than a render's snapshot because Next re-renders
// URL readers in a later transition, so a second change in the same tick would
// otherwise drop the first.
function updateUrl(change: (current: RobotListParams) => RobotListParams) {
  const searchParams = new URLSearchParams(window.location.search);
  const next = change(parseRobotListParams(searchParams));

  for (const key of robotListParamKeys) {
    searchParams.delete(key);
  }
  for (const [key, value] of robotListSearchParams(next)) {
    searchParams.set(key, value);
  }

  const query = searchParams.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
  );
}
