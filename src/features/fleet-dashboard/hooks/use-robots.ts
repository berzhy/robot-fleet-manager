"use client";

import {
  hashKey,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import type { RobotFilters } from "@/modules/robots/robot-filters";
import { robotPageSize, type RobotPage } from "@/modules/robots/robot";

import { robotListOptions } from "../api/robot-queries";
import type { RobotQueryState } from "../types/robot-query-state";

function lastRobotPage(total: number, size: number) {
  return Math.max(0, Math.ceil(total / size) - 1);
}

export default function useRobots(paused = false) {
  const client = useQueryClient();

  const [request, setRequest] = useState<{
    page: number;
    pageSize: number;
    filters: RobotFilters;
  }>({
    page: 0,
    pageSize: robotPageSize,
    filters: { view: "all" },
  });

  const options = useMemo(
    () => robotListOptions(request.page, request.pageSize, request.filters),
    [request],
  );

  // Cancellation restores cached success, so only a new response verifies a selection.
  const count = () =>
    client.getQueryState(options.queryKey)?.dataUpdateCount ?? 0;
  const [selectionAfter, setSelectionAfter] = useState(count);
  const [lastKey, setLastKey] = useState<QueryKey>(options.queryKey);
  const [announcement, setAnnouncement] = useState("");
  const [announce, setAnnounce] = useState(false);

  const query = useQuery({
    ...options,
    enabled: !paused,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    notifyOnChangeProps: "all",
  });

  const currentCount = count();
  const selected = currentCount > selectionAfter;
  const snapshot = query.data ?? client.getQueryData<RobotPage>(lastKey);
  const total = snapshot?.total ?? 0;
  const page = Math.min(request.page, lastRobotPage(total, request.pageSize));
  const outOfRange = Boolean(
    selected &&
    query.data &&
    request.page > lastRobotPage(query.data.total, request.pageSize),
  );

  useEffect(() => {
    if (paused)
      void client.cancelQueries({ queryKey: options.queryKey, exact: true });
  }, [client, options.queryKey, paused]);

  if (outOfRange) {
    setSelectionAfter(
      client.getQueryState(
        robotListOptions(page, request.pageSize, request.filters).queryKey,
      )?.dataUpdateCount ?? 0,
    );
    setRequest((previous) => ({ ...previous, page }));
  } else if (query.data && selected) {
    if (lastKey !== options.queryKey) setLastKey(options.queryKey);

    if (announce) {
      setAnnouncement(
        `${query.data.total} ${query.data.total === 1 ? "robot" : "robots"} found.`,
      );
      setAnnounce(false);
    }
  }

  function cancelRefresh() {
    void client.cancelQueries({ queryKey: options.queryKey, exact: true });
  }

  function change(next: typeof request) {
    cancelRefresh();

    const nextKey = robotListOptions(
      next.page,
      next.pageSize,
      next.filters,
    ).queryKey;

    setSelectionAfter(client.getQueryState(nextKey)?.dataUpdateCount ?? 0);
    setRequest(next);

    if (hashKey(nextKey) === hashKey(options.queryKey) && !paused)
      void query.refetch();

    void client.invalidateQueries({
      queryKey: nextKey,
      exact: true,
      refetchType: "none",
    });
  }

  function refresh() {
    void client.invalidateQueries({
      queryKey: options.queryKey,
      exact: true,
    });
  }

  const state: RobotQueryState = outOfRange
    ? { status: "loading" }
    : query.isError && !selected
      ? { status: "error" }
      : selected && query.data
        ? { status: "success", robots: query.data.items }
        : { status: "loading" };

  return {
    state,
    announcement,
    total,
    page,
    pageSize: request.pageSize,
    setPage: (page: number) => change({ ...request, page }),
    setPageSize: (pageSize: number) =>
      change({ ...request, page: 0, pageSize }),
    setFilters: (filters: RobotFilters) => {
      setAnnounce(true);
      setAnnouncement("");
      change({ ...request, page: 0, filters });
    },
    refresh,
    cancelRefresh,
    interrupted: query.isError,
    unverified: query.isError,
    verifiedAt: snapshot?.evaluatedAt ?? 0,
    snapshot,
    filters: request.filters,
  };
}
