import { lowBatteryPercent, type Robot } from "./robot";
import { connectionStatus } from "../telemetry/freshness";

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
