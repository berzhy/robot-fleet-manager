import type { Robot } from "@/modules/robots/robot";

export function formatBattery(value: number | null) {
  return value === null ? "Unknown" : `${Math.round(value)}%`;
}

export function formatRobotType(type: Robot["type"]) {
  return `${type.charAt(0).toUpperCase()}${type.slice(1)} robot`;
}

export function formatIntegrationType(type: Robot["integrationType"]) {
  const labels = {
    ros2: "ROS 2",
    vda5050: "VDA5050",
    "vendor-api": "Vendor API",
  };
  return labels[type];
}

export function formatActivity(activity: Robot["activity"]) {
  const labels = {
    working: "Working",
    idle: "Idle",
    returning: "Returning",
    charging: "Charging",
    "needs-attention": "Needs attention",
    unknown: "Unknown",
  };
  return labels[activity];
}

const addedFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium",
});
export function formatAdded(createdAt: string) {
  return addedFormatter.format(new Date(createdAt));
}
