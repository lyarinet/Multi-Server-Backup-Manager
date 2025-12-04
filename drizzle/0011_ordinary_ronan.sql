CREATE TABLE `cron_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`server_id` integer,
	`schedule` text NOT NULL,
	`enabled` integer DEFAULT true,
	`schedule_type` text NOT NULL,
	`schedule_time` text,
	`schedule_day` integer,
	`last_run` text,
	`next_run` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON UPDATE no action ON DELETE no action
);
