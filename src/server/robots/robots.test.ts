import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { robotTypes, integrationTypes } from "@/common/robot";
import { openTestDatabase, removeTestDatabase } from "@/test/database";
import { testRobotInput } from "@/test/robots";

import { openDatabase, type FleetDatabase } from "../db/database";
import { latestTelemetry, robots } from "../db/schema";
import {
  createRobots,
  createRobot,
  deleteRobot,
  getRobot,
  getRobotContext,
  listRobots,
  robotRegistry,
} from "./robots";
import { robotHandlers } from "./robot-handlers";

const newRobotControl = {
  controlTarget: "work",
  controlRevision: 0,
  appliedControlRevision: 0,
} as const;

let db: FleetDatabase;

beforeEach(() => {
  db = openTestDatabase();
});

afterEach(() => {
  removeTestDatabase(db);
  vi.restoreAllMocks();
});

test("created metadata persists after reopening with unknown telemetry", () => {
  const robot = createRobot(db, testRobotInput);

  expect(robot).toMatchObject({
    ...testRobotInput,
    activity: null,
    connection: null,
    batteryLevel: null,
    area: null,
    batteryPercent: null,
    queuedControlTarget: null,
    lastReceivedAt: null,
  });
  expect(Number.isNaN(Date.parse(robot.createdAt))).toBe(false);

  const file = db.$client.name;
  db.$client.close();
  db = openDatabase(file);

  expect(robot).toMatchObject(getRobot(db, robot.id)!);
  const snapshot = getRobotContext(db, robot.id);
  expect(snapshot?.robot).toEqual(robot);
  expect(typeof snapshot?.evaluatedAt).toBe("number");
  expect(getRobotContext(db, "missing")).toBeUndefined();
});

test("pagination orders newest first with descending id tie-breaking", () => {
  for (let i = 0; i < 21; i++) {
    db.insert(robots)
      .values({
        ...testRobotInput,
        id: String(i).padStart(2, "0"),
        name:
          i < 2
            ? i === 0
              ? "alpha"
              : "Alpha"
            : `Robot ${String(i).padStart(2, "0")}`,
        createdAt: new Date(
          Date.UTC(2026, 0, Math.min(i, 19) + 1),
        ).toISOString(),
      })
      .run();
  }

  expect(listRobots(db, 0, 20).items.map((r) => r.id)).toEqual(
    Array.from({ length: 20 }, (_, i) => String(20 - i).padStart(2, "0")),
  );
  expect(listRobots(db, 1, 20)).toMatchObject({
    total: 21,
    page: 1,
    pageSize: 20,
    items: [{ id: "00" }],
  });
  expect(listRobots(db, 9)).toMatchObject({ items: [], total: 21, page: 9 });
});

test("deletion cascades only the selected robot's telemetry", () => {
  const first = createRobot(db, testRobotInput);
  const second = createRobot(db, { ...testRobotInput, name: "Other robot" });
  const observedAt = "2026-11-15T10:00:00.000Z";
  db.insert(latestTelemetry)
    .values([
      {
        robotId: first.id,
        activity: "working",
        batteryPercent: 42,
        area: "Lobby",
        observedAt,
      },
      {
        robotId: second.id,
        activity: "charging",
        batteryPercent: 60,
        area: "Base",
        observedAt,
      },
    ])
    .run();

  expect(getRobot(db, first.id)).toMatchObject({
    activity: "working",
    batteryPercent: 42,
    area: "Lobby",
    queuedControlTarget: null,
  });

  expect(deleteRobot(db, first.id)).toBe(true);
  expect(deleteRobot(db, first.id)).toBe(false);
  expect(getRobot(db, first.id)).toBeUndefined();
  expect(getRobot(db, second.id)).toMatchObject({
    name: "Other robot",
    activity: "charging",
  });
  expect(
    db
      .select()
      .from(latestTelemetry)
      .all()
      .map((row) => row.robotId),
  ).toEqual([second.id]);
});

test("batch creation rolls back every insert if a later database write fails", () => {
  db.$client.exec(
    "CREATE TRIGGER fail_batch BEFORE INSERT ON robots WHEN NEW.name = 'Fail' BEGIN SELECT RAISE(ABORT, 'Test failure'); END;",
  );

  expect(() =>
    createRobots(db, [testRobotInput, { ...testRobotInput, name: "Fail" }]),
  ).toThrow();
  expect(listRobots(db, 0).total).toBe(0);
});

test.each(robotTypes)(
  "%s type persists in creation, list, details and registry",
  (type) => {
    const robot = createRobot(db, { ...testRobotInput, type });

    expect(robot.type).toBe(type);
    expect(robot).toMatchObject(getRobot(db, robot.id)!);
    expect(listRobots(db, 0).items).toEqual([robot]);
    expect(robotRegistry(db)).toEqual([{ ...robot, ...newRobotControl }]);
  },
);

test("fresh schema rejects missing and unsupported types even outside the API", () => {
  const insert = db.$client.prepare(
    "INSERT INTO robots (id, name, manufacturer, site, created_at, type, integration_type) VALUES (?, ?, ?, ?, ?, ?, 'vendor-api')",
  );

  for (const type of [null, "unknown", "measurement"]) {
    expect(() =>
      insert.run(
        "invalid",
        "Name",
        "Maker",
        "Site",
        "2026-01-01T00:00:00.000Z",
        type,
      ),
    ).toThrow();
  }
  expect(listRobots(db, 0).total).toBe(0);
});

test.each(integrationTypes)(
  "%s integration persists in list, details and registry",
  (integrationType) => {
    const robot = createRobot(db, { ...testRobotInput, integrationType });

    expect(robot.integrationType).toBe(integrationType);
    expect(robot).toMatchObject(getRobot(db, robot.id)!);
    expect(listRobots(db, 0).items).toEqual([robot]);
    expect(robotRegistry(db)).toEqual([{ ...robot, ...newRobotControl }]);
  },
);

test("fresh schema rejects missing and unsupported integrations outside the API", () => {
  const insert = db.$client.prepare(
    "INSERT INTO robots (id, name, manufacturer, site, created_at, type, integration_type) VALUES ('invalid', 'Name', 'Maker', 'Site', '2026-01-01T00:00:00Z', 'inspection', ?)",
  );

  for (const integrationType of [null, "unsupported"]) {
    expect(() => insert.run(integrationType)).toThrow();
  }
  expect(listRobots(db, 0).total).toBe(0);
});

test("detail context counts only same-site peers per area and returns 404 for a missing robot", async () => {
  const selected = createRobot(db, testRobotInput);
  const [lobbyPeer, otherLobbyPeer] = createRobots(db, [
    { ...testRobotInput, name: "Lobby peer" },
    { ...testRobotInput, name: "Other lobby peer" },
    { ...testRobotInput, name: "Unreported peer" },
  ]);
  createRobot(db, { ...testRobotInput, site: "Berlin" });
  db.insert(latestTelemetry)
    .values(
      [selected, lobbyPeer, otherLobbyPeer].map((robot) => ({
        robotId: robot.id,
        activity: "working" as const,
        area: "Lobby",
        observedAt: new Date().toISOString(),
      })),
    )
    .run();

  const context = getRobotContext(db, selected.id)!;

  expect(context.robot.id).toBe(selected.id);
  expect(context.peerCounts).toEqual([
    { area: null, count: 1 },
    { area: "Lobby", count: 2 },
  ]);

  const response = robotHandlers(() => db).context(selected.id);

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    robot: { id: selected.id },
    peerCounts: [{ area: null }, { area: "Lobby" }],
  });

  expect(robotHandlers(() => db).context("missing").status).toBe(404);
});
