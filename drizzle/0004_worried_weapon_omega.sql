ALTER TABLE `servers` ADD `db_user` text;--> statement-breakpoint
ALTER TABLE `servers` ADD `db_password` text;--> statement-breakpoint
ALTER TABLE `servers` ADD `db_host` text DEFAULT 'localhost';--> statement-breakpoint
ALTER TABLE `servers` ADD `db_selected` text;