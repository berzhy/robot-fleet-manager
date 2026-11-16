import { sql } from "drizzle-orm";
import {
  check,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

import { robotProblemCodes } from "@/modules/robots/robot-problems";
import {
  robotActivities,
  robotTypes,
  integrationTypes,
  type RobotActivity,
} from "@/modules/robots/robot";
export const robots = sqliteTable(
  "robots",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    manufacturer: text("manufacturer").notNull(),
    type: text("type", { enum: robotTypes }).notNull(),
    integrationType: text("integration_type", {
      enum: integrationTypes,
    }).notNull(),
    site: text("site").notNull(),
    createdAt: text("created_at").notNull(),
    controlTarget: text("control_target", { enum: ["work", "stop", "base"] })
      .notNull()
      .default("work"),
    controlRevision: integer("control_revision").notNull().default(0),
  },
  (table) => [
    check(
      "control_target_value",
      sql`${table.controlTarget} in ('work','stop','base')`,
    ),
    check("control_revision_range", sql`${table.controlRevision} >= 0`),
    check(
      "integration_type_value",
      sql`${table.integrationType} in (${sql.join(
        integrationTypes.map((type) => sql.raw("'" + type + "'")),
        sql`, `,
      )})`,
    ),
    check(
      "robot_type_value",
      sql`${table.type} in (${sql.join(
        robotTypes.map((type) => sql.raw("'" + type + "'")),
        sql`, `,
      )})`,
    ),
  ],
);
export const latestTelemetry = sqliteTable(
  "latest_telemetry",
  {
    robotId: text("robot_id")
      .primaryKey()
      .references(() => robots.id, { onDelete: "cascade" }),
    activity: text("activity").$type<RobotActivity>().notNull(),
    batteryPercent: real("battery_percent"),
    area: text("area"),
    problemCode: text("problem_code", { enum: robotProblemCodes }),
    appliedControlRevision: integer("applied_control_revision")
      .notNull()
      .default(0),
    receivedAt: text("received_at"),
    observedAt: text("observed_at").notNull(),
  },
  (table) => [
    check(
      "problem_activity",
      sql`(${table.activity} = 'needs-attention' AND ${table.problemCode} IS NOT NULL AND ${table.problemCode} IN (${sql.join(
        robotProblemCodes.map((code) => sql.raw("'" + code + "'")),
        sql`, `,
      )})) OR (${table.activity} != 'needs-attention' AND ${table.problemCode} IS NULL)`,
    ),
    check("battery_range", sql`${table.batteryPercent} between 0 and 100`),
    check(
      "activity_value",
      sql`${table.activity} in (${sql.join(
        robotActivities.map((value) => sql.raw("'" + value + "'")),
        sql`, `,
      )})`,
    ),
  ],
);
