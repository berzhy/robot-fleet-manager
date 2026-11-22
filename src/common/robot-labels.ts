import type { ConnectionStatus, Robot, RobotActivity } from "./robot";

const unknownLabel = "Unknown";

export const robotTypeLabels = {
  cleaning: "Cleaning robot",
  security: "Security robot",
  delivery: "Delivery robot",
  inspection: "Inspection robot",
} satisfies Record<Robot["type"], string>;

export const integrationTypeLabels = {
  ros2: "ROS 2",
  vda5050: "VDA5050",
  "vendor-api": "Vendor API",
} satisfies Record<Robot["integrationType"], string>;

const activityLabels = {
  working: "Working",
  idle: "Idle",
  returning: "Returning",
  charging: "Charging",
  "needs-attention": "Needs attention",
} satisfies Record<RobotActivity, string>;

const connectionLabels = {
  online: "Online",
  delayed: "Delayed",
  offline: "Offline",
} satisfies Record<ConnectionStatus, string>;

export function formatRobotType(type: Robot["type"]) {
  return robotTypeLabels[type];
}

export function formatIntegrationType(type: Robot["integrationType"]) {
  return integrationTypeLabels[type];
}

/** `null` is a robot that has not reported yet. */
export function formatActivity(activity: RobotActivity | null) {
  return activity === null ? unknownLabel : activityLabels[activity];
}

/** `null` is a robot that has not reported yet. */
export function formatConnection(status: ConnectionStatus | null) {
  return status === null ? unknownLabel : connectionLabels[status];
}
