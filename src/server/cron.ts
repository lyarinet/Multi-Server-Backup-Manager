import cron from 'node-cron';
import { db } from './db';
import { cronJobs, servers, settings } from './db/schema';
import { eq } from 'drizzle-orm';
import { BackupManager } from './backup';
import { backupLogs } from './db/schema';

interface CronJobTask {
    id: number;
    task: cron.ScheduledTask;
}

class CronScheduler {
    private jobs: Map<number, CronJobTask> = new Map();

    /**
     * Convert schedule type to cron expression
     */
    private scheduleToCron(
        scheduleType: string,
        scheduleTime?: string,
        scheduleDay?: number
    ): string {
        if (!scheduleTime) {
            scheduleTime = '02:00'; // Default to 2 AM
        }

        const [hours, minutes] = scheduleTime.split(':').map(Number);

        switch (scheduleType) {
            case 'daily':
                // Run daily at specified time
                return `${minutes} ${hours} * * *`;

            case 'weekly':
                // Run weekly on specified day at specified time
                // scheduleDay: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
                const dayOfWeek = scheduleDay !== undefined ? scheduleDay : 0;
                return `${minutes} ${hours} * * ${dayOfWeek}`;

            case 'monthly':
                // Run monthly on specified day at specified time
                const dayOfMonth = scheduleDay !== undefined ? scheduleDay : 1;
                return `${minutes} ${hours} ${dayOfMonth} * *`;

            case 'custom':
                // Return the custom cron expression (stored in schedule field)
                // This will be validated separately
                return '';

            default:
                throw new Error(`Unknown schedule type: ${scheduleType}`);
        }
    }

    /**
     * Validate cron expression
     */
    private validateCronExpression(cronExpr: string): boolean {
        // Basic validation: 5 fields (minute hour day month dayOfWeek)
        const parts = cronExpr.trim().split(/\s+/);
        if (parts.length !== 5) {
            return false;
        }
        return cron.validate(cronExpr);
    }

    /**
     * Calculate next run time from cron expression
     */
    private calculateNextRun(cronExpr: string): Date {
        // Simple calculation: get next occurrence
        // For more accurate calculation, we could use a library like 'cron-parser'
        const now = new Date();
        const nextRun = new Date(now);
        nextRun.setMinutes(nextRun.getMinutes() + 1); // At least 1 minute in the future
        return nextRun;
    }

    /**
     * Execute a backup job
     */
    private async executeBackup(jobId: number, serverId: number | null) {
        try {
            console.log(`[Cron] Executing backup job ${jobId} for server ${serverId || 'all'}`);

            if (serverId === null) {
                // Global job - backup all servers
                const allServers = await db.select().from(servers).all();
                for (const server of allServers) {
                    await this.runBackupForServer(server.id);
                }
            } else {
                // Specific server backup
                await this.runBackupForServer(serverId);
            }

            // Update last run time
            const now = new Date().toISOString();
            await db.update(cronJobs)
                .set({ lastRun: now })
                .where(eq(cronJobs.id, jobId));

            console.log(`[Cron] Backup job ${jobId} completed successfully`);
        } catch (error: any) {
            console.error(`[Cron] Error executing backup job ${jobId}:`, error.message);
        }
    }

    /**
     * Run backup for a specific server
     */
    private async runBackupForServer(serverId: number) {
        const server = await db.select().from(servers).where(eq(servers.id, serverId)).get();
        if (!server) {
            console.error(`[Cron] Server ${serverId} not found`);
            return;
        }

        const appSettings = await db.select().from(settings).limit(1);
        const globalLocalBackupPath = appSettings[0]?.globalLocalBackupPath;

        const log = await db.insert(backupLogs).values({
            serverId,
            status: 'pending',
            logs: 'Scheduled backup initiated...',
        }).returning();

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
    }

    /**
     * Load and schedule all enabled cron jobs from database
     */
    async loadJobs() {
        console.log('[Cron] Loading cron jobs from database...');
        
        // Stop all existing jobs
        this.stopAll();

        const jobs = await db.select().from(cronJobs).where(eq(cronJobs.enabled, true));
        
        for (const job of jobs) {
            try {
                await this.scheduleJob(job.id);
            } catch (error: any) {
                console.error(`[Cron] Failed to schedule job ${job.id}:`, error.message);
            }
        }

        console.log(`[Cron] Loaded ${jobs.length} cron job(s)`);
    }

    /**
     * Schedule a single job
     */
    async scheduleJob(jobId: number) {
        const job = await db.select().from(cronJobs).where(eq(cronJobs.id, jobId)).get();
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }

        if (!job.enabled) {
            console.log(`[Cron] Job ${jobId} is disabled, skipping`);
            return;
        }

        // Stop existing job if any
        this.stopJob(jobId);

        let cronExpr: string;
        
        if (job.scheduleType === 'custom') {
            // Use custom cron expression
            cronExpr = job.schedule;
            if (!this.validateCronExpression(cronExpr)) {
                throw new Error(`Invalid cron expression: ${cronExpr}`);
            }
        } else {
            // Convert schedule type to cron expression
            cronExpr = this.scheduleToCron(
                job.scheduleType,
                job.scheduleTime || undefined,
                job.scheduleDay || undefined
            );
        }

        // Create cron task
        const task = cron.schedule(cronExpr, async () => {
            await this.executeBackup(job.id, job.serverId || null);
        }, {
            scheduled: true,
            timezone: 'UTC', // You can make this configurable
        });

        this.jobs.set(job.id, { id: job.id, task });

        // Update next run time
        const nextRun = this.calculateNextRun(cronExpr);
        await db.update(cronJobs)
            .set({ nextRun: nextRun.toISOString(), schedule: cronExpr })
            .where(eq(cronJobs.id, job.id));

        console.log(`[Cron] Scheduled job ${job.id} (${job.name}) with expression: ${cronExpr}`);
    }

    /**
     * Stop a specific job
     */
    stopJob(jobId: number) {
        const jobTask = this.jobs.get(jobId);
        if (jobTask) {
            jobTask.task.stop();
            this.jobs.delete(jobId);
            console.log(`[Cron] Stopped job ${jobId}`);
        }
    }

    /**
     * Stop all jobs
     */
    stopAll() {
        for (const [jobId, jobTask] of this.jobs) {
            jobTask.task.stop();
        }
        this.jobs.clear();
        console.log('[Cron] Stopped all jobs');
    }

    /**
     * Get all active jobs
     */
    getActiveJobs(): number[] {
        return Array.from(this.jobs.keys());
    }
}

// Singleton instance
export const cronScheduler = new CronScheduler();

