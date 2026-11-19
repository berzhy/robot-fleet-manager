"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { robotFilterSearchParams } from "@/modules/robots/robot-list-params";

import { robotListOptions } from "../api/robot-queries";

import useRobotListView, { setRobotListPage } from "./use-robot-list-view";

export type RobotListStatus = "loading" | "error" | "success";

/**
 * The robot page for the URL's view. No local state or effects, so any part of
 * the list can call it; React Query shares one request between them.
 */
export default function useRobotList() {
  const client = useQueryClient();
  const view = useRobotListView();

  const options = robotListOptions(view);
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

/** Moves the URL to the last page when the current one no longer exists. */
export function useRobotListPageCorrection() {
  const { page, isOutOfRange } = useRobotList();

  useEffect(() => {
    if (isOutOfRange) {
      setRobotListPage(page);
    }
  }, [isOutOfRange, page]);
}

/** The result count to announce after the filters change, not after polls. */
export function useRobotListAnnouncement() {
  const { filters } = useRobotListView();
  const { status, snapshot } = useRobotList();
  const filtersKey = robotFilterSearchParams(filters).toString();

  const [announced, setAnnounced] = useState({ filtersKey, text: "" });

  if (announced.filtersKey !== filtersKey) {
    if (status === "success" && snapshot) {
      const robots = snapshot.total === 1 ? "robot" : "robots";
      setAnnounced({ filtersKey, text: `${snapshot.total} ${robots} found.` });
    } else if (announced.text) {
      // Clear while loading, so the same count is announced again.
      setAnnounced({ ...announced, text: "" });
    }
  }

  return announced.text;
}

function lastRobotPage(total: number, size: number) {
  return Math.max(0, Math.ceil(total / size) - 1);
}
