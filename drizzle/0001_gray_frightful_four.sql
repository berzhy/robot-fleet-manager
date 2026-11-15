ALTER TABLE `latest_telemetry` ADD `received_at` text;--> statement-breakpoint
UPDATE latest_telemetry SET received_at = observed_at;
