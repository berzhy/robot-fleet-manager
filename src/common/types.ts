import type {
  controlTargets,
  fleetViews,
  integrationTypes,
  robotActions,
  robotActivities,
  robotProblemCodes,
  robotTypes,
} from "./constants";

export type RobotType = (typeof robotTypes)[number];
export type IntegrationType = (typeof integrationTypes)[number];
export type RobotActivity = (typeof robotActivities)[number];
export type RobotProblemCode = (typeof robotProblemCodes)[number];
export type RobotAction = (typeof robotActions)[number];
export type ControlTarget = (typeof controlTargets)[number];
type FleetView = (typeof fleetViews)[number];

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
  integrationType: IntegrationType;
  site: string;
  area: string | null;
  activity: RobotActivity | null;
  problemCode: RobotProblemCode | null;
  batteryPercent: number | null;
  lastReceivedAt: string | null;
  // Worked out by the server at the response's `evaluatedAt`.
  connection: ConnectionStatus | null;
  batteryLevel: BatteryLevel | null;
  /** Why each action the robot's state rules out is unavailable. */
  blockedActions: Partial<Record<RobotAction, string>>;
  /**
   * Actions whose command the connected robot has yet to apply, so its
   * reported activity is from before it. Start and Retry send the same
   * command, so both count. Empty while it is disconnected, since it may
   * never apply it.
   */
  queuedActions: RobotAction[];
};

/**
 * What the simulator reads for each robot: where its last report left it,
 * the latest command (target and revision) and the revision it last applied.
 */
export type RegistryRobot = Pick<
  Robot,
  "id" | "activity" | "problemCode" | "batteryPercent" | "area"
> & {
  controlTarget: ControlTarget;
  controlRevision: number;
  appliedControlRevision: number;
};

type FleetSummary = Record<FleetView, number>;
export type FilterOptions = { sites: string[]; manufacturers: string[] };

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
/** One read of a robot and its site, so the map's counts match the robot shown. */
export type RobotSnapshot = {
  robot: Robot;
  /** Counts rather than the robots: the map shows only how many are where. */
  peerCounts: PeerCount[];
  evaluatedAt: number;
};
