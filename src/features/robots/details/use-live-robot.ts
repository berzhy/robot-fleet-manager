"use client";

import { useQuery } from "@tanstack/react-query";

import { isRobotNotFound } from "../api/robot-api";
import { robotContextOptions } from "../api/robot-queries";

export default function useLiveRobot(robotId: string) {
  const query = useQuery({
    ...robotContextOptions(robotId),
    // A deleted robot stays deleted: no more polls or refetches on focus.
    enabled: (contextQuery) => !isRobotNotFound(contextQuery.state.error),
  });

  // The page prefetches the context on the server, so the cache already holds it.
  if (!query.data) {
    throw new Error(`Robot ${robotId} rendered without a prefetched context.`);
  }

  // A failed refetch keeps the last data, so a deleted robot still shows its name.
  const missing = isRobotNotFound(query.error);
  return { ...query.data, missing, refreshFailed: query.isError && !missing };
}
