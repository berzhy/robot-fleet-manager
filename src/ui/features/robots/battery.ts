import type { BatteryLevel } from "@/common/types";

export function formatBattery(value: number | null) {
  return value === null ? "Unknown" : `${Math.round(value)}%`;
}

/** As the fleet views read: Low battery warns, Needs attention is an error. */
export const batteryLevelColors: Partial<Record<BatteryLevel, string>> = {
  low: "warning.main",
  critical: "error.main",
};
