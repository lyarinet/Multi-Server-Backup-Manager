"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessions = exports.users = exports.settings = exports.backupLogs = exports.servers = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
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
    createdAt: (0, sqlite_core_1.text)('created_at').default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
});
exports.backupLogs = (0, sqlite_core_1.sqliteTable)('backup_logs', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    serverId: (0, sqlite_core_1.integer)('server_id').references(() => exports.servers.id),
    status: (0, sqlite_core_1.text)('status').notNull(), // 'pending', 'running', 'success', 'failed'
    logs: (0, sqlite_core_1.text)('logs'),
    createdAt: (0, sqlite_core_1.text)('created_at').default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
});
exports.settings = (0, sqlite_core_1.sqliteTable)('settings', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    globalLocalBackupPath: (0, sqlite_core_1.text)('global_local_backup_path'),
    driveClientId: (0, sqlite_core_1.text)('drive_client_id'),
    driveClientSecret: (0, sqlite_core_1.text)('drive_client_secret'),
    driveRefreshToken: (0, sqlite_core_1.text)('drive_refresh_token'),
    sslEnabled: (0, sqlite_core_1.integer)('ssl_enabled', { mode: 'boolean' }).default(false),
    sslPort: (0, sqlite_core_1.integer)('ssl_port').default(3443),
    sslCertPath: (0, sqlite_core_1.text)('ssl_cert_path'),
    sslKeyPath: (0, sqlite_core_1.text)('ssl_key_path'),
});
exports.users = (0, sqlite_core_1.sqliteTable)('users', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    username: (0, sqlite_core_1.text)('username').notNull(),
    passwordHash: (0, sqlite_core_1.text)('password_hash').notNull(),
    passwordSalt: (0, sqlite_core_1.text)('password_salt').notNull(),
    createdAt: (0, sqlite_core_1.text)('created_at').default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
});
exports.sessions = (0, sqlite_core_1.sqliteTable)('sessions', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    userId: (0, sqlite_core_1.integer)('user_id'),
    token: (0, sqlite_core_1.text)('token').notNull(),
    expiresAt: (0, sqlite_core_1.text)('expires_at').notNull(),
    createdAt: (0, sqlite_core_1.text)('created_at').default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
});
