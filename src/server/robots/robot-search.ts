import "server-only";

import { and, eq, or, sql, type SQL } from "drizzle-orm";

import {
  integrationTypes,
  robotActivities,
  robotProblemCodes,
  robotTypes,
} from "@/common/constants";
import {
  formatActivity,
  formatConnection,
  integrationTypeLabels,
  robotProblemLabels,
  robotTypeLabels,
} from "@/common/labels";

import { robots, latestTelemetry } from "../db/schema";

export function robotSearchCondition(
  search: string | undefined,
  {
    onlineCutoff,
    delayedCutoff,
  }: { onlineCutoff: string; delayedCutoff: string },
): SQL | undefined {
  const offline = sql<boolean>`${latestTelemetry.receivedAt} < ${delayedCutoff}`;
  const query = search?.toLowerCase() ?? "";
  const pattern =
    search === undefined ? undefined : `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  const batterySearch = /^(\d{1,3})%?$/.exec(query);
  const batteryValue =
    batterySearch && Number(batterySearch[1]) <= 100
      ? Number(batterySearch[1])
      : undefined;

  const connectionSearches = (
    [
      ["online", sql`${latestTelemetry.receivedAt} >= ${onlineCutoff}`],
      [
        "delayed",
        and(
          sql`${latestTelemetry.receivedAt} < ${onlineCutoff}`,
          sql`${latestTelemetry.receivedAt} >= ${delayedCutoff}`,
        ),
      ],
      ["offline", offline],
      // No report yet.
      [null, sql`${latestTelemetry.receivedAt} is null`],
    ] as const
  )
    .filter(([status]) =>
      formatConnection(status).toLowerCase().includes(query),
    )
    .map(([, condition]) => condition);

  return pattern === undefined
    ? undefined
    : or(
        ...[
          robots.name,
          robots.manufacturer,
          robots.site,
          latestTelemetry.area,
          robots.type,
          robots.integrationType,
          latestTelemetry.problemCode,
          latestTelemetry.activity,
        ].map((column) => sql`${column} like ${pattern} escape '\\'`),
        ...robotTypes
          .filter((type) => robotTypeLabels[type].toLowerCase().includes(query))
          .map((type) => eq(robots.type, type)),
        ...integrationTypes
          .filter((type) =>
            integrationTypeLabels[type].toLowerCase().includes(query),
          )
          .map((type) => eq(robots.integrationType, type)),
        ...[...robotActivities, null]
          .filter((activity) =>
            formatActivity(activity).toLowerCase().includes(query),
          )
          .map((activity) =>
            activity === null
              ? sql`${latestTelemetry.activity} is null`
              : eq(latestTelemetry.activity, activity),
          ),
        ...robotProblemCodes
          .filter((code) =>
            robotProblemLabels[code].toLowerCase().includes(query),
          )
          .map((code) => eq(latestTelemetry.problemCode, code)),
        ...connectionSearches,
        ...(batteryValue === undefined
          ? []
          : [sql`round(${latestTelemetry.batteryPercent}) = ${batteryValue}`]),
      );
}
