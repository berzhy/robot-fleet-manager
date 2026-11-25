import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";

import type { RobotListParams } from "@/common/schemas";
import type { RobotSnapshot } from "@/common/types";

import { getRobotSnapshot, getRobots, isRobotNotFound } from "./robot-api";

// The simulator reports every second; one robot is cheap enough to poll faster.
export const robotListPollIntervalMs = 3_000;
export const robotSnapshotPollIntervalMs = 2_000;

export const robotKeys = {
  all: ["robots"] as const,
  lists: ["robots", "list"] as const,
  list: (params: RobotListParams) => [...robotKeys.lists, params] as const,
  snapshot: (id: string) => [...robotKeys.all, "snapshot", id] as const,
  action: (id: string) => [...robotKeys.all, "action", id] as const,
};

export function robotListOptions(params: RobotListParams) {
  return queryOptions({
    queryKey: robotKeys.list(params),
    queryFn: ({ signal }) => getRobots(params, signal),
    refetchInterval: robotListPollIntervalMs,
  });
}

function robotSnapshotOptions(id: string) {
  return queryOptions({
    queryKey: robotKeys.snapshot(id),
    queryFn: ({ signal }) => getRobotSnapshot(id, signal),
    refetchInterval: robotSnapshotPollIntervalMs,
    // Server-rendered data stays fresh until the first poll. Invalidation
    // still refetches at once.
    staleTime: robotSnapshotPollIntervalMs,
  });
}

export function useRobotListQuery(params: RobotListParams) {
  // While the next view loads, the previous view's result stays on screen, so
  // the counts, filter options, pager and rows stay in place.
  const query = useQuery({
    ...robotListOptions(params),
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data,
    /** This view's own result has not arrived yet: the previous view's may stand in. */
    isLoading: query.isPending || query.isPlaceholderData,
    loadFailed: query.isLoadingError,
    refreshFailed: query.isRefetchError,
    refresh: () => void query.refetch(),
  };
}

/**
 * Starts from the server's snapshot rather than a one-off cache entry: Next
 * keeps a page you leave mounted but hidden, and the cache can drop the robot
 * meanwhile, so going Back refills it from here.
 */
export function useRobotSnapshotQuery(initialSnapshot: RobotSnapshot) {
  const query = useQuery({
    ...robotSnapshotOptions(initialSnapshot.robot.id),
    initialData: initialSnapshot,
    // Its age, so an old render refreshes as soon as it is shown again.
    initialDataUpdatedAt: initialSnapshot.evaluatedAt,
    // A deleted robot stays deleted: no more polls or refetches on focus.
    enabled: (snapshotQuery) => !isRobotNotFound(snapshotQuery.state.error),
  });

  // A failed refetch keeps the last data, so a deleted robot still shows its name.
  const missing = isRobotNotFound(query.error);
  return { ...query.data, missing, refreshFailed: query.isError && !missing };
}
