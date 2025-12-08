"use strict";
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
exports.cronScheduler = void 0;
var node_cron_1 = require("node-cron");
var db_1 = require("./db");
var schema_1 = require("./db/schema");
var drizzle_orm_1 = require("drizzle-orm");
var backup_1 = require("./backup");
var schema_2 = require("./db/schema");
var CronScheduler = /** @class */ (function () {
    function CronScheduler() {
        this.jobs = new Map();
    }
    /**
     * Convert schedule type to cron expression
     */
    CronScheduler.prototype.scheduleToCron = function (scheduleType, scheduleTime, scheduleDay) {
        if (!scheduleTime) {
            scheduleTime = '02:00'; // Default to 2 AM
        }
        var _a = scheduleTime.split(':').map(Number), hours = _a[0], minutes = _a[1];
        switch (scheduleType) {
            case 'daily':
                // Run daily at specified time
                return "".concat(minutes, " ").concat(hours, " * * *");
            case 'weekly':
                // Run weekly on specified day at specified time
                // scheduleDay: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
                var dayOfWeek = scheduleDay !== undefined ? scheduleDay : 0;
                return "".concat(minutes, " ").concat(hours, " * * ").concat(dayOfWeek);
            case 'monthly':
                // Run monthly on specified day at specified time
                var dayOfMonth = scheduleDay !== undefined ? scheduleDay : 1;
                return "".concat(minutes, " ").concat(hours, " ").concat(dayOfMonth, " * *");
            case 'custom':
                // Return the custom cron expression (stored in schedule field)
                // This will be validated separately
                return '';
            default:
                throw new Error("Unknown schedule type: ".concat(scheduleType));
        }
    };
    /**
     * Validate cron expression
     */
    CronScheduler.prototype.validateCronExpression = function (cronExpr) {
        // Basic validation: 5 fields (minute hour day month dayOfWeek)
        var parts = cronExpr.trim().split(/\s+/);
        if (parts.length !== 5) {
            return false;
        }
        return node_cron_1.default.validate(cronExpr);
    };
    /**
     * Calculate next run time from cron expression
     */
    CronScheduler.prototype.calculateNextRun = function (cronExpr) {
        // Simple calculation: get next occurrence
        // For more accurate calculation, we could use a library like 'cron-parser'
        var now = new Date();
        var nextRun = new Date(now);
        nextRun.setMinutes(nextRun.getMinutes() + 1); // At least 1 minute in the future
        return nextRun;
    };
    /**
     * Execute a backup job
     */
    CronScheduler.prototype.executeBackup = function (jobId, serverId) {
        return __awaiter(this, void 0, void 0, function () {
            var allServers, _i, allServers_1, server, now, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 10, , 11]);
                        console.log("[Cron] Executing backup job ".concat(jobId, " for server ").concat(serverId || 'all'));
                        if (!(serverId === null)) return [3 /*break*/, 6];
                        return [4 /*yield*/, db_1.db.select().from(schema_1.servers).all()];
                    case 1:
                        allServers = _a.sent();
                        _i = 0, allServers_1 = allServers;
                        _a.label = 2;
                    case 2:
                        if (!(_i < allServers_1.length)) return [3 /*break*/, 5];
                        server = allServers_1[_i];
                        return [4 /*yield*/, this.runBackupForServer(server.id)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 8];
                    case 6: 
                    // Specific server backup
                    return [4 /*yield*/, this.runBackupForServer(serverId)];
                    case 7:
                        // Specific server backup
                        _a.sent();
                        _a.label = 8;
                    case 8:
                        now = new Date().toISOString();
                        return [4 /*yield*/, db_1.db.update(schema_1.cronJobs)
                                .set({ lastRun: now })
                                .where((0, drizzle_orm_1.eq)(schema_1.cronJobs.id, jobId))];
                    case 9:
                        _a.sent();
                        console.log("[Cron] Backup job ".concat(jobId, " completed successfully"));
                        return [3 /*break*/, 11];
                    case 10:
                        error_1 = _a.sent();
                        console.error("[Cron] Error executing backup job ".concat(jobId, ":"), error_1.message);
                        return [3 /*break*/, 11];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Run backup for a specific server
     */
    CronScheduler.prototype.runBackupForServer = function (serverId) {
        return __awaiter(this, void 0, void 0, function () {
            var server, appSettings, globalLocalBackupPath, log, backupManager;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.servers).where((0, drizzle_orm_1.eq)(schema_1.servers.id, serverId)).get()];
                    case 1:
                        server = _b.sent();
                        if (!server) {
                            console.error("[Cron] Server ".concat(serverId, " not found"));
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, db_1.db.select().from(schema_1.settings).limit(1)];
                    case 2:
                        appSettings = _b.sent();
                        globalLocalBackupPath = (_a = appSettings[0]) === null || _a === void 0 ? void 0 : _a.globalLocalBackupPath;
                        return [4 /*yield*/, db_1.db.insert(schema_2.backupLogs).values({
                                serverId: serverId,
                                status: 'pending',
                                logs: 'Scheduled backup initiated...',
                            }).returning()];
                    case 3:
                        log = _b.sent();
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
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Load and schedule all enabled cron jobs from database
     */
    CronScheduler.prototype.loadJobs = function () {
        return __awaiter(this, void 0, void 0, function () {
            var jobs, _i, jobs_1, job, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[Cron] Loading cron jobs from database...');
                        // Stop all existing jobs
                        this.stopAll();
                        return [4 /*yield*/, db_1.db.select().from(schema_1.cronJobs).where((0, drizzle_orm_1.eq)(schema_1.cronJobs.enabled, true))];
                    case 1:
                        jobs = _a.sent();
                        _i = 0, jobs_1 = jobs;
                        _a.label = 2;
                    case 2:
                        if (!(_i < jobs_1.length)) return [3 /*break*/, 7];
                        job = jobs_1[_i];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, this.scheduleJob(job.id)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        error_2 = _a.sent();
                        console.error("[Cron] Failed to schedule job ".concat(job.id, ":"), error_2.message);
                        return [3 /*break*/, 6];
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7:
                        console.log("[Cron] Loaded ".concat(jobs.length, " cron job(s)"));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Schedule a single job
     */
    CronScheduler.prototype.scheduleJob = function (jobId) {
        return __awaiter(this, void 0, void 0, function () {
            var job, cronExpr, task, nextRun;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.cronJobs).where((0, drizzle_orm_1.eq)(schema_1.cronJobs.id, jobId)).get()];
                    case 1:
                        job = _a.sent();
                        if (!job) {
                            throw new Error("Job ".concat(jobId, " not found"));
                        }
                        if (!job.enabled) {
                            console.log("[Cron] Job ".concat(jobId, " is disabled, skipping"));
                            return [2 /*return*/];
                        }
                        // Stop existing job if any
                        this.stopJob(jobId);
                        if (job.scheduleType === 'custom') {
                            // Use custom cron expression
                            cronExpr = job.schedule;
                            if (!this.validateCronExpression(cronExpr)) {
                                throw new Error("Invalid cron expression: ".concat(cronExpr));
                            }
                        }
                        else {
                            // Convert schedule type to cron expression
                            cronExpr = this.scheduleToCron(job.scheduleType, job.scheduleTime || undefined, job.scheduleDay || undefined);
                        }
                        task = node_cron_1.default.schedule(cronExpr, function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.executeBackup(job.id, job.serverId || null)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }, {
                            scheduled: true,
                            timezone: 'UTC', // You can make this configurable
                        });
                        this.jobs.set(job.id, { id: job.id, task: task });
                        nextRun = this.calculateNextRun(cronExpr);
                        return [4 /*yield*/, db_1.db.update(schema_1.cronJobs)
                                .set({ nextRun: nextRun.toISOString(), schedule: cronExpr })
                                .where((0, drizzle_orm_1.eq)(schema_1.cronJobs.id, job.id))];
                    case 2:
                        _a.sent();
                        console.log("[Cron] Scheduled job ".concat(job.id, " (").concat(job.name, ") with expression: ").concat(cronExpr));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Stop a specific job
     */
    CronScheduler.prototype.stopJob = function (jobId) {
        var jobTask = this.jobs.get(jobId);
        if (jobTask) {
            jobTask.task.stop();
            this.jobs.delete(jobId);
            console.log("[Cron] Stopped job ".concat(jobId));
        }
    };
    /**
     * Stop all jobs
     */
    CronScheduler.prototype.stopAll = function () {
        for (var _i = 0, _a = this.jobs; _i < _a.length; _i++) {
            var _b = _a[_i], jobId = _b[0], jobTask = _b[1];
            jobTask.task.stop();
        }
        this.jobs.clear();
        console.log('[Cron] Stopped all jobs');
    };
    /**
     * Get all active jobs
     */
    CronScheduler.prototype.getActiveJobs = function () {
        return Array.from(this.jobs.keys());
    };
    return CronScheduler;
}());
// Singleton instance
exports.cronScheduler = new CronScheduler();
