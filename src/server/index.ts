import express from 'express';
import path from 'path';
import cors from 'cors';
import { db } from './db';
import { servers, backupLogs, users, sessions, cronJobs, ipWhitelist, loginIpWhitelist } from './db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { cronScheduler } from './cron';
import { isIpWhitelisted, isLoginIpWhitelisted, getClientIp, validateIpOrCidr } from './ipWhitelist';

const app = express();
const defaultPort = Number(process.env.PORT) || 3000;
let port = defaultPort;

// CORS configuration - allow requests from frontend domain and mobile apps
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }
        
        const allowedOrigins = [
            'https://bk.lyarinet.com',
            'http://localhost:5173', // Vite dev server
            'http://localhost:3000',
            'capacitor://localhost', // Capacitor iOS
            'http://localhost', // Capacitor Android
            'https://localhost', // Capacitor Android HTTPS
        ];
        
        // Allow if origin is in allowed list
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // For mobile apps, allow all origins (they use absolute URLs)
            // This is safe because mobile apps are installed and not accessible via browser
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.set('trust proxy', true);

// IP Whitelist middleware - must be before routes but after express.json
// Note: Login/register routes are excluded in the middleware itself
const ipWhitelistMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        // Skip whitelist check for login/register/health endpoints
        // Also allow IP whitelist management endpoints so admins can fix lockouts
        if (req.path === '/api/auth/login' || 
            req.path === '/api/auth/register' || 
            req.path === '/health' || 
            req.path.startsWith('/oauth_callback') ||
            req.path.startsWith('/api/ip-whitelist') ||
            req.path.startsWith('/api/login-ip-whitelist')) {
            return next();
        }
        
        const clientIp = getClientIp(req);
        const allowed = await isIpWhitelisted(clientIp);
        
        if (!allowed) {
            console.warn(`IP whitelist blocked: ${clientIp} from ${req.path}`);
            // For API requests, return JSON
            if (req.path.startsWith('/api')) {
                return res.status(403).json({
                    error: 'Access denied. Your IP address is not whitelisted.',
                    code: 'IP_WHITELIST',
                });
            }

            // For non-API (HTML) requests, show a friendly page
            res.status(403).send(`
                <!DOCTYPE html>
                <html lang="en">
                    <head>
                        <meta charset="UTF-8" />
                        <title>Access Denied - IP Whitelist</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                        <style>
                            body {
                                margin: 0;
                                padding: 0;
                                min-height: 100vh;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                                background: #0f172a;
                                color: #e5e7eb;
                            }
                            .card {
                                background: rgba(15, 23, 42, 0.96);
                                border-radius: 16px;
                                padding: 32px 40px;
                                box-shadow: 0 20px 45px rgba(15, 23, 42, 0.9);
                                max-width: 520px;
                                width: 100%;
                                border: 1px solid rgba(148, 163, 184, 0.4);
                                text-align: center;
                            }
                            h1 {
                                font-size: 1.75rem;
                                margin-bottom: 8px;
                            }
                            p {
                                margin: 4px 0;
                                font-size: 0.95rem;
                                color: #9ca3af;
                            }
                            .ip {
                                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                                background: rgba(15, 23, 42, 0.9);
                                padding: 6px 10px;
                                border-radius: 999px;
                                display: inline-block;
                                border: 1px solid rgba(148, 163, 184, 0.5);
                                margin-top: 8px;
                                color: #f97316;
                                font-size: 0.9rem;
                            }
                            .footnote {
                                margin-top: 18px;
                                font-size: 0.8rem;
                                color: #6b7280;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <h1>Access to this page is restricted</h1>
                            <p>You do not have access to this page from your current IP.</p>
                            <p>Please contact the system administrator to add your IP address to the whitelist.</p>
                            <div class="ip">Your IP: ${clientIp}</div>
                            <p class="footnote">IP whitelist is enabled on this server. Only approved IP addresses can use the backup panel.</p>
                        </div>
                    </body>
                </html>
            `);
            return;
        }
        
        next();
    } catch (error: any) {
        console.error('IP whitelist middleware error:', error.message);
        // On error, allow access (fail open)
        next();
    }
};

app.use(ipWhitelistMiddleware);

// Simple in-memory password hashing utilities
import crypto from 'crypto';
function hashPassword(password: string, salt: string) {
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
}
function makeToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Auth routes
app.post('/api/auth/register', async (req, res) => {
    // Check login IP whitelist
    const clientIp = getClientIp(req);
    const loginAllowed = await isLoginIpWhitelisted(clientIp);
    if (!loginAllowed) {
        console.warn(`Login IP whitelist blocked registration: ${clientIp}`);
        return res.status(403).json({ 
            error: 'Access denied. Your IP address is not whitelisted for registration.',
            code: 'LOGIN_IP_WHITELIST'
        });
    }

    const schema = z.object({ username: z.string().min(3), password: z.string().min(6) });
    try {
        const data = schema.parse(req.body);
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = hashPassword(data.password, salt);
        const existing = await db.select().from(users).where(eq(users.username, data.username));
        if (existing.length > 0) return res.status(409).json({ error: 'User exists' });
        const created = await db.insert(users).values({ username: data.username, passwordHash: hash, passwordSalt: salt }).returning();
        res.json({ id: created[0].id, username: created[0].username });
    } catch (e) {
        res.status(400).json({ error: 'Invalid input' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    // Check login IP whitelist
    const clientIp = getClientIp(req);
    const loginAllowed = await isLoginIpWhitelisted(clientIp);
    if (!loginAllowed) {
        console.warn(`Login IP whitelist blocked: ${clientIp}`);
        return res.status(403).json({ 
            error: 'Access denied. Your IP address is not whitelisted for login.',
            code: 'LOGIN_IP_WHITELIST'
        });
    }

    const schema = z.object({ username: z.string(), password: z.string() });
    try {
        const data = schema.parse(req.body);
        const found = await db.select().from(users).where(eq(users.username, data.username));
        const user = found[0];
        if (!user) {
            console.warn(`Login attempt failed: User not found - ${data.username}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const hash = hashPassword(data.password, (user as any).passwordSalt);
        if (hash !== (user as any).passwordHash) {
            console.warn(`Login attempt failed: Invalid password for user - ${data.username}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = makeToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
        await db.insert(sessions).values({ userId: (user as any).id, token, expiresAt });
        console.log(`Login successful for user: ${data.username}`);
        res.json({ token });
    } catch (e: any) {
        console.error('Login error:', e);
        res.status(400).json({ error: e?.message || 'Invalid input' });
    }
});

const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const token = auth.slice('Bearer '.length);
        const rows = await db.select().from(sessions).where(eq(sessions.token, token));
        const s = rows[0];
        if (!s) return res.status(401).json({ error: 'Unauthorized' });
        if (new Date((s as any).expiresAt).getTime() < Date.now()) return res.status(401).json({ error: 'Session expired' });
        (req as any).userId = (s as any).userId;
        next();
    } catch (error: any) {
        console.error('Auth middleware error:', error.message, error.stack);
        return res.status(500).json({ error: 'Auth error', details: error.message });
    }
};

app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
    const schema = z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6)
    });

    try {
        const data = schema.parse(req.body);
        const userId = (req as any).userId;

        const found = await db.select().from(users).where(eq(users.id, userId));
        const user = found[0];
        if (!user) return res.status(404).json({ error: 'User not found' });

        const currentHash = hashPassword(data.currentPassword, (user as any).passwordSalt);
        if (currentHash !== (user as any).passwordHash) {
            return res.status(401).json({ error: 'Incorrect current password' });
        }

        const newSalt = crypto.randomBytes(16).toString('hex');
        const newHash = hashPassword(data.newPassword, newSalt);

        // Update password
        await db.update(users)
            .set({ passwordHash: newHash, passwordSalt: newSalt })
            .where(eq(users.id, userId));

        // Invalidate all existing sessions for this user (security best practice)
        await db.delete(sessions).where(eq(sessions.userId, userId));

        console.log(`Password changed successfully for user ID: ${userId}`);
        res.json({ success: true, message: 'Password changed successfully. Please login again.' });
    } catch (e: any) {
        console.error('Password change error:', e);
        res.status(400).json({ error: e?.message || 'Invalid input' });
    }
});

