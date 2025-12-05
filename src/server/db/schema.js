"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginIpWhitelist = exports.ipWhitelist = exports.cronJobs = exports.sessions = exports.users = exports.settings = exports.backupLogs = exports.servers = void 0;
var sqlite_core_1 = require("drizzle-orm/sqlite-core");
var drizzle_orm_1 = require("drizzle-orm");
exports.servers = (0, sqlite_core_1.sqliteTable)('servers', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    name: (0, sqlite_core_1.text)('name').notNull(),
    ip: (0, sqlite_core_1.text)('ip').notNull(),
    user: (0, sqlite_core_1.text)('user').notNull(),
    port: (0, sqlite_core_1.integer)('port').notNull().default(22),
    sshKeyPath: (0, sqlite_core_1.text)('ssh_key_path').notNull(),
    password: (0, sqlite_core_1.text)('password'), // optional password for SSH auth
    localBackupPath: (0, sqlite_core_1.text)('local_backup_path'),
    backupPaths: (0, sqlite_core_1.text)('backup_paths'),
    dbUser: (0, sqlite_core_1.text)('db_user'),
    dbPassword: (0, sqlite_core_1.text)('db_password'),
    dbHost: (0, sqlite_core_1.text)('db_host').default('localhost'),
    dbSelected: (0, sqlite_core_1.text)('db_selected'),
    dbPort: (0, sqlite_core_1.integer)('db_port').default(3306),
    backupWww: (0, sqlite_core_1.integer)('backup_www', { mode: 'boolean' }).default(true),
    backupLogs: (0, sqlite_core_1.integer)('backup_logs', { mode: 'boolean' }).default(true),
    backupNginx: (0, sqlite_core_1.integer)('backup_nginx', { mode: 'boolean' }).default(true),
    backupDb: (0, sqlite_core_1.integer)('backup_db', { mode: 'boolean' }).default(true),
    createdAt: (0, sqlite_core_1.text)('created_at').default((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
exports.backupLogs = (0, sqlite_core_1.sqliteTable)('backup_logs', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    serverId: (0, sqlite_core_1.integer)('server_id').references(function () { return exports.servers.id; }),
    status: (0, sqlite_core_1.text)('status').notNull(), // 'pending', 'running', 'success', 'failed'
    logs: (0, sqlite_core_1.text)('logs'),
    createdAt: (0, sqlite_core_1.text)('created_at').default((0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
exports.settings = (0, sqlite_core_1.sqliteTable)('settings', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    globalLocalBackupPath: (0, sqlite_core_1.text)('global_local_backup_path'),
    driveClientId: (0, sqlite_core_1.text)('drive_client_id'),
    driveClientSecret: (0, sqlite_core_1.text)('drive_client_secret'),
    driveRefreshToken: (0, sqlite_core_1.text)('drive_refresh_token'),
    driveFolderId: (0, sqlite_core_1.text)('drive_folder_id'),
    driveAutoUpload: (0, sqlite_core_1.integer)('drive_auto_upload', { mode: 'boolean' }).default(false),
    sslEnabled: (0, sqlite_core_1.integer)('ssl_enabled', { mode: 'boolean' }).default(false),
    sslPort: (0, sqlite_core_1.integer)('ssl_port').default(3443),
    sslCertPath: (0, sqlite_core_1.text)('ssl_cert_path'),
    sslKeyPath: (0, sqlite_core_1.text)('ssl_key_path'),
    ipWhitelistEnabled: (0, sqlite_core_1.integer)('ip_whitelist_enabled', { mode: 'boolean' }).default(false),
    loginIpWhitelistEnabled: (0, sqlite_core_1.integer)('login_ip_whitelist_enabled', { mode: 'boolean' }).default(false),
    autostartEnabled: (0, sqlite_core_1.integer)('autostart_enabled', { mode: 'boolean' }).default(false),
});
exports.users = (0, sqlite_core_1.sqliteTable)('users', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    username: (0, sqlite_core_1.text)('username').notNull(),
    passwordHash: (0, sqlite_core_1.text)('password_hash').notNull(),
    passwordSalt: (0, sqlite_core_1.text)('password_salt').notNull(),
    createdAt: (0, sqlite_core_1.text)('created_at').default((0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
exports.sessions = (0, sqlite_core_1.sqliteTable)('sessions', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    userId: (0, sqlite_core_1.integer)('user_id'),
    token: (0, sqlite_core_1.text)('token').notNull(),
    expiresAt: (0, sqlite_core_1.text)('expires_at').notNull(),
    createdAt: (0, sqlite_core_1.text)('created_at').default((0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
exports.cronJobs = (0, sqlite_core_1.sqliteTable)('cron_jobs', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    name: (0, sqlite_core_1.text)('name').notNull(),
    serverId: (0, sqlite_core_1.integer)('server_id').references(function () { return exports.servers.id; }),
    scheduleType: (0, sqlite_core_1.text)('schedule_type').notNull(), // 'daily', 'weekly', 'monthly', 'custom'
    scheduleTime: (0, sqlite_core_1.text)('schedule_time'), // e.g., '02:00'
    scheduleDay: (0, sqlite_core_1.integer)('schedule_day'), // For weekly/monthly
    schedule: (0, sqlite_core_1.text)('schedule').notNull(), // Cron expression
    enabled: (0, sqlite_core_1.integer)('enabled', { mode: 'boolean' }).default(true),
    nextRun: (0, sqlite_core_1.text)('next_run'),
    lastRun: (0, sqlite_core_1.text)('last_run'),
    createdAt: (0, sqlite_core_1.text)('created_at').default((0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
exports.ipWhitelist = (0, sqlite_core_1.sqliteTable)('ip_whitelist', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    ipAddress: (0, sqlite_core_1.text)('ip_address').notNull(),
    type: (0, sqlite_core_1.text)('type').notNull(),
    description: (0, sqlite_core_1.text)('description'),
    createdAt: (0, sqlite_core_1.text)('created_at').default((0, drizzle_orm_1.sql)(templateObject_6 || (templateObject_6 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
exports.loginIpWhitelist = (0, sqlite_core_1.sqliteTable)('login_ip_whitelist', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    ipAddress: (0, sqlite_core_1.text)('ip_address').notNull(),
    type: (0, sqlite_core_1.text)('type').notNull(),
    description: (0, sqlite_core_1.text)('description'),
    createdAt: (0, sqlite_core_1.text)('created_at').default((0, drizzle_orm_1.sql)(templateObject_7 || (templateObject_7 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7;
