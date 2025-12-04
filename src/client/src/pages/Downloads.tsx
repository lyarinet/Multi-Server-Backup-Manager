import React, { useEffect, useState } from 'react';
import { Download, Trash2, File, RefreshCw, CloudDownload, Folder, ExternalLink, Upload } from 'lucide-react';
import { Button } from '../components/ui/button';

interface DownloadFile {
    name: string;
    size: number;
    createdAt: string;
}

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    modifiedTime?: string;
    webViewLink?: string;
}

export default function DownloadsPage() {
    const [files, setFiles] = useState<DownloadFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFiles = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/downloads');
            if (!res.ok) throw new Error('Failed to fetch downloads');
            const data = await res.json();
            setFiles(data);
        } catch (err) {
            setError('Failed to load files');
        } finally {
            setLoading(false);
        }
    };

    const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
    const [driveFolders, setDriveFolders] = useState<any[]>([]);
    const [driveLoading, setDriveLoading] = useState(false);
    const [currentDriveFolder, setCurrentDriveFolder] = useState<string | undefined>(undefined);
    const [driveError, setDriveError] = useState<string | null>(null);

    const loadDriveFiles = async (folderId?: string) => {
        setDriveLoading(true);
        setDriveError(null);
        try {
            const query = folderId ? `?folderId=${folderId}` : '';
            const res = await fetch(`/api/drive/files${query}`);
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to load Drive files');
            }
            const data = await res.json();
            if (Array.isArray(data)) {
                // Separate files and folders
                const folders = data.filter((f: DriveFile) => f.mimeType === 'application/vnd.google-apps.folder');
                const files = data.filter((f: DriveFile) => f.mimeType !== 'application/vnd.google-apps.folder');
                setDriveFolders(folders);
                setDriveFiles(files);
            }
        } catch (err: any) {
            setDriveError(err.message || 'Failed to load Drive files');
        } finally {
            setDriveLoading(false);
        }
    };

    const handleDriveDelete = async (fileId: string, fileName: string) => {
        if (!confirm(`Are you sure you want to delete "${fileName}" from Google Drive?`)) return;
        try {
            const res = await fetch(`/api/drive/files/${fileId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            loadDriveFiles(currentDriveFolder);
        } catch (err) {
            alert('Failed to delete file from Drive');
        }
    };

    useEffect(() => {
        fetchFiles();
    }, []);

    const handleDownload = async (filename: string) => {
        try {
            const res = await fetch(`/api/downloads/${filename}`);
            if (!res.ok) throw new Error('Download failed');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            alert('Failed to download file');
        }
    };

    const handleDelete = async (filename: string) => {
        if (!confirm(`Are you sure you want to delete ${filename}?`)) return;

        try {
            const res = await fetch(`/api/downloads/${filename}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            fetchFiles();
        } catch (err) {
            alert('Failed to delete file');
        }
    };

    const formatSize = (bytes: number | string) => {
        const numBytes = typeof bytes === 'string' ? parseInt(bytes) || 0 : bytes;
        if (numBytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(numBytes) / Math.log(k));
        return parseFloat((numBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Downloads</h1>
                    <p className="text-muted-foreground mt-1">Manage your backup files</p>
                </div>
                <Button onClick={fetchFiles} variant="outline" className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </Button>
                <div className="flex gap-2">
                    <Button onClick={() => loadDriveFiles()} variant="outline" className="gap-2">
                        <CloudDownload className="w-4 h-4" />
                        Load Drive Files
                    </Button>
                    {currentDriveFolder && (
                        <Button onClick={() => { setCurrentDriveFolder(undefined); loadDriveFiles(); }} variant="outline" className="gap-2">
                            <Folder className="w-4 h-4" />
                            Back to Root
                        </Button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading files...</div>
            ) : error ? (
                <div className="text-center py-12 text-destructive">{error}</div>
            ) : files.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                    No backup files found in the configured download location.
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium">
                            <tr>
                                <th className="px-4 py-3">File Name</th>
                                <th className="px-4 py-3">Size</th>
                                <th className="px-4 py-3">Created At</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {files.map((file) => (
                                <tr key={file.name} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                                        <File className="w-4 h-4 text-muted-foreground" />
                                        {file.name}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{formatSize(file.size)}</td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {new Date(file.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDownload(file.name)}
                                                title="Download"
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleDelete(file.name)}
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <CloudDownload className="w-5 h-5" />
                            Google Drive Files
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Browse and manage files in your Google Drive
                        </p>
                    </div>
                    <Button onClick={() => loadDriveFiles(currentDriveFolder)} variant="outline" className="gap-2" disabled={driveLoading}>
                        <RefreshCw className={`w-4 h-4 ${driveLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                {driveError && (
                    <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20 mb-4">
                        {driveError}
                    </div>
                )}

                {(driveFiles.length > 0 || driveFolders.length > 0) && (
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-medium">
                                <tr>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Size</th>
                                    <th className="px-4 py-3">Modified</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {driveFolders.map((folder) => (
                                    <tr key={folder.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                                            <Folder className="w-4 h-4 text-primary" />
                                            {folder.name}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">Folder</td>
                                        <td className="px-4 py-3 text-muted-foreground">-</td>
                                        <td className="px-4 py-3 text-muted-foreground">-</td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setCurrentDriveFolder(folder.id);
                                                    loadDriveFiles(folder.id);
                                                }}
                                            >
                                                Open
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {driveFiles.map((f) => (
                                    <tr key={f.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                                            <File className="w-4 h-4 text-muted-foreground" />
                                            {f.name}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {f.mimeType?.split('/')[1]?.toUpperCase() || 'File'}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{formatSize(f.size || 0)}</td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {f.modifiedTime ? new Date(f.modifiedTime).toLocaleString() : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                {f.webViewLink && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => window.open(f.webViewLink, '_blank')}
                                                        title="Open in Drive"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={async () => {
                                                        try {
                                                            const res = await fetch('/api/drive/import', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ fileId: f.id })
                                                            });
                                                            const j = await res.json();
                                                            if (!res.ok) return alert(`Import failed: ${j.error}`);
                                                            alert('✅ Imported to: ' + j.path);
                                                            fetchFiles();
                                                        } catch {
                                                            alert('❌ Import failed');
                                                        }
                                                    }}
                                                    title="Download to local"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDriveDelete(f.id, f.name)}
                                                    title="Delete from Drive"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!driveLoading && driveFiles.length === 0 && driveFolders.length === 0 && !driveError && (
                    <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                        No files found in Google Drive. Configure Drive in Settings to get started.
                    </div>
                )}

                {driveLoading && (
                    <div className="text-center py-12 text-muted-foreground">Loading Drive files...</div>
                )}
            </div>
        </div>
    );
}
