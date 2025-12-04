"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
const schema_1 = require("./db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const app = (0, express_1.default)();
const defaultPort = Number(process.env.PORT) || 3000;
let port = defaultPort;
app.use(express_1.default.json());
app.set('trust proxy', true);
// Simple in-memory password hashing utilities
const crypto_1 = __importDefault(require("crypto"));
function hashPassword(password, salt) {
    return crypto_1.default.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
}
function makeToken() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
// Auth routes
app.post('/api/auth/register', async (req, res) => {
    const schema = zod_1.z.object({ username: zod_1.z.string().min(3), password: zod_1.z.string().min(6) });
    try {
        const data = schema.parse(req.body);
        const salt = crypto_1.default.randomBytes(16).toString('hex');
        const hash = hashPassword(data.password, salt);
        const existing = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.username, data.username));
        if (existing.length > 0)
            return res.status(409).json({ error: 'User exists' });
        const created = await db_1.db.insert(schema_1.users).values({ username: data.username, passwordHash: hash, passwordSalt: salt }).returning();
        res.json({ id: created[0].id, username: created[0].username });
    }
    catch (e) {
        res.status(400).json({ error: 'Invalid input' });
    }
});
app.post('/api/auth/login', async (req, res) => {
    const schema = zod_1.z.object({ username: zod_1.z.string(), password: zod_1.z.string() });
    try {
        const data = schema.parse(req.body);
        const found = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.username, data.username));
        const user = found[0];
        if (!user)
            return res.status(401).json({ error: 'Invalid credentials' });
        const hash = hashPassword(data.password, user.passwordSalt);
        if (hash !== user.passwordHash)
            return res.status(401).json({ error: 'Invalid credentials' });
        const token = makeToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
        await db_1.db.insert(schema_1.sessions).values({ userId: user.id, token, expiresAt });
        res.json({ token });
    }
    catch (e) {
        res.status(400).json({ error: 'Invalid input' });
    }
});
const authMiddleware = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = auth.slice('Bearer '.length);
    db_1.db.select().from(schema_1.sessions).where((0, drizzle_orm_1.eq)(schema_1.sessions.token, token)).then((rows) => {
        const s = rows[0];
        if (!s)
            return res.status(401).json({ error: 'Unauthorized' });
        if (new Date(s.expiresAt).getTime() < Date.now())
            return res.status(401).json({ error: 'Session expired' });
        req.userId = s.userId;
        next();
    }).catch(() => res.status(500).json({ error: 'Auth error' }));
};
app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
    const schema = zod_1.z.object({
        currentPassword: zod_1.z.string(),
        newPassword: zod_1.z.string().min(6)
    });
    try {
        const data = schema.parse(req.body);
        const userId = req.userId;
        const found = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        const user = found[0];
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const currentHash = hashPassword(data.currentPassword, user.passwordSalt);
        if (currentHash !== user.passwordHash) {
            return res.status(401).json({ error: 'Incorrect current password' });
        }
        const newSalt = crypto_1.default.randomBytes(16).toString('hex');
        const newHash = hashPassword(data.newPassword, newSalt);
        await db_1.db.update(schema_1.users)
            .set({ passwordHash: newHash, passwordSalt: newSalt })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        res.json({ success: true });
    }
    catch (e) {
        res.status(400).json({ error: 'Invalid input' });
    }
});
// API Routes
app.get('/api/servers', authMiddleware, async (req, res) => {
    const allServers = await db_1.db.select().from(schema_1.servers);
    const normalized = allServers.map((s) => ({
        ...s,
        backupPaths: s.backupPaths ? JSON.parse(s.backupPaths) : [],
        dbSelected: s.dbSelected ? JSON.parse(s.dbSelected) : [],
    }));
    res.json(normalized);
});
app.post('/api/servers', authMiddleware, async (req, res) => {
    const schema = zod_1.z.object({
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
    }).refine((data) => Boolean(data.sshKeyPath) || Boolean(data.password), {
        message: 'Provide sshKeyPath or password',
        path: ['sshKeyPath'],
    });
    try {
        const data = schema.parse(req.body);
        const toSave = {
            ...data,
            localBackupPath: data.localBackupPath && data.localBackupPath.trim() ? data.localBackupPath : undefined,
            backupPaths: data.backupPaths ? JSON.stringify(data.backupPaths) : undefined,
            dbSelected: data.dbSelected ? JSON.stringify(data.dbSelected) : undefined,
        };
        const result = await db_1.db.insert(schema_1.servers).values(toSave).returning();
        res.json(result[0]);
    }
    catch (e) {
        res.status(400).json({ error: 'Invalid data' });
    }
});
app.put('/api/servers/:id', authMiddleware, async (req, res) => {
    const serverId = parseInt(req.params.id);
    const schema = zod_1.z.object({
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
    }).refine((data) => Boolean(data.sshKeyPath) || Boolean(data.password), {
        message: 'Provide sshKeyPath or password',
        path: ['sshKeyPath'],
    });
    try {
        const data = schema.parse(req.body);
        const toSave = {
            ...data,
            localBackupPath: data.localBackupPath && data.localBackupPath.trim() ? data.localBackupPath : undefined,
            backupPaths: data.backupPaths ? JSON.stringify(data.backupPaths) : undefined,
            dbSelected: data.dbSelected ? JSON.stringify(data.dbSelected) : undefined,
        };
        const result = await db_1.db.update(schema_1.servers)
            .set(toSave)
            .where((0, drizzle_orm_1.eq)(schema_1.servers.id, serverId))
            .returning();
        if (result.length === 0) {
            return res.status(404).json({ error: 'Server not found' });
        }
        res.json(result[0]);
    }
    catch (e) {
        res.status(400).json({ error: 'Invalid data' });
    }
});
app.delete('/api/servers/:id', authMiddleware, async (req, res) => {
    const serverId = parseInt(req.params.id);
    const existing = await db_1.db.select().from(schema_1.servers).where((0, drizzle_orm_1.eq)(schema_1.servers.id, serverId)).get();
    if (!existing) {
        return res.status(404).json({ error: 'Server not found' });
    }
    await db_1.db.delete(schema_1.backupLogs).where((0, drizzle_orm_1.eq)(schema_1.backupLogs.serverId, serverId));
    await db_1.db.delete(schema_1.servers).where((0, drizzle_orm_1.eq)(schema_1.servers.id, serverId));
    res.json({ ok: true });
});
const backup_1 = require("./backup");
const ssh2_1 = require("ssh2");
const schema_2 = require("./db/schema");
const fs_1 = require("fs");
const fs_2 = __importDefault(require("fs"));
const https_1 = __importDefault(require("https"));
app.post('/api/backup/:id', authMiddleware, async (req, res) => {
    const serverId = parseInt(req.params.id);
    const server = await db_1.db.select().from(schema_1.servers).where((0, drizzle_orm_1.eq)(schema_1.servers.id, serverId)).get();
    if (!server) {
        return res.status(404).json({ error: 'Server not found' });
    }
    const log = await db_1.db.insert(schema_1.backupLogs).values({
        serverId,
        status: 'pending',
        logs: 'Initializing...',
    }).returning();
    const appSettings = await db_1.db.select().from(schema_2.settings).limit(1);
    const globalLocalBackupPath = appSettings[0]?.globalLocalBackupPath;
    const backupManager = new backup_1.BackupManager({
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
});
app.get('/api/backup/:id/status', authMiddleware, async (req, res) => {
    const logId = parseInt(req.params.id);
    const log = await db_1.db.select().from(schema_1.backupLogs).where((0, drizzle_orm_1.eq)(schema_1.backupLogs.id, logId)).get();
    if (!log) {
        return res.status(404).json({ error: 'Log not found' });
    }
    res.json(log);
});
app.get('/api/servers/:id/browse', authMiddleware, async (req, res) => {
    const serverId = parseInt(req.params.id);
    const targetPath = typeof req.query.path === 'string' && req.query.path ? req.query.path : '/';
    const server = await db_1.db.select().from(schema_1.servers).where((0, drizzle_orm_1.eq)(schema_1.servers.id, serverId)).get();
    if (!server) {
        return res.status(404).json({ error: 'Server not found' });
    }
    const conn = new ssh2_1.Client();
    conn.on('ready', () => {
        conn.sftp((err, sftp) => {
            if (err) {
                conn.end();
                return res.status(500).json({ error: 'SFTP init failed' });
            }
            sftp.readdir(targetPath, (err2, list) => {
                conn.end();
                if (err2) {
                    return res.status(400).json({ error: 'Cannot read directory' });
                }
                const entries = list.map((e) => {
                    const mode = e.attrs && typeof e.attrs.mode === 'number' ? e.attrs.mode : 0;
                    const type = (mode & 0o170000) === 0o040000 ? 'dir' : 'file';
                    return { name: e.filename, type };
                });
                res.json({ path: targetPath, entries });
            });
        });
    }).on('error', () => {
        res.status(500).json({ error: 'SSH connection failed' });
    }).connect({
        host: server.ip,
        port: server.port,
        username: server.user,
        ...(server.password ? { password: server.password } : { privateKey: server.sshKeyPath ? require('fs').readFileSync(server.sshKeyPath) : undefined }),
    });
});
app.post('/api/browse', authMiddleware, async (req, res) => {
    const schema = zod_1.z.object({
        host: zod_1.z.string(),
        port: zod_1.z.number().default(22),
        user: zod_1.z.string(),
        sshKeyPath: zod_1.z.string().optional(),
        password: zod_1.z.string().optional(),
        path: zod_1.z.string().default('/'),
    }).refine((d) => Boolean(d.sshKeyPath) || Boolean(d.password), {
        message: 'Provide sshKeyPath or password',
        path: ['sshKeyPath'],
    });
    try {
        const data = schema.parse(req.body);
        const conn = new ssh2_1.Client();
        conn.on('ready', () => {
            conn.sftp((err, sftp) => {
                if (err) {
                    conn.end();
                    return res.status(500).json({ error: 'SFTP init failed' });
                }
                sftp.readdir(data.path, (err2, list) => {
                    conn.end();
                    if (err2) {
                        return res.status(400).json({ error: 'Cannot read directory' });
                    }
                    const entries = list.map((e) => {
                        const mode = e.attrs && typeof e.attrs.mode === 'number' ? e.attrs.mode : 0;
                        const type = (mode & 0o170000) === 0o040000 ? 'dir' : 'file';
                        return { name: e.filename, type };
                    });
                    res.json({ path: data.path, entries });
                });
            });
        }).on('error', () => {
            res.status(500).json({ error: 'SSH connection failed' });
        }).connect({
            host: data.host,
            port: data.port,
            username: data.user,
            ...(data.password ? { password: data.password } : { privateKey: data.sshKeyPath ? require('fs').readFileSync(data.sshKeyPath) : undefined }),
        });
    }
    catch (e) {
        res.status(400).json({ error: 'Invalid input' });
    }
});
app.post('/api/servers/:id/dbs', authMiddleware, async (req, res) => {
    const serverId = parseInt(req.params.id);
    const { dbHost, dbUser, dbPassword, dbPort } = req.body || {};
    const server = await db_1.db.select().from(schema_1.servers).where((0, drizzle_orm_1.eq)(schema_1.servers.id, serverId)).get();
    if (!server) {
        return res.status(404).json({ error: 'Server not found' });
    }
    if (!dbUser) {
        return res.status(400).json({ error: 'dbUser required' });
    }
    const conn = new ssh2_1.Client();
    conn.on('ready', () => {
        conn.exec('command -v mysql || command -v mariadb', (findErr, findStream) => {
            if (findErr) {
                conn.end();
                return res.status(500).json({ error: 'Failed to locate MySQL client' });
            }
            let bin = '';
            findStream.on('data', (d) => { bin += d.toString().trim(); });
            findStream.on('close', () => {
                if (!bin) {
                    conn.end();
                    return res.status(500).json({ error: 'MySQL client not found on remote host' });
                }
                const cmd = `${bin} --protocol=tcp -h ${dbHost || 'localhost'} ${dbPort ? `-P ${dbPort}` : ''} -u ${dbUser} ${dbPassword ? `-p${dbPassword}` : ''} -e "SHOW DATABASES;" -s -N`;
                conn.exec(cmd, (err, stream) => {
                    if (err) {
                        conn.end();
                        return res.status(500).json({ error: 'Failed to run mysql', details: err.message });
                    }
                    let out = '';
                    let errOut = '';
                    stream.on('data', (d) => { out += d.toString(); });
                    stream.stderr.on('data', (d) => { errOut += d.toString(); });
                    stream.on('close', () => {
                        conn.end();
                        if (errOut && !out) {
                            return res.status(500).json({ error: 'mysql stderr', details: errOut });
                        }
                        const lines = out.split('\n').map((l) => l.trim()).filter((l) => l && l !== 'information_schema' && l !== 'performance_schema' && l !== 'mysql' && l !== 'sys');
                        res.json({ databases: lines });
                    });
                });
            });
        });
    }).on('error', () => {
        res.status(500).json({ error: 'SSH connection failed' });
    }).connect({
        host: server.ip,
        port: server.port,
        username: server.user,
        ...(server.password ? { password: server.password } : { privateKey: server.sshKeyPath ? require('fs').readFileSync(server.sshKeyPath) : undefined }),
    });
});
app.post('/api/dbs', authMiddleware, async (req, res) => {
    const { host, port, user, sshKeyPath, password, dbHost, dbUser, dbPassword, dbPort } = req.body || {};
    if (!host || !port || !user) {
        return res.status(400).json({ error: 'Missing SSH connection fields' });
    }
    if (!dbUser) {
        return res.status(400).json({ error: 'dbUser required' });
    }
    const conn = new ssh2_1.Client();
    conn.on('ready', () => {
        conn.exec('command -v mysql || command -v mariadb', (findErr, findStream) => {
            if (findErr) {
                conn.end();
                return res.status(500).json({ error: 'Failed to locate MySQL client' });
            }
            let bin = '';
            findStream.on('data', (d) => { bin += d.toString().trim(); });
            findStream.on('close', () => {
                if (!bin) {
                    conn.end();
                    return res.status(500).json({ error: 'MySQL client not found on remote host' });
                }
                const cmd = `${bin} --protocol=tcp -h ${dbHost || 'localhost'} ${dbPort ? `-P ${dbPort}` : ''} -u ${dbUser} ${dbPassword ? `-p${dbPassword}` : ''} -e "SHOW DATABASES;" -s -N`;
                conn.exec(cmd, (err, stream) => {
                    if (err) {
                        conn.end();
                        return res.status(500).json({ error: 'Failed to run mysql', details: err.message });
                    }
                    let out = '';
                    let errOut = '';
                    stream.on('data', (d) => { out += d.toString(); });
                    stream.stderr.on('data', (d) => { errOut += d.toString(); });
                    stream.on('close', () => {
                        conn.end();
                        if (errOut && !out) {
                            return res.status(500).json({ error: 'mysql stderr', details: errOut });
                        }
                        const lines = out.split('\n').map((l) => l.trim()).filter((l) => l && l !== 'information_schema' && l !== 'performance_schema' && l !== 'mysql' && l !== 'sys');
                        res.json({ databases: lines });
                    });
                });
            });
        });
    }).on('error', () => {
        res.status(500).json({ error: 'SSH connection failed' });
    }).connect({
        host,
        port,
        username: user,
        ...(password ? { password } : { privateKey: sshKeyPath ? require('fs').readFileSync(sshKeyPath) : undefined }),
    });
});
app.get('/api/local/browse', authMiddleware, async (req, res) => {
    try {
        const q = typeof req.query.path === 'string' && req.query.path ? req.query.path : (process.env.HOME || '/');
        const entriesRaw = await fs_1.promises.readdir(q, { withFileTypes: true });
        const entries = entriesRaw.map((d) => ({ name: d.name, type: d.isDirectory() ? 'dir' : 'file' }));
        res.json({ path: q, entries });
    }
    catch (e) {
        res.status(400).json({ error: 'Cannot read local directory' });
    }
});
// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    app.use(express_1.default.static(path_1.default.join(__dirname, '../client')));
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(__dirname, '../client/index.html'));
    });
}
function startHttpServer(p) {
    const host = process.env.HOST || '0.0.0.0';
    app.listen(p, host, () => {
        console.log(`Server running at http://localhost:${p}`);
        // Ensure an initial admin exists for first login
        (async () => {
            try {
                const existing = await db_1.db.select().from(schema_1.users).limit(1);
                if (existing.length === 0) {
                    const username = 'admin';
                    const password = 'admin123';
                    const salt = crypto_1.default.randomBytes(16).toString('hex');
                    const hash = hashPassword(password, salt);
                    await db_1.db.insert(schema_1.users).values({ username, passwordHash: hash, passwordSalt: salt });
                    console.log('Created default admin user: admin / admin123');
                }
            }
            catch (e) {
                console.error('Failed to init default user', e);
            }
        })();
    }).on('error', (err) => {
        if (err && err.code === 'EADDRINUSE') {
            if (process.env.NODE_ENV === 'production') {
                console.error(`Port ${p} in use in production. Set a free PORT and restart.`);
                throw err;
            }
            else {
                const next = p + 1;
                console.warn(`Port ${p} in use, retrying on ${next}...`);
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
(async () => {
    try {
        const existing = await db_1.db.select().from(schema_1.users).limit(1);
        if (existing.length === 0) {
            const username = 'admin';
            const password = 'admin123';
            const salt = crypto_1.default.randomBytes(16).toString('hex');
            const hash = hashPassword(password, salt);
            await db_1.db.insert(schema_1.users).values({ username, passwordHash: hash, passwordSalt: salt });
            console.log('Created default admin user: admin / admin123');
        }
    }
    catch (e) {
        console.error('Failed to init default user', e);
    }
})();
;
// Optional HTTPS server controlled by settings
(async () => {
    try {
        const set = await db_1.db.select().from(schema_2.settings).limit(1);
        const cfg = set[0];
        if (cfg?.sslEnabled && cfg?.sslCertPath && cfg?.sslKeyPath) {
            const sslPort = Number(cfg.sslPort || 3443);
            const options = {
                cert: fs_2.default.readFileSync(cfg.sslCertPath),
                key: fs_2.default.readFileSync(cfg.sslKeyPath),
            };
            https_1.default.createServer(options, app).listen(sslPort, () => {
                console.log(`HTTPS server running at https://localhost:${sslPort}`);
            });
        }
    }
    catch (e) {
        console.error('Failed to start HTTPS server:', e?.message || e);
    }
})();
app.get('/api/settings', authMiddleware, async (req, res) => {
    const rows = await db_1.db.select().from(schema_2.settings).limit(1);
    res.json(rows[0] || {});
});
app.put('/api/settings', authMiddleware, async (req, res) => {
    const schema = zod_1.z.object({
        globalLocalBackupPath: zod_1.z.string().optional(),
        driveClientId: zod_1.z.string().optional(),
        driveClientSecret: zod_1.z.string().optional(),
        driveRefreshToken: zod_1.z.string().optional(),
        sslEnabled: zod_1.z.boolean().optional(),
        sslPort: zod_1.z.number().optional(),
        sslCertPath: zod_1.z.string().optional(),
        sslKeyPath: zod_1.z.string().optional(),
    });
    try {
        const data = schema.parse(req.body);
        const existing = await db_1.db.select().from(schema_2.settings).limit(1);
        if (existing.length > 0) {
            const updated = await db_1.db.update(schema_2.settings).set(data).where((0, drizzle_orm_1.eq)(schema_2.settings.id, existing[0].id)).returning();
            res.json(updated[0]);
        }
        else {
            const created = await db_1.db.insert(schema_2.settings).values(data).returning();
            res.json(created[0]);
        }
    }
    catch (e) {
        res.status(400).json({ error: 'Invalid settings' });
    }
});
app.get('/api/drive/files', authMiddleware, async (req, res) => {
    const set = await db_1.db.select().from(schema_2.settings).limit(1);
    const cfg = set[0];
    if (!cfg?.driveClientId || !cfg?.driveClientSecret || !cfg?.driveRefreshToken) {
        return res.status(400).json({ error: 'Drive not configured' });
    }
    const { google } = await Promise.resolve().then(() => __importStar(require('googleapis')));
    const oauth2Client = new google.auth.OAuth2(cfg.driveClientId, cfg.driveClientSecret);
    oauth2Client.setCredentials({ refresh_token: cfg.driveRefreshToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    try {
        const r = await drive.files.list({ pageSize: 50, fields: 'files(id,name,mimeType,modifiedTime,size)' });
        res.json(r.data.files || []);
    }
    catch (e) {
        res.status(500).json({ error: 'Drive list failed', details: e.message });
    }
});
app.post('/api/drive/import', authMiddleware, async (req, res) => {
    const schema = zod_1.z.object({ fileId: zod_1.z.string(), targetPath: zod_1.z.string().optional() });
    try {
        const data = schema.parse(req.body);
        const set = await db_1.db.select().from(schema_2.settings).limit(1);
        const cfg = set[0];
        if (!cfg?.driveClientId || !cfg?.driveClientSecret || !cfg?.driveRefreshToken) {
            return res.status(400).json({ error: 'Drive not configured' });
        }
        const basePath = cfg.globalLocalBackupPath || path_1.default.join(process.env.HOME || '', 'Server-Backups');
        const destDir = path_1.default.resolve(data.targetPath || basePath);
        await fs_1.promises.mkdir(destDir, { recursive: true });
        const { google } = await Promise.resolve().then(() => __importStar(require('googleapis')));
        const oauth2Client = new google.auth.OAuth2(cfg.driveClientId, cfg.driveClientSecret);
        oauth2Client.setCredentials({ refresh_token: cfg.driveRefreshToken });
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        const destFile = path_1.default.join(destDir, `${data.fileId}.download`);
        const stream = (await Promise.resolve().then(() => __importStar(require('fs')))).createWriteStream(destFile);
        const r = await drive.files.get({ fileId: data.fileId, alt: 'media' }, { responseType: 'stream' });
        await new Promise((resolve, reject) => {
            r.data.on('error', reject);
            r.data.pipe(stream).on('finish', () => resolve()).on('error', reject);
        });
        res.json({ ok: true, path: destFile });
    }
    catch (e) {
        res.status(400).json({ error: 'Import failed', details: e.message });
    }
});
// List backup files
app.get('/api/backups/list', authMiddleware, async (req, res) => {
    const relativePath = req.query.path || '';
    // Prevent directory traversal
    if (relativePath.includes('..')) {
        return res.status(400).json({ error: 'Invalid path' });
    }
    const set = await db_1.db.select().from(schema_2.settings).limit(1);
    const globalPath = set[0]?.globalLocalBackupPath || path_1.default.join(process.env.HOME || '', 'Server-Backups');
    const fullPath = path_1.default.join(globalPath, relativePath);
    try {
        // Ensure directory exists
        await fs_1.promises.mkdir(fullPath, { recursive: true });
        const entries = await fs_1.promises.readdir(fullPath, { withFileTypes: true });
        const files = await Promise.all(entries.map(async (entry) => {
            const stats = await fs_1.promises.stat(path_1.default.join(fullPath, entry.name));
            return {
                name: entry.name,
                isDirectory: entry.isDirectory(),
                size: stats.size,
                date: stats.mtime.toISOString(),
            };
        }));
        // Sort directories first, then files
        files.sort((a, b) => {
            if (a.isDirectory === b.isDirectory)
                return a.name.localeCompare(b.name);
            return a.isDirectory ? -1 : 1;
        });
        res.json({ files, currentPath: relativePath });
    }
    catch (error) {
        console.error('Error listing backups:', error);
        res.status(500).json({ error: 'Failed to list backup files' });
    }
});
// Download backup file
app.get('/api/backups/download', async (req, res) => {
    const token = req.query.token;
    if (!token)
        return res.status(401).send('Unauthorized');
    // Verify token manually since this is a browser navigation
    const s = await db_1.db.select().from(schema_1.sessions).where((0, drizzle_orm_1.eq)(schema_1.sessions.token, token)).limit(1);
    if (!s.length || new Date(s[0].expiresAt).getTime() < Date.now()) {
        return res.status(401).send('Unauthorized or expired session');
    }
    const relativePath = req.query.path || '';
    if (relativePath.includes('..'))
        return res.status(400).send('Invalid path');
    const set = await db_1.db.select().from(schema_2.settings).limit(1);
    const globalPath = set[0]?.globalLocalBackupPath || path_1.default.join(process.env.HOME || '', 'Server-Backups');
    const fullPath = path_1.default.join(globalPath, relativePath);
    res.download(fullPath, (err) => {
        if (err) {
            console.error('Download error:', err);
            if (!res.headersSent)
                res.status(404).send('File not found');
        }
    });
});
app.get('/health', (req, res) => {
    res.type('application/json');
    res.send(JSON.stringify({ ok: true, time: new Date().toISOString() }));
});
