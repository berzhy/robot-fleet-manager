import type { ConnectionStatus } from "../telemetry/freshness";

import type { Robot } from "./robot";

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
  unknown: "Unknown",
} satisfies Record<Robot["activity"], string>;

const connectionLabels = {
  online: "Online",
  delayed: "Delayed",
  offline: "Offline",
  unknown: "Unknown",
} satisfies Record<ConnectionStatus, string>;

export function formatRobotType(type: Robot["type"]) {
  return robotTypeLabels[type];
}

export function formatIntegrationType(type: Robot["integrationType"]) {
  return integrationTypeLabels[type];
}

export function formatActivity(activity: Robot["activity"]) {
  return activityLabels[activity];
}

export function formatConnection(status: ConnectionStatus) {
  return connectionLabels[status];
}
