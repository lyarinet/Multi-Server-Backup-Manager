import { Client } from 'ssh2';
import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';
import { db } from './db';
import { backupLogs } from './db/schema';
import { eq } from 'drizzle-orm';

interface BackupConfig {
    host: string;
    port: number;
    username: string;
    privateKeyPath?: string;
    password?: string;
    localBackupPath?: string;
    backupPaths?: string[];
    dbUser?: string;
    dbPassword?: string;
    dbHost?: string;
    dbPort?: number;
    dbSelected?: string[];
    backupWww: boolean;
    backupLogs: boolean;
    backupNginx: boolean;
    backupDb: boolean;
    serverName?: string;
}

export class BackupManager {
    private config: BackupConfig;
    private logId: number;

    constructor(config: BackupConfig, logId: number) {
        this.config = config;
        this.logId = logId;
    }

    async log(message: string): Promise<void> {
        console.log(`[Backup ${this.logId}] ${message}`);
        const currentLog = await db.select().from(backupLogs).where(eq(backupLogs.id, this.logId));
        const newLogs = (currentLog[0]?.logs || '') + `${new Date().toISOString()}: ${message}\n`;
        await db.update(backupLogs).set({ logs: newLogs }).where(eq(backupLogs.id, this.logId));
    }

    async executeRemote(command: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const conn = new Client();
            conn.on('ready', () => {
                conn.exec(command, (err, stream) => {
                    if (err) {
                        conn.end();
                        return reject(err);
                    }
                    stream.on('close', (code, signal) => {
                        conn.end();
                        if (code !== 0) {
                            reject(new Error(`Command failed with code ${code}`));
                        } else {
                            resolve();
                        }
                    }).on('data', (data) => {
                        this.log(`STDOUT: ${data}`);
                    }).stderr.on('data', (data) => {
                        this.log(`STDERR: ${data}`);
                    });
                });
            }).on('error', (err) => {
                reject(err);
            }).connect({
                host: this.config.host,
                port: this.config.port,
                username: this.config.username,
                // Prefer password authentication if password is provided, otherwise use private key
                ...(this.config.password 
                    ? { password: this.config.password } 
                    : { privateKey: this.config.privateKeyPath ? fs.readFileSync(this.config.privateKeyPath) : undefined }
                ),
            });
        });
    }

    async executeLocal(command: string): Promise<void> {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    this.log(`Local Error: ${error.message}`);
                    return reject(error);
                }
                if (stdout) this.log(`Local STDOUT: ${stdout}`);
                if (stderr) this.log(`Local STDERR: ${stderr}`);
                resolve();
            });
        });
    }

    async transferViaSFTP(remoteDir: string, localDir: string): Promise<void> {
        await this.log(`Starting SFTP transfer from ${remoteDir} to ${localDir}`);
        return new Promise((resolve, reject) => {
            const conn = new Client();
            conn.on('ready', () => {
                this.log('SFTP Connection ready');
                conn.sftp((err, sftp) => {
                    if (err) {
                        conn.end();
                        this.log(`SFTP session error: ${err.message}`);
                        return reject(err);
                    }
                    sftp.readdir(remoteDir, (err2, list) => {
                        if (err2) {
                            conn.end();
                            this.log(`SFTP readdir error: ${err2.message}`);
                            return reject(err2);
                        }
                        const files = list.filter((e: any) => {
                            const mode = e.attrs && typeof e.attrs.mode === 'number' ? e.attrs.mode : 0;
                            const isDir = (mode & 0o170000) === 0o040000;
                            return !isDir;
                        }).map((e: any) => e.filename);
                        this.log(`Found ${files.length} files to transfer via SFTP`);
                        const run = async () => {
                            for (const f of files) {
                                await this.log(`SFTP downloading: ${f}`);
                                await new Promise<void>((res, rej) => {
                                    sftp.fastGet(`${remoteDir}/${f}`, path.join(localDir, f), (e3) => {
                                        if (e3) {
                                            this.log(`SFTP failed to download ${f}: ${e3.message}`);
                                            rej(e3);
                                        } else {
                                            res();
                                        }
                                    });
                                });
                            }
                            conn.end();
                            this.log('SFTP transfer completed successfully');
                            resolve();
                        };
                        run().catch((e) => {
                            conn.end();
                            this.log(`SFTP transfer loop error: ${e.message}`);
                            reject(e);
                        });
                    });
                });
            }).on('error', (err) => {
                this.log(`SFTP Connection error: ${err.message}`);
                reject(err);
            }).connect({
                host: this.config.host,
                port: this.config.port,
                username: this.config.username,
                ...(this.config.password 
                    ? { password: this.config.password } 
                    : { privateKey: this.config.privateKeyPath ? fs.readFileSync(this.config.privateKeyPath) : undefined }
                ),
            });
        });
    }

    async run(): Promise<void> {
        const safeName = (this.config.serverName || `${this.config.username}@${this.config.host}`)
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_\-\.]/g, '');
        const datePart = new Date().toISOString().split('T')[0];
        const dirName = `backup_${datePart}_${safeName}`;
        const remoteTmpDir = `/tmp/${dirName}`;

        const expandTilde = (p?: string): string | undefined => {
            if (!p) return p;
            if (p.startsWith('~')) {
                const h = process.env.HOME || '';
                return path.join(h, p.slice(1));
            }
            return p;
        };

        let basePath = expandTilde(this.config.localBackupPath || path.join(process.env.HOME || '', 'Server-Backups')) || '';
        if (this.config.localBackupPath) {
            await this.log(`Using server-specific local backup path: ${this.config.localBackupPath}`);
        } else {
            await this.log(`Using default/global local backup path: ${basePath}`);
        }
        basePath = path.resolve(basePath);

        try {
            await fs.promises.mkdir(basePath, { recursive: true });
            await fs.promises.access(basePath, fs.constants.W_OK);
        } catch {
            const fallback = path.join(process.env.HOME || '', 'Server-Backups');
            await this.log(`Local backup path ${basePath} not writable, using fallback: ${fallback}`);
            await fs.promises.mkdir(fallback, { recursive: true });
            basePath = fallback;
        }

        const localBackupDir = path.join(basePath, dirName);
        const prefix = `${safeName}_`;

        try {
            await db.update(backupLogs).set({ status: 'running' }).where(eq(backupLogs.id, this.logId));
            await this.log('Starting backup process...');

            // 1. Create remote directory
            await this.log(`Creating remote directory: ${remoteTmpDir}`);
            await this.executeRemote(`mkdir -p ${remoteTmpDir}`);

            // 2. Compress directories based on config
            const commonExcludes = `--ignore-failed-read --warning=no-file-changed --exclude=.git --exclude=node_modules --exclude=.cache --exclude=cache --exclude=tmp --exclude=*.tmp --exclude=*.log`;
            
            if (this.config.backupWww) {
                await this.log('Compressing /var/www...');
                await this.executeRemote(`tar $(command -v pigz >/dev/null 2>&1 && echo '-I pigz -cf' || echo '-czf') ${remoteTmpDir}/${prefix}www_bak.tar.gz ${commonExcludes} /var/www`);
            } else {
                await this.log('Skipping /var/www backup');
            }

            if (this.config.backupLogs) {
                await this.log('Compressing /var/log...');
                await this.executeRemote(`tar $(command -v pigz >/dev/null 2>&1 && echo '-I pigz -cf' || echo '-czf') ${remoteTmpDir}/${prefix}logs_bak.tar.gz ${commonExcludes} /var/log`);
            } else {
                await this.log('Skipping /var/log backup');
            }

            if (this.config.backupNginx) {
                await this.log('Compressing /etc/nginx...');
                await this.executeRemote(`tar $(command -v pigz >/dev/null 2>&1 && echo '-I pigz -cf' || echo '-czf') ${remoteTmpDir}/${prefix}nginx_bak.tar.gz ${commonExcludes} /etc/nginx`);
            } else {
                await this.log('Skipping /etc/nginx backup');
            }

            if (this.config.backupPaths && this.config.backupPaths.length > 0) {
                for (const p of this.config.backupPaths) {
                    const name = p.replace(/\/+$/, '').replace(/\//g, '_').replace(/[^a-zA-Z0-9_\-\.]/g, '');
                    await this.log(`Compressing ${p}...`);
                    await this.executeRemote(`tar $(command -v pigz >/dev/null 2>&1 && echo '-I pigz -cf' || echo '-czf') ${remoteTmpDir}/${prefix}custom_${name}.tar.gz ${commonExcludes} ${p}`);
                }
            }

            if (this.config.backupDb) {
                try {
                    if (this.config.dbSelected && this.config.dbSelected.length > 0 && this.config.dbUser) {
                        await this.log(`Dumping selected databases: ${this.config.dbSelected.join(', ')}`);
                        const creds = `--protocol=tcp --host ${this.config.dbHost || 'localhost'} ${this.config.dbPort ? `--port=${this.config.dbPort}` : ''} --user ${this.config.dbUser} ${this.config.dbPassword ? `--password=${this.config.dbPassword}` : '--password'}`;
                        await this.log(`DEBUG: dbSelected array: ${JSON.stringify(this.config.dbSelected)}`);
                        for (const dbName of this.config.dbSelected) {
                            await this.log(`Dumping database: ${dbName}`);
                            const cmd = `mysqldump ${creds} --databases ${dbName} > ${remoteTmpDir}/${prefix}db-${dbName}.sql`;
                            await this.log(`DEBUG: Executing mysqldump for ${dbName}`);
                            await this.executeRemote(cmd);
                        }
                    } else if (this.config.dbUser) {
                        await this.log('Dumping all databases...');
                        const creds = `--protocol=tcp --host ${this.config.dbHost || 'localhost'} ${this.config.dbPort ? `--port=${this.config.dbPort}` : ''} --user ${this.config.dbUser} ${this.config.dbPassword ? `--password=${this.config.dbPassword}` : '--password'}`;
                        await this.executeRemote(`mysqldump ${creds} --all-databases > ${remoteTmpDir}/${prefix}db-dump-all.sql`);
                    } else {
                        await this.log('Skipping database backup: missing dbUser');
                    }
                } catch (e: any) {
                    await this.log('Database dump failed, continuing');
                }
            } else {
                await this.log('Skipping database backup');
            }

            // 4. Rsync to local
            await this.log(`Rsyncing to local: ${localBackupDir}`);
            await fs.promises.mkdir(localBackupDir, { recursive: true });

            // Note: Using system rsync as it's more robust for file transfer than implementing via ssh2 streams manually
            let rsh: string;
            if (!this.config.privateKeyPath && this.config.password) {
                const pw = (this.config.password || '').replace(/'/g, `'"'"'`);
                rsh = `sshpass -p '${pw}' ssh -o StrictHostKeyChecking=no -o PreferredAuthentications=password -p ${this.config.port}`;
            } else {
                const parts: string[] = [];
                parts.push(`ssh`);
                parts.push(`-p ${this.config.port}`);
                if (this.config.privateKeyPath) {
                    parts.push(`-i ${this.config.privateKeyPath}`);
                }
                parts.push(`-o StrictHostKeyChecking=no`);
                rsh = parts.join(' ');
            }

            const rsyncCmd = `rsync -az --partial -e "${rsh}" ${this.config.username}@${this.config.host}:${remoteTmpDir}/ ${localBackupDir}/`;
            try {
                await this.executeLocal(rsyncCmd);
            } catch (e) {
                await this.log('Rsync failed, falling back to SFTP');
                await this.transferViaSFTP(remoteTmpDir, localBackupDir);
            }

            // 5. Clean up remote
            await this.log('Cleaning up remote files...');
            await this.executeRemote(`rm -rf ${remoteTmpDir}`);
            await this.log('Backup completed successfully.');
            await db.update(backupLogs).set({ status: 'success' }).where(eq(backupLogs.id, this.logId));
        } catch (error: any) {
            await this.log(`Backup failed: ${error.message}`);
            await db.update(backupLogs).set({ status: 'failed' }).where(eq(backupLogs.id, this.logId));
            throw error;
        }
    }
}

