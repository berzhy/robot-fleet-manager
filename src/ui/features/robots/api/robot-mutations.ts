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
  return useRobotWrite(createRobots);
}

export function useDeleteRobot() {
  return useRobotWrite(deleteRobot);
}

export function useDeleteAllRobots() {
  return useRobotWrite(deleteAllRobots);
}

export function useSendRobotAction(robotId: string) {
  return useRobotWrite((action: RobotAction) =>
    sendRobotAction(robotId, action),
  );
}

/** A write to the fleet, pending until the robots it changed are fetched again. */
function useRobotWrite<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  const client = useQueryClient();

  return useMutation({
    mutationFn,
    onSettled: () => invalidateRobots(client),
  });
}

// Returned from onSettled, so each mutation stays pending until fresh data arrives.
async function invalidateRobots(client: QueryClient) {
  // List pages not on screen hold pre-write data, such as deleted robots;
  // dropping them stops a later page or filter showing them as current. Robot
  // details stay: one already known to be deleted must not show it again.
  client.removeQueries({ queryKey: robotKeys.lists, type: "inactive" });
  // A request sent before the write may answer with pre-write data. The refetch
  // below cancels one only for a query that already has data, and reuses it
  // for a first load, so cancel them all first.
  await client.cancelQueries({ queryKey: robotKeys.all });
  return client.invalidateQueries({ queryKey: robotKeys.all });
}
