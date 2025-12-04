import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X, Folder, Loader2, RefreshCw, Upload, Check } from 'lucide-react';

interface DriveFolder {
    id: string;
    name: string;
    parents?: string[];
}

interface DriveExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    filePath: string;
    fileName: string;
    isDirectory: boolean;
}

export function DriveExportModal({ isOpen, onClose, onSuccess, filePath, fileName, isDirectory }: DriveExportModalProps) {
    const [folders, setFolders] = useState<DriveFolder[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(undefined);
    const [folderStack, setFolderStack] = useState<Array<{ id: string; name: string }>>([]);
    const [uploadProgress, setUploadProgress] = useState<string>('');

    const loadFolders = async (parentId?: string) => {
        setLoading(true);
        setError(null);
        try {
            const query = parentId ? `?parentId=${parentId}` : '';
            const res = await fetch(`/api/drive/folders${query}`);
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to load Drive folders');
            }
            const data = await res.json();
            setFolders(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError(err.message || 'Failed to load Drive folders');
            setFolders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadFolders(selectedFolderId);
        } else {
            // Reset state when modal closes
            setFolders([]);
            setError(null);
            setSelectedFolderId(undefined);
            setFolderStack([]);
            setUploadProgress('');
        }
    }, [isOpen, selectedFolderId]);

    const handleFolderClick = (folder: DriveFolder) => {
        setFolderStack([...folderStack, { id: folder.id, name: folder.name }]);
        setSelectedFolderId(folder.id);
    };

    const handleBack = () => {
        if (folderStack.length > 0) {
            const newStack = [...folderStack];
            newStack.pop();
            setFolderStack(newStack);
            setSelectedFolderId(newStack.length > 0 ? newStack[newStack.length - 1].id : undefined);
        } else {
            setSelectedFolderId(undefined);
        }
    };

    const handleExport = async () => {
        setUploading(true);
        setError(null);
        setUploadProgress('Starting upload...');

        try {
            // Send the relative path - server will construct full path
            const fullPath = filePath;
            
            if (isDirectory) {
                // Upload directory
                setUploadProgress('Uploading directory...');
                const res = await fetch('/api/drive/upload-directory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        dirPath: fullPath,
                        folderId: selectedFolderId,
                    }),
                });
                
                if (!res.ok) {
                    const j = await res.json();
                    throw new Error(j.error || j.details || 'Upload failed');
                }
                
                const result = await res.json();
                setUploadProgress(`✅ Successfully uploaded ${result.count || 0} items!`);
            } else {
                // Upload single file
                setUploadProgress('Uploading file...');
                const res = await fetch('/api/drive/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filePath: fullPath,
                        fileName: fileName,
                        folderId: selectedFolderId,
                    }),
                });
                
                if (!res.ok) {
                    const j = await res.json();
                    throw new Error(j.error || j.details || 'Upload failed');
                }
                
                const result = await res.json();
                setUploadProgress(`✅ Successfully uploaded: ${result.name || fileName}`);
            }

            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);
        } catch (e: any) {
            console.error('Export error:', e);
            setError(e.message || 'Failed to export to Google Drive');
            setUploadProgress('');
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget && !uploading) {
                    onClose();
                }
            }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
            <div 
                className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col my-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
                    <h2 className="text-lg sm:text-xl font-semibold">
                        Export {isDirectory ? 'Folder' : 'File'} to Google Drive
                    </h2>
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={uploading} className="flex-shrink-0">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="p-4 border-b border-border flex-shrink-0">
                    <div className="mb-3">
                        <p className="text-sm text-muted-foreground">
                            <strong>Exporting:</strong> {fileName}
                        </p>
                        {isDirectory && (
                            <p className="text-xs text-muted-foreground mt-1">
                                This will upload the entire folder and all its contents
                            </p>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {folderStack.length > 0 && (
                            <Button variant="outline" size="sm" onClick={handleBack} disabled={uploading}>
                                ← Back
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => loadFolders(selectedFolderId)} disabled={uploading}>
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                        <div className="flex-1 text-sm text-muted-foreground">
                            {folderStack.length > 0 ? (
                                <span>Path: {folderStack.map(f => f.name).join(' / ')}</span>
                            ) : (
                                <span>Select destination folder (or leave empty for root)</span>
                            )}
                        </div>
                    </div>
                </div>

                <div 
                    className="flex-1 overflow-y-auto p-4 min-h-0"
                    style={{ 
                        minHeight: 0,
                        maxHeight: 'calc(85vh - 250px)',
                        overflowY: 'auto',
                        overflowX: 'hidden'
                    }}
                >
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-muted-foreground">Loading folders...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-red-500">
                            <p className="break-words">{error}</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => loadFolders(selectedFolderId)}>
                                Retry
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {!selectedFolderId && (
                                <div
                                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                                    onClick={() => {
                                        setSelectedFolderId(undefined);
                                        setFolderStack([]);
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <Folder className="w-5 h-5 text-blue-400" />
                                        <div>
                                            <div className="font-medium">My Drive (Root)</div>
                                            <div className="text-xs text-muted-foreground">Upload to root folder</div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                        Select
                                    </Button>
                                </div>
                            )}

                            {folders.map((folder) => (
                                <div
                                    key={folder.id}
                                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                                    onClick={() => handleFolderClick(folder)}
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <Folder className="w-5 h-5 text-blue-400 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium truncate">{folder.name}</div>
                                            <div className="text-xs text-muted-foreground">Folder</div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="flex-shrink-0">
                                        <span className="hidden sm:inline">Open →</span>
                                        <span className="sm:hidden">→</span>
                                    </Button>
                                </div>
                            ))}

                            {folders.length === 0 && !selectedFolderId && (
                                <div className="text-center py-12 text-muted-foreground">
                                    No folders found. You can upload to root.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {uploadProgress && (
                    <div className="p-4 border-t border-border bg-muted/50">
                        <div className="flex items-center gap-2 text-sm">
                            {uploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Check className="w-4 h-4 text-green-500" />
                            )}
                            <span>{uploadProgress}</span>
                        </div>
                    </div>
                )}

                {error && !uploading && (
                    <div className="p-4 border-t border-border bg-red-500/10">
                        <p className="text-sm text-red-500">{error}</p>
                    </div>
                )}

                <div className="flex justify-end gap-3 p-4 border-t border-border flex-shrink-0">
                    <Button variant="outline" onClick={onClose} disabled={uploading}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleExport} 
                        disabled={uploading || loading}
                        className="gap-2"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                Export to Drive
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

