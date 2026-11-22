import type { Robot } from "@/modules/robots/robot";
import {
  actionLabels,
  actionUnavailable,
  type RobotAction,
} from "@/modules/robots/robot-actions";
import { useNotifications } from "@/shared/notifications/notification-provider";

import { ApiError, isRequestTimeout } from "./api/robot-api";
import { useRobotWriteLocks, useSendRobotAction } from "./api/robot-mutations";

/** A delete and every other write wait for each other. */
export const otherChangePendingReason = "Another change is in progress";

/**
 * Sends this robot's actions from any screen and reports each outcome as a
 * notification. `waitReason` says why the robot cannot take a command yet.
 */
export default function useRobotCommand(robot: Robot) {
  const sendAction = useSendRobotAction(robot.id);
  const locks = useRobotWriteLocks();
  const notifications = useNotifications();

  function currentWaitReason() {
    if (locks.isCommandPending(robot.id)) {
      return "Sending command…";
    }
    return locks.isDeletePending() ? otherChangePendingReason : null;
  }

  function showUnavailable(reason: string) {
    notifications.show({
      severity: "error",
      message: `${reason}. Check the latest report before trying again.`,
    });
  }

  function requestAction(action: RobotAction) {
    if (currentWaitReason()) {
      return;
    }

    // Controls reflect the last poll; a report can expire before the click.
    const reason = actionUnavailable(robot, action, Date.now());
    if (reason) {
      showUnavailable(reason);
      return;
    }

    notifications.clear();

    // Unlike per-call mutate callbacks, the promise settles even after the screen
    // unmounts, so a command sent from details is still reported after navigating away.
    sendAction.mutateAsync(action).then(
      () =>
        notifications.show({
          severity: "success",
          message: `${actionLabels[action]} requested for “${robot.name}”.`,
        }),
      (error: Error) => {
        // The server checks the robot's latest report, which may be newer than this screen's.
        if (error instanceof ApiError && error.code === "ACTION_UNAVAILABLE") {
          showUnavailable(error.message);
          return;
        }
        notifications.show({
          severity: "error",
          message: isRequestTimeout(error)
            ? "The command timed out, so its outcome is uncertain. Check the reported activity before trying again."
            : `Unable to request ${actionLabels[action].toLowerCase()} for “${robot.name}”. Please try again.`,
        });
      },
    );
  }

  return { requestAction, waitReason: currentWaitReason() };
}
