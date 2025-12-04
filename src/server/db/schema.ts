import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const servers = sqliteTable('servers', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    ip: text('ip').notNull(),
    user: text('user').notNull(),
    port: integer('port').notNull().default(22),
    sshKeyPath: text('ssh_key_path').notNull(),
    password: text('password'), // optional password for SSH auth
    localBackupPath: text('local_backup_path'),
    backupPaths: text('backup_paths'),
    dbUser: text('db_user'),
    dbPassword: text('db_password'),
    dbHost: text('db_host').default('localhost'),
    dbSelected: text('db_selected'),
    dbPort: integer('db_port').default(3306),
    backupWww: integer('backup_www', { mode: 'boolean' }).default(true),
    backupLogs: integer('backup_logs', { mode: 'boolean' }).default(true),
    backupNginx: integer('backup_nginx', { mode: 'boolean' }).default(true),
    backupDb: integer('backup_db', { mode: 'boolean' }).default(true),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const backupLogs = sqliteTable('backup_logs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    serverId: integer('server_id').references(() => servers.id),
    status: text('status').notNull(), // 'pending', 'running', 'success', 'failed'
    logs: text('logs'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const settings = sqliteTable('settings', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    globalLocalBackupPath: text('global_local_backup_path'),
    driveClientId: text('drive_client_id'),
    driveClientSecret: text('drive_client_secret'),
    driveRefreshToken: text('drive_refresh_token'),
    driveFolderId: text('drive_folder_id'),
    driveAutoUpload: integer('drive_auto_upload', { mode: 'boolean' }).default(false),
    sslEnabled: integer('ssl_enabled', { mode: 'boolean' }).default(false),
    sslPort: integer('ssl_port').default(3443),
    sslCertPath: text('ssl_cert_path'),
    sslKeyPath: text('ssl_key_path'),
    ipWhitelistEnabled: integer('ip_whitelist_enabled', { mode: 'boolean' }).default(false),
    loginIpWhitelistEnabled: integer('login_ip_whitelist_enabled', { mode: 'boolean' }).default(false),
    autostartEnabled: integer('autostart_enabled', { mode: 'boolean' }).default(false),
});

export const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    username: text('username').notNull(),
    passwordHash: text('password_hash').notNull(),
    passwordSalt: text('password_salt').notNull(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable('sessions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id'),
    token: text('token').notNull(),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const cronJobs = sqliteTable('cron_jobs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    serverId: integer('server_id').references(() => servers.id),
    scheduleType: text('schedule_type').notNull(), // 'daily', 'weekly', 'monthly', 'custom'
    scheduleTime: text('schedule_time'), // e.g., '02:00'
    scheduleDay: integer('schedule_day'), // For weekly/monthly
    schedule: text('schedule').notNull(), // Cron expression
    enabled: integer('enabled', { mode: 'boolean' }).default(true),
    nextRun: text('next_run'),
    lastRun: text('last_run'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const ipWhitelist = sqliteTable('ip_whitelist', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ipAddress: text('ip_address').notNull(),
    type: text('type').notNull(),
    description: text('description'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const loginIpWhitelist = sqliteTable('login_ip_whitelist', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ipAddress: text('ip_address').notNull(),
    type: text('type').notNull(),
    description: text('description'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

