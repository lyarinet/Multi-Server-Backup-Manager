ALTER TABLE `settings` ADD `ssl_enabled` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `settings` ADD `ssl_port` integer DEFAULT 3443;--> statement-breakpoint
ALTER TABLE `settings` ADD `ssl_cert_path` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `ssl_key_path` text;