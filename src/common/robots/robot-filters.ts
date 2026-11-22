export const fleetViews = [
  "all",
  "needs-attention",
  "offline",
  "low-battery",
] as const;
type FleetView = (typeof fleetViews)[number];
export type FleetSummary = Record<FleetView, number>;
export type FilterOptions = { sites: string[]; manufacturers: string[] };
