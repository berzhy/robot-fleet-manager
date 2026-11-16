import type { RobotFilters } from "@/modules/robots/robot-filters";

export function formatBattery(value: number | null) {
  return value === null ? "Unknown" : `${Math.round(value)}%`;
}

export {
  formatRobotType,
  formatIntegrationType,
  formatActivity,
} from "@/modules/robots/robot-labels";

const addedFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "long",
  timeZone: "Europe/Berlin",
});
export function formatAdded(createdAt: string) {
  return addedFormatter.format(new Date(createdAt));
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

function robotWord(count: number) {
  return count === 1 ? "robot" : "robots";
}

export function formatResultCount(
  total: number,
  matchingTotal: number,
  filters: RobotFilters,
) {
  const hasCriteria = Boolean(
    filters.search ||
    filters.site ||
    filters.type ||
    filters.manufacturer ||
    filters.integrationType,
  );
  const count =
    filters.view !== "all"
      ? `${total} of ${matchingTotal} matching ${robotWord(matchingTotal)}`
      : hasCriteria
        ? `${matchingTotal} matching ${robotWord(matchingTotal)}`
        : `${total} ${robotWord(total)}`;
  return `${count} · Newest first`;
}
