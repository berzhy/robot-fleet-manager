import type { Robot } from "./robot";
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
export function actionUnavailable(
  robot: Robot,
  action: RobotAction,
  now: number,
): string | null {
  if (connectionStatus(robot.lastReceivedAt, now) !== "Online")
    return "Robot must be online";
  switch (action) {
    case "start":
      if (robot.activity === "working") return "Robot is already working";
      if (robot.activity !== "idle") return "Robot must be idle";
      return robot.batteryPercent !== null && robot.batteryPercent > 10
        ? null
        : "Battery is too low";
    case "stop":
      return robot.activity === "working" || robot.activity === "returning"
        ? null
        : "Robot has no activity to stop";
    case "return-to-base":
      return robot.activity === "working" ||
        (robot.activity === "idle" &&
          robot.area !== null &&
          robot.area !== "Base")
        ? null
        : "Robot must be working or idle away from base";
    case "retry":
      return robot.activity === "needs-attention" &&
        robot.problemCode === "path-blocked"
        ? null
        : "Robot has no activity to retry";
  }
}
