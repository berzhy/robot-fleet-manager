import type { BatteryLevel } from "@/common/robot";

export function formatBattery(value: number | null) {
  return value === null ? "Unknown" : `${Math.round(value)}%`;
}

/** As the fleet views read: Low battery warns, Needs attention is an error. */
export const batteryLevelColors: Partial<Record<BatteryLevel, string>> = {
  low: "warning.main",
  critical: "error.main",
};

// One fixed locale and zone, so the server render and the browser agree and
// every time reads as at the fleet's German sites: English words, European
// dates and the 24-hour clock.
const locale = "en-GB";
const timeZone = "Europe/Berlin";

const timestampFormatter = new Intl.DateTimeFormat(locale, {
  dateStyle: "medium",
  timeStyle: "long",
  timeZone,
});

export function formatRobotTimestamp(timestamp: string) {
  return timestampFormatter.format(new Date(timestamp));
}

const dateFormatter = new Intl.DateTimeFormat(locale, {
  dateStyle: "medium",
  timeZone,
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat(locale, {
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