// API Routes
app.get('/api/servers', authMiddleware, async (_req, res) => {
    const allServers = await db.select().from(servers);
    const normalized = allServers.map((s: any) => ({
        ...s,
        backupPaths: s.backupPaths ? JSON.parse(s.backupPaths) : [],
        dbSelected: s.dbSelected ? JSON.parse(s.dbSelected) : [],
    }));
    res.json(normalized);
});

app.post('/api/servers', authMiddleware, async (req, res) => {
    const schema = z.object({
        name: z.string(),
        ip: z.string(),
        user: z.string(),
        port: z.number().default(22),
        sshKeyPath: z.string().optional(),
        password: z.string().optional(),
        localBackupPath: z.string().optional(),
        backupPaths: z.array(z.string()).optional(),
        dbUser: z.string().optional(),
        dbPassword: z.string().optional(),
        dbHost: z.string().optional(),
        dbPort: z.number().optional(),
        dbSelected: z.array(z.string()).optional(),
        backupWww: z.boolean().default(true),
        backupLogs: z.boolean().default(true),
        backupNginx: z.boolean().default(true),
        backupDb: z.boolean().default(true),
    }).refine((data) => Boolean(data.sshKeyPath) || Boolean(data.password), {
        message: 'Provide sshKeyPath or password',
        path: ['sshKeyPath'],
    });

    try {
        const data = schema.parse(req.body);
        const toSave: any = {
            ...data,
            localBackupPath: data.localBackupPath && data.localBackupPath.trim() ? data.localBackupPath : undefined,
            backupPaths: data.backupPaths ? JSON.stringify(data.backupPaths) : undefined,
            dbSelected: data.dbSelected ? JSON.stringify(data.dbSelected) : undefined,
        };
        const result = await db.insert(servers).values(toSave).returning();
        res.json(result[0]);
    } catch (e) {
        res.status(400).json({ error: 'Invalid data' });
    }
});

app.put('/api/servers/:id', authMiddleware, async (req, res) => {
    const serverId = parseInt(req.params.id);

    const schema = z.object({
        name: z.string(),
        ip: z.string(),
        user: z.string(),
        port: z.number().default(22),
        sshKeyPath: z.string().optional(),
        password: z.string().optional(),
        localBackupPath: z.string().optional(),
        backupPaths: z.array(z.string()).optional(),
        dbUser: z.string().optional(),
        dbPassword: z.string().optional(),
        dbHost: z.string().optional(),
        dbPort: z.number().optional(),
        dbSelected: z.array(z.string()).optional(),
        backupWww: z.boolean().default(true),
        backupLogs: z.boolean().default(true),
        backupNginx: z.boolean().default(true),
        backupDb: z.boolean().default(true),
    }).refine((data) => Boolean(data.sshKeyPath) || Boolean(data.password), {
        message: 'Provide sshKeyPath or password',
        path: ['sshKeyPath'],
    });

    try {
        const data = schema.parse(req.body);
        const toSave: any = {
            ...data,
            localBackupPath: data.localBackupPath && data.localBackupPath.trim() ? data.localBackupPath : undefined,
            backupPaths: data.backupPaths ? JSON.stringify(data.backupPaths) : undefined,
            dbSelected: data.dbSelected ? JSON.stringify(data.dbSelected) : undefined,
        };
        const result = await db.update(servers)
            .set(toSave)
            .where(eq(servers.id, serverId))
            .returning();

        if (result.length === 0) {
            return res.status(404).json({ error: 'Server not found' });
        }

        res.json(result[0]);
    } catch (e) {
        res.status(400).json({ error: 'Invalid data' });
    }
});

app.delete('/api/servers/:id', authMiddleware, async (req, res) => {
    const serverId = parseInt(req.params.id);
    const existing = await db.select().from(servers).where(eq(servers.id, serverId)).get();
    if (!existing) {
        return res.status(404).json({ error: 'Server not found' });
    }
    await db.delete(backupLogs).where(eq(backupLogs.serverId, serverId));
    await db.delete(servers).where(eq(servers.id, serverId));
    res.json({ ok: true });
});

import { BackupManager } from './backup';
import { Client } from 'ssh2';
import { settings } from './db/schema';
import { promises as fsp } from 'fs';
import fs from 'fs';
import https from 'https';

