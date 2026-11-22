import type { Robot, RobotPage } from "@/common/types";
import { toRobot, type RobotRow } from "@/server/robots/robot-status";

/**
 * A registered robot that has not reported yet; a test overrides what it
 * checks. The server's fields are worked out at `evaluatedAt`, so a test that
 * changes a stored field passes the robot through here again.
 */
export function testRobot(
  overrides: Partial<RobotRow> = {},
  evaluatedAt = Date.now(),
): Robot {
  return toRobot({ ...testRow, ...overrides }, evaluatedAt);
}

const testRow: RobotRow = {
  id: "test",
  name: "Test robot",
  manufacturer: "Test manufacturer",
  type: "inspection",
  integrationType: "vendor-api",
  site: "Munich",
  createdAt: "2026-11-14T12:00:00.000Z",
  area: null,
  activity: null,
  problemCode: null,
  batteryPercent: null,
  lastReceivedAt: null,
  queuedControlTarget: null,
};

/**
 * A list response holding `items`. Counts follow `total`, which defaults to the
 * items given; `fleetTotal` sets the fleet and matching counts on their own.
 */
export function testRobotPage(
  items: Robot[] = [],
  {
    fleetTotal,
    ...overrides
  }: Partial<RobotPage> & { fleetTotal?: number } = {},
): RobotPage {
  const total = overrides.total ?? items.length;
  const fleet = fleetTotal ?? total;
  return {
    items,
    total,
    page: 0,
    pageSize: 10,
    summary: { all: fleet, "needs-attention": 0, offline: 0, "low-battery": 0 },
    fleetTotal: fleet,
    filterOptions: { sites: ["Munich"], manufacturers: ["Maker"] },
    evaluatedAt: Date.now(),
    ...overrides,
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
});
