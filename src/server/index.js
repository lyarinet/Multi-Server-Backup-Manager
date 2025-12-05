"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var path_1 = require("path");
var cors_1 = require("cors");
var db_1 = require("./db");
var schema_1 = require("./db/schema");
var drizzle_orm_1 = require("drizzle-orm");
var zod_1 = require("zod");
var cron_1 = require("./cron");
var ipWhitelist_1 = require("./ipWhitelist");
var app = (0, express_1.default)();
var defaultPort = Number(process.env.PORT) || 3000;
var port = defaultPort;
// CORS configuration - allow requests from frontend domain
app.use((0, cors_1.default)({
    origin: [
        'https://bk.lyarinet.com',
        'http://localhost:5173', // Vite dev server
        'http://localhost:3000',
        'capacitor://localhost', // Capacitor iOS
        'http://localhost', // Capacitor Android
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
app.set('trust proxy', true);
// IP Whitelist middleware - must be before routes but after express.json
// Note: Login/register routes are excluded in the middleware itself
var ipWhitelistMiddleware = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var clientIp, allowed, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                // Skip whitelist check for login/register/health endpoints
                // Also allow IP whitelist management endpoints so admins can fix lockouts
                if (req.path === '/api/auth/login' ||
                    req.path === '/api/auth/register' ||
                    req.path === '/health' ||
                    req.path.startsWith('/oauth_callback') ||
                    req.path.startsWith('/api/ip-whitelist') ||
                    req.path.startsWith('/api/login-ip-whitelist')) {
                    return [2 /*return*/, next()];
                }
                clientIp = (0, ipWhitelist_1.getClientIp)(req);
                return [4 /*yield*/, (0, ipWhitelist_1.isIpWhitelisted)(clientIp)];
            case 1:
                allowed = _a.sent();
                if (!allowed) {
                    console.warn("IP whitelist blocked: ".concat(clientIp, " from ").concat(req.path));
                    // For API requests, return JSON
                    if (req.path.startsWith('/api')) {
                        return [2 /*return*/, res.status(403).json({
                                error: 'Access denied. Your IP address is not whitelisted.',
                                code: 'IP_WHITELIST',
                            })];
                    }
                    // For non-API (HTML) requests, show a friendly page
                    res.status(403).send("\n                <!DOCTYPE html>\n                <html lang=\"en\">\n                    <head>\n                        <meta charset=\"UTF-8\" />\n                        <title>Access Denied - IP Whitelist</title>\n                        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n                        <style>\n                            body {\n                                margin: 0;\n                                padding: 0;\n                                min-height: 100vh;\n                                display: flex;\n                                align-items: center;\n                                justify-content: center;\n                                font-family: system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif;\n                                background: #0f172a;\n                                color: #e5e7eb;\n                            }\n                            .card {\n                                background: rgba(15, 23, 42, 0.96);\n                                border-radius: 16px;\n                                padding: 32px 40px;\n                                box-shadow: 0 20px 45px rgba(15, 23, 42, 0.9);\n                                max-width: 520px;\n                                width: 100%;\n                                border: 1px solid rgba(148, 163, 184, 0.4);\n                                text-align: center;\n                            }\n                            h1 {\n                                font-size: 1.75rem;\n                                margin-bottom: 8px;\n                            }\n                            p {\n                                margin: 4px 0;\n                                font-size: 0.95rem;\n                                color: #9ca3af;\n                            }\n                            .ip {\n                                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace;\n                                background: rgba(15, 23, 42, 0.9);\n                                padding: 6px 10px;\n                                border-radius: 999px;\n                                display: inline-block;\n                                border: 1px solid rgba(148, 163, 184, 0.5);\n                                margin-top: 8px;\n                                color: #f97316;\n                                font-size: 0.9rem;\n                            }\n                            .footnote {\n                                margin-top: 18px;\n                                font-size: 0.8rem;\n                                color: #6b7280;\n                            }\n                        </style>\n                    </head>\n                    <body>\n                        <div class=\"card\">\n                            <h1>Access to this page is restricted</h1>\n                            <p>You do not have access to this page from your current IP.</p>\n                            <p>Please contact the system administrator to add your IP address to the whitelist.</p>\n                            <div class=\"ip\">Your IP: ".concat(clientIp, "</div>\n                            <p class=\"footnote\">IP whitelist is enabled on this server. Only approved IP addresses can use the backup panel.</p>\n                        </div>\n                    </body>\n                </html>\n            "));
                    return [2 /*return*/];
                }
                next();
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('IP whitelist middleware error:', error_1.message);
                // On error, allow access (fail open)
                next();
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
app.use(ipWhitelistMiddleware);
// Simple in-memory password hashing utilities
var crypto_1 = require("crypto");
function hashPassword(password, salt) {
    return crypto_1.default.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
}
function makeToken() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
// Auth routes
app.post('/api/auth/register', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var clientIp, loginAllowed, schema, data, salt, hash, existing, created, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                clientIp = (0, ipWhitelist_1.getClientIp)(req);
                return [4 /*yield*/, (0, ipWhitelist_1.isLoginIpWhitelisted)(clientIp)];
            case 1:
                loginAllowed = _a.sent();
                if (!loginAllowed) {
                    console.warn("Login IP whitelist blocked registration: ".concat(clientIp));
                    return [2 /*return*/, res.status(403).json({
                            error: 'Access denied. Your IP address is not whitelisted for registration.',
                            code: 'LOGIN_IP_WHITELIST'
                        })];
                }
                schema = zod_1.z.object({ username: zod_1.z.string().min(3), password: zod_1.z.string().min(6) });
                _a.label = 2;
            case 2:
                _a.trys.push([2, 5, , 6]);
                data = schema.parse(req.body);
                salt = crypto_1.default.randomBytes(16).toString('hex');
                hash = hashPassword(data.password, salt);
                return [4 /*yield*/, db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.username, data.username))];
            case 3:
                existing = _a.sent();
                if (existing.length > 0)
                    return [2 /*return*/, res.status(409).json({ error: 'User exists' })];
                return [4 /*yield*/, db_1.db.insert(schema_1.users).values({ username: data.username, passwordHash: hash, passwordSalt: salt }).returning()];
            case 4:
                created = _a.sent();
                res.json({ id: created[0].id, username: created[0].username });
                return [3 /*break*/, 6];
            case 5:
                e_1 = _a.sent();
                res.status(400).json({ error: 'Invalid input' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
app.post('/api/auth/login', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var clientIp, loginAllowed, schema, data, found, user, hash, token, expiresAt, e_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                clientIp = (0, ipWhitelist_1.getClientIp)(req);
                return [4 /*yield*/, (0, ipWhitelist_1.isLoginIpWhitelisted)(clientIp)];
            case 1:
                loginAllowed = _a.sent();
                if (!loginAllowed) {
                    console.warn("Login IP whitelist blocked: ".concat(clientIp));
                    return [2 /*return*/, res.status(403).json({
                            error: 'Access denied. Your IP address is not whitelisted for login.',
                            code: 'LOGIN_IP_WHITELIST'
                        })];
                }
                schema = zod_1.z.object({ username: zod_1.z.string(), password: zod_1.z.string() });
                _a.label = 2;
            case 2:
                _a.trys.push([2, 5, , 6]);
                data = schema.parse(req.body);
                return [4 /*yield*/, db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.username, data.username))];
            case 3:
                found = _a.sent();
                user = found[0];
                if (!user) {
                    console.warn("Login attempt failed: User not found - ".concat(data.username));
                    return [2 /*return*/, res.status(401).json({ error: 'Invalid credentials' })];
                }
                hash = hashPassword(data.password, user.passwordSalt);
                if (hash !== user.passwordHash) {
                    console.warn("Login attempt failed: Invalid password for user - ".concat(data.username));
                    return [2 /*return*/, res.status(401).json({ error: 'Invalid credentials' })];
                }
                token = makeToken();
                expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
                return [4 /*yield*/, db_1.db.insert(schema_1.sessions).values({ userId: user.id, token: token, expiresAt: expiresAt })];
            case 4:
                _a.sent();
                console.log("Login successful for user: ".concat(data.username));
                res.json({ token: token });
                return [3 /*break*/, 6];
            case 5:
                e_2 = _a.sent();
                console.error('Login error:', e_2);
                res.status(400).json({ error: (e_2 === null || e_2 === void 0 ? void 0 : e_2.message) || 'Invalid input' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
var authMiddleware = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, token, rows, s, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                auth = req.headers.authorization;
                if (!auth || !auth.startsWith('Bearer ')) {
                    return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                }
                token = auth.slice('Bearer '.length);
                return [4 /*yield*/, db_1.db.select().from(schema_1.sessions).where((0, drizzle_orm_1.eq)(schema_1.sessions.token, token))];
            case 1:
                rows = _a.sent();
                s = rows[0];
                if (!s)
                    return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                if (new Date(s.expiresAt).getTime() < Date.now())
                    return [2 /*return*/, res.status(401).json({ error: 'Session expired' })];
                req.userId = s.userId;
                next();
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('Auth middleware error:', error_2.message, error_2.stack);
                return [2 /*return*/, res.status(500).json({ error: 'Auth error', details: error_2.message })];
            case 3: return [2 /*return*/];
        }
    });
}); };
app.post('/api/auth/change-password', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var schema, data, userId, found, user, currentHash, newSalt, newHash, e_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                schema = zod_1.z.object({
                    currentPassword: zod_1.z.string(),
                    newPassword: zod_1.z.string().min(6)
                });
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                data = schema.parse(req.body);
                userId = req.userId;
                return [4 /*yield*/, db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))];
            case 2:
                found = _a.sent();
                user = found[0];
                if (!user)
                    return [2 /*return*/, res.status(404).json({ error: 'User not found' })];
                currentHash = hashPassword(data.currentPassword, user.passwordSalt);
                if (currentHash !== user.passwordHash) {
                    return [2 /*return*/, res.status(401).json({ error: 'Incorrect current password' })];
                }
                newSalt = crypto_1.default.randomBytes(16).toString('hex');
                newHash = hashPassword(data.newPassword, newSalt);
                // Update password
                return [4 /*yield*/, db_1.db.update(schema_1.users)
                        .set({ passwordHash: newHash, passwordSalt: newSalt })
                        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))];
            case 3:
                // Update password
                _a.sent();
                // Invalidate all existing sessions for this user (security best practice)
                return [4 /*yield*/, db_1.db.delete(schema_1.sessions).where((0, drizzle_orm_1.eq)(schema_1.sessions.userId, userId))];
            case 4:
                // Invalidate all existing sessions for this user (security best practice)
                _a.sent();
                console.log("Password changed successfully for user ID: ".concat(userId));
                res.json({ success: true, message: 'Password changed successfully. Please login again.' });
                return [3 /*break*/, 6];
            case 5:
                e_3 = _a.sent();
                console.error('Password change error:', e_3);
                res.status(400).json({ error: (e_3 === null || e_3 === void 0 ? void 0 : e_3.message) || 'Invalid input' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// API Routes
app.get('/api/servers', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var allServers, normalized;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.servers)];
            case 1:
                allServers = _a.sent();
                normalized = allServers.map(function (s) { return (__assign(__assign({}, s), { backupPaths: s.backupPaths ? JSON.parse(s.backupPaths) : [], dbSelected: s.dbSelected ? JSON.parse(s.dbSelected) : [] })); });
                res.json(normalized);
                return [2 /*return*/];
        }
    });
}); });
app.post('/api/servers', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var schema, data, toSave, result, e_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                schema = zod_1.z.object({
                    name: zod_1.z.string(),
                    ip: zod_1.z.string(),
                    user: zod_1.z.string(),
                    port: zod_1.z.number().default(22),
                    sshKeyPath: zod_1.z.string().optional(),
                    password: zod_1.z.string().optional(),
                    localBackupPath: zod_1.z.string().optional(),
                    backupPaths: zod_1.z.array(zod_1.z.string()).optional(),
                    dbUser: zod_1.z.string().optional(),
                    dbPassword: zod_1.z.string().optional(),
                    dbHost: zod_1.z.string().optional(),
                    dbPort: zod_1.z.number().optional(),
                    dbSelected: zod_1.z.array(zod_1.z.string()).optional(),
                    backupWww: zod_1.z.boolean().default(true),
                    backupLogs: zod_1.z.boolean().default(true),
                    backupNginx: zod_1.z.boolean().default(true),
                    backupDb: zod_1.z.boolean().default(true),
                }).refine(function (data) { return Boolean(data.sshKeyPath) || Boolean(data.password); }, {
                    message: 'Provide sshKeyPath or password',
                    path: ['sshKeyPath'],
                });
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                data = schema.parse(req.body);
                toSave = __assign(__assign({}, data), { localBackupPath: data.localBackupPath && data.localBackupPath.trim() ? data.localBackupPath : undefined, backupPaths: data.backupPaths ? JSON.stringify(data.backupPaths) : undefined, dbSelected: data.dbSelected ? JSON.stringify(data.dbSelected) : undefined });
                return [4 /*yield*/, db_1.db.insert(schema_1.servers).values(toSave).returning()];
            case 2:
                result = _a.sent();
                res.json(result[0]);
                return [3 /*break*/, 4];
            case 3:
                e_4 = _a.sent();
                res.status(400).json({ error: 'Invalid data' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.put('/api/servers/:id', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var serverId, schema, data, toSave, result, e_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                serverId = parseInt(req.params.id);
                schema = zod_1.z.object({
                    name: zod_1.z.string(),
                    ip: zod_1.z.string(),
                    user: zod_1.z.string(),
                    port: zod_1.z.number().default(22),
                    sshKeyPath: zod_1.z.string().optional(),
                    password: zod_1.z.string().optional(),
                    localBackupPath: zod_1.z.string().optional(),
                    backupPaths: zod_1.z.array(zod_1.z.string()).optional(),
                    dbUser: zod_1.z.string().optional(),
                    dbPassword: zod_1.z.string().optional(),
                    dbHost: zod_1.z.string().optional(),
                    dbPort: zod_1.z.number().optional(),
                    dbSelected: zod_1.z.array(zod_1.z.string()).optional(),
                    backupWww: zod_1.z.boolean().default(true),
                    backupLogs: zod_1.z.boolean().default(true),
                    backupNginx: zod_1.z.boolean().default(true),
                    backupDb: zod_1.z.boolean().default(true),
                }).refine(function (data) { return Boolean(data.sshKeyPath) || Boolean(data.password); }, {
                    message: 'Provide sshKeyPath or password',
                    path: ['sshKeyPath'],
                });
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                data = schema.parse(req.body);
                toSave = __assign(__assign({}, data), { localBackupPath: data.localBackupPath && data.localBackupPath.trim() ? data.localBackupPath : undefined, backupPaths: data.backupPaths ? JSON.stringify(data.backupPaths) : undefined, dbSelected: data.dbSelected ? JSON.stringify(data.dbSelected) : undefined });
                return [4 /*yield*/, db_1.db.update(schema_1.servers)
                        .set(toSave)
                        .where((0, drizzle_orm_1.eq)(schema_1.servers.id, serverId))
                        .returning()];
            case 2:
                result = _a.sent();
                if (result.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Server not found' })];
                }
                res.json(result[0]);
                return [3 /*break*/, 4];
            case 3:
                e_5 = _a.sent();
                res.status(400).json({ error: 'Invalid data' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.delete('/api/servers/:id', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var serverId, existing;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                serverId = parseInt(req.params.id);
                return [4 /*yield*/, db_1.db.select().from(schema_1.servers).where((0, drizzle_orm_1.eq)(schema_1.servers.id, serverId)).get()];
            case 1:
                existing = _a.sent();
                if (!existing) {
                    return [2 /*return*/, res.status(404).json({ error: 'Server not found' })];
                }
                return [4 /*yield*/, db_1.db.delete(schema_1.backupLogs).where((0, drizzle_orm_1.eq)(schema_1.backupLogs.serverId, serverId))];
            case 2:
                _a.sent();
                return [4 /*yield*/, db_1.db.delete(schema_1.servers).where((0, drizzle_orm_1.eq)(schema_1.servers.id, serverId))];
            case 3:
                _a.sent();
                res.json({ ok: true });
                return [2 /*return*/];
        }
    });
}); });
var backup_1 = require("./backup");
var ssh2_1 = require("ssh2");
var schema_2 = require("./db/schema");
var fs_1 = require("fs");
var fs_2 = require("fs");
var https_1 = require("https");
app.post('/api/backup/:id', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var serverId, server, log, appSettings, globalLocalBackupPath, backupManager;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                serverId = parseInt(req.params.id);
                return [4 /*yield*/, db_1.db.select().from(schema_1.servers).where((0, drizzle_orm_1.eq)(schema_1.servers.id, serverId)).get()];
            case 1:
                server = _b.sent();
                if (!server) {
                    return [2 /*return*/, res.status(404).json({ error: 'Server not found' })];
                }
                return [4 /*yield*/, db_1.db.insert(schema_1.backupLogs).values({
                        serverId: serverId,
                        status: 'pending',
                        logs: 'Initializing...',
                    }).returning()];
            case 2:
                log = _b.sent();
                return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 3:
                appSettings = _b.sent();
                globalLocalBackupPath = (_a = appSettings[0]) === null || _a === void 0 ? void 0 : _a.globalLocalBackupPath;
                backupManager = new backup_1.BackupManager({
                    host: server.ip,
                    port: server.port,
                    username: server.user,
                    privateKeyPath: server.sshKeyPath,
                    password: server.password,
                    localBackupPath: server.localBackupPath || globalLocalBackupPath || undefined,
                    backupPaths: server.backupPaths ? JSON.parse(server.backupPaths) : undefined,
                    dbUser: server.dbUser,
                    dbPassword: server.dbPassword,
                    dbHost: server.dbHost,
                    dbSelected: server.dbSelected ? JSON.parse(server.dbSelected) : undefined,
                    backupWww: Boolean(server.backupWww),
                    backupLogs: Boolean(server.backupLogs),
                    backupNginx: Boolean(server.backupNginx),
                    backupDb: Boolean(server.backupDb),
                    serverName: server.name,
                }, log[0].id);
                // Run in background
                backupManager.run().catch(console.error);
                res.json({ logId: log[0].id });
                return [2 /*return*/];
        }
    });
}); });
app.get('/api/backup/:id/status', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var logId, log;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logId = parseInt(req.params.id);
                return [4 /*yield*/, db_1.db.select().from(schema_1.backupLogs).where((0, drizzle_orm_1.eq)(schema_1.backupLogs.id, logId)).get()];
            case 1:
                log = _a.sent();
                if (!log) {
                    return [2 /*return*/, res.status(404).json({ error: 'Log not found' })];
                }
                res.json(log);
                return [2 /*return*/];
        }
    });
}); });
app.get('/api/servers/:id/browse', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var serverId, targetPath, server, conn;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                serverId = parseInt(req.params.id);
                targetPath = typeof req.query.path === 'string' && req.query.path ? req.query.path : '/';
                return [4 /*yield*/, db_1.db.select().from(schema_1.servers).where((0, drizzle_orm_1.eq)(schema_1.servers.id, serverId)).get()];
            case 1:
                server = _a.sent();
                if (!server) {
                    return [2 /*return*/, res.status(404).json({ error: 'Server not found' })];
                }
                conn = new ssh2_1.Client();
                conn.on('ready', function () {
                    conn.sftp(function (err, sftp) {
                        if (err) {
                            conn.end();
                            return res.status(500).json({ error: 'SFTP init failed' });
                        }
                        sftp.readdir(targetPath, function (err2, list) {
                            conn.end();
                            if (err2) {
                                return res.status(400).json({ error: 'Cannot read directory' });
                            }
                            var entries = list.map(function (e) {
                                var mode = e.attrs && typeof e.attrs.mode === 'number' ? e.attrs.mode : 0;
                                var type = (mode & 61440) === 16384 ? 'dir' : 'file';
                                return { name: e.filename, type: type };
                            });
                            res.json({ path: targetPath, entries: entries });
                        });
                    });
                }).on('error', function () {
                    res.status(500).json({ error: 'SSH connection failed' });
                }).connect(__assign({ host: server.ip, port: server.port, username: server.user }, (server.password ? { password: server.password } : { privateKey: server.sshKeyPath ? require('fs').readFileSync(server.sshKeyPath) : undefined })));
                return [2 /*return*/];
        }
    });
}); });
app.post('/api/browse', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var schema, data_1, conn_1;
    return __generator(this, function (_a) {
        schema = zod_1.z.object({
            host: zod_1.z.string(),
            port: zod_1.z.number().default(22),
            user: zod_1.z.string(),
            sshKeyPath: zod_1.z.string().optional(),
            password: zod_1.z.string().optional(),
            path: zod_1.z.string().default('/'),
        }).refine(function (d) { return Boolean(d.sshKeyPath) || Boolean(d.password); }, {
            message: 'Provide sshKeyPath or password',
            path: ['sshKeyPath'],
        });
        try {
            data_1 = schema.parse(req.body);
            conn_1 = new ssh2_1.Client();
            conn_1.on('ready', function () {
                conn_1.sftp(function (err, sftp) {
                    if (err) {
                        conn_1.end();
                        return res.status(500).json({ error: 'SFTP init failed' });
                    }
                    sftp.readdir(data_1.path, function (err2, list) {
                        conn_1.end();
                        if (err2) {
                            return res.status(400).json({ error: 'Cannot read directory' });
                        }
                        var entries = list.map(function (e) {
                            var mode = e.attrs && typeof e.attrs.mode === 'number' ? e.attrs.mode : 0;
                            var type = (mode & 61440) === 16384 ? 'dir' : 'file';
                            return { name: e.filename, type: type };
                        });
                        res.json({ path: data_1.path, entries: entries });
                    });
                });
            }).on('error', function () {
                res.status(500).json({ error: 'SSH connection failed' });
            }).connect(__assign({ host: data_1.host, port: data_1.port, username: data_1.user }, (data_1.password ? { password: data_1.password } : { privateKey: data_1.sshKeyPath ? require('fs').readFileSync(data_1.sshKeyPath) : undefined })));
        }
        catch (e) {
            res.status(400).json({ error: 'Invalid input' });
        }
        return [2 /*return*/];
    });
}); });
app.post('/api/servers/:id/dbs', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var serverId, _a, dbHost, dbUser, dbPassword, dbPort, server, conn;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                serverId = parseInt(req.params.id);
                _a = req.body || {}, dbHost = _a.dbHost, dbUser = _a.dbUser, dbPassword = _a.dbPassword, dbPort = _a.dbPort;
                return [4 /*yield*/, db_1.db.select().from(schema_1.servers).where((0, drizzle_orm_1.eq)(schema_1.servers.id, serverId)).get()];
            case 1:
                server = _b.sent();
                if (!server) {
                    return [2 /*return*/, res.status(404).json({ error: 'Server not found' })];
                }
                if (!dbUser) {
                    return [2 /*return*/, res.status(400).json({ error: 'dbUser required' })];
                }
                conn = new ssh2_1.Client();
                conn.on('ready', function () {
                    conn.exec('command -v mysql || command -v mariadb', function (findErr, findStream) {
                        if (findErr) {
                            conn.end();
                            return res.status(500).json({ error: 'Failed to locate MySQL client' });
                        }
                        var bin = '';
                        findStream.on('data', function (d) { bin += d.toString().trim(); });
                        findStream.on('close', function () {
                            if (!bin) {
                                conn.end();
                                return res.status(500).json({ error: 'MySQL client not found on remote host' });
                            }
                            var cmd = "".concat(bin, " --protocol=tcp -h ").concat(dbHost || 'localhost', " ").concat(dbPort ? "-P ".concat(dbPort) : '', " -u ").concat(dbUser, " ").concat(dbPassword ? "-p".concat(dbPassword) : '', " -e \"SHOW DATABASES;\" -s -N");
                            conn.exec(cmd, function (err, stream) {
                                if (err) {
                                    conn.end();
                                    return res.status(500).json({ error: 'Failed to run mysql', details: err.message });
                                }
                                var out = '';
                                var errOut = '';
                                stream.on('data', function (d) { out += d.toString(); });
                                stream.stderr.on('data', function (d) { errOut += d.toString(); });
                                stream.on('close', function () {
                                    conn.end();
                                    if (errOut && !out) {
                                        return res.status(500).json({ error: 'mysql stderr', details: errOut });
                                    }
                                    var lines = out.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l && l !== 'information_schema' && l !== 'performance_schema' && l !== 'mysql' && l !== 'sys'; });
                                    res.json({ databases: lines });
                                });
                            });
                        });
                    });
                }).on('error', function () {
                    res.status(500).json({ error: 'SSH connection failed' });
                }).connect(__assign({ host: server.ip, port: server.port, username: server.user }, (server.password ? { password: server.password } : { privateKey: server.sshKeyPath ? require('fs').readFileSync(server.sshKeyPath) : undefined })));
                return [2 /*return*/];
        }
    });
}); });
app.post('/api/dbs', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, host, port, user, sshKeyPath, password, dbHost, dbUser, dbPassword, dbPort, conn;
    return __generator(this, function (_b) {
        _a = req.body || {}, host = _a.host, port = _a.port, user = _a.user, sshKeyPath = _a.sshKeyPath, password = _a.password, dbHost = _a.dbHost, dbUser = _a.dbUser, dbPassword = _a.dbPassword, dbPort = _a.dbPort;
        if (!host || !port || !user) {
            return [2 /*return*/, res.status(400).json({ error: 'Missing SSH connection fields' })];
        }
        if (!dbUser) {
            return [2 /*return*/, res.status(400).json({ error: 'dbUser required' })];
        }
        conn = new ssh2_1.Client();
        conn.on('ready', function () {
            conn.exec('command -v mysql || command -v mariadb', function (findErr, findStream) {
                if (findErr) {
                    conn.end();
                    return res.status(500).json({ error: 'Failed to locate MySQL client' });
                }
                var bin = '';
                findStream.on('data', function (d) { bin += d.toString().trim(); });
                findStream.on('close', function () {
                    if (!bin) {
                        conn.end();
                        return res.status(500).json({ error: 'MySQL client not found on remote host' });
                    }
                    var cmd = "".concat(bin, " --protocol=tcp -h ").concat(dbHost || 'localhost', " ").concat(dbPort ? "-P ".concat(dbPort) : '', " -u ").concat(dbUser, " ").concat(dbPassword ? "-p".concat(dbPassword) : '', " -e \"SHOW DATABASES;\" -s -N");
                    conn.exec(cmd, function (err, stream) {
                        if (err) {
                            conn.end();
                            return res.status(500).json({ error: 'Failed to run mysql', details: err.message });
                        }
                        var out = '';
                        var errOut = '';
                        stream.on('data', function (d) { out += d.toString(); });
                        stream.stderr.on('data', function (d) { errOut += d.toString(); });
                        stream.on('close', function () {
                            conn.end();
                            if (errOut && !out) {
                                return res.status(500).json({ error: 'mysql stderr', details: errOut });
                            }
                            var lines = out.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l && l !== 'information_schema' && l !== 'performance_schema' && l !== 'mysql' && l !== 'sys'; });
                            res.json({ databases: lines });
                        });
                    });
                });
            });
        }).on('error', function () {
            res.status(500).json({ error: 'SSH connection failed' });
        }).connect(__assign({ host: host, port: port, username: user }, (password ? { password: password } : { privateKey: sshKeyPath ? require('fs').readFileSync(sshKeyPath) : undefined })));
        return [2 /*return*/];
    });
}); });
app.get('/api/local/browse', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var q, entriesRaw, entries, e_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                q = typeof req.query.path === 'string' && req.query.path ? req.query.path : (process.env.HOME || '/');
                return [4 /*yield*/, fs_1.promises.readdir(q, { withFileTypes: true })];
            case 1:
                entriesRaw = _a.sent();
                entries = entriesRaw.map(function (d) { return ({ name: d.name, type: d.isDirectory() ? 'dir' : 'file' }); });
                res.json({ path: q, entries: entries });
                return [3 /*break*/, 3];
            case 2:
                e_6 = _a.sent();
                res.status(400).json({ error: 'Cannot read local directory' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// OAuth callback handler - MUST be before static file serving
app.get('/oauth_callback', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, code, error, set, cfg, google, redirectUri, oauth2Client, tokens, existingToken, errorMessage, dbError_1, e_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 8, , 9]);
                _a = req.query, code = _a.code, error = _a.error;
                if (error) {
                    return [2 /*return*/, res.send("\n                <html>\n                    <head><title>OAuth Error</title></head>\n                    <body style=\"font-family: Arial, sans-serif; padding: 40px; text-align: center;\">\n                        <h1 style=\"color: red;\">\u274C Authorization Failed</h1>\n                        <p><strong>Error:</strong> ".concat(error, "</p>\n                        ").concat(error === 'redirect_uri_mismatch' ? "\n                            <div style=\"background: #fff3cd; border: 1px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto;\">\n                                <h3 style=\"margin-top: 0;\">Redirect URI Mismatch - How to Fix:</h3>\n                                <ol style=\"text-align: left;\">\n                                    <li>Go to <a href=\"https://console.cloud.google.com/apis/credentials\" target=\"_blank\">Google Cloud Console \u2192 Credentials</a></li>\n                                    <li>Click on your OAuth 2.0 Client ID</li>\n                                    <li>In \"Authorized redirect URIs\", add exactly: <code style=\"background: #f0f0f0; padding: 2px 6px; border-radius: 3px;\">https://bk.lyarinet.com/oauth_callback</code></li>\n                                    <li>Make sure there are NO trailing slashes</li>\n                                    <li>Click \"Save\"</li>\n                                    <li>Wait a few minutes for changes to propagate</li>\n                                    <li>Try again</li>\n                                </ol>\n                            </div>\n                        " : '', "\n                        <p><a href=\"javascript:window.close()\">Close this window</a></p>\n                    </body>\n                </html>\n            "))];
                }
                if (!code) {
                    return [2 /*return*/, res.status(400).send('Missing authorization code')];
                }
                return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 1:
                set = _b.sent();
                cfg = set[0];
                if (!(cfg === null || cfg === void 0 ? void 0 : cfg.driveClientId) || !(cfg === null || cfg === void 0 ? void 0 : cfg.driveClientSecret)) {
                    return [2 /*return*/, res.status(400).send('Drive not configured')];
                }
                return [4 /*yield*/, Promise.resolve().then(function () { return require('googleapis'); })];
            case 2:
                google = (_b.sent()).google;
                redirectUri = 'https://bk.lyarinet.com/oauth_callback';
                oauth2Client = new google.auth.OAuth2(cfg.driveClientId, cfg.driveClientSecret, redirectUri);
                return [4 /*yield*/, oauth2Client.getToken(code)];
            case 3:
                tokens = (_b.sent()).tokens;
                console.log('OAuth tokens received:', {
                    hasAccessToken: !!tokens.access_token,
                    hasRefreshToken: !!tokens.refresh_token,
                    tokenType: tokens.token_type,
                    expiryDate: tokens.expiry_date,
                });
                if (!tokens.refresh_token) {
                    existingToken = cfg.driveRefreshToken;
                    errorMessage = 'No refresh token received. ';
                    if (existingToken) {
                        errorMessage += 'You already have a refresh token saved. If you need a new one, revoke access at https://myaccount.google.com/permissions and try again.';
                    }
                    else {
                        errorMessage += 'This usually happens if you\'ve already authorized this app. Please revoke access at https://myaccount.google.com/permissions and try again with prompt=consent.';
                    }
                    return [2 /*return*/, res.send("\n                <!DOCTYPE html>\n                <html>\n                    <head>\n                        <title>OAuth Error - No Refresh Token</title>\n                        <meta charset=\"UTF-8\">\n                        <style>\n                            body {\n                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;\n                                padding: 40px;\n                                text-align: center;\n                                background: #1a1a1a;\n                                color: #ffffff;\n                                margin: 0;\n                                display: flex;\n                                align-items: center;\n                                justify-content: center;\n                                min-height: 100vh;\n                            }\n                            .container {\n                                background: #2a2a2a;\n                                border-radius: 12px;\n                                padding: 40px;\n                                max-width: 600px;\n                                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);\n                            }\n                            h1 {\n                                color: #f87171;\n                                margin-bottom: 20px;\n                                font-size: 24px;\n                            }\n                            p {\n                                color: #d1d5db;\n                                margin: 10px 0;\n                                line-height: 1.6;\n                                text-align: left;\n                            }\n                            .steps {\n                                background: #374151;\n                                border-radius: 8px;\n                                padding: 20px;\n                                margin: 20px 0;\n                                text-align: left;\n                            }\n                            .steps ol {\n                                margin: 10px 0;\n                                padding-left: 20px;\n                            }\n                            .steps li {\n                                margin: 8px 0;\n                                color: #d1d5db;\n                            }\n                            a {\n                                color: #60a5fa;\n                                text-decoration: none;\n                            }\n                            a:hover {\n                                text-decoration: underline;\n                            }\n                            button {\n                                background: #3b82f6;\n                                color: white;\n                                border: none;\n                                padding: 12px 24px;\n                                border-radius: 6px;\n                                cursor: pointer;\n                                font-size: 16px;\n                                margin-top: 20px;\n                            }\n                            button:hover {\n                                background: #2563eb;\n                            }\n                        </style>\n                    </head>\n                    <body>\n                        <div class=\"container\">\n                            <h1>\u26A0\uFE0F No Refresh Token Received</h1>\n                            <p>".concat(errorMessage, "</p>\n                            <div class=\"steps\">\n                                <h3 style=\"color: #fbbf24; margin-top: 0;\">To Fix This:</h3>\n                                <ol>\n                                    <li>Go to <a href=\"https://myaccount.google.com/permissions\" target=\"_blank\">Google Account Permissions</a></li>\n                                    <li>Find \"lyarinet.com\" or your app name in the list</li>\n                                    <li>Click \"Remove access\" or \"Revoke\"</li>\n                                    <li>Come back here and click \"Get via OAuth\" again</li>\n                                    <li>This time, Google will ask for consent again and provide a refresh token</li>\n                                </ol>\n                            </div>\n                            <button onclick=\"window.close()\">Close Window</button>\n                        </div>\n                    </body>\n                </html>\n            "))];
                }
                _b.label = 4;
            case 4:
                _b.trys.push([4, 6, , 7]);
                return [4 /*yield*/, db_1.db.update(schema_2.settings)
                        .set({ driveRefreshToken: tokens.refresh_token })
                        .where((0, drizzle_orm_1.eq)(schema_2.settings.id, cfg.id))];
            case 5:
                _b.sent();
                console.log('Refresh token saved successfully');
                return [3 /*break*/, 7];
            case 6:
                dbError_1 = _b.sent();
                console.error('Failed to save refresh token:', dbError_1);
                return [2 /*return*/, res.status(500).send("\n                <!DOCTYPE html>\n                <html>\n                    <head><title>Database Error</title></head>\n                    <body style=\"font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #1a1a1a; color: #fff;\">\n                        <h1 style=\"color: red;\">\u274C Database Error</h1>\n                        <p>Failed to save refresh token: ".concat(dbError_1.message, "</p>\n                        <p>Please try again or contact support.</p>\n                        <button onclick=\"window.close()\" style=\"padding: 10px 20px; margin-top: 20px; cursor: pointer;\">Close</button>\n                    </body>\n                </html>\n            "))];
            case 7:
                res.send("\n            <!DOCTYPE html>\n            <html>\n                <head>\n                    <title>OAuth Success</title>\n                    <meta charset=\"UTF-8\">\n                    <style>\n                        body {\n                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;\n                            padding: 40px;\n                            text-align: center;\n                            background: #1a1a1a;\n                            color: #ffffff;\n                            margin: 0;\n                            display: flex;\n                            align-items: center;\n                            justify-content: center;\n                            min-height: 100vh;\n                        }\n                        .container {\n                            background: #2a2a2a;\n                            border-radius: 12px;\n                            padding: 40px;\n                            max-width: 500px;\n                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);\n                        }\n                        h1 {\n                            color: #4ade80;\n                            margin-bottom: 20px;\n                            font-size: 24px;\n                        }\n                        p {\n                            color: #d1d5db;\n                            margin: 10px 0;\n                            line-height: 1.6;\n                        }\n                        .spinner {\n                            border: 3px solid #374151;\n                            border-top: 3px solid #4ade80;\n                            border-radius: 50%;\n                            width: 40px;\n                            height: 40px;\n                            animation: spin 1s linear infinite;\n                            margin: 20px auto;\n                        }\n                        @keyframes spin {\n                            0% { transform: rotate(0deg); }\n                            100% { transform: rotate(360deg); }\n                        }\n                    </style>\n                </head>\n                <body>\n                    <div class=\"container\">\n                        <h1>\u2705 Authorization Successful!</h1>\n                        <p>Your Google Drive refresh token has been saved.</p>\n                        <p>This window will close automatically...</p>\n                        <div class=\"spinner\"></div>\n                        <p style=\"font-size: 12px; color: #9ca3af; margin-top: 20px;\">\n                            If the window doesn't close, you can close it manually.\n                        </p>\n                    </div>\n                    <script>\n                        // Try to close the window immediately\n                        if (window.opener) {\n                            // Notify parent window that auth was successful\n                            try {\n                                window.opener.postMessage({ type: 'oauth_success', refreshToken: '".concat(tokens.refresh_token, "' }, '*');\n                            } catch (e) {\n                                console.log('Could not notify parent window');\n                            }\n                        }\n                        \n                        // Close the window\n                        function closeWindow() {\n                            if (window.opener) {\n                                window.close();\n                            } else {\n                                // If window.close() doesn't work, try to redirect parent\n                                try {\n                                    window.location.href = window.location.origin + '/#/settings';\n                                } catch (e) {\n                                    document.body.innerHTML = '<div class=\"container\"><h1>\u2705 Success!</h1><p>Please close this window and refresh the settings page.</p></div>';\n                                }\n                            }\n                        }\n                        \n                        // Try to close immediately\n                        setTimeout(closeWindow, 500);\n                        \n                        // Fallback: try again after 2 seconds\n                        setTimeout(closeWindow, 2000);\n                        \n                        // Final fallback: show message after 3 seconds\n                        setTimeout(() => {\n                            if (!document.hidden) {\n                                document.querySelector('.spinner').style.display = 'none';\n                                document.querySelector('p:last-of-type').innerHTML = 'Please close this window manually and refresh the settings page.';\n                            }\n                        }, 3000);\n                    </script>\n                </body>\n            </html>\n        "));
                return [3 /*break*/, 9];
            case 8:
                e_7 = _b.sent();
                console.error('OAuth callback error:', e_7);
                res.status(500).send("\n            <html>\n                <head><title>OAuth Error</title></head>\n                <body style=\"font-family: Arial, sans-serif; padding: 40px; text-align: center;\">\n                    <h1 style=\"color: red;\">\u274C Authorization Failed</h1>\n                    <p>".concat(e_7.message, "</p>\n                    <p><a href=\"javascript:window.close()\">Close this window</a></p>\n                </body>\n            </html>\n        "));
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
// Root path handler - return API info
app.get('/', function (req, res) {
    res.json({
        message: 'Multi-Server Backup Manager API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            api: '/api/*',
            docs: 'See README.md for API documentation'
        }
    });
});
// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    app.use(express_1.default.static(path_1.default.join(__dirname, '../client')));
    app.get('*', function (req, res) {
        res.sendFile(path_1.default.join(__dirname, '../client/index.html'));
    });
}
function startHttpServer(p) {
    var _this = this;
    var host = process.env.HOST || '0.0.0.0';
    app.listen(p, host, function () {
        console.log("Server running at http://localhost:".concat(p));
        // Ensure an initial admin exists for first login
        (function () { return __awaiter(_this, void 0, void 0, function () {
            var existing, username, password, salt, hash, e_8, e_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        return [4 /*yield*/, db_1.db.select().from(schema_1.users).limit(1)];
                    case 1:
                        existing = _a.sent();
                        if (!(existing.length === 0)) return [3 /*break*/, 3];
                        username = 'admin';
                        password = 'admin123';
                        salt = crypto_1.default.randomBytes(16).toString('hex');
                        hash = hashPassword(password, salt);
                        return [4 /*yield*/, db_1.db.insert(schema_1.users).values({ username: username, passwordHash: hash, passwordSalt: salt })];
                    case 2:
                        _a.sent();
                        console.log('Created default admin user: admin / admin123');
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, cron_1.cronScheduler.loadJobs()];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_8 = _a.sent();
                        console.error('Failed to load cron jobs:', e_8.message);
                        return [3 /*break*/, 6];
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        e_9 = _a.sent();
                        console.error('Failed to init default user', e_9);
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        }); })();
    }).on('error', function (err) {
        if (err && err.code === 'EADDRINUSE') {
            if (process.env.NODE_ENV === 'production') {
                console.error("Port ".concat(p, " in use in production. Set a free PORT and restart."));
                throw err;
            }
            else {
                var next = p + 1;
                console.warn("Port ".concat(p, " in use, retrying on ").concat(next, "..."));
                port = next;
                startHttpServer(next);
            }
        }
        else {
            throw err;
        }
    });
}
startHttpServer(port);
// Ensure an initial admin exists for first login
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var existing, username, password, salt, hash, e_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                return [4 /*yield*/, db_1.db.select().from(schema_1.users).limit(1)];
            case 1:
                existing = _a.sent();
                if (!(existing.length === 0)) return [3 /*break*/, 3];
                username = 'admin';
                password = 'admin123';
                salt = crypto_1.default.randomBytes(16).toString('hex');
                hash = hashPassword(password, salt);
                return [4 /*yield*/, db_1.db.insert(schema_1.users).values({ username: username, passwordHash: hash, passwordSalt: salt })];
            case 2:
                _a.sent();
                console.log('Created default admin user: admin / admin123');
                _a.label = 3;
            case 3: return [3 /*break*/, 5];
            case 4:
                e_10 = _a.sent();
                console.error('Failed to init default user', e_10);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); })();
