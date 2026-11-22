import type { ControlTarget } from "./robot";

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
