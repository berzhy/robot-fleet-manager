export function formatBattery(value: number | null) {
  return value === null ? "Unknown" : `${Math.round(value)}%`;
}

export {
  formatRobotType,
  formatIntegrationType,
  formatActivity,
} from "@/modules/robots/robot-labels";

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
