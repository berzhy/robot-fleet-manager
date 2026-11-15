import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import type { Robot } from "@/modules/robots/robot";

import { openDatabase, type FleetDatabase } from "../db/database";
import { latestTelemetry, robots } from "../db/schema";
import {
  createRobots,
  createRobot,
  deleteRobot,
  getRobot,
  getRobotSnapshot,
  listRobots,
} from "./robots";
import { robotHandlers } from "./robot-handlers";
let directory: string;
let db: FleetDatabase;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "fleet-"));
  db = openDatabase(join(directory, "test.sqlite"));
  migrate(db, { migrationsFolder: "./drizzle" });
});
afterEach(() => {
  db.$client.close();
  rmSync(directory, { recursive: true, force: true });
  vi.restoreAllMocks();
});
const input = { name: "New robot", manufacturer: "Maker", site: "Munich" };
test("created metadata persists after reopening with unknown telemetry", () => {
  const robot = createRobot(db, { ...input, name: "  New robot  " });
  expect(robot).toMatchObject({
    ...input,
    activity: "unknown",
    area: null,
    batteryPercent: null,
    lastTelemetryAt: null,
    lastReceivedAt: null,
  });
  expect(Number.isNaN(Date.parse(robot.createdAt))).toBe(false);
  db.$client.close();
  db = openDatabase(join(directory, "test.sqlite"));
  expect(getRobot(db, robot.id)).toEqual(robot);
  const snapshot = getRobotSnapshot(db, robot.id);
  expect(snapshot?.robot).toEqual(robot);
  expect(typeof snapshot?.verifiedAt).toBe("number");
  expect(getRobotSnapshot(db, "missing")).toBeUndefined();
  expect(() => createRobot(db, { ...input, name: " " })).toThrow();
});
test("pagination orders newest first with descending id tie-breaking", () => {
  for (let i = 0; i < 21; i++)
    db.insert(robots)
      .values({
        ...input,
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
  expect(listRobots(db, 0).items.map((r) => r.id)).toEqual(
    Array.from({ length: 20 }, (_, i) => String(20 - i).padStart(2, "0")),
  );
  expect(listRobots(db, 1)).toMatchObject({
    total: 21,
    page: 1,
    pageSize: 20,
    items: [{ id: "00" }],
  });
  expect(listRobots(db, 9)).toMatchObject({ items: [], total: 21, page: 9 });
});
test("deletion cascades only the selected robot's telemetry", () => {
  const first = createRobot(db, input);
  const second = createRobot(db, { ...input, name: "Other robot" });
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
    lastTelemetryAt: observedAt,
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
test("HTTP contracts create/read/list/delete and reject invalid requests", async () => {
  const api = robotHandlers(() => db);
  const post = (value: unknown) =>
    api.create(
      new Request("http://local/api/robots", {
        method: "POST",
        body: JSON.stringify(value),
      }),
    );
  expect((await post({ ...input, extra: true })).status).toBe(400);
  expect((await post({ ...input, name: " " })).status).toBe(400);
  expect((await post({ ...input, name: "x".repeat(101) })).status).toBe(400);
  expect(
    (
      await api.create(
        new Request("http://local/api/robots", { method: "POST", body: "{" }),
      )
    ).status,
  ).toBe(400);
  const response = await post(input);
  expect(response.status).toBe(201);
  const robot = (await response.json()) as Robot;
  expect(await api.get(robot.id).json()).toEqual(robot);
  expect(
    await api.list(new Request("http://local/api/robots")).json(),
  ).toMatchObject({ items: [robot] });
  expect(
    await api.list(new Request("http://local/api/robots?page=9")).json(),
  ).toMatchObject({ items: [], total: 1, page: 9, pageSize: 20 });
  for (const page of ["-1", "abc", "1.5", "Infinity"])
    expect(
      api.list(new Request(`http://local/api/robots?page=${page}`)).status,
    ).toBe(400);
  expect(api.remove(robot.id).status).toBe(204);
  expect(api.remove(robot.id).status).toBe(404);
  expect(api.get(robot.id).status).toBe(404);
});
test("database failures return generic errors without leaking details", async () => {
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  const api = robotHandlers(() => {
    throw new Error("private database path");
  });
  const response = api.list(new Request("http://local/api/robots"));
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({
    error: {
      code: "INTERNAL_ERROR",
      message: "Unable to complete robot request.",
    },
  });
  expect(logged).toHaveBeenCalledOnce();
});

test("HTTP page size controls database pagination and unsupported sizes are rejected", async () => {
  for (let i = 0; i < 21; i++)
    db.insert(robots)
      .values({
        ...input,
        id: String(i).padStart(2, "0"),
        createdAt: "2026-11-14T12:00:00.000Z",
      })
      .run();
  const api = robotHandlers(() => db);
  const result = (await api
    .list(new Request("http://local/api/robots?page=1&pageSize=10"))
    .json()) as { items: Robot[]; total: number; pageSize: number };
  expect(result.total).toBe(21);
  expect(result.pageSize).toBe(10);
  expect(result.items).toHaveLength(10);
  expect(result.items[0].id).toBe("10");
  for (const size of ["-1", "0", "11", "50", "101", "abc", "20.5"])
    expect(
      api.list(new Request(`http://local/api/robots?pageSize=${size}`)).status,
    ).toBe(400);
  for (const size of [10, 20, 100])
    expect(
      await api
        .list(new Request(`http://local/api/robots?pageSize=${size}`))
        .json(),
    ).toMatchObject({ pageSize: size });
});

test.each([10, 100])(
  "batch endpoint creates %i persisted robots in one request",
  async (count) => {
    const api = robotHandlers(() => db);
    const response = await api.createBatch(
      new Request("http://local/api/robots/batch", {
        method: "POST",
        body: JSON.stringify({
          robots: Array.from({ length: count }, (_, i) => ({
            ...input,
            name: `Batch ${i}`,
          })),
        }),
      }),
    );
    expect(response.status).toBe(201);
    const result = (await response.json()) as { items: Robot[] };
    expect(result.items).toHaveLength(count);
    expect(new Set(result.items.map((robot) => robot.id)).size).toBe(count);
    expect(listRobots(db, 0).total).toBe(count);
    expect(getRobot(db, result.items[0].id)).toEqual(result.items[0]);
  },
);

test("batch creation rolls back every insert if a later database write fails", () => {
  db.$client.exec(
    "CREATE TRIGGER fail_batch BEFORE INSERT ON robots WHEN NEW.name = 'Fail' BEGIN SELECT RAISE(ABORT, 'Test failure'); END;",
  );
  expect(() => createRobots(db, [input, { ...input, name: "Fail" }])).toThrow();
  expect(listRobots(db, 0).total).toBe(0);
});

test("invalid, empty and oversized batches write nothing", async () => {
  const api = robotHandlers(() => db);
  for (const robots of [
    [],
    Array.from({ length: 101 }, () => input),
    [input, { ...input, name: "" }],
  ]) {
    const response = await api.createBatch(
      new Request("http://local/api/robots/batch", {
        method: "POST",
        body: JSON.stringify({ robots }),
      }),
    );
    expect(response.status).toBe(400);
    expect(listRobots(db, 0).total).toBe(0);
  }
});
