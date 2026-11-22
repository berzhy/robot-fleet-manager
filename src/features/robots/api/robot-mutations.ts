import {
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

export function useCreateRobots() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: createRobots,
    onSettled: () => invalidateRobots(client),
  });
}

export function useDeleteRobot() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: deleteRobot,
    onSettled: () => invalidateRobots(client),
  });
}

export function useDeleteAllRobots() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: deleteAllRobots,
    onSettled: () => invalidateRobots(client),
  });
}

export function useSendRobotAction(robotId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (action: RobotAction) => sendRobotAction(robotId, action),
    onSettled: () => invalidateRobots(client),
  });
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
