import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { promises as fsp } from 'fs';
import path from 'path';
import { createReadStream, statSync } from 'fs';

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

export class GoogleDriveService {
    private oauth2Client: OAuth2Client;
    private drive: ReturnType<typeof google.drive>;

    constructor(config: DriveConfig) {
        this.oauth2Client = new google.auth.OAuth2(
            config.clientId,
            config.clientSecret
        );
        
        // Trim and validate refresh token
        const refreshToken = config.refreshToken?.trim();
        if (!refreshToken) {
            throw new Error('Refresh token is required');
        }
        
        console.log('Initializing Drive service with refresh token length:', refreshToken.length);
        
        this.oauth2Client.setCredentials({
            refresh_token: refreshToken,
        });
        this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    }

    /**
     * Get authenticated Drive client
     */
    private async ensureAuth() {
        try {
            const token = await this.oauth2Client.getAccessToken();
            if (!token.token) {
                throw new Error('Failed to get access token');
            }
            console.log('Drive authentication successful');
        } catch (error: any) {
            console.error('Drive authentication error:', error.message, error.code, error.response?.data);
            
            // Check for various invalid token error codes and messages
            const isInvalidToken = 
                error.code === 401 || 
                error.code === 400 ||
                error.message?.includes('invalid_grant') ||
                error.message?.includes('invalid_token') ||
                error.message?.includes('Token has been expired or revoked') ||
                error.response?.data?.error === 'invalid_grant' ||
                error.response?.data?.error === 'invalid_token';
            
            if (isInvalidToken) {
                throw new Error('Invalid refresh token. Please regenerate it using the OAuth flow by clicking "Get via OAuth" button.');
            }
            throw new Error(`Drive authentication failed: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * List files in Google Drive
     */
    async listFiles(options: {
        folderId?: string;
        pageSize?: number;
        query?: string;
        fields?: string;
    } = {}): Promise<DriveFile[]> {
        await this.ensureAuth();

        const {
            folderId,
            pageSize = 100,
            query: customQuery,
            fields = 'files(id,name,mimeType,size,modifiedTime,parents,webViewLink)',
        } = options;

        let query = customQuery || '';
        if (folderId) {
            query = query
                ? `${query} and '${folderId}' in parents`
                : `'${folderId}' in parents`;
        }
        
        // Always exclude trashed files
        query = query
            ? `${query} and trashed=false`
            : 'trashed=false';

        try {
            const response = await this.drive.files.list({
                q: query || undefined,
                pageSize,
                fields,
                orderBy: 'modifiedTime desc',
            });

            return (response.data.files || []) as DriveFile[];
        } catch (error: any) {
            throw new Error(`Failed to list Drive files: ${error.message}`);
        }
    }

    /**
     * Get file metadata
     */
    async getFile(fileId: string): Promise<DriveFile> {
        await this.ensureAuth();

        try {
            const response = await this.drive.files.get({
                fileId,
                fields: 'id,name,mimeType,size,modifiedTime,parents,webViewLink',
            });

            if (!response.data) {
                throw new Error(`File not found or inaccessible: ${fileId}`);
            }

            return response.data as DriveFile;
        } catch (error: any) {
            console.error('Get file error:', error.message, error.code);
            if (error.code === 404) {
                throw new Error(`File not found: ${fileId}. Please check the file ID is correct.`);
            } else if (error.code === 403) {
                throw new Error(`Access denied to file: ${fileId}. Please check file permissions.`);
            }
            throw new Error(`Failed to get file metadata: ${error.message}`);
        }
    }

    /**
     * Upload a file to Google Drive
     */
    async uploadFile(options: {
        filePath: string;
        fileName?: string;
        folderId?: string;
        mimeType?: string;
        onProgress?: (bytesUploaded: number, totalBytes: number) => void;
    }): Promise<DriveFile> {
        await this.ensureAuth();

        const { filePath, fileName, folderId, mimeType, onProgress } = options;

        const stats = statSync(filePath);
        const fileSize = stats.size;
        const finalFileName = fileName || path.basename(filePath);

        const fileMetadata: any = {
            name: finalFileName,
        };

        if (folderId) {
            fileMetadata.parents = [folderId];
        }

        const media = {
            mimeType: mimeType || 'application/octet-stream',
            body: createReadStream(filePath),
        };

        try {
            // For large files, use resumable upload
            if (fileSize > 5 * 1024 * 1024) {
                // Files larger than 5MB
                return await this.uploadLargeFile(
                    fileMetadata,
                    media,
                    fileSize,
                    onProgress
                );
            } else {
                // Small files - simple upload
                const response = await this.drive.files.create({
                    requestBody: fileMetadata,
                    media,
                    fields: 'id,name,mimeType,size,modifiedTime,parents,webViewLink',
                });

                return response.data as DriveFile;
            }
        } catch (error: any) {
            throw new Error(`Failed to upload file: ${error.message}`);
        }
    }

    /**
     * Upload large files using resumable upload
     */
    private async uploadLargeFile(
        fileMetadata: any,
        media: any,
        fileSize: number,
        onProgress?: (bytesUploaded: number, totalBytes: number) => void
    ): Promise<DriveFile> {
        // For now, use simple upload even for large files
        // In production, you'd implement resumable upload here
        const response = await this.drive.files.create({
            requestBody: fileMetadata,
            media,
            fields: 'id,name,mimeType,size,modifiedTime,parents,webViewLink',
        });

        if (onProgress) {
            onProgress(fileSize, fileSize);
        }

        return response.data as DriveFile;
    }

    /**
     * Upload a directory (recursively upload all files)
     */
    async uploadDirectory(options: {
        dirPath: string;
        folderId?: string;
        onProgress?: (current: number, total: number, fileName: string) => void;
    }): Promise<(DriveFile | DriveFolder)[]> {
        await this.ensureAuth();

        const { dirPath, folderId, onProgress } = options;

        const uploadedFiles: (DriveFile | DriveFolder)[] = [];
        const files = await this.getAllFilesInDirectory(dirPath);
        if (files.length === 0) {
            // Upload a small marker file so the folder shows as updated even if empty
            const markerPath = path.join(dirPath, '.drive-upload-marker.txt');
            try {
                await fsp.writeFile(markerPath, `Uploaded on ${new Date().toISOString()}`);
                const markerUploaded = await this.uploadFile({
                    filePath: markerPath,
                    fileName: 'README.txt',
                    folderId: folderId || undefined,
                });
                uploadedFiles.push(markerUploaded);
            } catch (e) {
                // ignore marker errors
            }
        }
        const totalFiles = files.length;

        // Create a folder in Drive for this directory
        const dirName = path.basename(dirPath);
        const driveFolder = await this.createFolder({
            name: dirName,
            parentId: folderId,
        });

        uploadedFiles.push(driveFolder);

        // Upload each file
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const relativePath = path.relative(dirPath, file);
            const relativeDir = path.dirname(relativePath);
            let parentIdForFile = driveFolder.id;
            if (relativeDir && relativeDir !== '.' && relativeDir !== '') {
                const segments = relativeDir.split(path.sep).filter(Boolean);
                for (const seg of segments) {
                    const subFolder = await this.findOrCreateFolder({
                        name: seg,
                        parentId: parentIdForFile,
                    });
                    parentIdForFile = subFolder.id;
                }
            }
            const fileName = path.basename(relativePath);

            if (onProgress) {
                onProgress(i + 1, totalFiles, fileName);
            }

            try {
                const uploaded = await this.uploadFile({
                    filePath: file,
                    fileName,
                    folderId: parentIdForFile,
                });
                uploadedFiles.push(uploaded);
            } catch (error: any) {
                console.error(`Failed to upload ${fileName}:`, error);
                // Continue with other files
            }
        }

        return uploadedFiles;
    }

    /**
     * Get all files in a directory recursively
     */
    private async getAllFilesInDirectory(dirPath: string): Promise<string[]> {
        const files: string[] = [];
        const entries = await fsp.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                const subFiles = await this.getAllFilesInDirectory(fullPath);
                files.push(...subFiles);
            } else {
                files.push(fullPath);
            }
        }

        return files;
    }

    /**
     * Create a folder in Google Drive
     */
    async createFolder(options: {
        name: string;
        parentId?: string;
    }): Promise<DriveFolder> {
        await this.ensureAuth();

        const { name, parentId } = options;

        const fileMetadata: any = {
            name,
            mimeType: 'application/vnd.google-apps.folder',
        };

        if (parentId) {
            fileMetadata.parents = [parentId];
        }

        try {
            const response = await this.drive.files.create({
                requestBody: fileMetadata,
                fields: 'id,name,parents',
            });

            return response.data as DriveFolder;
        } catch (error: any) {
            throw new Error(`Failed to create folder: ${error.message}`);
        }
    }

    /**
     * Find or create a folder by name
     */
    async findOrCreateFolder(options: {
        name: string;
        parentId?: string;
    }): Promise<DriveFolder> {
        await this.ensureAuth();

        const { name, parentId } = options;

        // First, try to find existing folder
        let query = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        if (parentId) {
            query += ` and '${parentId}' in parents`;
        }

        try {
            const response = await this.drive.files.list({
                q: query,
                fields: 'files(id,name,parents)',
                pageSize: 1,
            });

            if (response.data.files && response.data.files.length > 0) {
                return response.data.files[0] as DriveFolder;
            }
        } catch (error) {
            // If search fails, create new folder
        }

        // Folder doesn't exist, create it
        return await this.createFolder({ name, parentId });
    }

    /**
     * Download a file from Google Drive
     */
    async downloadFile(
        fileId: string,
        destinationPath: string
    ): Promise<string> {
        await this.ensureAuth();

        try {
            // Get file metadata to get the name
            console.log('Getting file metadata for:', fileId);
            const file = await this.getFile(fileId);
            
            if (!file) {
                throw new Error(`File not found: ${fileId}`);
            }
            
            const fileName = file.name || `drive_file_${fileId}`;
            
            console.log('File metadata retrieved:', {
                id: file.id,
                name: fileName,
                mimeType: file.mimeType,
                size: file.size
            });

            // Check if this is a Google Docs/Sheets/Slides file that needs export
            const googleDocsMimeTypes: { [key: string]: string } = {
                'application/vnd.google-apps.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
                'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
                'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
                'application/vnd.google-apps.drawing': 'image/png', // .png
                'application/vnd.google-apps.script': 'application/vnd.google-apps.script+json', // .json
            };

            const exportMimeType = googleDocsMimeTypes[file.mimeType || ''];
            const isGoogleDoc = !!exportMimeType;
            
            console.log('File type check:', {
                mimeType: file.mimeType,
                isGoogleDoc,
                exportMimeType
            });

            // Determine file extension
            let fileExtension = '';
            if (isGoogleDoc) {
                if (file.mimeType === 'application/vnd.google-apps.document') fileExtension = '.docx';
                else if (file.mimeType === 'application/vnd.google-apps.spreadsheet') fileExtension = '.xlsx';
                else if (file.mimeType === 'application/vnd.google-apps.presentation') fileExtension = '.pptx';
                else if (file.mimeType === 'application/vnd.google-apps.drawing') fileExtension = '.png';
                else if (file.mimeType === 'application/vnd.google-apps.script') fileExtension = '.json';
            } else {
                // Try to get extension from original filename or mimeType
                const nameParts = fileName.split('.');
                if (nameParts.length > 1) {
                    fileExtension = '.' + nameParts[nameParts.length - 1];
                }
            }

            const finalFileName = fileName.endsWith(fileExtension) ? fileName : fileName + fileExtension;
            const finalPath = path.join(destinationPath, finalFileName);

            // Ensure destination directory exists
            await fsp.mkdir(destinationPath, { recursive: true });

            console.log('Starting download:', finalFileName, 'to', finalPath, isGoogleDoc ? '(exporting Google Doc)' : '');

            // Download or export the file
            let response;
            try {
                if (isGoogleDoc) {
                    // For Google Docs, use the export endpoint
                    console.log('Exporting Google Doc to:', exportMimeType, 'for file:', fileId);
                    try {
                        response = await this.drive.files.export(
                            {
                                fileId,
                                mimeType: exportMimeType,
                            },
                            {
                                responseType: 'stream',
                                timeout: 600000,
                            }
                        );
                        console.log('Export request successful');
                    } catch (exportError: any) {
                        console.error('Export failed:', exportError.message, exportError.code);
                        // If export fails, provide helpful error
                        throw new Error(`Cannot export this Google Docs file (${file.mimeType}). You may need to download it manually from Google Drive (File → Download → Choose format) and then import the downloaded file. Error: ${exportError.message}`);
                    }
                } else {
                    // For regular files, use the get endpoint with alt=media
                    console.log('Downloading regular file:', fileId);
                    try {
                        response = await this.drive.files.get(
                            { 
                                fileId, 
                                alt: 'media'
                            },
                            { 
                                responseType: 'stream',
                                timeout: 600000 // 10 minutes timeout
                            }
                        );
                        console.log('Download request successful');
                    } catch (downloadError: any) {
                        console.error('Download failed:', downloadError.message, downloadError.code);
                        // If download fails with "binary content" error, it might be a Google Doc we didn't detect
                        if (downloadError.message && downloadError.message.includes('binary content')) {
                            throw new Error('This file cannot be downloaded directly. It may be a Google Docs file. Please download it manually from Google Drive (File → Download) and import the downloaded file, or select a binary file (like .zip, .tar.gz, .sql.gz, etc.).');
                        }
                        throw downloadError;
                    }
                }
            } catch (apiError: any) {
                console.error('API call error:', apiError.message, apiError.code);
                // Re-throw with better message if it's already been handled
                if (apiError.message && apiError.message.includes('Cannot export') || apiError.message.includes('cannot be downloaded')) {
                    throw apiError;
                }
                // Otherwise, provide generic error
                throw new Error(`Failed to access file: ${apiError.message || 'Unknown error'}`);
            }

            const writeStream = (await import('fs')).createWriteStream(
                finalPath
            );

            // Track download progress
            let downloadedBytes = 0;
            const totalBytes = file.size ? parseInt(file.size) : undefined;
            
            if (totalBytes) {
                console.log('File size:', formatBytes(totalBytes));
            }

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    writeStream.destroy();
                    reject(new Error('Download timeout - file is too large or connection is slow'));
                }, 600000); // 10 minute timeout

                // Handle both export and download responses
                const stream = response.data || response;
                
                if (!stream) {
                    clearTimeout(timeout);
                    reject(new Error('No response stream received'));
                    return;
                }

                stream
                    .on('data', (chunk: Buffer) => {
                        downloadedBytes += chunk.length;
                        if (totalBytes && downloadedBytes % (10 * 1024 * 1024) === 0) { // Log every 10MB
                            const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
                            console.log(`Download progress: ${percent}% (${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)})`);
                        }
                    })
                    .on('error', (err: Error) => {
                        clearTimeout(timeout);
                        console.error('Stream error:', err.message);
                        reject(err);
                    })
                    .pipe(writeStream)
                    .on('finish', () => {
                        clearTimeout(timeout);
                        console.log('Download completed:', formatBytes(downloadedBytes));
                        resolve();
                    })
                    .on('error', (err: Error) => {
                        clearTimeout(timeout);
                        console.error('Write stream error:', err.message);
                        reject(err);
                    });
            });

            return finalPath;
        } catch (error: any) {
            console.error('Download error:', {
                message: error.message,
                code: error.code,
                stack: error.stack,
                response: error.response?.data
            });
            
            // Check for specific Google Docs error from API
            if (error.message && (
                error.message.includes('Only files with binary content can be downloaded') ||
                error.message.includes('fileNotDownloadable')
            )) {
                // This means we tried to download a Google Doc directly
                // This shouldn't happen if detection worked, but provide helpful message
                throw new Error('This is a Google Docs/Sheets/Slides file. These files need to be exported first. Please download the file manually from Google Drive (File → Download) and then import the downloaded file, or select a binary file (like .zip, .tar.gz, .sql.gz, etc.).');
            }
            
            // Parse error response if it's a JSON string
            if (error.message && typeof error.message === 'string' && error.message.includes('"code"')) {
                try {
                    const errorObj = JSON.parse(error.message);
                    if (errorObj.error) {
                        if (errorObj.error.code === 403 && errorObj.error.reason === 'fileNotDownloadable') {
                            throw new Error('This file type cannot be downloaded directly. It is a Google Docs file. Please download it manually from Google Drive (File → Download) and import the downloaded file, or select a binary file (like .zip, .tar.gz, .sql.gz, etc.).');
                        }
                        throw new Error(errorObj.error.message || 'Download failed');
                    }
                } catch (parseError) {
                    // If parsing fails, use original error
                    console.error('Error parsing error message:', parseError);
                }
            }
            
            // Check if it's an export error
            if (error.code === 403 || (error.message && error.message.includes('export'))) {
                throw new Error(`Failed to export Google Docs file: ${error.message}. Please try downloading the file manually from Google Drive (File → Download) first, then import the downloaded file.`);
            }
            
            throw new Error(`Failed to download file: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Download an entire folder from Google Drive (recursively)
     */
    async downloadFolder(
        folderId: string,
        destinationPath: string
    ): Promise<string> {
        await this.ensureAuth();

        try {
            // Get folder metadata
            console.log('Getting folder metadata for:', folderId);
            const folder = await this.getFile(folderId);
            
            if (!folder) {
                throw new Error(`Folder not found: ${folderId}`);
            }
            
            if (folder.mimeType !== 'application/vnd.google-apps.folder') {
                throw new Error(`Not a folder: ${folderId}`);
            }
            
            const folderName = folder.name || `drive_folder_${folderId}`;
            const finalFolderPath = path.join(destinationPath, folderName);
            
            // Create the folder
            await fsp.mkdir(finalFolderPath, { recursive: true });
            console.log('Created folder:', finalFolderPath);
            
            // List all files in the folder
            const files = await this.listFiles({ folderId });
            console.log(`Found ${files.length} items in folder`);
            
            // Download each file/folder
            for (const item of files) {
                try {
                    if (item.mimeType === 'application/vnd.google-apps.folder') {
                        // Recursively download subfolder
                        console.log('Downloading subfolder:', item.name);
                        await this.downloadFolder(item.id, finalFolderPath);
                    } else {
                        // Download file
                        console.log('Downloading file:', item.name);
                        await this.downloadFile(item.id, finalFolderPath);
                    }
                } catch (itemError: any) {
                    console.error(`Failed to download ${item.name}:`, itemError.message);
                    // Continue with other files even if one fails
                }
            }
            
            return finalFolderPath;
        } catch (error: any) {
            console.error('Folder download error:', error.message);
            throw new Error(`Failed to download folder: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Delete a file from Google Drive
     */
    async deleteFile(fileId: string): Promise<void> {
        await this.ensureAuth();

        try {
            await this.drive.files.delete({ fileId });
        } catch (error: any) {
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }

    /**
     * Get folder structure (list folders)
     */
    async listFolders(parentId?: string): Promise<DriveFolder[]> {
        await this.ensureAuth();

        let query = "mimeType='application/vnd.google-apps.folder' and trashed=false";
        if (parentId) {
            query += ` and '${parentId}' in parents`;
        }

        try {
            const response = await this.drive.files.list({
                q: query,
                fields: 'files(id,name,parents)',
                orderBy: 'name',
            });

            return (response.data.files || []) as DriveFolder[];
        } catch (error: any) {
            throw new Error(`Failed to list folders: ${error.message}`);
        }
    }

    /**
     * Get root folder ID (My Drive)
     */
    async getRootFolder(): Promise<DriveFolder> {
        // The root folder ID is always 'root' in Google Drive
        return {
            id: 'root',
            name: 'My Drive',
        };
    }

    /**
     * Check if Drive is properly configured and accessible
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.ensureAuth();
            // Try to list root folder to verify access
            await this.drive.files.list({
                pageSize: 1,
                q: "trashed=false",
            });
            return true;
        } catch (error: any) {
            console.error('Drive testConnection error:', error.message, error.code);
            throw new Error(`Drive connection test failed: ${error.message || 'Unknown error'}`);
        }
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
