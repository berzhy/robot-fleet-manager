import {
  useIsMutating,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import type { RobotAction } from "@/modules/robots/robot-actions";

import {
  createRobots,
  deleteAllRobots,
  deleteRobot,
  sendRobotAction,
} from "./robot-api";
import { robotKeys } from "./robot-queries";

const robotMutationKey = [...robotKeys.all, "mutation"] as const;

export function useCreateRobots() {
  const client = useQueryClient();

  return useMutation({
    mutationKey: [...robotMutationKey, "create"],
    mutationFn: createRobots,
    onSettled: () => invalidateRobots(client),
  });
}

export function useDeleteRobot() {
  const client = useQueryClient();

  return useMutation({
    mutationKey: [...robotMutationKey, "delete"],
    mutationFn: deleteRobot,
    onSettled: () => invalidateRobots(client),
  });
}

export function useDeleteAllRobots() {
  const client = useQueryClient();

  return useMutation({
    mutationKey: [...robotMutationKey, "delete-all"],
    mutationFn: deleteAllRobots,
    onSettled: () => invalidateRobots(client),
  });
}

export function useRobotCommand() {
  const client = useQueryClient();

  return useMutation({
    mutationKey: [...robotMutationKey, "command"],
    mutationFn: ({ id, action }: { id: string; action: RobotAction }) =>
      sendRobotAction(id, action),
    onSettled: () => invalidateRobots(client),
  });
}

/**
 * One robot write at a time, across screens. `isWritePending` drives rendering;
 * `isWritePendingNow()` reads the cache synchronously, so a click handler sees a
 * write started a moment ago, before React re-renders.
 */
export function useRobotWriteLock() {
  const client = useQueryClient();
  const isWritePending = useIsMutating({ mutationKey: robotMutationKey }) > 0;

  function isWritePendingNow() {
    return client.isMutating({ mutationKey: robotMutationKey }) > 0;
  }

  return { isWritePending, isWritePendingNow };
}

// Returned from onSettled, so each mutation stays pending until fresh data arrives.
async function invalidateRobots(client: QueryClient) {
  // Reads that started before the write finished are out of date. invalidateQueries
  // only cancels in-flight reads that already have data, so a first read for newly
  // selected filters would otherwise be reused.
  await client.cancelQueries({ queryKey: robotKeys.all });

  // Cached views that are not on screen hold pre-write data. Dropping them makes a
  // later page correction or filter change load fresh rows instead of showing them.
  client.removeQueries({ queryKey: robotKeys.all, type: "inactive" });

  return client.invalidateQueries({ queryKey: robotKeys.all });
}
