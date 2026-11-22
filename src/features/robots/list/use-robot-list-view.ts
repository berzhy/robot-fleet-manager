"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import type { RobotFilters } from "@/modules/robots/robot-filters";
import {
  parseRobotListParams,
  robotListParamKeys,
  robotListSearchParams,
  type RobotListParams,
} from "@/modules/robots/robot-list-params";

// The list's query as the user last left it in this tab, so the way back from a
// robot returns there. In memory only: a reload or a shared robot link opens
// the full list, and the server never sets it.
let lastListQuery = "";

export default function useRobotListView(): RobotListParams {
  return parseRobotListParams(useSearchParams());
}

/** Remembers the list's view for robotListHref; the list page calls it once. */
export function useRememberRobotListView() {
  const query = useSearchParams().toString();
  useEffect(() => {
    lastListQuery = query;
  }, [query]);
}

/** The robot list as the user last left it, for links back from a robot. */
export function robotListHref() {
  return lastListQuery ? `/robots?${lastListQuery}` : "/robots";
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
