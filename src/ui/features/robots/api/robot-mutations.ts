import {
  useMutation,
  useMutationState,
  useQueryClient,
  type MutationKey,
  type MutationState,
  type QueryClient,
} from "@tanstack/react-query";

import type {
  Robot,
  RobotAction,
  RobotSnapshot,
  RobotPage,
} from "@/common/types";

import {
  createRobots,
  deleteAllRobots,
  deleteRobot,
  sendRobotAction,
} from "./robot-api";
import { robotKeys } from "./robot-queries";

const emptyFleet = {
  items: [],
  total: 0,
  fleetTotal: 0,
  summary: { all: 0, "needs-attention": 0, offline: 0, "low-battery": 0 },
  filterOptions: { sites: [], manufacturers: [] },
} satisfies Partial<RobotPage>;

export function useCreateRobots() {
  return useRobotWrite(createRobots);
}

export function useDeleteRobot() {
  return useRobotWrite(deleteRobot, {
    applyResult: (client, _result, id) =>
      updateListedPages(client, (page) => ({
        ...page,
        items: page.items.filter((robot) => robot.id !== id),
      })),
  });
}

export function useDeleteAllRobots() {
  return useRobotWrite(deleteAllRobots, {
    applyResult: (client) =>
      updateListedPages(client, (page) => ({ ...page, ...emptyFleet })),
  });
}

export function useSendRobotAction(robotId: string) {
  return useRobotWrite(
    (action: RobotAction) => sendRobotAction(robotId, action),
    {
      mutationKey: robotKeys.action(robotId),
      applyResult: (client, updated) => {
        updateListedPages(client, (page) => ({
          ...page,
          items: page.items.map((robot) =>
            robot.id === updated.id ? updated : robot,
          ),
        }));
        client.setQueryData<RobotSnapshot>(
          robotKeys.snapshot(updated.id),
          (snapshot) => snapshot && { ...snapshot, robot: updated },
        );
      },
    },
  );
}

/** The action on its way to this robot from any screen, if any. */
export function usePendingRobotAction(robotId: string) {
  const [pending] = useMutationState<MutationState<Robot, Error, RobotAction>>({
    filters: { mutationKey: robotKeys.action(robotId), status: "pending" },
  });

  return pending?.variables;
}

/**
 * Reads the cache rather than a render, so a second click is caught before
 * React has shown the first.
 */
export function isRobotActionPending(client: QueryClient, robotId: string) {
  return client.isMutating({ mutationKey: robotKeys.action(robotId) }) > 0;
}

/**
 * A write to the fleet, finished when the server answers. Its result goes
 * straight into the cache and the refresh runs in the background, so
 * overlapping writes cannot end each other's wait.
 */
function useRobotWrite<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  {
    mutationKey,
    applyResult,
  }: {
    mutationKey?: MutationKey;
    applyResult?: (
      client: QueryClient,
      result: TData,
      variables: TVariables,
    ) => void;
  } = {},
) {
  const client = useQueryClient();

  return useMutation({
    mutationKey,
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

function updateListedPages(
  client: QueryClient,
  update: (page: RobotPage) => RobotPage,
) {
  client.setQueriesData<RobotPage>(
    { queryKey: robotKeys.lists },
    (page) => page && update(page),
  );
}
