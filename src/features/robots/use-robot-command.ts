"use client";

import type { Robot } from "@/modules/robots/robot";
import {
  actionLabels,
  actionUnavailable,
  type RobotAction,
} from "@/modules/robots/robot-actions";
import { useNotifications } from "@/shared/notifications/notification-provider";

import { isRequestTimeout } from "./api/robot-api";
import { useRobotWriteLock, useSendRobotAction } from "./api/robot-mutations";

/** Sends a robot action from any screen and reports the outcome as a notification. */
export default function useRobotCommand() {
  const sendAction = useSendRobotAction();
  const { isWritePendingNow } = useRobotWriteLock();
  const notifications = useNotifications();

  return function requestAction(robot: Robot, action: RobotAction) {
    if (isWritePendingNow()) {
      return;
    }

    // Controls reflect the last poll; a report can expire before the click.
    const reason = actionUnavailable(robot, action, Date.now());
    if (reason) {
      notifications.show({
        severity: "error",
        message: `${reason}. Check the latest report before trying again.`,
      });
      return;
    }

    notifications.clear();

    // Unlike per-call mutate callbacks, the promise settles even after the screen
    // unmounts, so a command sent from details is still reported after navigating away.
    sendAction.mutateAsync({ id: robot.id, action }).then(
      () =>
        notifications.show({
          severity: "success",
          message: `${actionLabels[action]} requested for “${robot.name}”.`,
        }),
      (error: Error) =>
        notifications.show({
          severity: "error",
          message: isRequestTimeout(error)
            ? "The command timed out, so its outcome is uncertain. Check the reported activity before trying again."
            : `Unable to request ${actionLabels[action].toLowerCase()} for “${robot.name}”. Please try again.`,
        }),
    );
  };
}
