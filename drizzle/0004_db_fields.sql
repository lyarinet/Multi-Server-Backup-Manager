ALTER TABLE `servers` ADD `db_user` text;
ALTER TABLE `servers` ADD `db_password` text;
ALTER TABLE `servers` ADD `db_host` text DEFAULT 'localhost';
ALTER TABLE `servers` ADD `db_selected` text;
