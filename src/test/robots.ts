import type { Robot, RobotPage } from "@/modules/robots/robot";

/** A registered robot that has not reported yet; a test overrides what it checks. */
export function testRobot(overrides: Partial<Robot> = {}): Robot {
  return {
    id: "test",
    name: "Test robot",
    manufacturer: "Test manufacturer",
    type: "inspection",
    integrationType: "vendor-api",
    site: "Munich",
    createdAt: "2026-11-14T12:00:00.000Z",
    area: null,
    activity: "unknown",
    problemCode: null,
    batteryPercent: null,
    lastTelemetryAt: null,
    lastReceivedAt: null,
    queuedControlTarget: null,
    ...overrides,
  };
}

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

export const workingRobot = testRobot({
  id: "control",
  name: "Atlas",
  manufacturer: "Maker",
  integrationType: "ros2",
  site: "Site",
  createdAt: new Date().toISOString(),
  area: "Lobby",
  activity: "working",
  batteryPercent: 50,
  lastReceivedAt: new Date().toISOString(),
  lastTelemetryAt: new Date().toISOString(),
});
