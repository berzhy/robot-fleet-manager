PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_latest_telemetry` (
	`robot_id` text PRIMARY KEY NOT NULL,
	`activity` text NOT NULL,
	`battery_percent` real,
	`area` text,
	`problem_code` text,
	`applied_control_revision` integer DEFAULT 0 NOT NULL,
	`received_at` text,
	`observed_at` text NOT NULL,
	FOREIGN KEY (`robot_id`) REFERENCES `robots`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "problem_activity" CHECK(("__new_latest_telemetry"."activity" = 'needs-attention' AND "__new_latest_telemetry"."problem_code" IS NOT NULL AND "__new_latest_telemetry"."problem_code" IN ('path-blocked', 'position-lost', 'sensor-obstructed')) OR ("__new_latest_telemetry"."activity" != 'needs-attention' AND "__new_latest_telemetry"."problem_code" IS NULL)),
	CONSTRAINT "battery_range" CHECK("__new_latest_telemetry"."battery_percent" between 0 and 100),
	CONSTRAINT "activity_value" CHECK("__new_latest_telemetry"."activity" in ('working', 'idle', 'returning', 'charging', 'needs-attention', 'unknown'))
);
--> statement-breakpoint
INSERT INTO `__new_latest_telemetry`("robot_id", "activity", "battery_percent", "area", "problem_code", "applied_control_revision", "received_at", "observed_at") SELECT "robot_id", "activity", "battery_percent", "area", "problem_code", "applied_control_revision", "received_at", "observed_at" FROM `latest_telemetry`;--> statement-breakpoint
DROP TABLE `latest_telemetry`;--> statement-breakpoint
ALTER TABLE `__new_latest_telemetry` RENAME TO `latest_telemetry`;--> statement-breakpoint
PRAGMA foreign_keys=ON;