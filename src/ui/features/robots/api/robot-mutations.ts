import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import type { RobotAction } from "@/common/types";

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
function invalidateRobots(client: QueryClient) {
  // List pages not on screen hold pre-write data, such as deleted robots;
  // dropping them stops a later page or filter showing them as current. Robot
  // details stay: one already known to be deleted must not show it again.
  client.removeQueries({ queryKey: robotKeys.lists, type: "inactive" });
  return client.invalidateQueries({ queryKey: robotKeys.all });
}
