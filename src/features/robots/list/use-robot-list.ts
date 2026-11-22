import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";

import type { RobotFilters } from "@/modules/robots/robot-filters";
import { robotFilterSearchParams } from "@/modules/robots/robot-list-params";

import { robotListOptions } from "../api/robot-queries";

import useRobotListView, { setRobotListPage } from "./use-robot-list-view";

type RobotListStatus = "loading" | "error" | "success";

// No local state or effects, so any part of the list can call it; React Query
// shares one request between them. A component that mounts later, such as one
// in a popover, refetches on mount, so it should get the data as props instead.
export default function useRobotList() {
  const client = useQueryClient();
  const view = useRobotListView();

  const options = robotListOptions(view);
  // While the next view loads, the previous result keeps the tile counts,
  // filter options and pager in place. Its rows are not shown (status stays
  // "loading"), because they belong to the previous view: a click on one
  // would act on a robot the new view may not include.
  const query = useQuery({ ...options, placeholderData: keepPreviousData });

  const snapshot = query.data;
  const page = Math.min(
    view.page,
    lastRobotPage(snapshot?.total ?? 0, view.pageSize),
  );
  const isOutOfRange = Boolean(
    snapshot &&
    !query.isPlaceholderData &&
    view.page > lastRobotPage(snapshot.total, view.pageSize),
  );

  const status: RobotListStatus =
    isOutOfRange || query.isPlaceholderData
      ? "loading"
      : snapshot
        ? "success"
        : query.isError
          ? "error"
          : "loading";

  function refresh() {
    void client.invalidateQueries({ queryKey: options.queryKey, exact: true });
  }

  return {
    status,
    snapshot,
    page,
    isOutOfRange,
    refresh,
    refreshFailed: query.isRefetchError,
  };
}

type RobotList = ReturnType<typeof useRobotList>;

// Correcting the URL, not just the shown page, keeps polling and shared links
// on a page that exists.
export function useRobotListPageCorrection({
  page,
  isOutOfRange,
}: Pick<RobotList, "page" | "isOutOfRange">) {
  useEffect(() => {
    if (isOutOfRange) {
      setRobotListPage(page);
    }
  }, [isOutOfRange, page]);
}

// Screen readers hear the count after a filter change, not after every poll.
export function useRobotListAnnouncement(
  filters: RobotFilters,
  { status, snapshot }: Pick<RobotList, "status" | "snapshot">,
) {
  const filtersKey = robotFilterSearchParams(filters).toString();

  const [announced, setAnnounced] = useState({
    filtersKey,
    text: "",
    isWaiting: false,
  });

  if (announced.filtersKey !== filtersKey) {
    // Clear at once, so the same count is announced again.
    setAnnounced({ filtersKey, text: "", isWaiting: true });
  } else if (announced.isWaiting && status === "success" && snapshot) {
    const robots = snapshot.total === 1 ? "robot" : "robots";
    setAnnounced({
      filtersKey,
      text: `${snapshot.total} ${robots} found.`,
      isWaiting: false,
    });
  }

  return announced.text;
}

function lastRobotPage(total: number, size: number) {
  return Math.max(0, Math.ceil(total / size) - 1);
}
