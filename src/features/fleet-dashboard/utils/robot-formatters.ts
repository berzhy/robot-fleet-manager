import type { Robot } from "../types/robot";

export function formatBattery(value: number | null) {
  return value === null ? "Unknown" : `${Math.round(value)}%`;
}

export function formatActivity(activity: Robot["activity"]) {
  return activity.charAt(0).toUpperCase() + activity.slice(1);
}
