import { sql } from "drizzle-orm";
import { check, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import {
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
  },
  (table) => [
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
    receivedAt: text("received_at"),
    observedAt: text("observed_at").notNull(),
  },
  (table) => [
    check("battery_range", sql`${table.batteryPercent} between 0 and 100`),
    check(
      "activity_value",
      sql`${table.activity} in ('working','idle','charging','blocked','unknown')`,
    ),
  ],
);
