"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import type { RobotFilters } from "@/modules/robots/robot-filters";
import {
  parseRobotListParams,
  robotListSearchParams,
  type RobotListParams,
} from "@/modules/robots/robot-list-params";

import { robotListOptions } from "../api/robot-queries";

export type RobotListStatus = "loading" | "error" | "success";

function lastRobotPage(total: number, size: number) {
  return Math.max(0, Math.ceil(total / size) - 1);
}

export default function useRobotList() {
  const client = useQueryClient();

  const request = parseRobotListParams(useSearchParams());

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

  if (query.data && !query.isPlaceholderData && announce) {
    setAnnouncement(
      `${query.data.total} ${query.data.total === 1 ? "robot" : "robots"} found.`,
    );
    setAnnounce(false);
  }

  useEffect(() => {
    if (outOfRange) {
      updateRequest((current) => ({ ...current, page }));
    }
  }, [outOfRange, page]);

  function refresh() {
    void client.invalidateQueries({
      queryKey: options.queryKey,
      exact: true,
    });
  }

  function announceNextResult() {
    setAnnounce(true);
    setAnnouncement("");
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
      updateRequest((current) => ({ ...current, page })),
    setPageSize: (pageSize: number) =>
      updateRequest((current) => ({ ...current, page: 0, pageSize })),
    setFilters: (changes: Partial<RobotFilters>) => {
      announceNextResult();
      updateRequest((current) => ({
        ...current,
        page: 0,
        filters: { ...current.filters, ...changes },
      }));
    },
    clearFilters: () => {
      announceNextResult();
      updateRequest((current) => ({
        ...current,
        page: 0,
        filters: { view: "all" },
      }));
    },
    refresh,
    refreshFailed: query.isRefetchError,
    snapshot,
    filters: request.filters,
  };
}

// The URL is the list's state. Changes merge into window.location rather than
// this render's snapshot: Next re-renders after replaceState inside a
// transition, so a second change in the same tick would otherwise drop the first.
function updateRequest(change: (current: RobotListParams) => RobotListParams) {
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
