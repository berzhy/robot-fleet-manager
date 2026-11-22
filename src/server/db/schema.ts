import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import {
  controlTargets,
  robotProblemCodes,
  robotTypes,
  integrationTypes,
  type RobotActivity,
} from "@/common/robot";

// CHECK constraints live in schema.sql; these mappings support typed queries.
export const robots = sqliteTable("robots", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  manufacturer: text("manufacturer").notNull(),
  type: text("type", { enum: robotTypes }).notNull(),
  integrationType: text("integration_type", {
    enum: integrationTypes,
  }).notNull(),
  site: text("site").notNull(),
  createdAt: text("created_at").notNull(),
  controlTarget: text("control_target", { enum: controlTargets })
    .notNull()
    .default("work"),
  controlRevision: integer("control_revision").notNull().default(0),
});

export const latestTelemetry = sqliteTable("latest_telemetry", {
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
});
