import type { Robot } from "@/modules/robots/robot";

export function formatBattery(value: number | null) {
  return value === null ? "Unknown" : `${Math.round(value)}%`;
}

export {
  formatRobotType,
  formatIntegrationType,
} from "@/modules/robots/robot-labels";

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
