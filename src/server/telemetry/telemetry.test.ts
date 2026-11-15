import { afterAll, afterEach, beforeEach, expect, test, vi } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { openDatabase } from "../db/database";
import { createRobot, deleteRobot, getRobot } from "../robots/robots";
import { robotHandlers } from "../robots/robot-handlers";
import { telemetryHandlers } from "./telemetry-handlers";
import { ingestTelemetry } from "./telemetry";
import { telemetryBatchSchema } from "@/modules/telemetry/telemetry";
const db = openDatabase(":memory:");
afterAll(() => db.$client.close());
const input = {
  name: "Test",
  manufacturer: "Maker",
  type: "inspection" as const,
  integrationType: "vendor-api" as const,
  site: "Munich",
};
const observedAt = "2026-01-01T00:00:00.000Z";
let id: string;
beforeEach(() => {
  migrate(db, { migrationsFolder: "drizzle" });
  db.$client.exec("DELETE FROM robots");
  id = createRobot(db, input).id;
});
afterEach(() => {
  db.$client.exec("DROP TRIGGER IF EXISTS fail_telemetry");
  vi.restoreAllMocks();
});
const report = () => ({
  robotId: id,
  activity: "working" as const,
  batteryPercent: 50,
  area: "Lobby",
  observedAt,
});
const post = (body: unknown) =>
  telemetryHandlers(() => db).ingest(
    new Request("http://local/api/telemetry/batch", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
test("ingestion persists latest telemetry and receipt times in list, registry and detail", async () => {
  expect((await post({ reports: [report()] })).status).toBe(204);
  const robot = getRobot(db, id)!;
  expect(robot).toMatchObject({
    batteryPercent: 50,
    lastTelemetryAt: observedAt,
  });
  expect(Date.parse(robot.lastReceivedAt!)).toBeGreaterThan(
    Date.parse(observedAt),
  );
  const api = robotHandlers(() => db);
  expect(await api.registry().json()).toMatchObject({ items: [robot] });
  expect(
    await api.list(new Request("http://local/api/robots")).json(),
  ).toMatchObject({ items: [robot], total: 1 });
});
test("older, duplicate, unknown and deleted reports do not replace data or receipt time", () => {
  ingestTelemetry(db, [report()], observedAt);
  ingestTelemetry(
    db,
    [
      { ...report(), batteryPercent: 1 },
      { ...report(), robotId: "unknown" },
    ],
    "2026-01-02T00:00:00.000Z",
  );
  ingestTelemetry(
    db,
    [{ ...report(), observedAt: "2025-01-01T00:00:00.000Z" }],
    "2026-01-03T00:00:00.000Z",
  );
  expect(getRobot(db, id)).toMatchObject({
    batteryPercent: 50,
    lastReceivedAt: observedAt,
  });
  deleteRobot(db, id);
  expect(() => ingestTelemetry(db, [report()], observedAt)).not.toThrow();
  expect(db.$client.prepare("SELECT * FROM latest_telemetry").all()).toEqual(
    [],
  );
});
test("invalid batches and future timestamps write nothing", async () => {
  for (const reports of [
    [],
    [report(), report()],
    [report(), { ...report(), robotId: "other", batteryPercent: -1 }],
    [{ ...report(), observedAt: "2999-01-01T00:00:00Z" }],
    Array.from({ length: 101 }, (_, index) => ({
      ...report(),
      robotId: String(index),
    })),
  ]) {
    expect((await post({ reports })).status).toBe(400);
    expect(getRobot(db, id)?.lastReceivedAt).toBeNull();
  }
  expect(
    (
      await telemetryHandlers(() => db).ingest(
        new Request("http://local", { method: "POST", body: "{" }),
      )
    ).status,
  ).toBe(400);
  expect(
    telemetryBatchSchema.parse({
      reports: [{ ...report(), observedAt: "2026-01-01T01:00:00+01:00" }],
    }).reports[0].observedAt,
  ).toBe(observedAt);
});
test("a database error rolls back the complete batch", async () => {
  const other = createRobot(db, input);
  db.$client.exec(
    `CREATE TRIGGER fail_telemetry BEFORE INSERT ON latest_telemetry WHEN NEW.robot_id = '${other.id}' BEGIN SELECT RAISE(ABORT, 'failure'); END;`,
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
  expect(
    (await post({ reports: [report(), { ...report(), robotId: other.id }] }))
      .status,
  ).toBe(500);
  expect(getRobot(db, id)?.lastReceivedAt).toBeNull();
});
