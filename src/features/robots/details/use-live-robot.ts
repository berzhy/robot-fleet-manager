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
  const [wasPaused, setWasPaused] = useState(paused);

  // Commands pause polling via `paused`; when it releases, stay in the
  // refreshing state until a fresh response reconciles reported data.
  if (paused !== wasPaused) {
    setWasPaused(paused);

    if (!paused) setRefreshAfter(count());
  }

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
  };
}
