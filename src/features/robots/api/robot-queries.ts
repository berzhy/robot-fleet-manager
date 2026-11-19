import { queryOptions } from "@tanstack/react-query";

import type { RobotFilters } from "@/modules/robots/robot-filters";

import { getRobotContext, getRobots } from "./robot-api";

const robotPollIntervalMs = 5_000;

export const robotKeys = {
  all: ["robots"] as const,
  list: (page: number, pageSize: number, filters: RobotFilters) =>
    ["robots", "list", { page, pageSize, filters }] as const,
  context: (id: string) => ["robots", "context", id] as const,
};

export function robotListOptions(
  page: number,
  pageSize: number,
  filters: RobotFilters,
) {
  return queryOptions({
    queryKey: robotKeys.list(page, pageSize, filters),
    queryFn: ({ signal }) => getRobots(page, pageSize, signal, filters),
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
