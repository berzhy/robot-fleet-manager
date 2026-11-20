import {
  criticalBatteryPercent,
  lowBatteryPercent,
  type Robot,
} from "@/modules/robots/robot";

export function formatBattery(value: number | null) {
  return value === null ? "Unknown" : `${Math.round(value)}%`;
}

/**
 * Palette colour matching the fleet views: Low battery (warning) and the
 * critical level that counts as Needs attention (error). Charging robots are
 * in neither, as in `src/server/robots/robots.ts`.
 */
export function batteryTone({
  batteryPercent,
  activity,
}: Pick<Robot, "batteryPercent" | "activity">) {
  if (batteryPercent === null || activity === "charging") {
    return undefined;
  }
  if (batteryPercent <= criticalBatteryPercent) {
    return "error";
  }
  return batteryPercent <= lowBatteryPercent ? "warning" : undefined;
}

const timestampFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "long",
  timeZone: "Europe/Berlin",
});

export function formatRobotTimestamp(timestamp: string) {
  return timestampFormatter.format(new Date(timestamp));
}

const addedDateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "Europe/Berlin",
});
const addedTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeStyle: "long",
  timeZone: "Europe/Berlin",
});
export function formatAddedParts(createdAt: string) {
  const date = new Date(createdAt);
  return {
    date: addedDateFormatter.format(date),
    time: addedTimeFormatter.format(date),
  };
}
