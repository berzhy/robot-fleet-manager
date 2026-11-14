export type Robot = {
  id: string;
  name: string;
  manufacturer: string;
  site: string;
  area: string | null;
  activity: "working" | "idle" | "charging" | "blocked" | "unknown";
  batteryPercent: number | null;
};

export type DemoScenario = "success" | "empty" | "error";

export type RobotQueryState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; robots: Robot[] };
