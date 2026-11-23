import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { offlineAfterMs, robotActivities } from "@/common/constants";
import type { RobotFilters } from "@/common/schemas";
import {
  openTestDatabase,
  removeTestDatabase,
} from "@/server/db/test-database";
import { testRobotInput } from "@/server/robots/test-robots";

import type { FleetDatabase } from "../db/database";
import { latestTelemetry } from "../db/schema";
import { onlineReportMaxAgeMs } from "./robot-status";
import { createRobots, listRobots } from "./robots";

// The fleet views count robots in SQL, while each robot's connection and
// battery level are worked out in TypeScript; the two must agree on every one.
const batteryPercents = [null, 0, 9, 10, 11, 19, 20, 21, 100];
const reportAgesMs = [
  0,
  onlineReportMaxAgeMs,
  onlineReportMaxAgeMs + 1,
  offlineAfterMs,
  offlineAfterMs + 1,
];
const fleetPageSize = 1_000;

let db: FleetDatabase;

beforeEach(() => {
  db = openTestDatabase();
  // One instant for every query, so a robot on a boundary stays on it.
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  removeTestDatabase(db);
});

test("the SQL fleet views and each robot's connection and battery level agree", () => {
  const now = Date.now();
  const cases = robotActivities.flatMap((activity) =>
    batteryPercents.flatMap((batteryPercent) =>
      [...reportAgesMs, null].map((ageMs) => ({
        activity,
        // The schema ties a problem to the Needs attention activity.
        problemCode:
          activity === "needs-attention" ? ("path-blocked" as const) : null,
        batteryPercent,
        receivedAt: ageMs === null ? null : new Date(now - ageMs).toISOString(),
      })),
    ),
  );
  const created = createRobots(
    db,
    cases.map(() => testRobotInput),
  );
  db.insert(latestTelemetry)
    .values(
      created.map((robot, index) => ({
        robotId: robot.id,
        ...cases[index],
        observedAt: new Date(now).toISOString(),
      })),
    )
    .run();
  // Robots that have never reported.
  createRobots(db, [testRobotInput, testRobotInput]);

  function idsIn(view: RobotFilters["view"]) {
    return new Set(
      listRobots(db, 0, fleetPageSize, { view }).items.map((robot) => robot.id),
    );
  }
  const lowBattery = idsIn("low-battery");
  const offline = idsIn("offline");
  const needsAttention = idsIn("needs-attention");

  const robots = listRobots(db, 0, fleetPageSize).items;
  expect(robots).toHaveLength(cases.length + 2);

  for (const robot of robots) {
    const isLow =
      robot.batteryLevel === "low" || robot.batteryLevel === "critical";
    const isOffline = robot.connection === "offline";

    expect(lowBattery.has(robot.id), robot.id).toBe(isLow);
    expect(offline.has(robot.id), robot.id).toBe(isOffline);
    expect(needsAttention.has(robot.id), robot.id).toBe(
      isOffline ||
        robot.batteryLevel === "critical" ||
        robot.problemCode !== null,
    );
  }
});
