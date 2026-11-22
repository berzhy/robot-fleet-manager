import type { Robot } from "@/modules/robots/robot";
import {
  actionControlTargets,
  actionLabels,
  actionUnavailable,
  type RobotAction,
} from "@/modules/robots/robot-actions";
import { connectionStatus } from "@/modules/telemetry/freshness";
import { useNotifications } from "@/shared/notifications/notification-provider";

import { ApiError, isRequestTimeout } from "./api/robot-api";
import { useRobotWriteLock, useSendRobotAction } from "./api/robot-mutations";

/** The write lock covers every robot change, not only this robot's. */
export const otherChangePendingReason = "Another change is in progress";

/**
 * Why a screen cannot offer an action now. Data that may be out of date
 * blocks every action before the robot's own state is considered. A queued
 * action blocks only itself, so another command can always replace it.
 */
export function commandUnavailable(
  robot: Robot,
  action: RobotAction,
  evaluatedAt: number,
  unverified: boolean,
) {
  if (unverified) {
    return "Waiting for live updates";
  }
  if (isActionQueued(robot, action, evaluatedAt)) {
    return "Waiting for the robot…";
  }
  return actionUnavailable(robot, action, evaluatedAt);
}

/**
 * Whether this action was sent and a connected robot has yet to apply it, so
 * the reported activity is from before it. A disconnected robot may never
 * apply it, so its connection is the reason to show instead.
 */
export function isActionQueued(
  robot: Robot,
  action: RobotAction,
  evaluatedAt: number,
) {
  return (
    robot.queuedControlTarget === actionControlTargets[action] &&
    connectionStatus(robot.lastReceivedAt, evaluatedAt) === "online"
  );
}

/** Sends a robot action from any screen and reports the outcome as a notification. */
export default function useRobotCommand() {
  const sendAction = useSendRobotAction();
  const { isWritePendingNow } = useRobotWriteLock();
  const notifications = useNotifications();

  function showUnavailable(reason: string) {
    notifications.show({
      severity: "error",
      message: `${reason}. Check the latest report before trying again.`,
    });
  }

  return function requestAction(robot: Robot, action: RobotAction) {
    if (isWritePendingNow()) {
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
    sendAction.mutateAsync({ id: robot.id, action }).then(
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
  };
}
