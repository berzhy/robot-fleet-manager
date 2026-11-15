CREATE TABLE `latest_telemetry` (
	`robot_id` text PRIMARY KEY NOT NULL,
	`activity` text NOT NULL,
	`battery_percent` real,
	`area` text,
	`problem_code` text,
	`applied_control_revision` integer DEFAULT 0 NOT NULL,
	`received_at` text,
	`observed_at` text NOT NULL,
	FOREIGN KEY (`robot_id`) REFERENCES `robots`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "problem_activity" CHECK(("latest_telemetry"."activity" = 'needs-attention' AND "latest_telemetry"."problem_code" IS 'path-blocked') OR ("latest_telemetry"."activity" != 'needs-attention' AND "latest_telemetry"."problem_code" IS NULL)),
	CONSTRAINT "battery_range" CHECK("latest_telemetry"."battery_percent" between 0 and 100),
	CONSTRAINT "activity_value" CHECK("latest_telemetry"."activity" in ('working', 'idle', 'returning', 'charging', 'needs-attention', 'unknown'))
);
--> statement-breakpoint
CREATE TABLE `robots` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`manufacturer` text NOT NULL,
	`type` text NOT NULL,
	`integration_type` text NOT NULL,
	`site` text NOT NULL,
	`created_at` text NOT NULL,
	`control_target` text DEFAULT 'work' NOT NULL,
	`control_revision` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "control_target_value" CHECK("robots"."control_target" in ('work','stop','base')),
	CONSTRAINT "control_revision_range" CHECK("robots"."control_revision" >= 0),
	CONSTRAINT "integration_type_value" CHECK("robots"."integration_type" in ('ros2', 'vda5050', 'vendor-api')),
	CONSTRAINT "robot_type_value" CHECK("robots"."type" in ('cleaning', 'security', 'delivery', 'inspection'))
);
