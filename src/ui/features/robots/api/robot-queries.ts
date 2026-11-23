import { queryOptions } from "@tanstack/react-query";

import type { RobotListParams } from "./robot-list-params";

import { getRobotContext, getRobots } from "./robot-api";

// The simulator reports every second; one robot is cheap enough to poll faster.
export const robotListPollIntervalMs = 3_000;
export const robotContextPollIntervalMs = 2_000;

export const robotKeys = {
  all: ["robots"] as const,
  lists: ["robots", "list"] as const,
  list: (params: RobotListParams) => [...robotKeys.lists, params] as const,
  context: (id: string) => [...robotKeys.all, "context", id] as const,
  action: (id: string) => [...robotKeys.all, "action", id] as const,
};

export function robotListOptions(params: RobotListParams) {
  return queryOptions({
    queryKey: robotKeys.list(params),
    queryFn: ({ signal }) => getRobots(params, signal),
    refetchInterval: robotListPollIntervalMs,
  });
}

export function robotContextOptions(id: string) {
  return queryOptions({
    queryKey: robotKeys.context(id),
    queryFn: ({ signal }) => getRobotContext(id, signal),
    refetchInterval: robotContextPollIntervalMs,
    // Server-rendered data stays fresh until the first poll. Invalidation
    // still refetches at once.
    staleTime: robotContextPollIntervalMs,
  });
}
