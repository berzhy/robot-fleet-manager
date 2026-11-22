import { useSearchParams } from "next/navigation";

import type { RobotFilters } from "@/modules/robots/robot-filters";
import {
  parseRobotListParams,
  robotListParamKeys,
  robotListSearchParams,
  type RobotListParams,
} from "@/modules/robots/robot-list-params";

export default function useRobotListView(): RobotListParams {
  return parseRobotListParams(useSearchParams());
}

export function setRobotListPage(page: number) {
  updateView((current) => ({ ...current, page }));
}

export function setRobotListPageSize(pageSize: number) {
  updateView((current) => ({ ...current, page: 0, pageSize }));
}

export function setRobotListFilters(changes: Partial<RobotFilters>) {
  updateView((current) => ({
    ...current,
    page: 0,
    filters: { ...current.filters, ...changes },
  }));
}

export function clearRobotListFilters() {
  updateView((current) => ({ ...current, page: 0, filters: { view: "all" } }));
}

// The native history API, not router.replace: a router navigation re-renders the
// page on the server, while React Query already owns this data. Writes start
// from window.location rather than a render's snapshot because Next re-renders
// URL readers in a later transition, so a second change in the same tick would
// otherwise drop the first.
function updateView(change: (current: RobotListParams) => RobotListParams) {
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
