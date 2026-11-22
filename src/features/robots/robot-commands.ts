import { actionControlTargets, type RobotAction } from "@/common/robot-actions";
import type { Robot } from "@/common/robot";

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
 * Whether this action was sent and a connected robot has yet to apply it, so
 * the reported activity is from before it. A disconnected robot may never
 * apply it, so its connection is the reason to show instead.
 */
export function isActionQueued(robot: Robot, action: RobotAction) {
  return (
    robot.queuedControlTarget === actionControlTargets[action] &&
    robot.connection === "online"
  );
}

/**
 * Why a screen cannot offer an action now. A queued action blocks only
 * itself, so another command can always replace it.
 */
export function commandUnavailable(robot: Robot, action: RobotAction) {
  if (isActionQueued(robot, action)) {
    return "Waiting for the robot…";
  }
  return robot.blockedActions[action] ?? null;
}
