export const fleetViews = [
  "all",
  "needs-attention",
  "offline",
  "low-battery",
] as const;
type FleetView = (typeof fleetViews)[number];
export type FleetSummary = Record<FleetView, number>;
export type FilterOptions = { sites: string[]; manufacturers: string[] };

// The views' definitions, which the filter help text quotes. A battery counts
// from the threshold down; a report is offline once older than offlineAfterMs.
export const lowBatteryPercent = 20;
export const criticalBatteryPercent = 10;
export const offlineAfterMs = 15_000;
