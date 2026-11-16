import { z } from "zod";
import { integrationTypes, robotTypes } from "./robot";

export const fleetViews = [
  "all",
  "needs-attention",
  "offline",
  "low-battery",
] as const;
export const robotFiltersSchema = z.object({
  search: z.string().trim().min(2).max(100).optional(),
  site: z.string().min(1).max(100).optional(),
  manufacturer: z.string().min(1).max(100).optional(),
  integrationType: z.enum(integrationTypes).optional(),
  type: z.enum(robotTypes).optional(),
  view: z.enum(fleetViews).default("all"),
});
export type RobotFilters = z.infer<typeof robotFiltersSchema>;
export type FleetSummary = Record<RobotFilters["view"], number>;
export type FilterOptions = { sites: string[]; manufacturers: string[] };
