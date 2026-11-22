import "server-only";
import { inArray, sql } from "drizzle-orm";
import type { TelemetryReport } from "@/common/telemetry";
import type { FleetDatabase } from "../db/database";
import { robots, latestTelemetry } from "../db/schema";

/** What a batch did: reports that changed nothing are counted by reason. */
export type IngestResult = {
  accepted: number;
  ignored: {
    /** The robot does not exist, or was deleted. */
    unknownRobot: number;
    /** Acknowledges a command revision that was never sent. */
    futureRevision: number;
    /** Older than the stored report, or acknowledges an older revision. */
    outdated: number;
  };
};

export function ingestTelemetry(
  db: FleetDatabase,
  reports: TelemetryReport[],
  receivedAt: string,
): IngestResult {
  return db.transaction((tx) => {
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

    const ignored = { unknownRobot: 0, futureRevision: 0, outdated: 0 };
    const rows = reports
      .filter((report) => {
        const revision = known.get(report.robotId);
        if (revision === undefined) {
          ignored.unknownRobot++;
          return false;
        }
        if (report.appliedControlRevision > revision) {
          ignored.futureRevision++;
          return false;
        }
        return true;
      })
      .map((report) => ({ ...report, receivedAt }));

    if (!rows.length) {
      return { accepted: 0, ignored };
    }

    // A row the condition below skips counts as no change.
    const { changes } = tx
      .insert(latestTelemetry)
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

    ignored.outdated = rows.length - changes;
    return { accepted: changes, ignored };
  });
}
