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
export type RobotActivity =
  "working" | "idle" | "charging" | "blocked" | "unknown";
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
