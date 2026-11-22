import {
  useIsMutating,
  useMutation,
  useMutationState,
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
const createMutationKey = [...robotMutationKey, "create"] as const;
// One prefix for both deletes, so a check can wait for either.
const deleteMutationKey = [...robotMutationKey, "delete"] as const;
const commandMutationKey = [...robotMutationKey, "command"] as const;

export function useCreateRobots() {
  const client = useQueryClient();

  return useMutation({
    mutationKey: createMutationKey,
    mutationFn: createRobots,
    onSettled: () => invalidateRobots(client),
  });
}

export function useDeleteRobot() {
  const client = useQueryClient();

  return useMutation({
    mutationKey: [...deleteMutationKey, "robot"],
    mutationFn: deleteRobot,
    onSettled: () => invalidateRobots(client),
  });
}

export function useDeleteAllRobots() {
  const client = useQueryClient();

  return useMutation({
    mutationKey: [...deleteMutationKey, "all"],
    mutationFn: deleteAllRobots,
    onSettled: () => invalidateRobots(client),
  });
}

export function useSendRobotAction(robotId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationKey: robotCommandKey(robotId),
    mutationFn: (action: RobotAction) => sendRobotAction(robotId, action),
    onSettled: () => invalidateRobots(client),
  });
}

/** The action being sent to this robot, until the refresh after it settles. */
export function usePendingRobotAction(robotId: string) {
  const [pendingAction] = useMutationState({
    filters: { mutationKey: robotCommandKey(robotId), status: "pending" },
    // Only useSendRobotAction writes under this key.
    select: (mutation) => mutation.state.variables as RobotAction,
  });

  return pendingAction;
}

/**
 * Which writes wait for which. A robot takes one command at a time. A delete,
 * made behind a modal dialog, waits for every other write and holds them all
 * up. One add runs at a time, beside commands to any robot.
 *
 * Each check reads the mutation cache, so a click handler sees a write started
 * a moment ago, before React re-renders; the subscription keeps the same
 * checks current during render.
 */
export function useRobotWriteLocks() {
  const client = useQueryClient();
  useIsMutating({ mutationKey: robotMutationKey });

  function isPending(mutationKey: readonly string[]) {
    return client.isMutating({ mutationKey }) > 0;
  }

  return {
    isCommandPending: (robotId: string) => isPending(robotCommandKey(robotId)),
    isDeletePending: () => isPending(deleteMutationKey),
    isAddLocked: () =>
      isPending(createMutationKey) || isPending(deleteMutationKey),
    isDeleteLocked: () => isPending(robotMutationKey),
  };
}

function robotCommandKey(robotId: string) {
  return [...commandMutationKey, robotId];
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
