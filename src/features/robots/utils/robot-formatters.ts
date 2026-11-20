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

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
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
    date: dateFormatter.format(date),
    time: addedTimeFormatter.format(date),
  };
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en-GB", {
  style: "short",
});
const minuteMs = 60_000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

/**
 * "12 sec ago" up to a day, then the date; the exact time belongs in a
 * tooltip. Measured against the snapshot time, like the connection status.
 */
export function formatTimeAgo(timestamp: string, now: number) {
  // A report stamped after the snapshot time must not read "in 2 sec".
  const age = Math.max(0, now - Date.parse(timestamp));
  if (age >= dayMs) {
    return dateFormatter.format(new Date(timestamp));
  }
  const [unitMs, unit] =
    age >= hourMs
      ? [hourMs, "hour" as const]
      : age >= minuteMs
        ? [minuteMs, "minute" as const]
        : [1000, "second" as const];
  return relativeTimeFormatter.format(-Math.floor(age / unitMs), unit);
}
