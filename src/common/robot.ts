import type { RobotAction } from "./robot-actions";
import type { FleetSummary, FilterOptions } from "./robot-filters";
import type { RobotProblemCode } from "./robot-problems";

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

export const robotActivities = [
  "working",
  "idle",
  "returning",
  "charging",
  "needs-attention",
] as const;
export type RobotActivity = (typeof robotActivities)[number];

/** What the robot's latest command asks of it. */
export const controlTargets = ["work", "stop", "base"] as const;
export type ControlTarget = (typeof controlTargets)[number];

/** How recent the robot's last report is when the server answers. */
export type ConnectionStatus = "online" | "delayed" | "offline";

/**
 * The band the fleet views count the battery in. A charging robot is
 * "normal" whatever its charge, since the views never flag it.
 */
export type BatteryLevel = "normal" | "low" | "critical";

/** `null` fields mean the robot has not reported them yet. */
export type Robot = {
  id: string;
  name: string;
  createdAt: string;
  manufacturer: string;
  type: RobotType;
  integrationType: (typeof integrationTypes)[number];
  site: string;
  area: string | null;
  activity: RobotActivity | null;
  problemCode: RobotProblemCode | null;
  batteryPercent: number | null;
  lastReceivedAt: string | null;
  /** The latest command's target until the robot reports applying it, else `null`. */
  queuedControlTarget: ControlTarget | null;
  // Worked out by the server at the response's `evaluatedAt`.
  connection: ConnectionStatus | null;
  batteryLevel: BatteryLevel | null;
  /** Why each action the robot's state rules out is unavailable. */
  blockedActions: Partial<Record<RobotAction, string>>;
};

/**
 * A robot as the simulator reads it from the registry: with the latest
 * command (target and revision) and the revision the robot last applied.
 */
export type RegistryRobot = Robot & {
  controlTarget: ControlTarget;
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

/** How many of the site's other robots last reported this area. */
export type PeerCount = { area: string | null; count: number };
export type RobotContext = {
  robot: Robot;
  /** Counts rather than the robots: the map shows only how many are where. */
  peerCounts: PeerCount[];
  evaluatedAt: number;
};
