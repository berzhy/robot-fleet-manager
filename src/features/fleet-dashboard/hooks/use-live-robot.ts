"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import type { RobotContext } from "@/modules/robots/robot";

import { robotContextOptions } from "../api/robot-queries";
import usePageVisibility from "./use-page-visibility";

export default function useLiveRobot(initial: RobotContext, paused = false) {
  const client = useQueryClient();

  const options = useMemo(
    () => robotContextOptions(initial.robot.id),
    [initial.robot.id],
  );
  const count = () =>
    client.getQueryState(options.queryKey)?.dataUpdateCount ?? 0;

  // Server-rendered context starts verified; hidden mounts must first revalidate.
  const [verificationAfter, setVerificationAfter] = useState(() =>
    typeof document !== "undefined" && document.hidden ? Infinity : -1,
  );
  const [refreshAfter, setRefreshAfter] = useState<number | null>(null);

  const hidden = usePageVisibility(() => {
    if (!paused) setVerificationAfter(count());
    void client.cancelQueries({ queryKey: options.queryKey, exact: true });
  });

  const query = useQuery({
    ...options,
    initialData: initial,
    enabled: (q) => !paused && !hidden && q.state.data !== null,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    notifyOnChangeProps: "all",
  });

  useEffect(() => {
    if (paused || hidden)
      void client.cancelQueries({ queryKey: options.queryKey, exact: true });
  }, [client, options.queryKey, paused, hidden]);

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
    unverified: query.isError || count() <= verificationAfter,
    cancelRefresh,
  };
}
