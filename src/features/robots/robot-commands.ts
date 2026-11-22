import type { Robot, RobotAction } from "@/common/types";

/** The obvious next thing for the robot's state: Start, Stop or Retry. */
export function mainActivityAction(robot: Robot): RobotAction {
  switch (robot.activity) {
    case "working":
    case "returning":
      return "stop";
    // Whether there is a problem to retry is Retry's own reason to give.
    case "needs-attention":
      return "retry";
    case "idle":
    case "charging":
    case null:
      return "start";
  }
}

/**
 * Why a screen cannot offer an action now. A queued action blocks only
 * itself, so another command can always replace it.
 */
export function commandUnavailable(robot: Robot, action: RobotAction) {
  if (robot.queuedActions.includes(action)) {
    return "Waiting for the robot…";
  }
  return robot.blockedActions[action] ?? null;
}
