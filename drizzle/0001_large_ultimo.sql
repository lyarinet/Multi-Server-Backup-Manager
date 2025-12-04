ALTER TABLE `servers` ADD `local_backup_path` text;--> statement-breakpoint
ALTER TABLE `servers` ADD `backup_www` integer DEFAULT true;--> statement-breakpoint
ALTER TABLE `servers` ADD `backup_logs` integer DEFAULT true;--> statement-breakpoint
ALTER TABLE `servers` ADD `backup_nginx` integer DEFAULT true;--> statement-breakpoint
ALTER TABLE `servers` ADD `backup_db` integer DEFAULT true;