app.post('/api/backup/:id', authMiddleware, async (req, res) => {
    const serverId = parseInt(req.params.id);
    const server = await db.select().from(servers).where(eq(servers.id, serverId)).get();

    if (!server) {
        return res.status(404).json({ error: 'Server not found' });
    }

    const log = await db.insert(backupLogs).values({
        serverId,
        status: 'pending',
        logs: 'Initializing...',
    }).returning();

    const appSettings = await db.select().from(settings).limit(1);
    const globalLocalBackupPath = appSettings[0]?.globalLocalBackupPath;

    const backupManager = new BackupManager({
        host: server.ip,
        port: server.port,
        username: server.user,
        privateKeyPath: server.sshKeyPath,
        password: (server as any).password,
        localBackupPath: server.localBackupPath || globalLocalBackupPath || undefined,
        backupPaths: (server as any).backupPaths ? JSON.parse((server as any).backupPaths) : undefined,
        dbUser: (server as any).dbUser,
        dbPassword: (server as any).dbPassword,
        dbHost: (server as any).dbHost,
        dbSelected: (server as any).dbSelected ? JSON.parse((server as any).dbSelected) : undefined,
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
    const log = await db.select().from(backupLogs).where(eq(backupLogs.id, logId)).get();

    if (!log) {
        return res.status(404).json({ error: 'Log not found' });
    }

    res.json(log);
});

app.get('/api/servers/:id/browse', authMiddleware, async (req, res) => {
    const serverId = parseInt(req.params.id);
    const targetPath = typeof req.query.path === 'string' && req.query.path ? req.query.path : '/';
    const server = await db.select().from(servers).where(eq(servers.id, serverId)).get();
    if (!server) {
        return res.status(404).json({ error: 'Server not found' });
    }

    const conn = new Client();
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
                const entries = list.map((e: any) => {
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
        ...(server.password ? { password: (server as any).password } : { privateKey: server.sshKeyPath ? require('fs').readFileSync(server.sshKeyPath) : undefined }),
    });
});

app.post('/api/browse', authMiddleware, async (req, res) => {
    const schema = z.object({
        host: z.string(),
        port: z.number().default(22),
        user: z.string(),
        sshKeyPath: z.string().optional(),
        password: z.string().optional(),
        path: z.string().default('/'),
    }).refine((d) => Boolean(d.sshKeyPath) || Boolean(d.password), {
        message: 'Provide sshKeyPath or password',
        path: ['sshKeyPath'],
    });

    try {
        const data = schema.parse(req.body);
        const conn = new Client();
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
                    const entries = list.map((e: any) => {
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
    } catch (e) {
        res.status(400).json({ error: 'Invalid input' });
    }
});

app.post('/api/servers/:id/dbs', authMiddleware, async (req, res) => {
    const serverId = parseInt(req.params.id);
    const { dbHost, dbUser, dbPassword, dbPort } = req.body || {};
    const server = await db.select().from(servers).where(eq(servers.id, serverId)).get();
    if (!server) {
        return res.status(404).json({ error: 'Server not found' });
    }
    if (!dbUser) {
        return res.status(400).json({ error: 'dbUser required' });
    }
    const conn = new Client();
    conn.on('ready', () => {
        conn.exec('command -v mysql || command -v mariadb', (findErr, findStream) => {
            if (findErr) {
                conn.end();
                return res.status(500).json({ error: 'Failed to locate MySQL client' });
            }
            let bin = '';
            findStream.on('data', (d: any) => { bin += d.toString().trim(); });
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
                    stream.on('data', (d: any) => { out += d.toString(); });
                    stream.stderr.on('data', (d: any) => { errOut += d.toString(); });
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
        ...(server.password ? { password: (server as any).password } : { privateKey: server.sshKeyPath ? require('fs').readFileSync(server.sshKeyPath) : undefined }),
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
    const conn = new Client();
    conn.on('ready', () => {
        conn.exec('command -v mysql || command -v mariadb', (findErr, findStream) => {
            if (findErr) {
                conn.end();
                return res.status(500).json({ error: 'Failed to locate MySQL client' });
            }
            let bin = '';
            findStream.on('data', (d: any) => { bin += d.toString().trim(); });
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
                    stream.on('data', (d: any) => { out += d.toString(); });
                    stream.stderr.on('data', (d: any) => { errOut += d.toString(); });
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
        const entriesRaw = await fsp.readdir(q, { withFileTypes: true });
        const entries = entriesRaw.map((d) => ({ name: d.name, type: d.isDirectory() ? 'dir' : 'file' }));
        res.json({ path: q, entries });
    } catch (e: any) {
        res.status(400).json({ error: 'Cannot read local directory' });
    }
});

// OAuth callback handler - MUST be before static file serving
app.get('/oauth_callback', async (req, res) => {
    try {
        const { code, error } = req.query;
        
        if (error) {
            return res.send(`
                <html>
                    <head><title>OAuth Error</title></head>
                    <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                        <h1 style="color: red;">❌ Authorization Failed</h1>
                        <p><strong>Error:</strong> ${error}</p>
                        ${error === 'redirect_uri_mismatch' ? `
                            <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto;">
                                <h3 style="margin-top: 0;">Redirect URI Mismatch - How to Fix:</h3>
                                <ol style="text-align: left;">
                                    <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank">Google Cloud Console → Credentials</a></li>
                                    <li>Click on your OAuth 2.0 Client ID</li>
                                    <li>In "Authorized redirect URIs", add exactly: <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">https://bk.lyarinet.com/oauth_callback</code></li>
                                    <li>Make sure there are NO trailing slashes</li>
                                    <li>Click "Save"</li>
                                    <li>Wait a few minutes for changes to propagate</li>
                                    <li>Try again</li>
                                </ol>
                            </div>
                        ` : ''}
                        <p><a href="javascript:window.close()">Close this window</a></p>
                    </body>
                </html>
            `);
        }
        
        if (!code) {
            return res.status(400).send('Missing authorization code');
        }

        const set = await db.select().from(settings).limit(1);
        const cfg = set[0] as any;
        if (!cfg?.driveClientId || !cfg?.driveClientSecret) {
            return res.status(400).send('Drive not configured');
        }

        const { google } = await import('googleapis');
        
        // Hardcode the redirect URI to match exactly what's in Google Cloud Console
        const redirectUri = 'https://bk.lyarinet.com/oauth_callback';
        
        const oauth2Client = new google.auth.OAuth2(
            cfg.driveClientId,
            cfg.driveClientSecret,
            redirectUri
        );

        const { tokens } = await oauth2Client.getToken(code as string);
        
        console.log('OAuth tokens received:', {
            hasAccessToken: !!tokens.access_token,
            hasRefreshToken: !!tokens.refresh_token,
            tokenType: tokens.token_type,
            expiryDate: tokens.expiry_date,
        });
        
        if (!tokens.refresh_token) {
            // If no refresh token, check if we have an existing one or need to revoke
            const existingToken = cfg.driveRefreshToken;
            let errorMessage = 'No refresh token received. ';
            
            if (existingToken) {
                errorMessage += 'You already have a refresh token saved. If you need a new one, revoke access at https://myaccount.google.com/permissions and try again.';
            } else {
                errorMessage += 'This usually happens if you\'ve already authorized this app. Please revoke access at https://myaccount.google.com/permissions and try again with prompt=consent.';
            }
            
            return res.send(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>OAuth Error - No Refresh Token</title>
                        <meta charset="UTF-8">
                        <style>
                            body {
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                                padding: 40px;
                                text-align: center;
                                background: #1a1a1a;
                                color: #ffffff;
                                margin: 0;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                min-height: 100vh;
                            }
                            .container {
                                background: #2a2a2a;
                                border-radius: 12px;
                                padding: 40px;
                                max-width: 600px;
                                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                            }
                            h1 {
                                color: #f87171;
                                margin-bottom: 20px;
                                font-size: 24px;
                            }
                            p {
                                color: #d1d5db;
                                margin: 10px 0;
                                line-height: 1.6;
                                text-align: left;
                            }
                            .steps {
                                background: #374151;
                                border-radius: 8px;
                                padding: 20px;
                                margin: 20px 0;
                                text-align: left;
                            }
                            .steps ol {
                                margin: 10px 0;
                                padding-left: 20px;
                            }
                            .steps li {
                                margin: 8px 0;
                                color: #d1d5db;
                            }
                            a {
                                color: #60a5fa;
                                text-decoration: none;
                            }
                            a:hover {
                                text-decoration: underline;
                            }
                            button {
                                background: #3b82f6;
                                color: white;
                                border: none;
                                padding: 12px 24px;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 16px;
                                margin-top: 20px;
                            }
                            button:hover {
                                background: #2563eb;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>⚠️ No Refresh Token Received</h1>
                            <p>${errorMessage}</p>
                            <div class="steps">
                                <h3 style="color: #fbbf24; margin-top: 0;">To Fix This:</h3>
                                <ol>
                                    <li>Go to <a href="https://myaccount.google.com/permissions" target="_blank">Google Account Permissions</a></li>
                                    <li>Find "lyarinet.com" or your app name in the list</li>
                                    <li>Click "Remove access" or "Revoke"</li>
                                    <li>Come back here and click "Get via OAuth" again</li>
                                    <li>This time, Google will ask for consent again and provide a refresh token</li>
                                </ol>
                            </div>
                            <button onclick="window.close()">Close Window</button>
                        </div>
                    </body>
                </html>
            `);
        }

        // Save refresh token
        try {
            await db.update(settings)
                .set({ driveRefreshToken: tokens.refresh_token })
                .where(eq(settings.id, cfg.id));
            
            console.log('Refresh token saved successfully');
        } catch (dbError: any) {
            console.error('Failed to save refresh token:', dbError);
            return res.status(500).send(`
                <!DOCTYPE html>
                <html>
                    <head><title>Database Error</title></head>
                    <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #1a1a1a; color: #fff;">
                        <h1 style="color: red;">❌ Database Error</h1>
                        <p>Failed to save refresh token: ${dbError.message}</p>
                        <p>Please try again or contact support.</p>
                        <button onclick="window.close()" style="padding: 10px 20px; margin-top: 20px; cursor: pointer;">Close</button>
                    </body>
                </html>
            `);
        }

        res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>OAuth Success</title>
                    <meta charset="UTF-8">
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                            padding: 40px;
                            text-align: center;
                            background: #1a1a1a;
                            color: #ffffff;
                            margin: 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            min-height: 100vh;
                        }
                        .container {
                            background: #2a2a2a;
                            border-radius: 12px;
                            padding: 40px;
                            max-width: 500px;
                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                        }
                        h1 {
                            color: #4ade80;
                            margin-bottom: 20px;
                            font-size: 24px;
                        }
                        p {
                            color: #d1d5db;
                            margin: 10px 0;
                            line-height: 1.6;
                        }
                        .spinner {
                            border: 3px solid #374151;
                            border-top: 3px solid #4ade80;
                            border-radius: 50%;
                            width: 40px;
                            height: 40px;
                            animation: spin 1s linear infinite;
                            margin: 20px auto;
                        }
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>✅ Authorization Successful!</h1>
                        <p>Your Google Drive refresh token has been saved.</p>
                        <p>This window will close automatically...</p>
                        <div class="spinner"></div>
                        <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
                            If the window doesn't close, you can close it manually.
                        </p>
                    </div>
                    <script>
                        // Try to close the window immediately
                        if (window.opener) {
                            // Notify parent window that auth was successful
                            try {
                                window.opener.postMessage({ type: 'oauth_success', refreshToken: '${tokens.refresh_token}' }, '*');
                            } catch (e) {
                                console.log('Could not notify parent window');
                            }
                        }
                        
                        // Close the window
                        function closeWindow() {
                            if (window.opener) {
                                window.close();
                            } else {
                                // If window.close() doesn't work, try to redirect parent
                                try {
                                    window.location.href = window.location.origin + '/#/settings';
                                } catch (e) {
                                    document.body.innerHTML = '<div class="container"><h1>✅ Success!</h1><p>Please close this window and refresh the settings page.</p></div>';
                                }
                            }
                        }
                        
                        // Try to close immediately
                        setTimeout(closeWindow, 500);
                        
                        // Fallback: try again after 2 seconds
                        setTimeout(closeWindow, 2000);
                        
                        // Final fallback: show message after 3 seconds
                        setTimeout(() => {
                            if (!document.hidden) {
                                document.querySelector('.spinner').style.display = 'none';
                                document.querySelector('p:last-of-type').innerHTML = 'Please close this window manually and refresh the settings page.';
                            }
                        }, 3000);
                    </script>
                </body>
            </html>
        `);
    } catch (e: any) {
        console.error('OAuth callback error:', e);
        res.status(500).send(`
            <html>
                <head><title>OAuth Error</title></head>
                <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                    <h1 style="color: red;">❌ Authorization Failed</h1>
                    <p>${e.message}</p>
                    <p><a href="javascript:window.close()">Close this window</a></p>
                </body>
            </html>
        `);
    }
});

// Root path handler - return API info
app.get('/', (_req, res) => {
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

function startHttpServer(p: number) {
    const host = process.env.HOST || '0.0.0.0';
    app.listen(p, host as any, () => {
        console.log(`Server running at http://localhost:${p}`);
        // Ensure an initial admin exists for first login
        (async () => {
            try {
                const existing = await db.select().from(users).limit(1);
                if (existing.length === 0) {
                    const username = 'admin';
                    const password = 'admin123';
                    const salt = crypto.randomBytes(16).toString('hex');
                    const hash = hashPassword(password, salt);
                    await db.insert(users).values({ username, passwordHash: hash, passwordSalt: salt });
                    console.log('Created default admin user: admin / admin123');
                }
                
                // Load and start cron jobs
                try {
                    await cronScheduler.loadJobs();
                } catch (e: any) {
                    console.error('Failed to load cron jobs:', e.message);
                }
            } catch (e) {
                console.error('Failed to init default user', e);
            }
        })();
    }).on('error', (err: any) => {
        if (err && err.code === 'EADDRINUSE') {
            if (process.env.NODE_ENV === 'production') {
                console.error(`Port ${p} in use in production. Set a free PORT and restart.`);
                throw err;
            } else {
                const next = p + 1;
                console.warn(`Port ${p} in use, retrying on ${next}...`);
                port = next;
                startHttpServer(next);
            }
        } else {
            throw err;
        }
    });
}

startHttpServer(port);
    // Ensure an initial admin exists for first login
    (async () => {
        try {
            const existing = await db.select().from(users).limit(1);
            if (existing.length === 0) {
                const username = 'admin';
                const password = 'admin123';
                const salt = crypto.randomBytes(16).toString('hex');
                const hash = hashPassword(password, salt);
                await db.insert(users).values({ username, passwordHash: hash, passwordSalt: salt });
                console.log('Created default admin user: admin / admin123');
            }
        } catch (e) {
            console.error('Failed to init default user', e);
        }
    })();
;

// Optional HTTPS server controlled by settings
(async () => {
    try {
        const set = await db.select().from(settings).limit(1);
        const cfg = set[0] as any;
        if (cfg?.sslEnabled && cfg?.sslCertPath && cfg?.sslKeyPath) {
            const sslPort = Number(cfg.sslPort || 3443);
            const options = {
                cert: fs.readFileSync(cfg.sslCertPath),
                key: fs.readFileSync(cfg.sslKeyPath),
            };
            https.createServer(options, app).listen(sslPort, () => {
                console.log(`HTTPS server running at https://localhost:${sslPort}`);
            });
        }
    } catch (e) {
        console.error('Failed to start HTTPS server:', (e as any)?.message || e);
    }
})();
app.get('/api/settings', authMiddleware, async (_req, res) => {
    try {
        const rows = await db.select().from(settings).limit(1);
        res.json(rows[0] || {});
    } catch (e: any) {
        console.error('Settings get error:', e.message, e.stack);
        res.status(500).json({ error: 'Failed to get settings', details: e.message });
    }
});

app.put('/api/settings', authMiddleware, async (req, res) => {
    const schema = z.object({
        globalLocalBackupPath: z.string().optional(),
        apiBaseUrl: z.string().optional(),
        driveClientId: z.string().optional(),
        driveClientSecret: z.string().optional(),
        driveRefreshToken: z.string().optional(),
        driveFolderId: z.string().optional(),
        driveAutoUpload: z.boolean().optional(),
        sslEnabled: z.boolean().optional(),
        sslPort: z.number().optional(),
        sslCertPath: z.string().optional(),
        sslKeyPath: z.string().optional(),
        autostartEnabled: z.boolean().optional(),
    });
    try {
        const data = schema.parse(req.body);
        
        // Log what's being saved (but mask sensitive data)
        console.log('Saving settings:', {
            hasGlobalPath: !!data.globalLocalBackupPath,
            hasDriveClientId: !!data.driveClientId,
            hasDriveClientSecret: !!data.driveClientSecret,
            hasDriveRefreshToken: !!data.driveRefreshToken,
            refreshTokenLength: data.driveRefreshToken?.length || 0,
            hasDriveFolderId: !!data.driveFolderId,
            driveAutoUpload: data.driveAutoUpload,
        });
        
        const existing = await db.select().from(settings).limit(1);
        if (existing.length > 0) {
            const updated = await db.update(settings).set(data).where(eq(settings.id, existing[0].id)).returning();
            console.log('Settings updated successfully');
            res.json(updated[0]);
        } else {
            const created = await db.insert(settings).values(data).returning();
            console.log('Settings created successfully');
            res.json(created[0]);
        }
    } catch (e: any) {
        console.error('Settings save error:', e.message);
        res.status(400).json({ error: 'Invalid settings', details: e.message });
    }
});

import { GoogleDriveService } from './drive';

// Helper to get Drive service instance
function getDriveService() {
    return async () => {
        const set = await db.select().from(settings).limit(1);
        const cfg = set[0] as any;
        if (!cfg?.driveClientId || !cfg?.driveClientSecret || !cfg?.driveRefreshToken) {
            throw new Error('Drive not configured');
        }
        return new GoogleDriveService({
            clientId: cfg.driveClientId,
            clientSecret: cfg.driveClientSecret,
            refreshToken: cfg.driveRefreshToken,
        });
    };
}

// Get OAuth authorization URL
app.get('/api/drive/oauth-url', authMiddleware, async (req, res) => {
    try {
        const set = await db.select().from(settings).limit(1);
        const cfg = set[0] as any;
        if (!cfg?.driveClientId || !cfg?.driveClientSecret) {
            return res.status(400).json({ error: 'Drive client ID and secret must be configured first' });
        }

        const { google } = await import('googleapis');
        
        // Hardcode the redirect URI to match exactly what's in Google Cloud Console
        // This must match EXACTLY: https://bk.lyarinet.com/oauth_callback
        const redirectUri = 'https://bk.lyarinet.com/oauth_callback';
        
        console.log('OAuth redirect URI (hardcoded):', redirectUri);
        console.log('Request headers:', {
            protocol: req.protocol,
            host: req.get('host'),
            'x-forwarded-proto': req.get('x-forwarded-proto'),
            'x-forwarded-host': req.get('x-forwarded-host'),
        });
        
        const oauth2Client = new google.auth.OAuth2(
            cfg.driveClientId,
            cfg.driveClientSecret,
            redirectUri
        );

        const scopes = [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive.metadata.readonly',
        ];

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent', // Force consent to get refresh token
        });

        // Return the auth URL and the exact redirect URI being used
        res.json({ authUrl, redirectUri });
    } catch (e: any) {
        console.error('OAuth URL generation error:', e);
        res.status(400).json({ error: e.message });
    }
});


// Get redirect URI info for debugging
app.get('/api/drive/redirect-uri', authMiddleware, (req, res) => {
    const redirectUri = 'https://bk.lyarinet.com/oauth_callback';
    res.json({
        redirectUri,
        instructions: [
            '1. Go to Google Cloud Console → APIs & Services → Credentials',
            '2. Click on your OAuth 2.0 Client ID',
            `3. In "Authorized redirect URIs", add exactly: ${redirectUri}`,
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
app.get('/api/drive/test', authMiddleware, async (_req, res) => {
    try {
        // Check if Drive is configured first
        const set = await db.select().from(settings).limit(1);
        const cfg = set[0] as any;
        
        console.log('Drive test - Config check:', {
            hasClientId: !!cfg?.driveClientId,
            hasClientSecret: !!cfg?.driveClientSecret,
            hasRefreshToken: !!cfg?.driveRefreshToken,
            refreshTokenLength: cfg?.driveRefreshToken?.length || 0
        });
        
        if (!cfg?.driveClientId || !cfg?.driveClientSecret) {
            return res.status(400).json({ 
                error: 'Drive not configured. Please configure Client ID and Client Secret first.' 
            });
        }
        if (!cfg?.driveRefreshToken) {
            return res.status(400).json({ 
                error: 'Refresh token missing. Please save your refresh token by clicking "Update Provider" first.' 
            });
        }
        
        const driveService = await getDriveService()();
        const isConnected = await driveService.testConnection();
        if (isConnected) {
            res.json({ ok: true, message: 'Drive connection successful' });
        } else {
            res.status(500).json({ error: 'Drive connection test returned false' });
        }
    } catch (e: any) {
        console.error('Drive test error:', e.message, e.stack);
        res.status(400).json({ error: e.message || 'Failed to test Drive connection' });
    }
});

// List files in Drive
app.get('/api/drive/files', authMiddleware, async (req, res) => {
    try {
        const driveService = await getDriveService()();
        const folderId = req.query.folderId as string | undefined;
        const files = await driveService.listFiles({
            folderId,
            pageSize: 100,
        });
        res.json(files);
    } catch (e: any) {
        res.status(500).json({ error: 'Drive list failed', details: e.message });
    }
});

// List folders in Drive
app.get('/api/drive/folders', authMiddleware, async (req, res) => {
    try {
        const driveService = await getDriveService()();
        const parentId = req.query.parentId as string | undefined;
        const folders = await driveService.listFolders(parentId);
        res.json(folders);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to list folders', details: e.message });
    }
});

// Get root folder
app.get('/api/drive/root', authMiddleware, async (_req, res) => {
    try {
        const driveService = await getDriveService()();
        const root = await driveService.getRootFolder();
        res.json(root);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to get root folder', details: e.message });
    }
});

// Create folder
app.post('/api/drive/folders', authMiddleware, async (req, res) => {
    const schema = z.object({
        name: z.string(),
        parentId: z.string().optional(),
    });
    try {
        const data = schema.parse(req.body);
        const driveService = await getDriveService()();
        const folder = await driveService.createFolder({
            name: data.name,
            parentId: data.parentId,
        });
        res.json(folder);
    } catch (e: any) {
        res.status(400).json({ error: 'Failed to create folder', details: e.message });
    }
});

// Upload file to Drive
app.post('/api/drive/upload', authMiddleware, async (req, res) => {
    const schema = z.object({
        filePath: z.string(),
        fileName: z.string().optional(),
        folderId: z.string().optional(),
    });
    try {
        const data = schema.parse(req.body);
        
        // Get base path from settings
        const set = await db.select().from(settings).limit(1);
        const cfg = set[0] as any;
        const basePath = cfg.globalLocalBackupPath || path.join(process.env.HOME || '', 'Server-Backups');
        
        // Construct full path
        const fullPath = path.isAbsolute(data.filePath) 
            ? data.filePath 
            : path.join(basePath, data.filePath);
        
        console.log('Uploading file to Drive:', fullPath);
        
        const driveService = await getDriveService()();
        const file = await driveService.uploadFile({
            filePath: fullPath,
            fileName: data.fileName,
            folderId: data.folderId,
        });
        res.json(file);
    } catch (e: any) {
        console.error('Drive upload error:', e.message);
        res.status(400).json({ error: 'Upload failed', details: e.message });
    }
});

// Upload directory to Drive
app.post('/api/drive/upload-directory', authMiddleware, async (req, res) => {
    const schema = z.object({
        dirPath: z.string(),
        folderId: z.string().optional(),
    });
    try {
        const data = schema.parse(req.body);
        
        // Get base path from settings
        const set = await db.select().from(settings).limit(1);
        const cfg = set[0] as any;
        const basePath = cfg.globalLocalBackupPath || path.join(process.env.HOME || '', 'Server-Backups');
        
        // Construct full path
        const fullPath = path.isAbsolute(data.dirPath) 
            ? data.dirPath 
            : path.join(basePath, data.dirPath);
        
        console.log('Uploading directory to Drive:', fullPath);
        
        const driveService = await getDriveService()();
        const uploadedFiles = await driveService.uploadDirectory({
            dirPath: fullPath,
            folderId: data.folderId,
            onProgress: (current, total, fileName) => {
                console.log(`Drive upload progress: ${current}/${total} - ${fileName}`);
            },
        });
        
        res.json({ 
            ok: true, 
            count: uploadedFiles.length,
            files: uploadedFiles 
        });
    } catch (e: any) {
        console.error('Drive directory upload error:', e.message);
        res.status(400).json({ error: 'Upload failed', details: e.message });
    }
});

// Download/Import file or folder from Drive
app.post('/api/drive/import', authMiddleware, async (req, res) => {
    // Set a longer timeout for large file downloads (10 minutes)
    req.setTimeout(600000); // 10 minutes
    res.setTimeout(600000);
    
    const schema = z.object({
        fileId: z.string(),
        targetPath: z.string().optional(),
    });
    try {
        const data = schema.parse(req.body);
        console.log('Starting Drive import for file/folder:', data.fileId);
        
        const set = await db.select().from(settings).limit(1);
        const cfg = set[0] as any;
        const basePath = cfg.globalLocalBackupPath || path.join(process.env.HOME || '', 'Server-Backups');
        const destDir = path.resolve(data.targetPath || basePath);
        
        const driveService = await getDriveService()();
        
        // Get file/folder info first
        const fileInfo = await driveService.getFile(data.fileId);
        console.log('Importing:', fileInfo.name, 'Type:', fileInfo.mimeType, 'Size:', fileInfo.size);
        
        // Check if it's a folder
        if (fileInfo.mimeType === 'application/vnd.google-apps.folder') {
            // Import entire folder
            console.log('Importing folder:', fileInfo.name);
            const folderPath = await driveService.downloadFolder(data.fileId, destDir);
            console.log('Folder import completed:', folderPath);
            res.json({ ok: true, path: folderPath, fileName: fileInfo.name, isFolder: true });
        } else {
            // Import single file
            const downloadedPath = await driveService.downloadFile(data.fileId, destDir);
            console.log('File import completed:', downloadedPath);
            res.json({ ok: true, path: downloadedPath, fileName: fileInfo.name, isFolder: false });
        }
    } catch (e: any) {
        console.error('Drive import error:', e.message, e.stack);
        const errorDetails = e.message || 'Unknown error';
        res.status(400).json({ 
            error: 'Import failed', 
            details: errorDetails,
            message: errorDetails
        });
    }
});

// Delete file from Drive
app.delete('/api/drive/files/:fileId', authMiddleware, async (req, res) => {
    try {
        const driveService = await getDriveService()();
        await driveService.deleteFile(req.params.fileId);
        res.json({ ok: true });
    } catch (e: any) {
        res.status(400).json({ error: 'Delete failed', details: e.message });
    }
});

// Get file info
app.get('/api/drive/files/:fileId', authMiddleware, async (req, res) => {
    try {
        const driveService = await getDriveService()();
        const file = await driveService.getFile(req.params.fileId);
        res.json(file);
    } catch (e: any) {
        res.status(400).json({ error: 'Failed to get file', details: e.message });
    }
});

// List backup files
app.get('/api/backups/list', authMiddleware, async (req, res) => {
    try {
        const relativePath = (req.query.path as string) || '';
        // Prevent directory traversal
        if (relativePath.includes('..')) {
            return res.status(400).json({ error: 'Invalid path' });
        }

        const set = await db.select().from(settings).limit(1);
        const globalPath = set[0]?.globalLocalBackupPath || path.join(process.env.HOME || '', 'Server-Backups');
        const fullPath = path.join(globalPath, relativePath);

        console.log('Listing backups:', { relativePath, globalPath, fullPath });

        // Ensure directory exists
        await fsp.mkdir(fullPath, { recursive: true });

        const entries = await fsp.readdir(fullPath, { withFileTypes: true });
        const files = await Promise.all(entries.map(async (entry) => {
            try {
                const stats = await fsp.stat(path.join(fullPath, entry.name));
                return {
                    name: entry.name,
                    isDirectory: entry.isDirectory(),
                    size: stats.size,
                    date: stats.mtime.toISOString(),
                };
            } catch (statError: any) {
                console.error(`Error getting stats for ${entry.name}:`, statError.message);
                // Return basic info even if stat fails
                return {
                    name: entry.name,
                    isDirectory: entry.isDirectory(),
                    size: 0,
                    date: new Date().toISOString(),
                };
            }
        }));

        // Sort directories first, then files
        files.sort((a, b) => {
            if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
            return a.isDirectory ? -1 : 1;
        });

        res.json({ files, currentPath: relativePath });
    } catch (error: any) {
        console.error('Error listing backups:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to list backup files', details: error.message });
    }
});

// Download backup file
app.get('/api/backups/download', async (req, res) => {
    const token = req.query.token as string;
    if (!token) return res.status(401).send('Unauthorized');

    // Verify token manually since this is a browser navigation
    const s = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
    if (!s.length || new Date((s[0] as any).expiresAt).getTime() < Date.now()) {
        return res.status(401).send('Unauthorized or expired session');
    }

    const relativePath = (req.query.path as string) || '';
    if (relativePath.includes('..')) return res.status(400).send('Invalid path');

    const set = await db.select().from(settings).limit(1);
    const globalPath = set[0]?.globalLocalBackupPath || path.join(process.env.HOME || '', 'Server-Backups');
    const fullPath = path.join(globalPath, relativePath);

    res.download(fullPath, (err) => {
        if (err) {
            console.error('Download error:', err);
            if (!res.headersSent) res.status(404).send('File not found');
        }
    });
});
// Cron Jobs API
app.get('/api/cron-jobs', authMiddleware, async (_req, res) => {
    try {
        const jobs = await db.select().from(cronJobs).all();
        // Join with servers to get server names
        const jobsWithServers = await Promise.all(jobs.map(async (job) => {
            if (job.serverId) {
                const server = await db.select().from(servers).where(eq(servers.id, job.serverId)).get();
                return { ...job, serverName: server?.name || null };
            }
            return { ...job, serverName: null };
        }));
        res.json(jobsWithServers);
    } catch (e: any) {
        console.error('Error fetching cron jobs:', e);
        res.status(500).json({ error: 'Failed to fetch cron jobs', details: e.message });
    }
});

app.post('/api/cron-jobs', authMiddleware, async (req, res) => {
    const schema = z.object({
        name: z.string().min(1),
        serverId: z.number().nullable().optional(),
        scheduleType: z.enum(['daily', 'weekly', 'monthly', 'custom']),
        scheduleTime: z.string().optional(),
        scheduleDay: z.number().optional(),
        schedule: z.string().optional(), // For custom cron expression
        enabled: z.boolean().default(true),
    });

    try {
        const data = schema.parse(req.body);
        
        let cronExpr: string;
        if (data.scheduleType === 'custom') {
            if (!data.schedule) {
                return res.status(400).json({ error: 'Custom schedule requires a cron expression' });
            }
            cronExpr = data.schedule;
            // Validate cron expression
            const cron = await import('node-cron');
            if (!cron.validate(cronExpr)) {
                return res.status(400).json({ error: 'Invalid cron expression' });
            }
        } else {
            // Convert to cron expression
            const time = data.scheduleTime || '02:00';
            const [hours, minutes] = time.split(':').map(Number);
            
            switch (data.scheduleType) {
                case 'daily':
                    cronExpr = `${minutes} ${hours} * * *`;
                    break;
                case 'weekly':
                    const dayOfWeek = data.scheduleDay !== undefined ? data.scheduleDay : 0;
                    cronExpr = `${minutes} ${hours} * * ${dayOfWeek}`;
                    break;
                case 'monthly':
                    const dayOfMonth = data.scheduleDay !== undefined ? data.scheduleDay : 1;
                    cronExpr = `${minutes} ${hours} ${dayOfMonth} * *`;
                    break;
                default:
                    return res.status(400).json({ error: 'Invalid schedule type' });
            }
        }

        const nextRun = new Date();
        nextRun.setMinutes(nextRun.getMinutes() + 1);

        const result = await db.insert(cronJobs).values({
            name: data.name,
            serverId: data.serverId || null,
            scheduleType: data.scheduleType,
            scheduleTime: data.scheduleTime || null,
            scheduleDay: data.scheduleDay || null,
            schedule: cronExpr,
            enabled: data.enabled,
            nextRun: nextRun.toISOString(),
        }).returning();

        const job = result[0];
        
        // Schedule the job if enabled
        if (job.enabled) {
            await cronScheduler.scheduleJob(job.id);
        }

        res.json(job);
    } catch (e: any) {
        console.error('Error creating cron job:', e);
        res.status(400).json({ error: 'Failed to create cron job', details: e.message });
    }
});

app.put('/api/cron-jobs/:id', authMiddleware, async (req, res) => {
    const schema = z.object({
        name: z.string().min(1).optional(),
        serverId: z.number().nullable().optional(),
        scheduleType: z.enum(['daily', 'weekly', 'monthly', 'custom']).optional(),
        scheduleTime: z.string().optional(),
        scheduleDay: z.number().optional(),
        schedule: z.string().optional(),
        enabled: z.boolean().optional(),
    });

    try {
        const jobId = parseInt(req.params.id);
        const data = schema.parse(req.body);
        
        const existingJob = await db.select().from(cronJobs).where(eq(cronJobs.id, jobId)).get();
        if (!existingJob) {
            return res.status(404).json({ error: 'Cron job not found' });
        }

        let cronExpr = existingJob.schedule;
        
        if (data.scheduleType !== undefined || data.scheduleTime !== undefined || data.scheduleDay !== undefined || data.schedule !== undefined) {
            const scheduleType = data.scheduleType || existingJob.scheduleType;
            
            if (scheduleType === 'custom') {
                if (data.schedule) {
                    cronExpr = data.schedule;
                    const cron = await import('node-cron');
                    if (!cron.validate(cronExpr)) {
                        return res.status(400).json({ error: 'Invalid cron expression' });
                    }
                }
            } else {
                const time = data.scheduleTime || existingJob.scheduleTime || '02:00';
                const [hours, minutes] = time.split(':').map(Number);
                
                switch (scheduleType) {
                    case 'daily':
                        cronExpr = `${minutes} ${hours} * * *`;
                        break;
                    case 'weekly':
                        const dayOfWeek = data.scheduleDay !== undefined ? data.scheduleDay : (existingJob.scheduleDay || 0);
                        cronExpr = `${minutes} ${hours} * * ${dayOfWeek}`;
                        break;
                    case 'monthly':
                        const dayOfMonth = data.scheduleDay !== undefined ? data.scheduleDay : (existingJob.scheduleDay || 1);
                        cronExpr = `${minutes} ${hours} ${dayOfMonth} * *`;
                        break;
                }
            }
        }

        const nextRun = new Date();
        nextRun.setMinutes(nextRun.getMinutes() + 1);

        const result = await db.update(cronJobs)
            .set({
                ...data,
                schedule: cronExpr,
                nextRun: nextRun.toISOString(),
            })
            .where(eq(cronJobs.id, jobId))
            .returning();

        const job = result[0];
        
        // Reschedule the job
        cronScheduler.stopJob(jobId);
        if (job.enabled) {
            await cronScheduler.scheduleJob(jobId);
        }

        res.json(job);
    } catch (e: any) {
        console.error('Error updating cron job:', e);
        res.status(400).json({ error: 'Failed to update cron job', details: e.message });
    }
});

app.delete('/api/cron-jobs/:id', authMiddleware, async (req, res) => {
    try {
        const jobId = parseInt(req.params.id);
        
        const job = await db.select().from(cronJobs).where(eq(cronJobs.id, jobId)).get();
        if (!job) {
            return res.status(404).json({ error: 'Cron job not found' });
        }

        cronScheduler.stopJob(jobId);
        await db.delete(cronJobs).where(eq(cronJobs.id, jobId));

        res.json({ ok: true });
    } catch (e: any) {
        console.error('Error deleting cron job:', e);
        res.status(400).json({ error: 'Failed to delete cron job', details: e.message });
    }
});

// Run cron job immediately
app.post('/api/cron-jobs/:id/run-now', authMiddleware, async (req, res) => {
    try {
        const jobId = parseInt(req.params.id);
        const job = await db.select().from(cronJobs).where(eq(cronJobs.id, jobId)).get();
        if (!job) return res.status(404).json({ error: 'Cron job not found' });

        await cronScheduler.runNow(jobId);
        res.json({ ok: true });
    } catch (e: any) {
        console.error('Error running cron job now:', e);
        res.status(400).json({ error: 'Failed to run cron job', details: e.message });
    }
});

// IP Whitelist Management API
app.get('/api/ip-whitelist/status', authMiddleware, async (_req, res) => {
    try {
        const settingsRows = await db.select().from(settings).limit(1);
        const config = settingsRows[0] as any;
        const enabled = !!config?.ipWhitelistEnabled;
        
        const entries = await db.select().from(ipWhitelist).all();
        const singleIps = entries.filter(e => e.type === 'single').length;
        const cidrRanges = entries.filter(e => e.type === 'cidr').length;
        
        res.json({
            enabled,
            total: entries.length,
            singleIps,
            cidrRanges,
        });
    } catch (e: any) {
        console.error('Error getting IP whitelist status:', e);
        res.status(500).json({ error: 'Failed to get IP whitelist status', details: e.message });
    }
});

app.get('/api/ip-whitelist/current-ip', authMiddleware, (req, res) => {
    try {
        const clientIp = getClientIp(req);
        res.json({ ip: clientIp });
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to get current IP', details: e.message });
    }
});

app.get('/api/ip-whitelist', authMiddleware, async (_req, res) => {
    try {
        const entries = await db.select().from(ipWhitelist).orderBy(ipWhitelist.createdAt).all();
        res.json(entries);
    } catch (e: any) {
        console.error('Error fetching IP whitelist:', e);
        res.status(500).json({ error: 'Failed to fetch IP whitelist', details: e.message });
    }
});

app.post('/api/ip-whitelist', authMiddleware, async (req, res) => {
    const schema = z.object({
        ipAddress: z.string().min(1),
        description: z.string().optional(),
    });
    
    try {
        const data = schema.parse(req.body);
        const validation = validateIpOrCidr(data.ipAddress);
        
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error || 'Invalid IP address or CIDR range' });
        }
        
        // Check if already exists
        const existing = await db.select().from(ipWhitelist).where(eq(ipWhitelist.ipAddress, data.ipAddress)).get();
        if (existing) {
            return res.status(409).json({ error: 'IP address or CIDR range already exists in whitelist' });
        }
        
        const result = await db.insert(ipWhitelist).values({
            ipAddress: data.ipAddress,
            type: validation.type!,
            description: data.description || null,
        }).returning();
        
        res.json(result[0]);
    } catch (e: any) {
        console.error('Error adding IP to whitelist:', e);
        res.status(400).json({ error: 'Failed to add IP to whitelist', details: e.message });
    }
});

app.delete('/api/ip-whitelist/:id', authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const entry = await db.select().from(ipWhitelist).where(eq(ipWhitelist.id, id)).get();
        
        if (!entry) {
            return res.status(404).json({ error: 'IP whitelist entry not found' });
        }
        
        await db.delete(ipWhitelist).where(eq(ipWhitelist.id, id));
        res.json({ ok: true });
    } catch (e: any) {
        console.error('Error deleting IP from whitelist:', e);
        res.status(400).json({ error: 'Failed to delete IP from whitelist', details: e.message });
    }
});

app.put('/api/ip-whitelist/enable', authMiddleware, async (req, res) => {
    const schema = z.object({
        enabled: z.boolean(),
    });
    
    try {
        const data = schema.parse(req.body);
        const settingsRows = await db.select().from(settings).limit(1);
        const config = settingsRows[0] as any;
        
        if (!config) {
            // Create settings if doesn't exist
            await db.insert(settings).values({ ipWhitelistEnabled: data.enabled });
        } else {
            await db.update(settings).set({ ipWhitelistEnabled: data.enabled }).where(eq(settings.id, config.id));
        }
        
        res.json({ enabled: data.enabled });
    } catch (e: any) {
        console.error('Error updating IP whitelist status:', e);
        res.status(400).json({ error: 'Failed to update IP whitelist status', details: e.message });
    }
});

// Login IP Whitelist endpoints
// This endpoint is public (no auth) so the login page can check if it should be shown
app.get('/api/login-ip-whitelist/check', async (req, res) => {
    try {
        const clientIp = getClientIp(req);
        const settingsRows = await db.select().from(settings).limit(1);
        const config = settingsRows[0] as any;
        const enabled = !!config?.loginIpWhitelistEnabled;
        
        if (!enabled) {
            return res.json({ allowed: true, enabled: false });
        }
        
        const allowed = await isLoginIpWhitelisted(clientIp);
        res.json({ allowed, enabled: true, ip: clientIp });
    } catch (e: any) {
        console.error('Error checking login IP whitelist:', e);
        // On error, allow access (fail open)
        res.json({ allowed: true, enabled: false, error: e.message });
    }
});

app.get('/api/login-ip-whitelist/status', authMiddleware, async (_req, res) => {
    try {
        const settingsRows = await db.select().from(settings).limit(1);
        const config = settingsRows[0] as any;
        const enabled = !!config?.loginIpWhitelistEnabled;
        
        res.json({ enabled });
    } catch (e: any) {
        console.error('Error fetching login IP whitelist status:', e);
        res.status(500).json({ error: 'Failed to get login IP whitelist status', details: e.message });
    }
});

app.get('/api/login-ip-whitelist/current-ip', authMiddleware, (req, res) => {
    try {
        const clientIp = getClientIp(req);
        res.json({ ip: clientIp });
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to get current IP', details: e.message });
    }
});

app.get('/api/login-ip-whitelist', authMiddleware, async (_req, res) => {
    try {
        const entries = await db.select().from(loginIpWhitelist).orderBy(loginIpWhitelist.createdAt).all();
        res.json(entries);
    } catch (e: any) {
        console.error('Error fetching login IP whitelist:', e);
        res.status(500).json({ error: 'Failed to fetch login IP whitelist', details: e.message });
    }
});

app.post('/api/login-ip-whitelist', authMiddleware, async (req, res) => {
    const schema = z.object({
        ipAddress: z.string().min(1),
        description: z.string().optional(),
    });
    
    try {
        const data = schema.parse(req.body);
        const validation = validateIpOrCidr(data.ipAddress);
        
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }
        
        // Check if IP already exists
        const existing = await db.select()
            .from(loginIpWhitelist)
            .where(eq(loginIpWhitelist.ipAddress, data.ipAddress))
            .get();
        
        if (existing) {
            return res.status(409).json({ error: 'IP address already in whitelist' });
        }
        
        const entry = await db.insert(loginIpWhitelist).values({
            ipAddress: data.ipAddress,
            type: validation.type!,
            description: data.description || null,
        }).returning();
        
        res.json(entry[0]);
    } catch (e: any) {
        console.error('Error adding IP to login whitelist:', e);
        res.status(400).json({ error: 'Failed to add IP to login whitelist', details: e.message });
    }
});

app.delete('/api/login-ip-whitelist/:id', authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const entry = await db.select().from(loginIpWhitelist).where(eq(loginIpWhitelist.id, id)).get();
        
        if (!entry) {
            return res.status(404).json({ error: 'Login IP whitelist entry not found' });
        }
        
        await db.delete(loginIpWhitelist).where(eq(loginIpWhitelist.id, id));
        res.json({ ok: true });
    } catch (e: any) {
        console.error('Error deleting IP from login whitelist:', e);
        res.status(400).json({ error: 'Failed to delete IP from login whitelist', details: e.message });
    }
});

app.put('/api/login-ip-whitelist/enable', authMiddleware, async (req, res) => {
    const schema = z.object({
        enabled: z.boolean(),
    });
    
    try {
        const data = schema.parse(req.body);
        const settingsRows = await db.select().from(settings).limit(1);
        const config = settingsRows[0] as any;
        
        if (!config) {
            // Create settings if doesn't exist
            await db.insert(settings).values({ loginIpWhitelistEnabled: data.enabled });
        } else {
            await db.update(settings).set({ loginIpWhitelistEnabled: data.enabled }).where(eq(settings.id, config.id));
        }
        
        res.json({ enabled: data.enabled });
    } catch (e: any) {
        console.error('Error enabling/disabling login IP whitelist:', e);
        res.status(400).json({ error: 'Failed to update login IP whitelist status', details: e.message });
    }
});

// Autostart Management
app.get('/api/autostart/status', authMiddleware, async (_req, res) => {
    try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        // Check if service file exists
        const serviceFile = '/etc/systemd/system/backup-system.service';
        const fs = await import('fs');
        const serviceInstalled = fs.existsSync(serviceFile);
        
        let serviceEnabled = false;
        let serviceActive = false;
        
        if (serviceInstalled) {
            try {
                // Check if service is enabled
                const { stdout: enabledOutput } = await execAsync('systemctl is-enabled backup-system 2>/dev/null || echo "disabled"');
                serviceEnabled = enabledOutput.trim() === 'enabled';
                
                // Check if service is active
                const { stdout: activeOutput } = await execAsync('systemctl is-active backup-system 2>/dev/null || echo "inactive"');
                serviceActive = activeOutput.trim() === 'active';
            } catch (e) {
                // Service might not be accessible
            }
        }
        
        // Get autostart setting from database
        const settingsRows = await db.select().from(settings).limit(1);
        const config = settingsRows[0] as any;
        const autostartEnabled = config?.autostartEnabled || false;
        
        res.json({
            installed: serviceInstalled,
            enabled: serviceEnabled,
            active: serviceActive,
            autostartEnabled: autostartEnabled,
        });
    } catch (e: any) {
        console.error('Error checking autostart status:', e);
        res.status(500).json({ error: 'Failed to check autostart status', details: e.message });
    }
});

app.post('/api/autostart/install', authMiddleware, async (_req, res) => {
    try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        const path = await import('path');
        
        const scriptPath = path.join(process.cwd(), 'manage-autostart.sh');
        
        // Check if script exists
        const fs = await import('fs');
        if (!fs.existsSync(scriptPath)) {
            return res.status(404).json({ error: 'Autostart management script not found' });
        }
        
        // Try to install (requires sudo)
        try {
            await execAsync(`sudo ${scriptPath} install`);
            res.json({ success: true, message: 'Service installed successfully. You may need to enable it separately.' });
        } catch (e: any) {
            res.status(400).json({ 
                error: 'Failed to install service', 
                details: e.message,
                note: 'Installation requires sudo privileges. You may need to run: sudo ./manage-autostart.sh install'
            });
        }
    } catch (e: any) {
        console.error('Error installing autostart service:', e);
        res.status(500).json({ error: 'Failed to install autostart service', details: e.message });
    }
});

app.post('/api/autostart/enable', authMiddleware, async (_req, res) => {
    try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        const path = await import('path');
        
        const scriptPath = path.join(process.cwd(), 'manage-autostart.sh');
        
        // Update database setting
        const settingsRows = await db.select().from(settings).limit(1);
        const config = settingsRows[0] as any;
        
        if (!config) {
            await db.insert(settings).values({ autostartEnabled: true });
        } else {
            await db.update(settings).set({ autostartEnabled: true }).where(eq(settings.id, config.id));
        }
        
        // Try to enable systemd service (requires sudo)
        try {
            await execAsync(`sudo ${scriptPath} enable`);
            res.json({ success: true, message: 'Autostart enabled successfully' });
        } catch (e: any) {
            // Database setting is saved, but systemd might need manual intervention
            res.json({ 
                success: true, 
                message: 'Autostart setting saved, but systemd service may need manual enable',
                warning: 'You may need to run: sudo systemctl enable backup-system'
            });
        }
    } catch (e: any) {
        console.error('Error enabling autostart:', e);
        res.status(500).json({ error: 'Failed to enable autostart', details: e.message });
    }
});

app.post('/api/autostart/disable', authMiddleware, async (_req, res) => {
    try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        const path = await import('path');
        
        const scriptPath = path.join(process.cwd(), 'manage-autostart.sh');
        
        // Update database setting
        const settingsRows = await db.select().from(settings).limit(1);
        const config = settingsRows[0] as any;
        
        if (!config) {
            await db.insert(settings).values({ autostartEnabled: false });
        } else {
            await db.update(settings).set({ autostartEnabled: false }).where(eq(settings.id, config.id));
        }
        
        // Try to disable systemd service (requires sudo)
        try {
            await execAsync(`sudo ${scriptPath} disable`);
            res.json({ success: true, message: 'Autostart disabled successfully' });
        } catch (e: any) {
            // Database setting is saved, but systemd might need manual intervention
            res.json({ 
                success: true, 
                message: 'Autostart setting saved, but systemd service may need manual disable',
                warning: 'You may need to run: sudo systemctl disable backup-system'
            });
        }
    } catch (e: any) {
        console.error('Error disabling autostart:', e);
        res.status(500).json({ error: 'Failed to disable autostart', details: e.message });
    }
});

app.get('/health', async (_req, res) => {
    try {
        // Test database connection
        await db.select().from(users).limit(1);
        res.type('application/json');
        res.send(JSON.stringify({ ok: true, time: new Date().toISOString(), db: 'connected' }));
    } catch (error: any) {
        console.error('Health check failed:', error);
        res.status(500).type('application/json');
        res.send(JSON.stringify({ ok: false, error: 'Database connection failed', time: new Date().toISOString() }));
    }
});

// Serve frontend in production - MUST be after all API routes
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client')));
    app.get('*', (_req, res) => {
        res.sendFile(path.join(__dirname, '../client/index.html'));
    });
}
