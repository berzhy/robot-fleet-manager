import { connectionStatus } from "../telemetry/freshness";

import { lowBatteryPercent, type ControlTarget, type Robot } from "./robot";
import type { RobotReading } from "./robot-reading";

export const robotActions = [
  "start",
  "stop",
  "retry",
  "return-to-base",
] as const;

export type RobotAction = (typeof robotActions)[number];

export const actionLabels: Record<RobotAction, string> = {
  start: "Start activity",
  stop: "Stop activity",
  "return-to-base": "Return to base",
  retry: "Retry activity",
};

/** What the robot is told to do when an action is requested. */
export const actionControlTargets: Record<RobotAction, ControlTarget> = {
  start: "work",
  retry: "work",
  stop: "stop",
  "return-to-base": "base",
};

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
    case "unknown":
      return "start";
  }
}

/**
 * Why a screen cannot offer an action now. A queued action blocks only
 * itself, so another command can always replace it.
 */
export function commandUnavailable(reading: RobotReading, action: RobotAction) {
  if (isActionQueued(reading, action)) {
    return "Waiting for the robot…";
  }
  return actionUnavailable(reading.robot, action, reading.evaluatedAt);
}

/**
 * Whether this action was sent and a connected robot has yet to apply it, so
 * the reported activity is from before it. A disconnected robot may never
 * apply it, so its connection is the reason to show instead.
 */
export function isActionQueued(
  { robot, connection }: RobotReading,
  action: RobotAction,
) {
  return (
    robot.queuedControlTarget === actionControlTargets[action] &&
    connection === "online"
  );
}

/**
 * Why an action cannot be requested now, in the operator's words, or `null`.
 * The server gives the same answer, so a stale screen cannot sneak one past it.
 */
export function actionUnavailable(
  robot: Robot,
  action: RobotAction,
  now: number,
): string | null {
  if (connectionStatus(robot.lastReceivedAt, now) !== "online") {
    return "Robot isn't connected";
  }

  switch (action) {
    case "start":
      switch (robot.activity) {
        case "working":
          return "Already working";
        case "returning":
          return "Stop the return first";
        case "needs-attention":
          return "Use Retry instead";
        case "unknown":
          return "Waiting for the robot's status";
        // An operator may cut charging short. Robots head back to base at
        // the critical level, so a start needs more than that to be useful.
        case "idle":
        case "charging":
          if (robot.batteryPercent === null) {
            return "Battery level unknown";
          }
          return robot.batteryPercent > lowBatteryPercent
            ? null
            : "Battery too low to start";
      }

    case "stop":
      return robot.activity === "working" || robot.activity === "returning"
        ? null
        : "Nothing to stop";

    case "return-to-base":
      switch (robot.activity) {
        case "working":
          return null;
        case "idle":
          return robot.area === "Base"
            ? "Already at base"
            : robot.area === null
              ? "Robot's location is unknown"
              : null;
        case "charging":
          return "Already charging";
        case "returning":
          return "Already returning";
        case "needs-attention":
          return "Fix the problem first";
        case "unknown":
          return "Waiting for the robot's status";
      }

    case "retry":
      return robot.activity === "needs-attention" && robot.problemCode !== null
        ? null
        : "Nothing to retry";
  }
}
