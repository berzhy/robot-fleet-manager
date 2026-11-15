export const robotPageSize = 20;
export const robotPageSizes = [10, 20, 100] as const;
export type RobotActivity =
  "working" | "idle" | "charging" | "blocked" | "unknown";
export type Robot = {
  id: string;
  name: string;
  createdAt: string;
  manufacturer: string;
  site: string;
  area: string | null;
  activity: RobotActivity;
  batteryPercent: number | null;
  lastTelemetryAt: string | null;
};
export type RobotPage = {
  items: Robot[];
  total: number;
  page: number;
  pageSize: number;
};
