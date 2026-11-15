export const robotTypes = [
  "cleaning",
  "security",
  "delivery",
  "inspection",
] as const;
type RobotType = (typeof robotTypes)[number];

export const integrationTypes = ["ros2", "vda5050", "vendor-api"] as const;

export const robotPageSize = 20;
export const robotPageSizes = [10, 20, 100] as const;
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
  problemCode: "path-blocked" | null;
  controlTarget: "work" | "stop" | "base";
  controlRevision: number;
  appliedControlRevision: number;
  batteryPercent: number | null;
  lastTelemetryAt: string | null;
  lastReceivedAt: string | null;
};
export type RobotPage = {
  items: Robot[];
  total: number;
  page: number;
  pageSize: number;
};
