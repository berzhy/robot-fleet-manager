"use client";

import { useSearchParams } from "next/navigation";

import type { RobotFilters } from "@/modules/robots/robot-filters";
import {
  parseRobotListParams,
  robotListSearchParams,
  type RobotListParams,
} from "@/modules/robots/robot-list-params";

/** The list's view (filters, page, page size), read from the URL. */
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

// Writes merge into window.location rather than a render's snapshot: Next
// re-renders URL readers after replaceState inside a transition, so a second
// change in the same tick would otherwise drop the first.
function updateView(change: (current: RobotListParams) => RobotListParams) {
  const current = parseRobotListParams(
    new URLSearchParams(window.location.search),
  );
  const query = robotListSearchParams(change(current)).toString();

  window.history.replaceState(
    null,
    "",
    query ? `?${query}` : window.location.pathname,
  );
}
