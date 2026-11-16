import "server-only";

import { and, eq, or, sql, type SQL } from "drizzle-orm";

import {
  formatRobotType,
  formatIntegrationType,
  formatActivity,
} from "@/modules/robots/robot-labels";
import {
  robotProblemCodes,
  robotProblemDetails,
} from "@/modules/robots/robot-problems";
import {
  robotTypes,
  robotActivities,
  integrationTypes,
} from "@/modules/robots/robot";

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
      ["Online", sql`${latestTelemetry.receivedAt} >= ${onlineCutoff}`],
      [
        "Delayed",
        and(
          sql`${latestTelemetry.receivedAt} < ${onlineCutoff}`,
          sql`${latestTelemetry.receivedAt} >= ${delayedCutoff}`,
        ),
      ],
      ["Offline", offline],
      ["Unknown", sql`${latestTelemetry.receivedAt} is null`],
    ] as const
  )
    .filter(([label]) => label.toLowerCase().includes(query))
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
          sql`coalesce(${latestTelemetry.activity}, 'unknown')`,
        ].map((column) => sql`${column} like ${pattern} escape '\\'`),
        ...(query.length >= 8
          ? [sql`${robots.id} like ${pattern} escape '\\'`]
          : []),
        ...robotTypes
          .filter((type) => formatRobotType(type).toLowerCase().includes(query))
          .map((type) => eq(robots.type, type)),
        ...integrationTypes
          .filter((type) =>
            formatIntegrationType(type).toLowerCase().includes(query),
          )
          .map((type) => eq(robots.integrationType, type)),
        ...robotActivities
          .filter((activity) =>
            formatActivity(activity).toLowerCase().includes(query),
          )
          .map((activity) =>
            activity === "unknown"
              ? sql`${latestTelemetry.activity} is null`
              : eq(latestTelemetry.activity, activity),
          ),
        ...robotProblemCodes
          .filter((code) =>
            robotProblemDetails[code].label.toLowerCase().includes(query),
          )
          .map((code) => eq(latestTelemetry.problemCode, code)),
        ...connectionSearches,
        ...(batteryValue === undefined
          ? []
          : [sql`round(${latestTelemetry.batteryPercent}) = ${batteryValue}`]),
      );
}
