import { queryOptions } from "@tanstack/react-query";

import type { RobotListParams } from "@/modules/robots/robot-list-params";

import { getRobotContext, getRobots } from "./robot-api";

const robotPollIntervalMs = 5_000;

export const robotKeys = {
  all: ["robots"] as const,
  list: (params: RobotListParams) =>
    [...robotKeys.all, "list", params] as const,
  context: (id: string) => [...robotKeys.all, "context", id] as const,
};

export function robotListOptions(params: RobotListParams) {
  return queryOptions({
    queryKey: robotKeys.list(params),
    queryFn: ({ signal }) => getRobots(params, signal),
    refetchInterval: robotPollIntervalMs,
  });
}

export function robotContextOptions(id: string) {
  return queryOptions({
    queryKey: robotKeys.context(id),
    queryFn: ({ signal }) => getRobotContext(id, signal),
    refetchInterval: robotPollIntervalMs,
  });
}
