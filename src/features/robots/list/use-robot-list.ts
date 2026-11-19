"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";

import { robotPageSize } from "@/modules/robots/robot";
import type { RobotFilters } from "@/modules/robots/robot-filters";
import type { RobotListParams } from "@/modules/robots/robot-list-params";

import { robotListOptions } from "../api/robot-queries";

export type RobotListStatus = "loading" | "error" | "success";

function lastRobotPage(total: number, size: number) {
  return Math.max(0, Math.ceil(total / size) - 1);
}

export default function useRobotList() {
  const client = useQueryClient();

  const [request, setRequest] = useState<RobotListParams>({
    page: 0,
    pageSize: robotPageSize,
    filters: { view: "all" },
  });

  const options = robotListOptions(request);

  const [announcement, setAnnouncement] = useState("");
  const [announce, setAnnounce] = useState(false);

  const query = useQuery({ ...options, placeholderData: keepPreviousData });

  const snapshot = query.data;
  const total = snapshot?.total ?? 0;
  const page = Math.min(request.page, lastRobotPage(total, request.pageSize));
  const outOfRange = Boolean(
    !query.isPlaceholderData &&
    query.data &&
    request.page > lastRobotPage(query.data.total, request.pageSize),
  );

  if (outOfRange) {
    setRequest((previous) => ({ ...previous, page }));
  } else if (query.data && !query.isPlaceholderData && announce) {
    setAnnouncement(
      `${query.data.total} ${query.data.total === 1 ? "robot" : "robots"} found.`,
    );
    setAnnounce(false);
  }

  function refresh() {
    void client.invalidateQueries({
      queryKey: options.queryKey,
      exact: true,
    });
  }

  const status: RobotListStatus =
    outOfRange || query.isPlaceholderData
      ? "loading"
      : snapshot
        ? "success"
        : query.isError
          ? "error"
          : "loading";

  return {
    status,
    announcement,
    page,
    pageSize: request.pageSize,
    setPage: (page: number) =>
      setRequest((previous) => ({ ...previous, page })),
    setPageSize: (pageSize: number) =>
      setRequest((previous) => ({ ...previous, page: 0, pageSize })),
    setFilters: (filters: RobotFilters) => {
      setAnnounce(true);
      setAnnouncement("");
      setRequest((previous) => ({ ...previous, page: 0, filters }));
    },
    refresh,
    refreshFailed: query.isRefetchError,
    snapshot,
    filters: request.filters,
  };
}
