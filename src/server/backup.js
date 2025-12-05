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
exports.BackupManager = void 0;
var ssh2_1 = require("ssh2");
var fs_1 = require("fs");
var child_process_1 = require("child_process");
var path_1 = require("path");
var db_1 = require("./db");
var schema_1 = require("./db/schema");
var drizzle_orm_1 = require("drizzle-orm");
var BackupManager = /** @class */ (function () {
    function BackupManager(config, logId) {
        this.config = config;
        this.logId = logId;
    }
    BackupManager.prototype.log = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var currentLog, newLogs;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log("[Backup ".concat(this.logId, "] ").concat(message));
                        return [4 /*yield*/, db_1.db.select().from(schema_1.backupLogs).where((0, drizzle_orm_1.eq)(schema_1.backupLogs.id, this.logId))];
                    case 1:
                        currentLog = _b.sent();
                        newLogs = (((_a = currentLog[0]) === null || _a === void 0 ? void 0 : _a.logs) || '') + "".concat(new Date().toISOString(), ": ").concat(message, "\n");
                        return [4 /*yield*/, db_1.db.update(schema_1.backupLogs).set({ logs: newLogs }).where((0, drizzle_orm_1.eq)(schema_1.backupLogs.id, this.logId))];
                    case 2:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    BackupManager.prototype.executeRemote = function (command) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var conn = new ssh2_1.Client();
                        conn.on('ready', function () {
                            conn.exec(command, function (err, stream) {
                                if (err) {
                                    conn.end();
                                    return reject(err);
                                }
                                stream.on('close', function (code, signal) {
                                    conn.end();
                                    if (code !== 0) {
                                        reject(new Error("Command failed with code ".concat(code)));
                                    }
                                    else {
                                        resolve();
                                    }
                                }).on('data', function (data) {
                                    _this.log("STDOUT: ".concat(data));
                                }).stderr.on('data', function (data) {
                                    _this.log("STDERR: ".concat(data));
                                });
                            });
                        }).on('error', function (err) {
                            reject(err);
                        }).connect(__assign({ host: _this.config.host, port: _this.config.port, username: _this.config.username }, (_this.config.password
                            ? { password: _this.config.password }
                            : { privateKey: _this.config.privateKeyPath ? fs_1.default.readFileSync(_this.config.privateKeyPath) : undefined })));
                    })];
            });
        });
    };
    BackupManager.prototype.executeLocal = function (command) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        (0, child_process_1.exec)(command, function (error, stdout, stderr) {
                            if (error) {
                                _this.log("Local Error: ".concat(error.message));
                                return reject(error);
                            }
                            if (stdout)
                                _this.log("Local STDOUT: ".concat(stdout));
                            if (stderr)
                                _this.log("Local STDERR: ".concat(stderr));
                            resolve();
                        });
                    })];
            });
        });
    };
    BackupManager.prototype.transferViaSFTP = function (remoteDir, localDir) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.log("Starting SFTP transfer from ".concat(remoteDir, " to ").concat(localDir))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                var conn = new ssh2_1.Client();
                                conn.on('ready', function () {
                                    _this.log('SFTP Connection ready');
                                    conn.sftp(function (err, sftp) {
                                        if (err) {
                                            conn.end();
                                            _this.log("SFTP session error: ".concat(err.message));
                                            return reject(err);
                                        }
                                        sftp.readdir(remoteDir, function (err2, list) {
                                            if (err2) {
                                                conn.end();
                                                _this.log("SFTP readdir error: ".concat(err2.message));
                                                return reject(err2);
                                            }
                                            var files = list.filter(function (e) {
                                                var mode = e.attrs && typeof e.attrs.mode === 'number' ? e.attrs.mode : 0;
                                                var isDir = (mode & 61440) === 16384;
                                                return !isDir;
                                            }).map(function (e) { return e.filename; });
                                            _this.log("Found ".concat(files.length, " files to transfer via SFTP"));
                                            var run = function () { return __awaiter(_this, void 0, void 0, function () {
                                                var _loop_1, this_1, _i, files_1, f;
                                                var _this = this;
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0:
                                                            _loop_1 = function (f) {
                                                                return __generator(this, function (_b) {
                                                                    switch (_b.label) {
                                                                        case 0: return [4 /*yield*/, this_1.log("SFTP downloading: ".concat(f))];
                                                                        case 1:
                                                                            _b.sent();
                                                                            return [4 /*yield*/, new Promise(function (res, rej) {
                                                                                    sftp.fastGet("".concat(remoteDir, "/").concat(f), path_1.default.join(localDir, f), function (e3) {
                                                                                        if (e3) {
                                                                                            _this.log("SFTP failed to download ".concat(f, ": ").concat(e3.message));
                                                                                            rej(e3);
                                                                                        }
                                                                                        else {
                                                                                            res();
                                                                                        }
                                                                                    });
                                                                                })];
                                                                        case 2:
                                                                            _b.sent();
                                                                            return [2 /*return*/];
                                                                    }
                                                                });
                                                            };
                                                            this_1 = this;
                                                            _i = 0, files_1 = files;
                                                            _a.label = 1;
                                                        case 1:
                                                            if (!(_i < files_1.length)) return [3 /*break*/, 4];
                                                            f = files_1[_i];
                                                            return [5 /*yield**/, _loop_1(f)];
                                                        case 2:
                                                            _a.sent();
                                                            _a.label = 3;
                                                        case 3:
                                                            _i++;
                                                            return [3 /*break*/, 1];
                                                        case 4:
                                                            conn.end();
                                                            this.log('SFTP transfer completed successfully');
                                                            resolve();
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            }); };
                                            run().catch(function (e) {
                                                conn.end();
                                                _this.log("SFTP transfer loop error: ".concat(e.message));
                                                reject(e);
                                            });
                                        });
                                    });
                                }).on('error', function (err) {
                                    _this.log("SFTP Connection error: ".concat(err.message));
                                    reject(err);
                                }).connect(__assign({ host: _this.config.host, port: _this.config.port, username: _this.config.username }, (_this.config.password
                                    ? { password: _this.config.password }
                                    : { privateKey: _this.config.privateKeyPath ? fs_1.default.readFileSync(_this.config.privateKeyPath) : undefined })));
                            })];
                }
            });
        });
    };
    BackupManager.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var safeName, datePart, dirName, remoteTmpDir, expandTilde, basePath, _a, fallback, localBackupDir, prefix, commonExcludes, _i, _b, p, name_1, creds, _c, _d, dbName, cmd, creds, e_1, rsh, pw, parts, rsyncCmd, e_2, error_1;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        safeName = (this.config.serverName || "".concat(this.config.username, "@").concat(this.config.host))
                            .replace(/\s+/g, '_')
                            .replace(/[^a-zA-Z0-9_\-\.]/g, '');
                        datePart = new Date().toISOString().split('T')[0];
                        dirName = "backup_".concat(datePart, "_").concat(safeName);
                        remoteTmpDir = "/tmp/".concat(dirName);
                        expandTilde = function (p) {
                            if (!p)
                                return p;
                            if (p.startsWith('~')) {
                                var h = process.env.HOME || '';
                                return path_1.default.join(h, p.slice(1));
                            }
                            return p;
                        };
                        basePath = expandTilde(this.config.localBackupPath || path_1.default.join(process.env.HOME || '', 'Server-Backups')) || '';
                        if (!this.config.localBackupPath) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.log("Using server-specific local backup path: ".concat(this.config.localBackupPath))];
                    case 1:
                        _e.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.log("Using default/global local backup path: ".concat(basePath))];
                    case 3:
                        _e.sent();
                        _e.label = 4;
                    case 4:
                        basePath = path_1.default.resolve(basePath);
                        _e.label = 5;
                    case 5:
                        _e.trys.push([5, 8, , 11]);
                        return [4 /*yield*/, fs_1.default.promises.mkdir(basePath, { recursive: true })];
                    case 6:
                        _e.sent();
                        return [4 /*yield*/, fs_1.default.promises.access(basePath, fs_1.default.constants.W_OK)];
                    case 7:
                        _e.sent();
                        return [3 /*break*/, 11];
                    case 8:
                        _a = _e.sent();
                        fallback = path_1.default.join(process.env.HOME || '', 'Server-Backups');
                        return [4 /*yield*/, this.log("Local backup path ".concat(basePath, " not writable, using fallback: ").concat(fallback))];
                    case 9:
                        _e.sent();
                        return [4 /*yield*/, fs_1.default.promises.mkdir(fallback, { recursive: true })];
                    case 10:
                        _e.sent();
                        basePath = fallback;
                        return [3 /*break*/, 11];
                    case 11:
                        localBackupDir = path_1.default.join(basePath, dirName);
                        prefix = "".concat(safeName, "_");
                        _e.label = 12;
                    case 12:
                        _e.trys.push([12, 70, , 73]);
                        return [4 /*yield*/, db_1.db.update(schema_1.backupLogs).set({ status: 'running' }).where((0, drizzle_orm_1.eq)(schema_1.backupLogs.id, this.logId))];
                    case 13:
                        _e.sent();
                        return [4 /*yield*/, this.log('Starting backup process...')];
                    case 14:
                        _e.sent();
                        // 1. Create remote directory
                        return [4 /*yield*/, this.log("Creating remote directory: ".concat(remoteTmpDir))];
                    case 15:
                        // 1. Create remote directory
                        _e.sent();
                        return [4 /*yield*/, this.executeRemote("mkdir -p ".concat(remoteTmpDir))];
                    case 16:
                        _e.sent();
                        commonExcludes = "--ignore-failed-read --warning=no-file-changed --exclude=.git --exclude=node_modules --exclude=.cache --exclude=cache --exclude=tmp --exclude=*.tmp --exclude=*.log";
                        if (!this.config.backupWww) return [3 /*break*/, 19];
                        return [4 /*yield*/, this.log('Compressing /var/www...')];
                    case 17:
                        _e.sent();
                        return [4 /*yield*/, this.executeRemote("tar $(command -v pigz >/dev/null 2>&1 && echo '-I pigz -cf' || echo '-czf') ".concat(remoteTmpDir, "/").concat(prefix, "www_bak.tar.gz ").concat(commonExcludes, " /var/www"))];
                    case 18:
                        _e.sent();
                        return [3 /*break*/, 21];
                    case 19: return [4 /*yield*/, this.log('Skipping /var/www backup')];
                    case 20:
                        _e.sent();
                        _e.label = 21;
                    case 21:
                        if (!this.config.backupLogs) return [3 /*break*/, 24];
                        return [4 /*yield*/, this.log('Compressing /var/log...')];
                    case 22:
                        _e.sent();
                        return [4 /*yield*/, this.executeRemote("tar $(command -v pigz >/dev/null 2>&1 && echo '-I pigz -cf' || echo '-czf') ".concat(remoteTmpDir, "/").concat(prefix, "logs_bak.tar.gz ").concat(commonExcludes, " /var/log"))];
                    case 23:
                        _e.sent();
                        return [3 /*break*/, 26];
                    case 24: return [4 /*yield*/, this.log('Skipping /var/log backup')];
                    case 25:
                        _e.sent();
                        _e.label = 26;
                    case 26:
                        if (!this.config.backupNginx) return [3 /*break*/, 29];
                        return [4 /*yield*/, this.log('Compressing /etc/nginx...')];
                    case 27:
                        _e.sent();
                        return [4 /*yield*/, this.executeRemote("tar $(command -v pigz >/dev/null 2>&1 && echo '-I pigz -cf' || echo '-czf') ".concat(remoteTmpDir, "/").concat(prefix, "nginx_bak.tar.gz ").concat(commonExcludes, " /etc/nginx"))];
                    case 28:
                        _e.sent();
                        return [3 /*break*/, 31];
                    case 29: return [4 /*yield*/, this.log('Skipping /etc/nginx backup')];
                    case 30:
                        _e.sent();
                        _e.label = 31;
                    case 31:
                        if (!(this.config.backupPaths && this.config.backupPaths.length > 0)) return [3 /*break*/, 36];
                        _i = 0, _b = this.config.backupPaths;
                        _e.label = 32;
                    case 32:
                        if (!(_i < _b.length)) return [3 /*break*/, 36];
                        p = _b[_i];
                        name_1 = p.replace(/\/+$/, '').replace(/\//g, '_').replace(/[^a-zA-Z0-9_\-\.]/g, '');
                        return [4 /*yield*/, this.log("Compressing ".concat(p, "..."))];
                    case 33:
                        _e.sent();
                        return [4 /*yield*/, this.executeRemote("tar $(command -v pigz >/dev/null 2>&1 && echo '-I pigz -cf' || echo '-czf') ".concat(remoteTmpDir, "/").concat(prefix, "custom_").concat(name_1, ".tar.gz ").concat(commonExcludes, " ").concat(p))];
                    case 34:
                        _e.sent();
                        _e.label = 35;
                    case 35:
                        _i++;
                        return [3 /*break*/, 32];
                    case 36:
                        if (!this.config.backupDb) return [3 /*break*/, 55];
                        _e.label = 37;
                    case 37:
                        _e.trys.push([37, 52, , 54]);
                        if (!(this.config.dbSelected && this.config.dbSelected.length > 0 && this.config.dbUser)) return [3 /*break*/, 46];
                        return [4 /*yield*/, this.log("Dumping selected databases: ".concat(this.config.dbSelected.join(', ')))];
                    case 38:
                        _e.sent();
                        creds = "--protocol=tcp --host ".concat(this.config.dbHost || 'localhost', " ").concat(this.config.dbPort ? "--port=".concat(this.config.dbPort) : '', " --user ").concat(this.config.dbUser, " ").concat(this.config.dbPassword ? "--password=".concat(this.config.dbPassword) : '--password');
                        return [4 /*yield*/, this.log("DEBUG: dbSelected array: ".concat(JSON.stringify(this.config.dbSelected)))];
                    case 39:
                        _e.sent();
                        _c = 0, _d = this.config.dbSelected;
                        _e.label = 40;
                    case 40:
                        if (!(_c < _d.length)) return [3 /*break*/, 45];
                        dbName = _d[_c];
                        return [4 /*yield*/, this.log("Dumping database: ".concat(dbName))];
                    case 41:
                        _e.sent();
                        cmd = "mysqldump ".concat(creds, " --databases ").concat(dbName, " > ").concat(remoteTmpDir, "/").concat(prefix, "db-").concat(dbName, ".sql");
                        return [4 /*yield*/, this.log("DEBUG: Executing mysqldump for ".concat(dbName))];
                    case 42:
                        _e.sent();
                        return [4 /*yield*/, this.executeRemote(cmd)];
                    case 43:
                        _e.sent();
                        _e.label = 44;
                    case 44:
                        _c++;
                        return [3 /*break*/, 40];
                    case 45: return [3 /*break*/, 51];
                    case 46:
                        if (!this.config.dbUser) return [3 /*break*/, 49];
                        return [4 /*yield*/, this.log('Dumping all databases...')];
                    case 47:
                        _e.sent();
                        creds = "--protocol=tcp --host ".concat(this.config.dbHost || 'localhost', " ").concat(this.config.dbPort ? "--port=".concat(this.config.dbPort) : '', " --user ").concat(this.config.dbUser, " ").concat(this.config.dbPassword ? "--password=".concat(this.config.dbPassword) : '--password');
                        return [4 /*yield*/, this.executeRemote("mysqldump ".concat(creds, " --all-databases > ").concat(remoteTmpDir, "/").concat(prefix, "db-dump-all.sql"))];
                    case 48:
                        _e.sent();
                        return [3 /*break*/, 51];
                    case 49: return [4 /*yield*/, this.log('Skipping database backup: missing dbUser')];
                    case 50:
                        _e.sent();
                        _e.label = 51;
                    case 51: return [3 /*break*/, 54];
                    case 52:
                        e_1 = _e.sent();
                        return [4 /*yield*/, this.log('Database dump failed, continuing')];
                    case 53:
                        _e.sent();
                        return [3 /*break*/, 54];
                    case 54: return [3 /*break*/, 57];
                    case 55: return [4 /*yield*/, this.log('Skipping database backup')];
                    case 56:
                        _e.sent();
                        _e.label = 57;
                    case 57: 
                    // 4. Rsync to local
                    return [4 /*yield*/, this.log("Rsyncing to local: ".concat(localBackupDir))];
                    case 58:
                        // 4. Rsync to local
                        _e.sent();
                        return [4 /*yield*/, fs_1.default.promises.mkdir(localBackupDir, { recursive: true })];
                    case 59:
                        _e.sent();
                        rsh = void 0;
                        if (!this.config.privateKeyPath && this.config.password) {
                            pw = (this.config.password || '').replace(/'/g, "'\"'\"'");
                            rsh = "sshpass -p '".concat(pw, "' ssh -o StrictHostKeyChecking=no -o PreferredAuthentications=password -p ").concat(this.config.port);
                        }
                        else {
                            parts = [];
                            parts.push("ssh");
                            parts.push("-p ".concat(this.config.port));
                            if (this.config.privateKeyPath) {
                                parts.push("-i ".concat(this.config.privateKeyPath));
                            }
                            parts.push("-o StrictHostKeyChecking=no");
                            rsh = parts.join(' ');
                        }
                        rsyncCmd = "rsync -az --partial -e \"".concat(rsh, "\" ").concat(this.config.username, "@").concat(this.config.host, ":").concat(remoteTmpDir, "/ ").concat(localBackupDir, "/");
                        _e.label = 60;
                    case 60:
                        _e.trys.push([60, 62, , 65]);
                        return [4 /*yield*/, this.executeLocal(rsyncCmd)];
                    case 61:
                        _e.sent();
                        return [3 /*break*/, 65];
                    case 62:
                        e_2 = _e.sent();
                        return [4 /*yield*/, this.log('Rsync failed, falling back to SFTP')];
                    case 63:
                        _e.sent();
                        return [4 /*yield*/, this.transferViaSFTP(remoteTmpDir, localBackupDir)];
                    case 64:
                        _e.sent();
                        return [3 /*break*/, 65];
                    case 65: 
                    // 5. Clean up remote
                    return [4 /*yield*/, this.log('Cleaning up remote files...')];
                    case 66:
                        // 5. Clean up remote
                        _e.sent();
                        return [4 /*yield*/, this.executeRemote("rm -rf ".concat(remoteTmpDir))];
                    case 67:
                        _e.sent();
                        return [4 /*yield*/, this.log('Backup completed successfully.')];
                    case 68:
                        _e.sent();
                        return [4 /*yield*/, db_1.db.update(schema_1.backupLogs).set({ status: 'success' }).where((0, drizzle_orm_1.eq)(schema_1.backupLogs.id, this.logId))];
                    case 69:
                        _e.sent();
                        return [3 /*break*/, 73];
                    case 70:
                        error_1 = _e.sent();
                        return [4 /*yield*/, this.log("Backup failed: ".concat(error_1.message))];
                    case 71:
                        _e.sent();
                        return [4 /*yield*/, db_1.db.update(schema_1.backupLogs).set({ status: 'failed' }).where((0, drizzle_orm_1.eq)(schema_1.backupLogs.id, this.logId))];
                    case 72:
                        _e.sent();
                        throw error_1;
                    case 73: return [2 /*return*/];
                }
            });
        });
    };
    return BackupManager;
}());
exports.BackupManager = BackupManager;
