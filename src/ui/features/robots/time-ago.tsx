import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";

/** A relative time, with the exact one on hover, or on focus when focusable. */
export default function TimeAgo({
  timestamp,
  now,
  tabIndex,
  sx,
  "data-testid": testId,
}: {
  timestamp: string;
  now: number;
  tabIndex?: number;
  sx?: SxProps<Theme>;
  "data-testid"?: string;
}) {
  return (
    <Tooltip title={formatRobotTimestamp(timestamp)} describeChild>
      <Box
        component="time"
        data-testid={testId}
        dateTime={timestamp}
        tabIndex={tabIndex}
        sx={sx}
      >
        {formatTimeAgo(timestamp, now)}
      </Box>
    </Tooltip>
  );
}

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
 * "12 sec ago" up to a day, then the date. Measured against the snapshot
 * time, like the connection status.
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
