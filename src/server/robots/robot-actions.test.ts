import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { robotProblemCodes } from "@/common/constants";
import {
  openTestDatabase,
  removeTestDatabase,
} from "@/server/db/test-database";
import { testRobotInput } from "@/server/robots/test-robot-input";

import type { FleetDatabase } from "../db/database";
import { latestTelemetry } from "../db/schema";
import { createRobot, getRobot, robotRegistry } from "./robots";
import { robotHandlers } from "./robot-handlers";

// Control state is internal: only the simulator's registry exposes it.
function registryEntry(db: FleetDatabase, id: string) {
  return robotRegistry(db).find((robot) => robot.id === id);
}

let db: FleetDatabase;

beforeEach(() => {
  db = openTestDatabase();
});

afterEach(() => {
  removeTestDatabase(db);
  vi.restoreAllMocks();
});

test("actions validate current state, persist latest intent, and stay queued until applied", async () => {
  const api = robotHandlers(() => db);
  const robot = createRobot(db, testRobotInput);
  const action = (value: unknown, id = robot.id) =>
    api.requestAction(
      id,
      new Request("http://local", {
        method: "POST",
        body: JSON.stringify(value),
      }),
    );

  expect((await action({ action: "start" })).status).toBe(409);
  expect((await action({ action: "invalid" })).status).toBe(400);
  expect((await action({ action: "stop" }, "missing")).status).toBe(404);

  db.insert(latestTelemetry)
    .values({
      robotId: robot.id,
      activity: "working",
      batteryPercent: 50,
      area: "Lobby",
      observedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
    })
    .run();

  expect((await action({ action: "start" })).status).toBe(409);

  expect((await action({ action: "stop" })).status).toBe(202);
  expect(registryEntry(db, robot.id)).toMatchObject({
    activity: "working",
    controlTarget: "stop",
    controlRevision: 1,
    appliedControlRevision: 0,
  });
  expect(getRobot(db, robot.id)?.queuedActions).toEqual(["stop"]);

  expect((await action({ action: "return-to-base" })).status).toBe(202);
  expect(registryEntry(db, robot.id)).toMatchObject({
    controlTarget: "base",
    controlRevision: 2,
  });
  expect(getRobot(db, robot.id)?.queuedActions).toEqual(["return-to-base"]);

  db.$client
    .prepare(
      "UPDATE latest_telemetry SET applied_control_revision = 2 WHERE robot_id = ?",
    )
    .run(robot.id);
  expect(getRobot(db, robot.id)?.queuedActions).toEqual([]);

  db.$client
    .prepare("UPDATE latest_telemetry SET received_at = ? WHERE robot_id = ?")
    .run(new Date(Date.now() - 11000).toISOString(), robot.id);

  expect((await action({ action: "stop" })).status).toBe(409);
  expect(registryEntry(db, robot.id)?.controlRevision).toBe(2);
});

test.each(robotProblemCodes)(
  "Retry for %s reissues work with a new revision",
  async (problemCode) => {
    const api = robotHandlers(() => db);
    const robot = createRobot(db, testRobotInput);
    db.insert(latestTelemetry)
      .values({
        robotId: robot.id,
        activity: "needs-attention",
        problemCode,
        batteryPercent: 50,
        area: "Lobby",
        observedAt: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
      })
      .run();

    const response = await api.requestAction(
      robot.id,
      new Request("http://local", {
        method: "POST",
        body: JSON.stringify({ action: "retry" }),
      }),
    );

    expect(response.status).toBe(202);
    expect(registryEntry(db, robot.id)).toMatchObject({
      controlTarget: "work",
      controlRevision: 1,
      activity: "needs-attention",
      problemCode,
    });
  },
);

test("action persistence failures roll back the target and return a generic error", async () => {
  const api = robotHandlers(() => db);
  const robot = createRobot(db, testRobotInput);
  db.insert(latestTelemetry)
    .values({
      robotId: robot.id,
      activity: "working",
      batteryPercent: 50,
      area: "Lobby",
      observedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
    })
    .run();
  db.$client.exec(
    "CREATE TRIGGER fail_control BEFORE UPDATE ON robots BEGIN SELECT RAISE(ABORT, 'private failure'); END;",
  );
  vi.spyOn(console, "error").mockImplementation(() => {});

  const response = await api.requestAction(
    robot.id,
    new Request("http://local", {
      method: "POST",
      body: JSON.stringify({ action: "stop" }),
    }),
  );

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({
    error: {
      message: "Unable to request robot action.",
    },
  });
  expect(registryEntry(db, robot.id)).toMatchObject({
    controlTarget: "work",
    controlRevision: 0,
  });
});

test.each(
  (["idle", "charging"] as const).flatMap((activity) =>
    [20, 20.1, null].map(
      (batteryPercent) => [activity, batteryPercent] as const,
    ),
  ),
)(
  "Start activity from %s requires a known battery above 20%% (%s)",
  async (activity, batteryPercent) => {
    const api = robotHandlers(() => db);
    const robot = createRobot(db, testRobotInput);
    db.insert(latestTelemetry)
      .values({
        robotId: robot.id,
        activity,
        batteryPercent,
        area: "Base",
        observedAt: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
      })
      .run();

    const response = await api.requestAction(
      robot.id,
      new Request("http://local", {
        method: "POST",
        body: JSON.stringify({ action: "start" }),
      }),
    );

    const allowed = batteryPercent !== null && batteryPercent > 20;
    expect(response.status).toBe(allowed ? 202 : 409);
    expect(registryEntry(db, robot.id)?.controlRevision).toBe(allowed ? 1 : 0);
  },
);
