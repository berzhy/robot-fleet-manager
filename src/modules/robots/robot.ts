import type { RobotProblemCode } from "./robot-problems";
import type { FleetSummary, FilterOptions } from "./robot-filters";

export const robotTypes = [
  "cleaning",
  "security",
  "delivery",
  "inspection",
] as const;
type RobotType = (typeof robotTypes)[number];

export const integrationTypes = ["ros2", "vda5050", "vendor-api"] as const;

export const robotPageSize = 10;
export const robotPageSizes = [10, 20, 50] as const;

export const lowBatteryPercent = 15;
export const criticalBatteryPercent = 10;

export const robotActivities = [
  "working",
  "idle",
  "returning",
  "charging",
  "needs-attention",
  "unknown",
] as const;
export type RobotActivity = (typeof robotActivities)[number];

export type Robot = {
  id: string;
  name: string;
  createdAt: string;
  manufacturer: string;
  type: RobotType;
  integrationType: (typeof integrationTypes)[number];
  site: string;
  area: string | null;
  activity: RobotActivity;
  problemCode: RobotProblemCode | null;
  batteryPercent: number | null;
  lastTelemetryAt: string | null;
  lastReceivedAt: string | null;
};

/**
 * A robot as the simulator reads it from the registry: with the latest
 * command (target and revision) and the revision the robot last applied.
 */
export type RegistryRobot = Robot & {
  controlTarget: "work" | "stop" | "base";
  controlRevision: number;
  appliedControlRevision: number;
};

export type RobotPage = {
  summary: FleetSummary;
  fleetTotal: number;
  filterOptions: FilterOptions;
  evaluatedAt: number;
  items: Robot[];
  total: number;
  page: number;
  pageSize: number;
};

export type SiteRobot = Pick<Robot, "id" | "name" | "area" | "lastReceivedAt">;
export type RobotContext = {
  robot: Robot;
  siteRobots: SiteRobot[];
  verifiedAt: number;
};
