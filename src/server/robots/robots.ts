import "server-only";

import { count, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  robotPageSize,
  type Robot,
  type RobotPage,
} from "@/modules/robots/robot";
import {
  createRobotBatchSchema,
  type CreateRobotInput,
} from "@/modules/robots/robot-validation";

import type { FleetDatabase } from "../db/database";
import { latestTelemetry, robots } from "../db/schema";
const selection = {
  id: robots.id,
  name: robots.name,
  createdAt: robots.createdAt,
  manufacturer: robots.manufacturer,
  site: robots.site,
  area: latestTelemetry.area,
  activity: sql<
    Robot["activity"]
  >`coalesce(${latestTelemetry.activity}, 'unknown')`,
  batteryPercent: latestTelemetry.batteryPercent,
  lastReceivedAt: latestTelemetry.receivedAt,
  lastTelemetryAt: latestTelemetry.observedAt,
};
export function listRobots(
  db: FleetDatabase,
  page: number,
  pageSize = robotPageSize,
): RobotPage {
  return db.transaction((tx) => ({
    items: tx
      .select(selection)
      .from(robots)
      .leftJoin(latestTelemetry, eq(robots.id, latestTelemetry.robotId))
      .orderBy(desc(robots.createdAt), desc(robots.id))
      .limit(pageSize)
      .offset(page * pageSize)
      .all(),
    total: tx.select({ value: count() }).from(robots).get()!.value,
    page,
    pageSize,
  }));
}
export function getRobot(db: FleetDatabase, id: string): Robot | undefined {
  return db
    .select(selection)
    .from(robots)
    .leftJoin(latestTelemetry, eq(robots.id, latestTelemetry.robotId))
    .where(eq(robots.id, id))
    .get();
}
export function createRobot(db: FleetDatabase, input: CreateRobotInput): Robot {
  return createRobots(db, [input])[0];
}

export function createRobots(
  db: FleetDatabase,
  input: CreateRobotInput[],
): Robot[] {
  const { robots: inputs } = createRobotBatchSchema.parse({ robots: input });
  const rows = inputs.map((data) => ({
    ...data,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  }));
  return db.transaction((tx) => {
    tx.insert(robots).values(rows).run();
    return rows.map((row): Robot => ({
      ...row,
      activity: "unknown",
      area: null,
      batteryPercent: null,
      lastTelemetryAt: null,
      lastReceivedAt: null,
    }));
  });
}

export function deleteRobot(db: FleetDatabase, id: string) {
  return db.delete(robots).where(eq(robots.id, id)).run().changes > 0;
}

export function robotRegistry(db: FleetDatabase): Robot[] {
  return db
    .select(selection)
    .from(robots)
    .leftJoin(latestTelemetry, eq(robots.id, latestTelemetry.robotId))
    .all();
}

export function getRobotSnapshot(db: FleetDatabase, id: string) {
  const robot = getRobot(db, id);
  return robot ? { robot, verifiedAt: Date.now() } : undefined;
}
