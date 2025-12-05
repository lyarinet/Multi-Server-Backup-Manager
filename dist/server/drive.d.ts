export interface DriveConfig {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
}
export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    modifiedTime?: string;
    parents?: string[];
    webViewLink?: string;
}
export interface DriveFolder {
    id: string;
    name: string;
    parents?: string[];
}
export declare class GoogleDriveService {
    private oauth2Client;
    private drive;
    constructor(config: DriveConfig);
    /**
     * Get authenticated Drive client
     */
    private ensureAuth;
    /**
     * List files in Google Drive
     */
    listFiles(options?: {
        folderId?: string;
        pageSize?: number;
        query?: string;
        fields?: string;
    }): Promise<DriveFile[]>;
    /**
     * Get file metadata
     */
    getFile(fileId: string): Promise<DriveFile>;
    /**
     * Upload a file to Google Drive
     */
    uploadFile(options: {
        filePath: string;
        fileName?: string;
        folderId?: string;
        mimeType?: string;
        onProgress?: (bytesUploaded: number, totalBytes: number) => void;
    }): Promise<DriveFile>;
    /**
     * Upload large files using resumable upload
     */
    private uploadLargeFile;
    /**
     * Upload a directory (recursively upload all files)
     */
    uploadDirectory(options: {
        dirPath: string;
        folderId?: string;
        onProgress?: (current: number, total: number, fileName: string) => void;
    }): Promise<(DriveFile | DriveFolder)[]>;
    /**
     * Get all files in a directory recursively
     */
    private getAllFilesInDirectory;
    /**
     * Create a folder in Google Drive
     */
    createFolder(options: {
        name: string;
        parentId?: string;
    }): Promise<DriveFolder>;
    /**
     * Find or create a folder by name
     */
    findOrCreateFolder(options: {
        name: string;
        parentId?: string;
    }): Promise<DriveFolder>;
    /**
     * Download a file from Google Drive
     */
    downloadFile(fileId: string, destinationPath: string): Promise<string>;
    /**
     * Download an entire folder from Google Drive (recursively)
     */
    downloadFolder(folderId: string, destinationPath: string): Promise<string>;
    /**
     * Delete a file from Google Drive
     */
    deleteFile(fileId: string): Promise<void>;
    /**
     * Get folder structure (list folders)
     */
    listFolders(parentId?: string): Promise<DriveFolder[]>;
    /**
     * Get root folder ID (My Drive)
     */
    getRootFolder(): Promise<DriveFolder>;
    /**
     * Check if Drive is properly configured and accessible
     */
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=drive.d.ts.map