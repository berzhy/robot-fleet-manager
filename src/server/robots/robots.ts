import "server-only";

import { and, count, desc, eq, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  formatRobotType,
  formatIntegrationType,
} from "@/modules/robots/robot-labels";
import type { RobotFilters } from "@/modules/robots/robot-filters";
import {
  robotPageSize,
  robotTypes,
  integrationTypes,
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
  const offline = sql<boolean>`${latestTelemetry.receivedAt} < ${new Date(evaluatedAt - 15000).toISOString()}`;
  const lowBattery = sql<boolean>`${latestTelemetry.batteryPercent} <= 20 and ${latestTelemetry.activity} not in ('charging', 'returning')`;
  const attention = or(
    offline,
    sql`${latestTelemetry.problemCode} is not null`,
    lowBattery,
  )!;
  const views = {
    all: sql`1`,
    "needs-attention": attention,
    offline,
    "low-battery": lowBattery,
  };
  const search = filters.search;
  const query = search?.toLowerCase() ?? "";
  const pattern =
    search === undefined ? undefined : `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  const searchScope =
    pattern === undefined
      ? undefined
      : or(
          ...[
            robots.name,
            robots.id,
            robots.manufacturer,
            robots.site,
            latestTelemetry.area,
            robots.type,
            robots.integrationType,
          ].map((column) => sql`${column} like ${pattern} escape '\\'`),
          ...robotTypes
            .filter((type) =>
              formatRobotType(type).toLowerCase().includes(query),
            )
            .map((type) => eq(robots.type, type)),
          ...integrationTypes
            .filter((type) =>
              formatIntegrationType(type).toLowerCase().includes(query),
            )
            .map((type) => eq(robots.integrationType, type)),
        );
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
