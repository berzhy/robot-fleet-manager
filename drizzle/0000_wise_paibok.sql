CREATE TABLE `latest_telemetry` (
	`robot_id` text PRIMARY KEY NOT NULL,
	`activity` text NOT NULL,
	`battery_percent` real,
	`area` text,
	`received_at` text,
	`observed_at` text NOT NULL,
	FOREIGN KEY (`robot_id`) REFERENCES `robots`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "battery_range" CHECK("latest_telemetry"."battery_percent" between 0 and 100),
	CONSTRAINT "activity_value" CHECK("latest_telemetry"."activity" in ('working','idle','charging','blocked','unknown'))
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
	CONSTRAINT "integration_type_value" CHECK("robots"."integration_type" in ('ros2', 'vda5050', 'vendor-api')),
	CONSTRAINT "robot_type_value" CHECK("robots"."type" in ('cleaning', 'security', 'delivery', 'inspection'))
);
