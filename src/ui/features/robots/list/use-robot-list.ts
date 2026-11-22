import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import type { RobotListParams } from "../api/robot-list-params";
import { robotListOptions } from "../api/robot-queries";

import { setRobotListPage } from "./robot-list-url";

/** The page of robots the URL asks for. The list screen calls it once and passes the result down. */
export default function useRobotList(params: RobotListParams) {
  // While the next view loads, the previous view's result stays on screen, so
  // the counts, filter options, pager and rows stay in place.
  const query = useQuery({
    ...robotListOptions(params),
    placeholderData: keepPreviousData,
  });

  const { data } = query;
  const lastPage = lastRobotPage(data?.total ?? 0, params.pageSize);
  const page = Math.min(params.page, lastPage);
  const isOutOfRange = Boolean(
    data && !query.isPlaceholderData && params.page > lastPage,
  );

  // Correcting the URL, not just the shown page, keeps polling and shared links
  // on a page that exists.
  useEffect(() => {
    if (isOutOfRange) {
      setRobotListPage(page);
    }
  }, [isOutOfRange, page]);

  return {
    data,
    /** This view's own result has not arrived yet: the previous view's may stand in. */
    isLoading: query.isPending || query.isPlaceholderData,
    loadFailed: query.isLoadingError,
    refreshFailed: query.isRefetchError,
    page,
    refresh: () => void query.refetch(),
  };
}

export type RobotListResult = ReturnType<typeof useRobotList>;

function lastRobotPage(total: number, size: number) {
  return Math.max(0, Math.ceil(total / size) - 1);
}
