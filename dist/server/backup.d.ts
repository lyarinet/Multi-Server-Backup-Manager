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
export declare class BackupManager {
    private config;
    private logId;
    constructor(config: BackupConfig, logId: number);
    log(message: string): Promise<void>;
    executeRemote(command: string): Promise<void>;
    executeLocal(command: string): Promise<void>;
    transferViaSFTP(remoteDir: string, localDir: string): Promise<void>;
    run(): Promise<void>;
}
export {};
//# sourceMappingURL=backup.d.ts.map