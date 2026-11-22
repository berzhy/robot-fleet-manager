import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Robot } from "@/common/types";
import {
  openTestDatabase,
  removeTestDatabase,
} from "@/server/db/test-database";
import { testRobotInput } from "@/server/robots/test-robot-input";

import type { FleetDatabase } from "../db/database";
import { latestTelemetry, robots } from "../db/schema";
import { createRobots, getRobot, listRobots } from "./robots";
import { robotHandlers } from "./robot-handlers";

let db: FleetDatabase;

beforeEach(() => {
  db = openTestDatabase();
});

afterEach(() => {
  removeTestDatabase(db);
  vi.restoreAllMocks();
});

test("HTTP contracts create/list/delete and reject invalid requests", async () => {
  const api = robotHandlers(() => db);
  const post = (value: unknown) =>
    api.createBatch(
      new Request("http://local/api/robots/batch", {
        method: "POST",
        body: JSON.stringify({ robots: [value] }),
      }),
    );
  const missingType = {
    name: testRobotInput.name,
    manufacturer: testRobotInput.manufacturer,
    site: testRobotInput.site,
    integrationType: testRobotInput.integrationType,
  };

  expect((await post(missingType)).status).toBe(400);
  for (const type of ["unknown", "measurement", "", null]) {
    expect((await post({ ...testRobotInput, type })).status).toBe(400);
  }
  expect(
    (await post({ ...testRobotInput, integrationType: undefined })).status,
  ).toBe(400);
  expect(
    (await post({ ...testRobotInput, integrationType: "unsupported" })).status,
  ).toBe(400);
  expect(listRobots(db, 0).total).toBe(0);

  expect((await post({ ...testRobotInput, extra: true })).status).toBe(400);
  expect((await post({ ...testRobotInput, name: " " })).status).toBe(400);
  expect(
    (await post({ ...testRobotInput, name: "x".repeat(101) })).status,
  ).toBe(400);
  expect(
    (
      await api.createBatch(
        new Request("http://local/api/robots/batch", {
          method: "POST",
          body: "{",
        }),
      )
    ).status,
  ).toBe(400);

  const response = await post({
    ...testRobotInput,
    name: `  ${testRobotInput.name}  `,
  });

  expect(response.status).toBe(201);
  const {
    items: [robot],
  } = (await response.json()) as { items: Robot[] };
  expect(robot.name).toBe(testRobotInput.name);
  expect(robot).toMatchObject(getRobot(db, robot.id)!);
  expect(
    await api.list(new Request("http://local/api/robots")).json(),
  ).toMatchObject({ items: [robot], pageSize: 10 });
  expect(
    await api.list(new Request("http://local/api/robots?page=9")).json(),
  ).toMatchObject({ items: [], total: 1, page: 9, pageSize: 10 });

  for (const page of ["-1", "abc", "1.5", "Infinity"]) {
    expect(
      api.list(new Request(`http://local/api/robots?page=${page}`)).status,
    ).toBe(400);
  }

  expect(api.remove(robot.id).status).toBe(204);
  expect(api.remove(robot.id).status).toBe(404);
  expect(getRobot(db, robot.id)).toBeUndefined();
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
      message: "Unable to complete robot request.",
    },
  });
  expect(logged).toHaveBeenCalledOnce();
});

test("HTTP page size controls database pagination and unsupported sizes are rejected", async () => {
  for (let i = 0; i < 21; i++) {
    db.insert(robots)
      .values({
        ...testRobotInput,
        id: String(i).padStart(2, "0"),
        createdAt: "2026-11-14T12:00:00.000Z",
      })
      .run();
  }
  const api = robotHandlers(() => db);

  const result = (await api
    .list(new Request("http://local/api/robots?page=1&pageSize=10"))
    .json()) as { items: Robot[]; total: number; pageSize: number };

  expect(result.total).toBe(21);
  expect(result.pageSize).toBe(10);
  expect(result.items).toHaveLength(10);
  expect(result.items[0].id).toBe("10");

  for (const size of ["-1", "0", "11", "100", "101", "abc", "20.5"]) {
    expect(
      api.list(new Request(`http://local/api/robots?pageSize=${size}`)).status,
    ).toBe(400);
  }

  for (const size of [10, 20, 50]) {
    expect(
      await api
        .list(new Request(`http://local/api/robots?pageSize=${size}`))
        .json(),
    ).toMatchObject({ pageSize: size });
  }
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
            ...testRobotInput,
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
    expect(result.items[0]).toMatchObject(getRobot(db, result.items[0].id)!);
  },
);

test("invalid, empty and oversized batches write nothing", async () => {
  const api = robotHandlers(() => db);

  for (const robots of [
    [],
    Array.from({ length: 101 }, () => testRobotInput),
    [testRobotInput, { ...testRobotInput, name: "" }],
    [testRobotInput, { ...testRobotInput, type: "unknown" }],
    [testRobotInput, { ...testRobotInput, integrationType: "unsupported" }],
    [testRobotInput, { ...testRobotInput, integrationType: undefined }],
    [
      testRobotInput,
      { name: "No type", manufacturer: "Maker", site: "Munich" },
    ],
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

test("bulk deletion removes the entire fleet and cascades telemetry, including on repeated calls", () => {
  const records = createRobots(db, [
    testRobotInput,
    { ...testRobotInput, site: "Berlin" },
  ]);
  db.insert(latestTelemetry)
    .values(
      records.map((robot) => ({
        robotId: robot.id,
        activity: "idle" as const,
        observedAt: new Date().toISOString(),
      })),
    )
    .run();
  const handlers = robotHandlers(() => db);

  expect(handlers.removeAll().status).toBe(204);
  expect(listRobots(db, 0)).toMatchObject({
    items: [],
    total: 0,
    fleetTotal: 0,
  });
  expect(db.select().from(latestTelemetry).all()).toEqual([]);

  expect(handlers.removeAll().status).toBe(204);
});

test("failed bulk deletion returns an error and rolls back every deletion", async () => {
  createRobots(db, [testRobotInput, testRobotInput]);
  db.$client.exec(
    "CREATE TRIGGER reject_deletion AFTER DELETE ON robots BEGIN SELECT RAISE(ABORT, 'Deletion failed'); END",
  );
  const log = vi.spyOn(console, "error").mockImplementation(() => {});

  const result = robotHandlers(() => db).removeAll();

  expect(result.status).toBe(500);
  expect(await result.json()).toEqual({
    error: { message: "Unable to complete robot request." },
  });
  expect(listRobots(db, 0).total).toBe(2);
  expect(log).toHaveBeenCalledOnce();
});
