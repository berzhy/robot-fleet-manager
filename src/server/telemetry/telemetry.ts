import "server-only";
import { inArray, sql } from "drizzle-orm";
import type { TelemetryReport } from "@/modules/telemetry/telemetry";
import type { FleetDatabase } from "../db/database";
import { robots, latestTelemetry } from "../db/schema";

export function ingestTelemetry(
  db: FleetDatabase,
  reports: TelemetryReport[],
  receivedAt: string,
) {
  db.transaction((tx) => {
    const known = new Map(
      tx
        .select({ id: robots.id, revision: robots.controlRevision })
        .from(robots)
        .where(
          inArray(
            robots.id,
            reports.map((report) => report.robotId),
          ),
        )
        .all()
        .map((robot) => [robot.id, robot.revision]),
    );

    const rows = reports
      .filter(
        (report) =>
          known.has(report.robotId) &&
          report.appliedControlRevision <= known.get(report.robotId)!,
      )
      .map((report) => ({ ...report, receivedAt }));

    if (!rows.length) {
      return;
    }

    tx.insert(latestTelemetry)
      .values(rows)
      .onConflictDoUpdate({
        target: latestTelemetry.robotId,
        set: {
          problemCode: sql`excluded.problem_code`,
          appliedControlRevision: sql`excluded.applied_control_revision`,
          activity: sql`excluded.activity`,
          batteryPercent: sql`excluded.battery_percent`,
          area: sql`excluded.area`,
          observedAt: sql`excluded.observed_at`,
          receivedAt: sql`excluded.received_at`,
        },
        setWhere: sql`excluded.observed_at > ${latestTelemetry.observedAt} AND excluded.applied_control_revision >= ${latestTelemetry.appliedControlRevision}`,
      })
      .run();
  });
}
