import "server-only";

import { and, count, desc, eq, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { RobotFilters } from "@/modules/robots/robot-filters";
import {
  robotPageSize,
  type Robot,
  type RobotPage,
} from "@/modules/robots/robot";
import {
  createRobotBatchSchema,
  type CreateRobotInput,
} from "@/modules/robots/robot-validation";

import {
  onlineReportMaxAgeMs,
  delayedReportMaxAgeMs,
} from "@/modules/telemetry/freshness";

import type { FleetDatabase } from "../db/database";
import { latestTelemetry, robots } from "../db/schema";
import { robotSearchCondition } from "./robot-search";

const selection = {
  controlTarget: robots.controlTarget,
  controlRevision: robots.controlRevision,
  appliedControlRevision: sql<number>`coalesce(${latestTelemetry.appliedControlRevision}, 0)`,
  problemCode: latestTelemetry.problemCode,
  id: robots.id,
  name: robots.name,
  createdAt: robots.createdAt,
  manufacturer: robots.manufacturer,
  type: robots.type,
  integrationType: robots.integrationType,
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
  filters: RobotFilters = { view: "all" },
): RobotPage {
  const evaluatedAt = Date.now();
  const onlineCutoff = new Date(
    evaluatedAt - onlineReportMaxAgeMs,
  ).toISOString();
  const delayedCutoff = new Date(
    evaluatedAt - delayedReportMaxAgeMs,
  ).toISOString();
  const offline = sql<boolean>`${latestTelemetry.receivedAt} < ${delayedCutoff}`;
  const lowBattery = sql<boolean>`${latestTelemetry.batteryPercent} <= 15 and ${latestTelemetry.activity} != 'charging'`;
  const criticalBattery = sql<boolean>`${latestTelemetry.batteryPercent} <= 10 and ${latestTelemetry.activity} != 'charging'`;
  const attention = or(
    offline,
    sql`${latestTelemetry.problemCode} is not null`,
    criticalBattery,
  )!;
  const views = {
    all: sql`1`,
    "needs-attention": attention,
    offline,
    "low-battery": lowBattery,
  };
  const searchScope = robotSearchCondition(filters.search, {
    onlineCutoff,
    delayedCutoff,
  });
  const scope = and(
    searchScope,
    filters.type === undefined ? undefined : eq(robots.type, filters.type),
    filters.site === undefined ? undefined : eq(robots.site, filters.site),
    filters.manufacturer === undefined
      ? undefined
      : eq(robots.manufacturer, filters.manufacturer),
    filters.integrationType === undefined
      ? undefined
      : eq(robots.integrationType, filters.integrationType),
  );
  const matching = and(scope, views[filters.view]);
  return db.transaction((tx) => {
    const summary = tx
      .select({
        all: count(),
        "needs-attention": sql<number>`coalesce(sum(case when ${attention} then 1 else 0 end), 0)`,
        offline: sql<number>`coalesce(sum(case when ${offline} then 1 else 0 end), 0)`,
        "low-battery": sql<number>`coalesce(sum(case when ${lowBattery} then 1 else 0 end), 0)`,
      })
      .from(robots)
      .leftJoin(latestTelemetry, eq(robots.id, latestTelemetry.robotId))
      .where(scope)
      .get()!;
    return {
      items: tx
        .select(selection)
        .from(robots)
        .leftJoin(latestTelemetry, eq(robots.id, latestTelemetry.robotId))
        .where(matching)
        .orderBy(desc(robots.createdAt), desc(robots.id))
        .limit(pageSize)
        .offset(page * pageSize)
        .all(),
      total: summary[filters.view],
      page,
      pageSize,
      summary,
      evaluatedAt,
      fleetTotal: tx.select({ value: count() }).from(robots).get()!.value,
      filterOptions: {
        sites: tx
          .selectDistinct({ value: robots.site })
          .from(robots)
          .orderBy(robots.site)
          .all()
          .map((row) => row.value),
        manufacturers: tx
          .selectDistinct({ value: robots.manufacturer })
          .from(robots)
          .orderBy(robots.manufacturer)
          .all()
          .map((row) => row.value),
      },
    };
  });
}

export function getRobot(
  db: Pick<FleetDatabase, "select">,
  id: string,
): Robot | undefined {
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
      controlTarget: "work",
      controlRevision: 0,
      appliedControlRevision: 0,
      problemCode: null,
      area: null,
      batteryPercent: null,
      lastTelemetryAt: null,
      lastReceivedAt: null,
    }));
  });
}

export function deleteAllRobots(db: FleetDatabase) {
  db.delete(robots).run();
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

export function getRobotContext(db: FleetDatabase, id: string) {
  return db.transaction((tx) => {
    const robot = getRobot(tx, id);
    if (!robot) return undefined;
    const siteRobots = tx
      .select({
        id: robots.id,
        name: robots.name,
        area: latestTelemetry.area,
        lastReceivedAt: latestTelemetry.receivedAt,
      })
      .from(robots)
      .leftJoin(latestTelemetry, eq(robots.id, latestTelemetry.robotId))
      .where(eq(robots.site, robot.site))
      .orderBy(robots.id)
      .all()
      .filter((peer) => peer.id !== id);
    return { robot, siteRobots, verifiedAt: Date.now() };
  });
}
