export interface Server {
    id: number;
    name: string;
    ip: string;
    user: string;
    port: number;
    sshKeyPath: string;
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
    createdAt: string;
}

export interface BackupLog {
    id: number;
    serverId: number;
    status: 'pending' | 'running' | 'success' | 'failed';
    logs: string;
    createdAt: string;
}

export interface CreateServerDto {
    name: string;
    ip: string;
    user: string;
    port: number;
    sshKeyPath: string;
    password?: string;
    localBackupPath?: string;
    backupPaths?: string[];
    dbUser?: string;
    dbPassword?: string;
    dbHost?: string;
    dbPort?: number;
    dbSelected?: string[];
    backupWww?: boolean;
    backupLogs?: boolean;
    backupNginx?: boolean;
    backupDb?: boolean;
}
