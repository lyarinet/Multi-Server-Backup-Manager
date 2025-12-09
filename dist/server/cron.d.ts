declare class CronScheduler {
    private jobs;
    private getTimezone;
    /**
     * Convert schedule type to cron expression
     */
    private scheduleToCron;
    /**
     * Validate cron expression
     */
    private validateCronExpression;
    /**
     * Calculate next run time from cron expression
     */
    private calculateNextRun;
    /**
     * Execute a backup job
     */
    private executeBackup;
    /**
     * Run backup for a specific server
     */
    private runBackupForServer;
    /**
     * Load and schedule all enabled cron jobs from database
     */
    loadJobs(): Promise<void>;
    /**
     * Schedule a single job
     */
    scheduleJob(jobId: number): Promise<void>;
    runNow(jobId: number): Promise<void>;
    /**
     * Stop a specific job
     */
    stopJob(jobId: number): void;
    /**
     * Stop all jobs
     */
    stopAll(): void;
    /**
     * Get all active jobs
     */
    getActiveJobs(): number[];
}
export declare const cronScheduler: CronScheduler;
export {};
//# sourceMappingURL=cron.d.ts.map