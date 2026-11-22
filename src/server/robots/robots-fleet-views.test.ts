import { afterEach, beforeEach, expect, test } from "vitest";

import { robotActivities } from "@/common/robots/robot";
import type { RobotFilters } from "@/common/robots/robot-schemas";
import { batteryLevel } from "@/common/robots/robot-reading";
import {
  connectionStatus,
  delayedReportMaxAgeMs,
  onlineReportMaxAgeMs,
} from "@/common/telemetry/freshness";
import { openTestDatabase, removeTestDatabase } from "@/test/database";
import { testRobotInput } from "@/test/robots";

import type { FleetDatabase } from "../db/database";
import { latestTelemetry } from "../db/schema";
import { createRobots, listRobots } from "./robots";

// The fleet views count robots in SQL, while screens colour each robot with
// the TypeScript rules; the two must put every robot in the same place.
const batteryPercents = [null, 0, 9, 10, 11, 19, 20, 21, 100];
// A minute of margin around each boundary, so the time a query runs at
// cannot move a robot across one.
const reportAgesMs = [
  0,
  onlineReportMaxAgeMs + 60_000,
  delayedReportMaxAgeMs + 60_000,
];
const fleetPageSize = 1_000;

let db: FleetDatabase;

beforeEach(() => {
  db = openTestDatabase();
});

afterEach(() => removeTestDatabase(db));

test("the SQL fleet views and the TypeScript rules agree on every robot", () => {
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

  function idsIn(view: RobotFilters["view"]) {
    return new Set(
      listRobots(db, 0, fleetPageSize, { view }).items.map((robot) => robot.id),
    );
  }
  const lowBattery = idsIn("low-battery");
  const offline = idsIn("offline");
  const needsAttention = idsIn("needs-attention");

  const robots = listRobots(db, 0, fleetPageSize).items;
  expect(robots).toHaveLength(cases.length);

  for (const robot of robots) {
    const level = batteryLevel(robot);
    const isOffline = connectionStatus(robot.lastReceivedAt, now) === "offline";

    expect(lowBattery.has(robot.id), robot.id).toBe(level !== null);
    expect(offline.has(robot.id), robot.id).toBe(isOffline);
    expect(needsAttention.has(robot.id), robot.id).toBe(
      isOffline || level === "critical" || robot.problemCode !== null,
    );
  }
});
