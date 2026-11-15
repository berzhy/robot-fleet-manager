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
    const known = new Set(
      tx
        .select({ id: robots.id })
        .from(robots)
        .where(
          inArray(
            robots.id,
            reports.map((report) => report.robotId),
          ),
        )
        .all()
        .map((robot) => robot.id),
    );
    const rows = reports
      .filter((report) => known.has(report.robotId))
      .map((report) => ({ ...report, receivedAt }));
    if (!rows.length) return;
    tx.insert(latestTelemetry)
      .values(rows)
      .onConflictDoUpdate({
        target: latestTelemetry.robotId,
        set: {
          activity: sql`excluded.activity`,
          batteryPercent: sql`excluded.battery_percent`,
          area: sql`excluded.area`,
          observedAt: sql`excluded.observed_at`,
          receivedAt: sql`excluded.received_at`,
        },
        setWhere: sql`excluded.observed_at > ${latestTelemetry.observedAt}`,
      })
      .run();
  });
}
