import type { Robot, RobotAction } from "@/common/types";
import { useNotifications } from "@/ui/notifications/notification-provider";

import { isActionUnavailable, isRequestTimeout } from "./api/robot-api";
import { useSendRobotAction } from "./api/robot-mutations";
import { actionLabels } from "./robot-action-display";

/**
 * Sends this robot's actions from any screen and reports each outcome as a
 * notification. One command at a time: `pendingAction` is the one being sent,
 * and `waitReason` says so.
 */
export default function useRobotCommand(robot: Robot) {
  const sendAction = useSendRobotAction(robot.id);
  const notifications = useNotifications();

  function showUnavailable(reason: string) {
    notifications.show({
      severity: "error",
      message: `${reason}. Check the latest report before trying again.`,
    });
  }

  function requestAction(action: RobotAction) {
    if (sendAction.isPending) {
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
        if (isActionUnavailable(error)) {
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

  return {
    requestAction,
    pendingAction: sendAction.isPending ? sendAction.variables : undefined,
    waitReason: sendAction.isPending ? "Sending command…" : null,
  };
}
