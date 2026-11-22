import "server-only";

import { and, count, desc, eq, lte, ne, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { RobotFilters } from "@/common/robots/robot-schemas";
import {
  criticalBatteryPercent,
  lowBatteryPercent,
  robotPageSize,
  type RegistryRobot,
  type Robot,
  type RobotActivity,
  type RobotPage,
} from "@/common/robots/robot";
import type { CreateRobotInput } from "@/common/robots/robot-schemas";

import {
  onlineReportMaxAgeMs,
  delayedReportMaxAgeMs,
} from "@/common/telemetry/freshness";

import type { FleetDatabase } from "../db/database";
import { latestTelemetry, robots } from "../db/schema";
import { robotSearchCondition } from "./robot-search";

const selection = {
  problemCode: latestTelemetry.problemCode,
  id: robots.id,
  name: robots.name,
  createdAt: robots.createdAt,
  manufacturer: robots.manufacturer,
  type: robots.type,
  integrationType: robots.integrationType,
  site: robots.site,
  area: latestTelemetry.area,
  // A parameter rather than SQL text, so the value is type-checked.
  activity: sql<RobotActivity>`coalesce(${latestTelemetry.activity}, ${"unknown" satisfies RobotActivity})`,
  batteryPercent: latestTelemetry.batteryPercent,
  lastReceivedAt: latestTelemetry.receivedAt,
  queuedControlTarget: sql<
    Robot["queuedControlTarget"]
  >`case when ${robots.controlRevision} > coalesce(${latestTelemetry.appliedControlRevision}, 0) then ${robots.controlTarget} end`,
};

const registrySelection = {
  ...selection,
  controlTarget: robots.controlTarget,
  controlRevision: robots.controlRevision,
  appliedControlRevision: sql<number>`coalesce(${latestTelemetry.appliedControlRevision}, 0)`,
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
  const notCharging = ne(latestTelemetry.activity, "charging");
  const lowBattery = and(
    lte(latestTelemetry.batteryPercent, lowBatteryPercent),
    notCharging,
  )!;
  const criticalBattery = and(
    lte(latestTelemetry.batteryPercent, criticalBatteryPercent),
    notCharging,
  )!;
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

/** Registers robots whose input the HTTP boundary has already validated. */
export function createRobots(
  db: FleetDatabase,
  inputs: CreateRobotInput[],
): Robot[] {
  const rows = inputs.map((input) => ({
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  }));

  // One INSERT, so the batch is stored whole or not at all.
  db.insert(robots).values(rows).run();

  return rows.map((row) => ({
    ...row,
    activity: "unknown",
    problemCode: null,
    area: null,
    batteryPercent: null,
    lastReceivedAt: null,
    queuedControlTarget: null,
  }));
}

export function deleteAllRobots(db: FleetDatabase) {
  db.delete(robots).run();
}

export function deleteRobot(db: FleetDatabase, id: string) {
  return db.delete(robots).where(eq(robots.id, id)).run().changes > 0;
}

export function robotRegistry(db: FleetDatabase): RegistryRobot[] {
  return db
    .select(registrySelection)
    .from(robots)
    .leftJoin(latestTelemetry, eq(robots.id, latestTelemetry.robotId))
    .all();
}

export function getRobotContext(db: FleetDatabase, id: string) {
  return db.transaction((tx) => {
    const robot = getRobot(tx, id);
    if (!robot) {
      return undefined;
    }

    const peerCounts = tx
      .select({ area: latestTelemetry.area, count: count() })
      .from(robots)
      .leftJoin(latestTelemetry, eq(robots.id, latestTelemetry.robotId))
      .where(and(eq(robots.site, robot.site), ne(robots.id, id)))
      .groupBy(latestTelemetry.area)
      .orderBy(latestTelemetry.area)
      .all();

    return { robot, peerCounts, evaluatedAt: Date.now() };
  });
}
