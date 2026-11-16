import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { CreateRobotInput } from "@/modules/robots/robot-validation";
import type { RobotAction } from "@/modules/robots/robot-actions";
import {
  createRobot,
  createRobots,
  deleteRobot,
  deleteAllRobots,
  sendRobotAction,
} from "../api/robot-api";
import { robotKeys } from "../api/robot-queries";

export default function useRobotMutations() {
  const client = useQueryClient();

  const lifecycle = {
    onMutate: () => client.cancelQueries({ queryKey: robotKeys.all }),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: robotKeys.all });
    },
  };

  const add = useMutation({
    ...lifecycle,
    mutationFn: (inputs: CreateRobotInput[]) =>
      inputs.length === 1
        ? createRobot(inputs[0]).then((robot) => [robot])
        : createRobots(inputs),
  });

  const remove = useMutation({
    ...lifecycle,
    mutationFn: (id: string | null) =>
      id === null ? deleteAllRobots() : deleteRobot(id),
  });

  const command = useMutation({
    ...lifecycle,
    mutationFn: ({ id, action }: { id: string; action: RobotAction }) =>
      sendRobotAction(id, action),
  });

  return { add, remove, command };
}
