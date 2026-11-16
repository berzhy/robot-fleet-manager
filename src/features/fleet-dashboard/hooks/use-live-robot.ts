"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import type { RobotContext } from "@/modules/robots/robot";

import { robotContextOptions } from "../api/robot-queries";

export default function useLiveRobot(initial: RobotContext, paused = false) {
  const client = useQueryClient();

  const options = useMemo(
    () => robotContextOptions(initial.robot.id),
    [initial.robot.id],
  );
  const count = () =>
    client.getQueryState(options.queryKey)?.dataUpdateCount ?? 0;

  const [refreshAfter, setRefreshAfter] = useState<number | null>(null);

  const query = useQuery({
    ...options,
    initialData: initial,
    enabled: (q) => !paused && q.state.data !== null,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    notifyOnChangeProps: "all",
  });

  useEffect(() => {
    if (paused)
      void client.cancelQueries({ queryKey: options.queryKey, exact: true });
  }, [client, options.queryKey, paused]);

  const missing = query.data === null;

  function cancelRefresh() {
    setRefreshAfter(count());
    void client.cancelQueries({ queryKey: options.queryKey, exact: true });
  }

  return {
    ...(query.data ?? initial),
    missing,
    interrupted: query.isError,
    refreshing:
      refreshAfter !== null &&
      count() <= refreshAfter &&
      !query.isError &&
      !missing,
    unverified: query.isError,
    cancelRefresh,
  };
}