;
// Optional HTTPS server controlled by settings
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var set, cfg, sslPort_1, options, e_11;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 1:
                set = _a.sent();
                cfg = set[0];
                if ((cfg === null || cfg === void 0 ? void 0 : cfg.sslEnabled) && (cfg === null || cfg === void 0 ? void 0 : cfg.sslCertPath) && (cfg === null || cfg === void 0 ? void 0 : cfg.sslKeyPath)) {
                    sslPort_1 = Number(cfg.sslPort || 3443);
                    options = {
                        cert: fs_2.default.readFileSync(cfg.sslCertPath),
                        key: fs_2.default.readFileSync(cfg.sslKeyPath),
                    };
                    https_1.default.createServer(options, app).listen(sslPort_1, function () {
                        console.log("HTTPS server running at https://localhost:".concat(sslPort_1));
                    });
                }
                return [3 /*break*/, 3];
            case 2:
                e_11 = _a.sent();
                console.error('Failed to start HTTPS server:', (e_11 === null || e_11 === void 0 ? void 0 : e_11.message) || e_11);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); })();
app.get('/api/settings', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows, e_12;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 1:
                rows = _a.sent();
                res.json(rows[0] || {});
                return [3 /*break*/, 3];
            case 2:
                e_12 = _a.sent();
                console.error('Settings get error:', e_12.message, e_12.stack);
                res.status(500).json({ error: 'Failed to get settings', details: e_12.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.put('/api/settings', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var schema, data, existing, updated, created, e_13;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                schema = zod_1.z.object({
                    globalLocalBackupPath: zod_1.z.string().optional(),
                    driveClientId: zod_1.z.string().optional(),
                    driveClientSecret: zod_1.z.string().optional(),
                    driveRefreshToken: zod_1.z.string().optional(),
                    driveFolderId: zod_1.z.string().optional(),
                    driveAutoUpload: zod_1.z.boolean().optional(),
                    sslEnabled: zod_1.z.boolean().optional(),
                    sslPort: zod_1.z.number().optional(),
                    sslCertPath: zod_1.z.string().optional(),
                    sslKeyPath: zod_1.z.string().optional(),
                    autostartEnabled: zod_1.z.boolean().optional(),
                });
                _b.label = 1;
            case 1:
                _b.trys.push([1, 7, , 8]);
                data = schema.parse(req.body);
                // Log what's being saved (but mask sensitive data)
                console.log('Saving settings:', {
                    hasGlobalPath: !!data.globalLocalBackupPath,
                    hasDriveClientId: !!data.driveClientId,
                    hasDriveClientSecret: !!data.driveClientSecret,
                    hasDriveRefreshToken: !!data.driveRefreshToken,
                    refreshTokenLength: ((_a = data.driveRefreshToken) === null || _a === void 0 ? void 0 : _a.length) || 0,
                    hasDriveFolderId: !!data.driveFolderId,
                    driveAutoUpload: data.driveAutoUpload,
                });
                return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 2:
                existing = _b.sent();
                if (!(existing.length > 0)) return [3 /*break*/, 4];
                return [4 /*yield*/, db_1.db.update(schema_2.settings).set(data).where((0, drizzle_orm_1.eq)(schema_2.settings.id, existing[0].id)).returning()];
            case 3:
                updated = _b.sent();
                console.log('Settings updated successfully');
                res.json(updated[0]);
                return [3 /*break*/, 6];
            case 4: return [4 /*yield*/, db_1.db.insert(schema_2.settings).values(data).returning()];
            case 5:
                created = _b.sent();
                console.log('Settings created successfully');
                res.json(created[0]);
                _b.label = 6;
            case 6: return [3 /*break*/, 8];
            case 7:
                e_13 = _b.sent();
                console.error('Settings save error:', e_13.message);
                res.status(400).json({ error: 'Invalid settings', details: e_13.message });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
var drive_1 = require("./drive");
// Helper to get Drive service instance
function getDriveService() {
    var _this = this;
    return function () { return __awaiter(_this, void 0, void 0, function () {
        var set, cfg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
                case 1:
                    set = _a.sent();
                    cfg = set[0];
                    if (!(cfg === null || cfg === void 0 ? void 0 : cfg.driveClientId) || !(cfg === null || cfg === void 0 ? void 0 : cfg.driveClientSecret) || !(cfg === null || cfg === void 0 ? void 0 : cfg.driveRefreshToken)) {
                        throw new Error('Drive not configured');
                    }
                    return [2 /*return*/, new drive_1.GoogleDriveService({
                            clientId: cfg.driveClientId,
                            clientSecret: cfg.driveClientSecret,
                            refreshToken: cfg.driveRefreshToken,
                        })];
            }
        });
    }); };
}
// Get OAuth authorization URL
app.get('/api/drive/oauth-url', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var set, cfg, google, redirectUri, oauth2Client, scopes, authUrl, e_14;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 1:
                set = _a.sent();
                cfg = set[0];
                if (!(cfg === null || cfg === void 0 ? void 0 : cfg.driveClientId) || !(cfg === null || cfg === void 0 ? void 0 : cfg.driveClientSecret)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Drive client ID and secret must be configured first' })];
                }
                return [4 /*yield*/, Promise.resolve().then(function () { return require('googleapis'); })];
            case 2:
                google = (_a.sent()).google;
                redirectUri = 'https://bk.lyarinet.com/oauth_callback';
                console.log('OAuth redirect URI (hardcoded):', redirectUri);
                console.log('Request headers:', {
                    protocol: req.protocol,
                    host: req.get('host'),
                    'x-forwarded-proto': req.get('x-forwarded-proto'),
                    'x-forwarded-host': req.get('x-forwarded-host'),
                });
                oauth2Client = new google.auth.OAuth2(cfg.driveClientId, cfg.driveClientSecret, redirectUri);
                scopes = [
                    'https://www.googleapis.com/auth/drive.file',
                    'https://www.googleapis.com/auth/drive.metadata.readonly',
                ];
                authUrl = oauth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: scopes,
                    prompt: 'consent', // Force consent to get refresh token
                });
                // Return the auth URL and the exact redirect URI being used
                res.json({ authUrl: authUrl, redirectUri: redirectUri });
                return [3 /*break*/, 4];
            case 3:
                e_14 = _a.sent();
                console.error('OAuth URL generation error:', e_14);
                res.status(400).json({ error: e_14.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Get redirect URI info for debugging
app.get('/api/drive/redirect-uri', authMiddleware, function (req, res) {
    var redirectUri = 'https://bk.lyarinet.com/oauth_callback';
    res.json({
        redirectUri: redirectUri,
        instructions: [
            '1. Go to Google Cloud Console → APIs & Services → Credentials',
            '2. Click on your OAuth 2.0 Client ID',
            "3. In \"Authorized redirect URIs\", add exactly: ".concat(redirectUri),
            '4. Make sure there are NO trailing slashes',
            '5. Click "Save"',
            '6. Wait 1-2 minutes for changes to propagate',
        ],
        currentRequest: {
            protocol: req.protocol,
            host: req.get('host'),
            'x-forwarded-proto': req.get('x-forwarded-proto'),
            'x-forwarded-host': req.get('x-forwarded-host'),
        }
    });
});
// Test Drive connection
app.get('/api/drive/test', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var set, cfg, driveService, isConnected, e_15;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 1:
                set = _b.sent();
                cfg = set[0];
                console.log('Drive test - Config check:', {
                    hasClientId: !!(cfg === null || cfg === void 0 ? void 0 : cfg.driveClientId),
                    hasClientSecret: !!(cfg === null || cfg === void 0 ? void 0 : cfg.driveClientSecret),
                    hasRefreshToken: !!(cfg === null || cfg === void 0 ? void 0 : cfg.driveRefreshToken),
                    refreshTokenLength: ((_a = cfg === null || cfg === void 0 ? void 0 : cfg.driveRefreshToken) === null || _a === void 0 ? void 0 : _a.length) || 0
                });
                if (!(cfg === null || cfg === void 0 ? void 0 : cfg.driveClientId) || !(cfg === null || cfg === void 0 ? void 0 : cfg.driveClientSecret)) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Drive not configured. Please configure Client ID and Client Secret first.'
                        })];
                }
                if (!(cfg === null || cfg === void 0 ? void 0 : cfg.driveRefreshToken)) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Refresh token missing. Please save your refresh token by clicking "Update Provider" first.'
                        })];
                }
                return [4 /*yield*/, getDriveService()()];
            case 2:
                driveService = _b.sent();
                return [4 /*yield*/, driveService.testConnection()];
            case 3:
                isConnected = _b.sent();
                if (isConnected) {
                    res.json({ ok: true, message: 'Drive connection successful' });
                }
                else {
                    res.status(500).json({ error: 'Drive connection test returned false' });
                }
                return [3 /*break*/, 5];
            case 4:
                e_15 = _b.sent();
                console.error('Drive test error:', e_15.message, e_15.stack);
                res.status(400).json({ error: e_15.message || 'Failed to test Drive connection' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// List files in Drive
app.get('/api/drive/files', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var driveService, folderId, files, e_16;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, getDriveService()()];
            case 1:
                driveService = _a.sent();
                folderId = req.query.folderId;
                return [4 /*yield*/, driveService.listFiles({
                        folderId: folderId,
                        pageSize: 100,
                    })];
            case 2:
                files = _a.sent();
                res.json(files);
                return [3 /*break*/, 4];
            case 3:
                e_16 = _a.sent();
                res.status(500).json({ error: 'Drive list failed', details: e_16.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// List folders in Drive
app.get('/api/drive/folders', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var driveService, parentId, folders, e_17;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, getDriveService()()];
            case 1:
                driveService = _a.sent();
                parentId = req.query.parentId;
                return [4 /*yield*/, driveService.listFolders(parentId)];
            case 2:
                folders = _a.sent();
                res.json(folders);
                return [3 /*break*/, 4];
            case 3:
                e_17 = _a.sent();
                res.status(500).json({ error: 'Failed to list folders', details: e_17.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Get root folder
app.get('/api/drive/root', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var driveService, root, e_18;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, getDriveService()()];
            case 1:
                driveService = _a.sent();
                return [4 /*yield*/, driveService.getRootFolder()];
            case 2:
                root = _a.sent();
                res.json(root);
                return [3 /*break*/, 4];
            case 3:
                e_18 = _a.sent();
                res.status(500).json({ error: 'Failed to get root folder', details: e_18.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Create folder
app.post('/api/drive/folders', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var schema, data, driveService, folder, e_19;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                schema = zod_1.z.object({
                    name: zod_1.z.string(),
                    parentId: zod_1.z.string().optional(),
                });
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                data = schema.parse(req.body);
                return [4 /*yield*/, getDriveService()()];
            case 2:
                driveService = _a.sent();
                return [4 /*yield*/, driveService.createFolder({
                        name: data.name,
                        parentId: data.parentId,
                    })];
            case 3:
                folder = _a.sent();
                res.json(folder);
                return [3 /*break*/, 5];
            case 4:
                e_19 = _a.sent();
                res.status(400).json({ error: 'Failed to create folder', details: e_19.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Upload file to Drive
app.post('/api/drive/upload', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var schema, data, set, cfg, basePath, fullPath, driveService, file, e_20;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                schema = zod_1.z.object({
                    filePath: zod_1.z.string(),
                    fileName: zod_1.z.string().optional(),
                    folderId: zod_1.z.string().optional(),
                });
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                data = schema.parse(req.body);
                return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 2:
                set = _a.sent();
                cfg = set[0];
                basePath = cfg.globalLocalBackupPath || path_1.default.join(process.env.HOME || '', 'Server-Backups');
                fullPath = path_1.default.isAbsolute(data.filePath)
                    ? data.filePath
                    : path_1.default.join(basePath, data.filePath);
                console.log('Uploading file to Drive:', fullPath);
                return [4 /*yield*/, getDriveService()()];
            case 3:
                driveService = _a.sent();
                return [4 /*yield*/, driveService.uploadFile({
                        filePath: fullPath,
                        fileName: data.fileName,
                        folderId: data.folderId,
                    })];
            case 4:
                file = _a.sent();
                res.json(file);
                return [3 /*break*/, 6];
            case 5:
                e_20 = _a.sent();
                console.error('Drive upload error:', e_20.message);
                res.status(400).json({ error: 'Upload failed', details: e_20.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// Upload directory to Drive
app.post('/api/drive/upload-directory', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var schema, data, set, cfg, basePath, fullPath, driveService, uploadedFiles, e_21;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                schema = zod_1.z.object({
                    dirPath: zod_1.z.string(),
                    folderId: zod_1.z.string().optional(),
                });
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                data = schema.parse(req.body);
                return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 2:
                set = _a.sent();
                cfg = set[0];
                basePath = cfg.globalLocalBackupPath || path_1.default.join(process.env.HOME || '', 'Server-Backups');
                fullPath = path_1.default.isAbsolute(data.dirPath)
                    ? data.dirPath
                    : path_1.default.join(basePath, data.dirPath);
                console.log('Uploading directory to Drive:', fullPath);
                return [4 /*yield*/, getDriveService()()];
            case 3:
                driveService = _a.sent();
                return [4 /*yield*/, driveService.uploadDirectory({
                        dirPath: fullPath,
                        folderId: data.folderId,
                        onProgress: function (current, total, fileName) {
                            console.log("Drive upload progress: ".concat(current, "/").concat(total, " - ").concat(fileName));
                        },
                    })];
            case 4:
                uploadedFiles = _a.sent();
                res.json({
                    ok: true,
                    count: uploadedFiles.length,
                    files: uploadedFiles
                });
                return [3 /*break*/, 6];
            case 5:
                e_21 = _a.sent();
                console.error('Drive directory upload error:', e_21.message);
                res.status(400).json({ error: 'Upload failed', details: e_21.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// Download/Import file or folder from Drive
app.post('/api/drive/import', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var schema, data, set, cfg, basePath, destDir, driveService, fileInfo, folderPath, downloadedPath, e_22, errorDetails;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                // Set a longer timeout for large file downloads (10 minutes)
                req.setTimeout(600000); // 10 minutes
                res.setTimeout(600000);
                schema = zod_1.z.object({
                    fileId: zod_1.z.string(),
                    targetPath: zod_1.z.string().optional(),
                });
                _a.label = 1;
            case 1:
                _a.trys.push([1, 9, , 10]);
                data = schema.parse(req.body);
                console.log('Starting Drive import for file/folder:', data.fileId);
                return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 2:
                set = _a.sent();
                cfg = set[0];
                basePath = cfg.globalLocalBackupPath || path_1.default.join(process.env.HOME || '', 'Server-Backups');
                destDir = path_1.default.resolve(data.targetPath || basePath);
                return [4 /*yield*/, getDriveService()()];
            case 3:
                driveService = _a.sent();
                return [4 /*yield*/, driveService.getFile(data.fileId)];
            case 4:
                fileInfo = _a.sent();
                console.log('Importing:', fileInfo.name, 'Type:', fileInfo.mimeType, 'Size:', fileInfo.size);
                if (!(fileInfo.mimeType === 'application/vnd.google-apps.folder')) return [3 /*break*/, 6];
                // Import entire folder
                console.log('Importing folder:', fileInfo.name);
                return [4 /*yield*/, driveService.downloadFolder(data.fileId, destDir)];
            case 5:
                folderPath = _a.sent();
                console.log('Folder import completed:', folderPath);
                res.json({ ok: true, path: folderPath, fileName: fileInfo.name, isFolder: true });
                return [3 /*break*/, 8];
            case 6: return [4 /*yield*/, driveService.downloadFile(data.fileId, destDir)];
            case 7:
                downloadedPath = _a.sent();
                console.log('File import completed:', downloadedPath);
                res.json({ ok: true, path: downloadedPath, fileName: fileInfo.name, isFolder: false });
                _a.label = 8;
            case 8: return [3 /*break*/, 10];
            case 9:
                e_22 = _a.sent();
                console.error('Drive import error:', e_22.message, e_22.stack);
                errorDetails = e_22.message || 'Unknown error';
                res.status(400).json({
                    error: 'Import failed',
                    details: errorDetails,
                    message: errorDetails
                });
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
// Delete file from Drive
app.delete('/api/drive/files/:fileId', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var driveService, e_23;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, getDriveService()()];
            case 1:
                driveService = _a.sent();
                return [4 /*yield*/, driveService.deleteFile(req.params.fileId)];
            case 2:
                _a.sent();
                res.json({ ok: true });
                return [3 /*break*/, 4];
            case 3:
                e_23 = _a.sent();
                res.status(400).json({ error: 'Delete failed', details: e_23.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Get file info
app.get('/api/drive/files/:fileId', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var driveService, file, e_24;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, getDriveService()()];
            case 1:
                driveService = _a.sent();
                return [4 /*yield*/, driveService.getFile(req.params.fileId)];
            case 2:
                file = _a.sent();
                res.json(file);
                return [3 /*break*/, 4];
            case 3:
                e_24 = _a.sent();
                res.status(400).json({ error: 'Failed to get file', details: e_24.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// List backup files
app.get('/api/backups/list', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var relativePath, set, globalPath, fullPath_1, entries, files, error_3;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 5, , 6]);
                relativePath = req.query.path || '';
                // Prevent directory traversal
                if (relativePath.includes('..')) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid path' })];
                }
                return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 1:
                set = _b.sent();
                globalPath = ((_a = set[0]) === null || _a === void 0 ? void 0 : _a.globalLocalBackupPath) || path_1.default.join(process.env.HOME || '', 'Server-Backups');
                fullPath_1 = path_1.default.join(globalPath, relativePath);
                console.log('Listing backups:', { relativePath: relativePath, globalPath: globalPath, fullPath: fullPath_1 });
                // Ensure directory exists
                return [4 /*yield*/, fs_1.promises.mkdir(fullPath_1, { recursive: true })];
            case 2:
                // Ensure directory exists
                _b.sent();
                return [4 /*yield*/, fs_1.promises.readdir(fullPath_1, { withFileTypes: true })];
            case 3:
                entries = _b.sent();
                return [4 /*yield*/, Promise.all(entries.map(function (entry) { return __awaiter(void 0, void 0, void 0, function () {
                        var stats, statError_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, fs_1.promises.stat(path_1.default.join(fullPath_1, entry.name))];
                                case 1:
                                    stats = _a.sent();
                                    return [2 /*return*/, {
                                            name: entry.name,
                                            isDirectory: entry.isDirectory(),
                                            size: stats.size,
                                            date: stats.mtime.toISOString(),
                                        }];
                                case 2:
                                    statError_1 = _a.sent();
                                    console.error("Error getting stats for ".concat(entry.name, ":"), statError_1.message);
                                    // Return basic info even if stat fails
                                    return [2 /*return*/, {
                                            name: entry.name,
                                            isDirectory: entry.isDirectory(),
                                            size: 0,
                                            date: new Date().toISOString(),
                                        }];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); }))];
            case 4:
                files = _b.sent();
                // Sort directories first, then files
                files.sort(function (a, b) {
                    if (a.isDirectory === b.isDirectory)
                        return a.name.localeCompare(b.name);
                    return a.isDirectory ? -1 : 1;
                });
                res.json({ files: files, currentPath: relativePath });
                return [3 /*break*/, 6];
            case 5:
                error_3 = _b.sent();
                console.error('Error listing backups:', error_3.message, error_3.stack);
                res.status(500).json({ error: 'Failed to list backup files', details: error_3.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// Download backup file
app.get('/api/backups/download', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var token, s, relativePath, set, globalPath, fullPath;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                token = req.query.token;
                if (!token)
                    return [2 /*return*/, res.status(401).send('Unauthorized')];
                return [4 /*yield*/, db_1.db.select().from(schema_1.sessions).where((0, drizzle_orm_1.eq)(schema_1.sessions.token, token)).limit(1)];
            case 1:
                s = _b.sent();
                if (!s.length || new Date(s[0].expiresAt).getTime() < Date.now()) {
                    return [2 /*return*/, res.status(401).send('Unauthorized or expired session')];
                }
                relativePath = req.query.path || '';
                if (relativePath.includes('..'))
                    return [2 /*return*/, res.status(400).send('Invalid path')];
                return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 2:
                set = _b.sent();
                globalPath = ((_a = set[0]) === null || _a === void 0 ? void 0 : _a.globalLocalBackupPath) || path_1.default.join(process.env.HOME || '', 'Server-Backups');
                fullPath = path_1.default.join(globalPath, relativePath);
                res.download(fullPath, function (err) {
                    if (err) {
                        console.error('Download error:', err);
                        if (!res.headersSent)
                            res.status(404).send('File not found');
                    }
                });
                return [2 /*return*/];
        }
    });
}); });
// Cron Jobs API
app.get('/api/cron-jobs', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var jobs, jobsWithServers, e_25;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, db_1.db.select().from(schema_1.cronJobs).all()];
            case 1:
                jobs = _a.sent();
                return [4 /*yield*/, Promise.all(jobs.map(function (job) { return __awaiter(void 0, void 0, void 0, function () {
                        var server;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (!job.serverId) return [3 /*break*/, 2];
                                    return [4 /*yield*/, db_1.db.select().from(schema_1.servers).where((0, drizzle_orm_1.eq)(schema_1.servers.id, job.serverId)).get()];
                                case 1:
                                    server = _a.sent();
                                    return [2 /*return*/, __assign(__assign({}, job), { serverName: (server === null || server === void 0 ? void 0 : server.name) || null })];
                                case 2: return [2 /*return*/, __assign(__assign({}, job), { serverName: null })];
                            }
                        });
                    }); }))];
            case 2:
                jobsWithServers = _a.sent();
                res.json(jobsWithServers);
                return [3 /*break*/, 4];
            case 3:
                e_25 = _a.sent();
                console.error('Error fetching cron jobs:', e_25);
                res.status(500).json({ error: 'Failed to fetch cron jobs', details: e_25.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.post('/api/cron-jobs', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var schema, data, cronExpr, cron, time, _a, hours, minutes, dayOfWeek, dayOfMonth, nextRun, result, job, e_26;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                schema = zod_1.z.object({
                    name: zod_1.z.string().min(1),
                    serverId: zod_1.z.number().nullable().optional(),
                    scheduleType: zod_1.z.enum(['daily', 'weekly', 'monthly', 'custom']),
                    scheduleTime: zod_1.z.string().optional(),
                    scheduleDay: zod_1.z.number().optional(),
                    schedule: zod_1.z.string().optional(), // For custom cron expression
                    enabled: zod_1.z.boolean().default(true),
                });
                _b.label = 1;
            case 1:
                _b.trys.push([1, 8, , 9]);
                data = schema.parse(req.body);
                cronExpr = void 0;
                if (!(data.scheduleType === 'custom')) return [3 /*break*/, 3];
                if (!data.schedule) {
                    return [2 /*return*/, res.status(400).json({ error: 'Custom schedule requires a cron expression' })];
                }
                cronExpr = data.schedule;
                return [4 /*yield*/, Promise.resolve().then(function () { return require('node-cron'); })];
            case 2:
                cron = _b.sent();
                if (!cron.validate(cronExpr)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid cron expression' })];
                }
                return [3 /*break*/, 4];
            case 3:
                time = data.scheduleTime || '02:00';
                _a = time.split(':').map(Number), hours = _a[0], minutes = _a[1];
                switch (data.scheduleType) {
                    case 'daily':
                        cronExpr = "".concat(minutes, " ").concat(hours, " * * *");
                        break;
                    case 'weekly':
                        dayOfWeek = data.scheduleDay !== undefined ? data.scheduleDay : 0;
                        cronExpr = "".concat(minutes, " ").concat(hours, " * * ").concat(dayOfWeek);
                        break;
                    case 'monthly':
                        dayOfMonth = data.scheduleDay !== undefined ? data.scheduleDay : 1;
                        cronExpr = "".concat(minutes, " ").concat(hours, " ").concat(dayOfMonth, " * *");
                        break;
                    default:
                        return [2 /*return*/, res.status(400).json({ error: 'Invalid schedule type' })];
                }
                _b.label = 4;
            case 4:
                nextRun = new Date();
                nextRun.setMinutes(nextRun.getMinutes() + 1);
                return [4 /*yield*/, db_1.db.insert(schema_1.cronJobs).values({
                        name: data.name,
                        serverId: data.serverId || null,
                        scheduleType: data.scheduleType,
                        scheduleTime: data.scheduleTime || null,
                        scheduleDay: data.scheduleDay || null,
                        schedule: cronExpr,
                        enabled: data.enabled,
                        nextRun: nextRun.toISOString(),
                    }).returning()];
            case 5:
                result = _b.sent();
                job = result[0];
                if (!job.enabled) return [3 /*break*/, 7];
                return [4 /*yield*/, cron_1.cronScheduler.scheduleJob(job.id)];
            case 6:
                _b.sent();
                _b.label = 7;
            case 7:
                res.json(job);
                return [3 /*break*/, 9];
            case 8:
                e_26 = _b.sent();
                console.error('Error creating cron job:', e_26);
                res.status(400).json({ error: 'Failed to create cron job', details: e_26.message });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
app.put('/api/cron-jobs/:id', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var schema, jobId, data, existingJob, cronExpr, scheduleType, cron, time, _a, hours, minutes, dayOfWeek, dayOfMonth, nextRun, result, job, e_27;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                schema = zod_1.z.object({
                    name: zod_1.z.string().min(1).optional(),
                    serverId: zod_1.z.number().nullable().optional(),
                    scheduleType: zod_1.z.enum(['daily', 'weekly', 'monthly', 'custom']).optional(),
                    scheduleTime: zod_1.z.string().optional(),
                    scheduleDay: zod_1.z.number().optional(),
                    schedule: zod_1.z.string().optional(),
                    enabled: zod_1.z.boolean().optional(),
                });
                _b.label = 1;
            case 1:
                _b.trys.push([1, 10, , 11]);
                jobId = parseInt(req.params.id);
                data = schema.parse(req.body);
                return [4 /*yield*/, db_1.db.select().from(schema_1.cronJobs).where((0, drizzle_orm_1.eq)(schema_1.cronJobs.id, jobId)).get()];
            case 2:
                existingJob = _b.sent();
                if (!existingJob) {
                    return [2 /*return*/, res.status(404).json({ error: 'Cron job not found' })];
                }
                cronExpr = existingJob.schedule;
                if (!(data.scheduleType !== undefined || data.scheduleTime !== undefined || data.scheduleDay !== undefined || data.schedule !== undefined)) return [3 /*break*/, 6];
                scheduleType = data.scheduleType || existingJob.scheduleType;
                if (!(scheduleType === 'custom')) return [3 /*break*/, 5];
                if (!data.schedule) return [3 /*break*/, 4];
                cronExpr = data.schedule;
                return [4 /*yield*/, Promise.resolve().then(function () { return require('node-cron'); })];
            case 3:
                cron = _b.sent();
                if (!cron.validate(cronExpr)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid cron expression' })];
                }
                _b.label = 4;
            case 4: return [3 /*break*/, 6];
            case 5:
                time = data.scheduleTime || existingJob.scheduleTime || '02:00';
                _a = time.split(':').map(Number), hours = _a[0], minutes = _a[1];
                switch (scheduleType) {
                    case 'daily':
                        cronExpr = "".concat(minutes, " ").concat(hours, " * * *");
                        break;
                    case 'weekly':
                        dayOfWeek = data.scheduleDay !== undefined ? data.scheduleDay : (existingJob.scheduleDay || 0);
                        cronExpr = "".concat(minutes, " ").concat(hours, " * * ").concat(dayOfWeek);
                        break;
                    case 'monthly':
                        dayOfMonth = data.scheduleDay !== undefined ? data.scheduleDay : (existingJob.scheduleDay || 1);
                        cronExpr = "".concat(minutes, " ").concat(hours, " ").concat(dayOfMonth, " * *");
                        break;
                }
                _b.label = 6;
            case 6:
                nextRun = new Date();
                nextRun.setMinutes(nextRun.getMinutes() + 1);
                return [4 /*yield*/, db_1.db.update(schema_1.cronJobs)
                        .set(__assign(__assign({}, data), { schedule: cronExpr, nextRun: nextRun.toISOString() }))
                        .where((0, drizzle_orm_1.eq)(schema_1.cronJobs.id, jobId))
                        .returning()];
            case 7:
                result = _b.sent();
                job = result[0];
                // Reschedule the job
                cron_1.cronScheduler.stopJob(jobId);
                if (!job.enabled) return [3 /*break*/, 9];
                return [4 /*yield*/, cron_1.cronScheduler.scheduleJob(jobId)];
            case 8:
                _b.sent();
                _b.label = 9;
            case 9:
                res.json(job);
                return [3 /*break*/, 11];
            case 10:
                e_27 = _b.sent();
                console.error('Error updating cron job:', e_27);
                res.status(400).json({ error: 'Failed to update cron job', details: e_27.message });
                return [3 /*break*/, 11];
            case 11: return [2 /*return*/];
        }
    });
}); });
app.delete('/api/cron-jobs/:id', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var jobId, job, e_28;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                jobId = parseInt(req.params.id);
                return [4 /*yield*/, db_1.db.select().from(schema_1.cronJobs).where((0, drizzle_orm_1.eq)(schema_1.cronJobs.id, jobId)).get()];
            case 1:
                job = _a.sent();
                if (!job) {
                    return [2 /*return*/, res.status(404).json({ error: 'Cron job not found' })];
                }
                cron_1.cronScheduler.stopJob(jobId);
                return [4 /*yield*/, db_1.db.delete(schema_1.cronJobs).where((0, drizzle_orm_1.eq)(schema_1.cronJobs.id, jobId))];
            case 2:
                _a.sent();
                res.json({ ok: true });
                return [3 /*break*/, 4];
            case 3:
                e_28 = _a.sent();
                console.error('Error deleting cron job:', e_28);
                res.status(400).json({ error: 'Failed to delete cron job', details: e_28.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// IP Whitelist Management API
app.get('/api/ip-whitelist/status', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var settingsRows, config, enabled, entries, singleIps, cidrRanges, e_29;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 1:
                settingsRows = _a.sent();
                config = settingsRows[0];
                enabled = !!(config === null || config === void 0 ? void 0 : config.ipWhitelistEnabled);
                return [4 /*yield*/, db_1.db.select().from(schema_1.ipWhitelist).all()];
            case 2:
                entries = _a.sent();
                singleIps = entries.filter(function (e) { return e.type === 'single'; }).length;
                cidrRanges = entries.filter(function (e) { return e.type === 'cidr'; }).length;
                res.json({
                    enabled: enabled,
                    total: entries.length,
                    singleIps: singleIps,
                    cidrRanges: cidrRanges,
                });
                return [3 /*break*/, 4];
            case 3:
                e_29 = _a.sent();
                console.error('Error getting IP whitelist status:', e_29);
                res.status(500).json({ error: 'Failed to get IP whitelist status', details: e_29.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.get('/api/ip-whitelist/current-ip', authMiddleware, function (req, res) {
    try {
        var clientIp = (0, ipWhitelist_1.getClientIp)(req);
        res.json({ ip: clientIp });
    }
    catch (e) {
        res.status(500).json({ error: 'Failed to get current IP', details: e.message });
    }
});
app.get('/api/ip-whitelist', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var entries, e_30;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1.db.select().from(schema_1.ipWhitelist).orderBy(schema_1.ipWhitelist.createdAt).all()];
            case 1:
                entries = _a.sent();
                res.json(entries);
                return [3 /*break*/, 3];
            case 2:
                e_30 = _a.sent();
                console.error('Error fetching IP whitelist:', e_30);
                res.status(500).json({ error: 'Failed to fetch IP whitelist', details: e_30.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/api/ip-whitelist', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var schema, data, validation, existing, result, e_31;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                schema = zod_1.z.object({
                    ipAddress: zod_1.z.string().min(1),
                    description: zod_1.z.string().optional(),
                });
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                data = schema.parse(req.body);
                validation = (0, ipWhitelist_1.validateIpOrCidr)(data.ipAddress);
                if (!validation.valid) {
                    return [2 /*return*/, res.status(400).json({ error: validation.error || 'Invalid IP address or CIDR range' })];
                }
                return [4 /*yield*/, db_1.db.select().from(schema_1.ipWhitelist).where((0, drizzle_orm_1.eq)(schema_1.ipWhitelist.ipAddress, data.ipAddress)).get()];
            case 2:
                existing = _a.sent();
                if (existing) {
                    return [2 /*return*/, res.status(409).json({ error: 'IP address or CIDR range already exists in whitelist' })];
                }
                return [4 /*yield*/, db_1.db.insert(schema_1.ipWhitelist).values({
                        ipAddress: data.ipAddress,
                        type: validation.type,
                        description: data.description || null,
                    }).returning()];
            case 3:
                result = _a.sent();
                res.json(result[0]);
                return [3 /*break*/, 5];
            case 4:
                e_31 = _a.sent();
                console.error('Error adding IP to whitelist:', e_31);
                res.status(400).json({ error: 'Failed to add IP to whitelist', details: e_31.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
app.delete('/api/ip-whitelist/:id', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, entry, e_32;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                id = parseInt(req.params.id);
                return [4 /*yield*/, db_1.db.select().from(schema_1.ipWhitelist).where((0, drizzle_orm_1.eq)(schema_1.ipWhitelist.id, id)).get()];
            case 1:
                entry = _a.sent();
                if (!entry) {
                    return [2 /*return*/, res.status(404).json({ error: 'IP whitelist entry not found' })];
                }
                return [4 /*yield*/, db_1.db.delete(schema_1.ipWhitelist).where((0, drizzle_orm_1.eq)(schema_1.ipWhitelist.id, id))];
            case 2:
                _a.sent();
                res.json({ ok: true });
                return [3 /*break*/, 4];
            case 3:
                e_32 = _a.sent();
                console.error('Error deleting IP from whitelist:', e_32);
                res.status(400).json({ error: 'Failed to delete IP from whitelist', details: e_32.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.put('/api/ip-whitelist/enable', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var schema, data, settingsRows, config, e_33;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                schema = zod_1.z.object({
                    enabled: zod_1.z.boolean(),
                });
                _a.label = 1;
            case 1:
                _a.trys.push([1, 7, , 8]);
                data = schema.parse(req.body);
                return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 2:
                settingsRows = _a.sent();
                config = settingsRows[0];
                if (!!config) return [3 /*break*/, 4];
                // Create settings if doesn't exist
                return [4 /*yield*/, db_1.db.insert(schema_2.settings).values({ ipWhitelistEnabled: data.enabled })];
            case 3:
                // Create settings if doesn't exist
                _a.sent();
                return [3 /*break*/, 6];
            case 4: return [4 /*yield*/, db_1.db.update(schema_2.settings).set({ ipWhitelistEnabled: data.enabled }).where((0, drizzle_orm_1.eq)(schema_2.settings.id, config.id))];
            case 5:
                _a.sent();
                _a.label = 6;
            case 6:
                res.json({ enabled: data.enabled });
                return [3 /*break*/, 8];
            case 7:
                e_33 = _a.sent();
                console.error('Error updating IP whitelist status:', e_33);
                res.status(400).json({ error: 'Failed to update IP whitelist status', details: e_33.message });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
// Login IP Whitelist endpoints
// This endpoint is public (no auth) so the login page can check if it should be shown
app.get('/api/login-ip-whitelist/check', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var clientIp, settingsRows, config, enabled, allowed, e_34;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                clientIp = (0, ipWhitelist_1.getClientIp)(req);
                return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 1:
                settingsRows = _a.sent();
                config = settingsRows[0];
                enabled = !!(config === null || config === void 0 ? void 0 : config.loginIpWhitelistEnabled);
                if (!enabled) {
                    return [2 /*return*/, res.json({ allowed: true, enabled: false })];
                }
                return [4 /*yield*/, (0, ipWhitelist_1.isLoginIpWhitelisted)(clientIp)];
            case 2:
                allowed = _a.sent();
                res.json({ allowed: allowed, enabled: true, ip: clientIp });
                return [3 /*break*/, 4];
            case 3:
                e_34 = _a.sent();
                console.error('Error checking login IP whitelist:', e_34);
                // On error, allow access (fail open)
                res.json({ allowed: true, enabled: false, error: e_34.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.get('/api/login-ip-whitelist/status', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var settingsRows, config, enabled, e_35;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 1:
                settingsRows = _a.sent();
                config = settingsRows[0];
                enabled = !!(config === null || config === void 0 ? void 0 : config.loginIpWhitelistEnabled);
                res.json({ enabled: enabled });
                return [3 /*break*/, 3];
            case 2:
                e_35 = _a.sent();
                console.error('Error fetching login IP whitelist status:', e_35);
                res.status(500).json({ error: 'Failed to get login IP whitelist status', details: e_35.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.get('/api/login-ip-whitelist/current-ip', authMiddleware, function (req, res) {
    try {
        var clientIp = (0, ipWhitelist_1.getClientIp)(req);
        res.json({ ip: clientIp });
    }
    catch (e) {
        res.status(500).json({ error: 'Failed to get current IP', details: e.message });
    }
});
app.get('/api/login-ip-whitelist', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var entries, e_36;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1.db.select().from(schema_1.loginIpWhitelist).orderBy(schema_1.loginIpWhitelist.createdAt).all()];
            case 1:
                entries = _a.sent();
                res.json(entries);
                return [3 /*break*/, 3];
            case 2:
                e_36 = _a.sent();
                console.error('Error fetching login IP whitelist:', e_36);
                res.status(500).json({ error: 'Failed to fetch login IP whitelist', details: e_36.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/api/login-ip-whitelist', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var schema, data, validation, existing, entry, e_37;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                schema = zod_1.z.object({
                    ipAddress: zod_1.z.string().min(1),
                    description: zod_1.z.string().optional(),
                });
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                data = schema.parse(req.body);
                validation = (0, ipWhitelist_1.validateIpOrCidr)(data.ipAddress);
                if (!validation.valid) {
                    return [2 /*return*/, res.status(400).json({ error: validation.error })];
                }
                return [4 /*yield*/, db_1.db.select()
                        .from(schema_1.loginIpWhitelist)
                        .where((0, drizzle_orm_1.eq)(schema_1.loginIpWhitelist.ipAddress, data.ipAddress))
                        .get()];
            case 2:
                existing = _a.sent();
                if (existing) {
                    return [2 /*return*/, res.status(409).json({ error: 'IP address already in whitelist' })];
                }
                return [4 /*yield*/, db_1.db.insert(schema_1.loginIpWhitelist).values({
                        ipAddress: data.ipAddress,
                        type: validation.type,
                        description: data.description || null,
                    }).returning()];
            case 3:
                entry = _a.sent();
                res.json(entry[0]);
                return [3 /*break*/, 5];
            case 4:
                e_37 = _a.sent();
                console.error('Error adding IP to login whitelist:', e_37);
                res.status(400).json({ error: 'Failed to add IP to login whitelist', details: e_37.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
app.delete('/api/login-ip-whitelist/:id', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, entry, e_38;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                id = parseInt(req.params.id);
                return [4 /*yield*/, db_1.db.select().from(schema_1.loginIpWhitelist).where((0, drizzle_orm_1.eq)(schema_1.loginIpWhitelist.id, id)).get()];
            case 1:
                entry = _a.sent();
                if (!entry) {
                    return [2 /*return*/, res.status(404).json({ error: 'Login IP whitelist entry not found' })];
                }
                return [4 /*yield*/, db_1.db.delete(schema_1.loginIpWhitelist).where((0, drizzle_orm_1.eq)(schema_1.loginIpWhitelist.id, id))];
            case 2:
                _a.sent();
                res.json({ ok: true });
                return [3 /*break*/, 4];
            case 3:
                e_38 = _a.sent();
                console.error('Error deleting IP from login whitelist:', e_38);
                res.status(400).json({ error: 'Failed to delete IP from login whitelist', details: e_38.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.put('/api/login-ip-whitelist/enable', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var schema, data, settingsRows, config, e_39;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                schema = zod_1.z.object({
                    enabled: zod_1.z.boolean(),
                });
                _a.label = 1;
            case 1:
                _a.trys.push([1, 7, , 8]);
                data = schema.parse(req.body);
                return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 2:
                settingsRows = _a.sent();
                config = settingsRows[0];
                if (!!config) return [3 /*break*/, 4];
                // Create settings if doesn't exist
                return [4 /*yield*/, db_1.db.insert(schema_2.settings).values({ loginIpWhitelistEnabled: data.enabled })];
            case 3:
                // Create settings if doesn't exist
                _a.sent();
                return [3 /*break*/, 6];
            case 4: return [4 /*yield*/, db_1.db.update(schema_2.settings).set({ loginIpWhitelistEnabled: data.enabled }).where((0, drizzle_orm_1.eq)(schema_2.settings.id, config.id))];
            case 5:
                _a.sent();
                _a.label = 6;
            case 6:
                res.json({ enabled: data.enabled });
                return [3 /*break*/, 8];
            case 7:
                e_39 = _a.sent();
                console.error('Error enabling/disabling login IP whitelist:', e_39);
                res.status(400).json({ error: 'Failed to update login IP whitelist status', details: e_39.message });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
// Autostart Management
app.get('/api/autostart/status', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var exec, promisify, execAsync, serviceFile, fs_3, serviceInstalled, serviceEnabled, serviceActive, enabledOutput, activeOutput, e_40, settingsRows, config, autostartEnabled, e_41;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 10, , 11]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require('child_process'); })];
            case 1:
                exec = (_a.sent()).exec;
                return [4 /*yield*/, Promise.resolve().then(function () { return require('util'); })];
            case 2:
                promisify = (_a.sent()).promisify;
                execAsync = promisify(exec);
                serviceFile = '/etc/systemd/system/backup-system.service';
                return [4 /*yield*/, Promise.resolve().then(function () { return require('fs'); })];
            case 3:
                fs_3 = _a.sent();
                serviceInstalled = fs_3.existsSync(serviceFile);
                serviceEnabled = false;
                serviceActive = false;
                if (!serviceInstalled) return [3 /*break*/, 8];
                _a.label = 4;
            case 4:
                _a.trys.push([4, 7, , 8]);
                return [4 /*yield*/, execAsync('systemctl is-enabled backup-system 2>/dev/null || echo "disabled"')];
            case 5:
                enabledOutput = (_a.sent()).stdout;
                serviceEnabled = enabledOutput.trim() === 'enabled';
                return [4 /*yield*/, execAsync('systemctl is-active backup-system 2>/dev/null || echo "inactive"')];
            case 6:
                activeOutput = (_a.sent()).stdout;
                serviceActive = activeOutput.trim() === 'active';
                return [3 /*break*/, 8];
            case 7:
                e_40 = _a.sent();
                return [3 /*break*/, 8];
            case 8: return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 9:
                settingsRows = _a.sent();
                config = settingsRows[0];
                autostartEnabled = (config === null || config === void 0 ? void 0 : config.autostartEnabled) || false;
                res.json({
                    installed: serviceInstalled,
                    enabled: serviceEnabled,
                    active: serviceActive,
                    autostartEnabled: autostartEnabled,
                });
                return [3 /*break*/, 11];
            case 10:
                e_41 = _a.sent();
                console.error('Error checking autostart status:', e_41);
                res.status(500).json({ error: 'Failed to check autostart status', details: e_41.message });
                return [3 /*break*/, 11];
            case 11: return [2 /*return*/];
        }
    });
}); });
app.post('/api/autostart/install', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var exec, promisify, execAsync, path_2, scriptPath, fs_4, e_42, e_43;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 9, , 10]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require('child_process'); })];
            case 1:
                exec = (_a.sent()).exec;
                return [4 /*yield*/, Promise.resolve().then(function () { return require('util'); })];
            case 2:
                promisify = (_a.sent()).promisify;
                execAsync = promisify(exec);
                return [4 /*yield*/, Promise.resolve().then(function () { return require('path'); })];
            case 3:
                path_2 = _a.sent();
                scriptPath = path_2.join(process.cwd(), 'manage-autostart.sh');
                return [4 /*yield*/, Promise.resolve().then(function () { return require('fs'); })];
            case 4:
                fs_4 = _a.sent();
                if (!fs_4.existsSync(scriptPath)) {
                    return [2 /*return*/, res.status(404).json({ error: 'Autostart management script not found' })];
                }
                _a.label = 5;
            case 5:
                _a.trys.push([5, 7, , 8]);
                return [4 /*yield*/, execAsync("sudo ".concat(scriptPath, " install"))];
            case 6:
                _a.sent();
                res.json({ success: true, message: 'Service installed successfully. You may need to enable it separately.' });
                return [3 /*break*/, 8];
            case 7:
                e_42 = _a.sent();
                res.status(400).json({
                    error: 'Failed to install service',
                    details: e_42.message,
                    note: 'Installation requires sudo privileges. You may need to run: sudo ./manage-autostart.sh install'
                });
                return [3 /*break*/, 8];
            case 8: return [3 /*break*/, 10];
            case 9:
                e_43 = _a.sent();
                console.error('Error installing autostart service:', e_43);
                res.status(500).json({ error: 'Failed to install autostart service', details: e_43.message });
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
app.post('/api/autostart/enable', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var exec, promisify, execAsync, path_3, scriptPath, settingsRows, config, e_44, e_45;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 12, , 13]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require('child_process'); })];
            case 1:
                exec = (_a.sent()).exec;
                return [4 /*yield*/, Promise.resolve().then(function () { return require('util'); })];
            case 2:
                promisify = (_a.sent()).promisify;
                execAsync = promisify(exec);
                return [4 /*yield*/, Promise.resolve().then(function () { return require('path'); })];
            case 3:
                path_3 = _a.sent();
                scriptPath = path_3.join(process.cwd(), 'manage-autostart.sh');
                return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 4:
                settingsRows = _a.sent();
                config = settingsRows[0];
                if (!!config) return [3 /*break*/, 6];
                return [4 /*yield*/, db_1.db.insert(schema_2.settings).values({ autostartEnabled: true })];
            case 5:
                _a.sent();
                return [3 /*break*/, 8];
            case 6: return [4 /*yield*/, db_1.db.update(schema_2.settings).set({ autostartEnabled: true }).where((0, drizzle_orm_1.eq)(schema_2.settings.id, config.id))];
            case 7:
                _a.sent();
                _a.label = 8;
            case 8:
                _a.trys.push([8, 10, , 11]);
                return [4 /*yield*/, execAsync("sudo ".concat(scriptPath, " enable"))];
            case 9:
                _a.sent();
                res.json({ success: true, message: 'Autostart enabled successfully' });
                return [3 /*break*/, 11];
            case 10:
                e_44 = _a.sent();
                // Database setting is saved, but systemd might need manual intervention
                res.json({
                    success: true,
                    message: 'Autostart setting saved, but systemd service may need manual enable',
                    warning: 'You may need to run: sudo systemctl enable backup-system'
                });
                return [3 /*break*/, 11];
            case 11: return [3 /*break*/, 13];
            case 12:
                e_45 = _a.sent();
                console.error('Error enabling autostart:', e_45);
                res.status(500).json({ error: 'Failed to enable autostart', details: e_45.message });
                return [3 /*break*/, 13];
            case 13: return [2 /*return*/];
        }
    });
}); });
app.post('/api/autostart/disable', authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var exec, promisify, execAsync, path_4, scriptPath, settingsRows, config, e_46, e_47;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 12, , 13]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require('child_process'); })];
            case 1:
                exec = (_a.sent()).exec;
                return [4 /*yield*/, Promise.resolve().then(function () { return require('util'); })];
            case 2:
                promisify = (_a.sent()).promisify;
                execAsync = promisify(exec);
                return [4 /*yield*/, Promise.resolve().then(function () { return require('path'); })];
            case 3:
                path_4 = _a.sent();
                scriptPath = path_4.join(process.cwd(), 'manage-autostart.sh');
                return [4 /*yield*/, db_1.db.select().from(schema_2.settings).limit(1)];
            case 4:
                settingsRows = _a.sent();
                config = settingsRows[0];
                if (!!config) return [3 /*break*/, 6];
                return [4 /*yield*/, db_1.db.insert(schema_2.settings).values({ autostartEnabled: false })];
            case 5:
                _a.sent();
                return [3 /*break*/, 8];
            case 6: return [4 /*yield*/, db_1.db.update(schema_2.settings).set({ autostartEnabled: false }).where((0, drizzle_orm_1.eq)(schema_2.settings.id, config.id))];
            case 7:
                _a.sent();
                _a.label = 8;
            case 8:
                _a.trys.push([8, 10, , 11]);
                return [4 /*yield*/, execAsync("sudo ".concat(scriptPath, " disable"))];
            case 9:
                _a.sent();
                res.json({ success: true, message: 'Autostart disabled successfully' });
                return [3 /*break*/, 11];
            case 10:
                e_46 = _a.sent();
                // Database setting is saved, but systemd might need manual intervention
                res.json({
                    success: true,
                    message: 'Autostart setting saved, but systemd service may need manual disable',
                    warning: 'You may need to run: sudo systemctl disable backup-system'
                });
                return [3 /*break*/, 11];
            case 11: return [3 /*break*/, 13];
            case 12:
                e_47 = _a.sent();
                console.error('Error disabling autostart:', e_47);
                res.status(500).json({ error: 'Failed to disable autostart', details: e_47.message });
                return [3 /*break*/, 13];
            case 13: return [2 /*return*/];
        }
    });
}); });
app.get('/health', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                // Test database connection
                return [4 /*yield*/, db_1.db.select().from(schema_1.users).limit(1)];
            case 1:
                // Test database connection
                _a.sent();
                res.type('application/json');
                res.send(JSON.stringify({ ok: true, time: new Date().toISOString(), db: 'connected' }));
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('Health check failed:', error_4);
                res.status(500).type('application/json');
                res.send(JSON.stringify({ ok: false, error: 'Database connection failed', time: new Date().toISOString() }));
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
