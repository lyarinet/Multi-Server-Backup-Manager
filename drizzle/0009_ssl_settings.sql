ALTER TABLE `settings` ADD `ssl_enabled` integer DEFAULT false;
ALTER TABLE `settings` ADD `ssl_port` integer DEFAULT 3443;
ALTER TABLE `settings` ADD `ssl_cert_path` text;
ALTER TABLE `settings` ADD `ssl_key_path` text;
