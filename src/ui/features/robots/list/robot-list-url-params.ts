import { useSearchParams } from "next/navigation";

import {
  defaultRobotListParams,
  robotListParamsSchema,
  type RobotFilters,
  type RobotListParams,
} from "@/common/schemas";
import {
  parseSearchParams,
  toSearchParams,
} from "@/ui/utils/search-params-helpers";

/** The query parameters this list owns; any others in the URL are left alone. */
const robotListParamKeys = robotListParamsSchema.keyof().options;

export default function useRobotListParams(): RobotListParams {
  return parseSearchParams(robotListParamsSchema, useSearchParams());
}

export function setRobotListPage(page: number) {
  updateUrl((current) => ({ ...current, page }));
}

export function setRobotListPageSize(pageSize: number) {
  updateUrl((current) => ({ ...current, page: 0, pageSize }));
}

export function setRobotListFilters(changes: Partial<RobotFilters>) {
  updateUrl((current) => ({ ...current, ...changes, page: 0 }));
}

export function clearRobotListFilters() {
  updateUrl(({ pageSize }) => ({ ...defaultRobotListParams, pageSize }));
}

// replaceState updates the URL at once. Reading window.location rather than a
// render's snapshot keeps two changes in one tick from overwriting each other.
function updateUrl(change: (current: RobotListParams) => RobotListParams) {
  const url = new URL(window.location.href);
  const next = change(
    parseSearchParams(robotListParamsSchema, url.searchParams),
  );

  for (const key of robotListParamKeys) {
    url.searchParams.delete(key);
  }
  for (const [key, value] of toSearchParams(robotListParamsSchema, next)) {
    url.searchParams.set(key, value);
  }

  window.history.replaceState(null, "", url);
}
