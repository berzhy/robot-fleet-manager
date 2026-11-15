import type { Robot } from "@/modules/robots/robot";

export function formatBattery(value: number | null) {
  return value === null ? "Unknown" : `${Math.round(value)}%`;
}

export function formatActivity(activity: Robot["activity"]) {
  return activity.charAt(0).toUpperCase() + activity.slice(1);
}

const addedFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
export function formatAdded(createdAt: string) {
  return addedFormatter.format(new Date(createdAt));
}
