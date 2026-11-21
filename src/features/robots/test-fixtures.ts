import type { Robot, RobotPage } from "@/modules/robots/robot";

export function pageMetadata(
  total = 0,
): Pick<RobotPage, "summary" | "fleetTotal" | "filterOptions" | "evaluatedAt"> {
  return {
    summary: { all: total, "needs-attention": 0, offline: 0, "low-battery": 0 },
    fleetTotal: total,
    filterOptions: { sites: ["Munich"], manufacturers: ["Maker"] },
    evaluatedAt: Date.now(),
  };
}

export const workingRobot: Robot = {
  id: "control",
  name: "Atlas",
  manufacturer: "Maker",
  type: "inspection",
  integrationType: "ros2",
  site: "Site",
  createdAt: new Date().toISOString(),
  area: "Lobby",
  activity: "working",
  batteryPercent: 50,
  lastReceivedAt: new Date().toISOString(),
  lastTelemetryAt: new Date().toISOString(),
  queuedControlTarget: null,
  problemCode: null,
};
