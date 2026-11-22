import type { RobotAction } from "@/common/robot-actions";
import { robotActions } from "@/common/robot-actions";
import {
  criticalBatteryPercent,
  lowBatteryPercent,
  offlineAfterMs,
} from "@/common/robot-filters";
import type { BatteryLevel, ConnectionStatus, Robot } from "@/common/robot";

// Plain functions without "server-only", so test fixtures can build robots
// exactly as the server answers them.

export const onlineReportMaxAgeMs = 10_000;

/** A robot as stored: what the server works out from it is left off. */
export type RobotRow = Omit<
  Robot,
  "connection" | "batteryLevel" | "blockedActions"
>;

/** The robot as the API answers it at `evaluatedAt`. */
export function toRobot<Row extends RobotRow>(row: Row, evaluatedAt: number) {
  const connection = connectionStatus(row.lastReceivedAt, evaluatedAt);
  const blockedActions: Robot["blockedActions"] = {};
  for (const action of robotActions) {
    const reason = actionUnavailable(row, connection, action);
    if (reason) {
      blockedActions[action] = reason;
    }
  }

  return {
    ...row,
    connection,
    batteryLevel: batteryLevel(row),
    blockedActions,
  } satisfies Robot;
}

function connectionStatus(
  receivedAt: string | null,
  now: number,
): ConnectionStatus | null {
  if (!receivedAt) {
    return null;
  }
  const age = Math.max(0, now - Date.parse(receivedAt));
  return age <= onlineReportMaxAgeMs
    ? "online"
    : age <= offlineAfterMs
      ? "delayed"
      : "offline";
}

/** The SQL fleet views apply the same bands; robots-fleet-views.test checks they agree. */
function batteryLevel({
  batteryPercent,
  activity,
}: RobotRow): BatteryLevel | null {
  if (batteryPercent === null) {
    return null;
  }
  if (activity === "charging" || batteryPercent > lowBatteryPercent) {
    return "normal";
  }
  return batteryPercent <= criticalBatteryPercent ? "critical" : "low";
}

/** Why an action cannot be requested now, in the operator's words, or `null`. */
function actionUnavailable(
  robot: RobotRow,
  connection: ConnectionStatus | null,
  action: RobotAction,
): string | null {
  if (connection !== "online") {
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
        case null:
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
        case null:
          return "Waiting for the robot's status";
      }

    case "retry":
      return robot.activity === "needs-attention" && robot.problemCode !== null
        ? null
        : "Nothing to retry";
  }
}
