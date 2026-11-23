import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import type {
  Robot,
  RobotAction,
  RobotContext,
  RobotPage,
} from "@/common/types";

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
  return useRobotWrite(deleteRobot, (client, _result, id) =>
    updateListedRobots(client, (robots) =>
      robots.filter((robot) => robot.id !== id),
    ),
  );
}

export function useDeleteAllRobots() {
  return useRobotWrite(deleteAllRobots, (client) =>
    updateListedRobots(client, () => []),
  );
}

export function useSendRobotAction(robotId: string) {
  return useRobotWrite(
    (action: RobotAction) => sendRobotAction(robotId, action),
    (client, updated) => {
      updateListedRobots(client, (robots) =>
        robots.map((robot) => (robot.id === updated.id ? updated : robot)),
      );
      client.setQueryData<RobotContext>(
        robotKeys.context(updated.id),
        (context) => context && { ...context, robot: updated },
      );
    },
  );
}

/**
 * A write to the fleet, finished when the server answers. Its result goes
 * straight into the cache and the refresh runs in the background, so
 * overlapping writes cannot end each other's wait.
 */
function useRobotWrite<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  applyResult?: (
    client: QueryClient,
    result: TData,
    variables: TVariables,
  ) => void,
) {
  const client = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async (result, variables) => {
      await discardPreWriteReads(client);
      applyResult?.(client, result, variables);
    },
    onError: () => discardPreWriteReads(client),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: robotKeys.all });
    },
  });
}

async function discardPreWriteReads(client: QueryClient) {
  // List pages not on screen hold pre-write data, such as deleted robots;
  // dropping them stops a later page or filter showing them as current. Robot
  // details stay: one already known to be deleted must not show it again.
  client.removeQueries({ queryKey: robotKeys.lists, type: "inactive" });
  // A request sent before the write may answer with pre-write data, and a
  // refetch reuses one still in flight for a first load.
  await client.cancelQueries({ queryKey: robotKeys.all });
}

function updateListedRobots(
  client: QueryClient,
  update: (robots: Robot[]) => Robot[],
) {
  client.setQueriesData<RobotPage>(
    { queryKey: robotKeys.lists },
    (page) => page && { ...page, items: update(page.items) },
  );
}
