import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";

import type { RobotFilters } from "@/common/robots/robot-schemas";
import { robotFilterSearchParams } from "@/common/robots/robot-list-params";

import { robotListOptions } from "../api/robot-queries";

import useRobotListView, { setRobotListPage } from "./use-robot-list-view";

// No local state or effects, so any part of the list can call it; React Query
// shares one request between them. A component that mounts later, such as one
// in a popover, refetches on mount, so it should get the data as props instead.
export default function useRobotList() {
  const client = useQueryClient();
  const view = useRobotListView();

  const options = robotListOptions(view);
  // While the next view loads, the previous view's result stays on screen, so
  // the counts, filter options, pager and rows stay in place.
  const query = useQuery({ ...options, placeholderData: keepPreviousData });

  const { data } = query;
  const page = Math.min(
    view.page,
    lastRobotPage(data?.total ?? 0, view.pageSize),
  );
  const isOutOfRange = Boolean(
    data &&
    !query.isPlaceholderData &&
    view.page > lastRobotPage(data.total, view.pageSize),
  );

  function refresh() {
    void client.invalidateQueries({ queryKey: options.queryKey, exact: true });
  }

  return {
    data,
    /** This view's own result has not arrived yet: the previous view's may stand in. */
    isLoading: query.isPending || query.isPlaceholderData,
    loadFailed: query.isLoadingError,
    refreshFailed: query.isRefetchError,
    page,
    isOutOfRange,
    refresh,
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
  { data, isLoading }: Pick<RobotList, "data" | "isLoading">,
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
  } else if (announced.isWaiting && data && !isLoading) {
    const robots = data.total === 1 ? "robot" : "robots";
    setAnnounced({
      filtersKey,
      text: `${data.total} ${robots} found.`,
      isWaiting: false,
    });
  }

  return announced.text;
}

function lastRobotPage(total: number, size: number) {
  return Math.max(0, Math.ceil(total / size) - 1);
}
