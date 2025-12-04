import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X, Search, File, Folder, Loader2, RefreshCw, Key } from 'lucide-react';

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    modifiedTime?: string;
}

interface DriveFileSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (fileId: string) => void;
}

export function DriveFileSelectorModal({ isOpen, onClose, onSelect }: DriveFileSelectorModalProps) {
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [folders, setFolders] = useState<DriveFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
    const [folderStack, setFolderStack] = useState<Array<{ id: string; name: string }>>([]);
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualFileId, setManualFileId] = useState('');

    useEffect(() => {
        if (isOpen) {
            console.log('DriveFileSelectorModal opened');
        }
    }, [isOpen]);

    const loadFiles = async (folderId?: string) => {
        setLoading(true);
        setError(null);
        try {
            const query = folderId ? `?folderId=${folderId}` : '';
            const res = await fetch(`/api/drive/files${query}`);
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to load Drive files');
            }
            const data = await res.json();
            if (Array.isArray(data)) {
                const driveFolders = data.filter((f: DriveFile) => f.mimeType === 'application/vnd.google-apps.folder');
                const driveFiles = data.filter((f: DriveFile) => f.mimeType !== 'application/vnd.google-apps.folder');
                setFolders(driveFolders);
                setFiles(driveFiles);
            } else {
                setFolders([]);
                setFiles([]);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load Drive files');
            setFolders([]);
            setFiles([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            console.log('DriveFileSelectorModal opened');
            loadFiles(currentFolderId);
        } else {
            // Reset state when modal closes
            setFiles([]);
            setFolders([]);
            setError(null);
            setSearchTerm('');
            setCurrentFolderId(undefined);
            setFolderStack([]);
        }
    }, [isOpen, currentFolderId]);

    const handleFolderClick = (folder: DriveFile) => {
        setFolderStack([...folderStack, { id: folder.id, name: folder.name }]);
        setCurrentFolderId(folder.id);
        setSearchTerm('');
    };

    const handleBack = () => {
        if (folderStack.length > 0) {
            const newStack = [...folderStack];
            newStack.pop();
            setFolderStack(newStack);
            setCurrentFolderId(newStack.length > 0 ? newStack[newStack.length - 1].id : undefined);
        } else {
            setCurrentFolderId(undefined);
        }
        setSearchTerm('');
    };

    const handleFileSelect = (fileId: string) => {
        onSelect(fileId);
        onClose();
    };

    const filteredFolders = folders.filter(f => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredFiles = files.filter(f => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
            <div 
                className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-3xl flex flex-col my-auto mx-auto"
                onClick={(e) => e.stopPropagation()}
                style={{ 
                    maxHeight: '90vh',
                    maxWidth: '90vw',
                    margin: 'auto',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
                    <h2 className="text-lg sm:text-xl font-semibold">Select File from Google Drive</h2>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setShowManualInput(!showManualInput)}
                            title="Import by file ID"
                            className="text-xs sm:text-sm"
                        >
                            <Key className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">{showManualInput ? 'Browse' : 'Manual Import'}</span>
                            <span className="sm:hidden">{showManualInput ? 'Browse' : 'Manual'}</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {showManualInput ? (
                    <div className="p-4 sm:p-6 border-b border-border flex-shrink-0">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Enter Google Drive File ID</label>
                                <input
                                    type="text"
                                    placeholder="e.g., 1JISYOGZrj06tq7usleHFaSe7vBx7u6A3"
                                    value={manualFileId}
                                    onChange={(e) => setManualFileId(e.target.value.trim())}
                                    className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background font-mono text-xs sm:text-sm"
                                />
                                <p className="text-xs text-muted-foreground mt-2 break-words">
                                    Find file ID in Google Drive URL: 
                                    <code className="bg-secondary px-1 py-0.5 rounded ml-1 break-all">
                                        .../file/d/FILE_ID_HERE/view
                                    </code>
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    variant="default" 
                                    onClick={() => {
                                        if (manualFileId) {
                                            handleFileSelect(manualFileId);
                                        } else {
                                            alert('Please enter a file ID');
                                        }
                                    }}
                                    disabled={!manualFileId}
                                    className="flex-1 sm:flex-initial"
                                >
                                    Import File
                                </Button>
                                <Button variant="outline" onClick={() => setShowManualInput(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 border-b border-border flex-shrink-0">
                        <div className="flex items-center gap-2">
                            {folderStack.length > 0 && (
                                <Button variant="outline" size="sm" onClick={handleBack}>
                                    ← Back
                                </Button>
                            )}
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search files and folders..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full h-10 pl-10 pr-3 rounded-[var(--radius)] border border-input bg-background"
                                />
                            </div>
                            <Button variant="outline" size="sm" onClick={() => loadFiles(currentFolderId)}>
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        </div>
                        {folderStack.length > 0 && (
                            <div className="mt-2 text-sm text-muted-foreground">
                                <span className="font-medium">Path:</span> {folderStack.map(f => f.name).join(' / ')}
                            </div>
                        )}
                    </div>
                )}

                {!showManualInput && (
                    <div 
                        className="flex-1 overflow-y-auto p-4 min-h-0"
                        style={{ 
                            minHeight: 0,
                            maxHeight: 'calc(90vh - 200px)',
                            overflowY: 'auto',
                            overflowX: 'hidden'
                        }}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                <span className="ml-2 text-muted-foreground">Loading files...</span>
                            </div>
                        ) : error ? (
                            <div className="text-center py-12 text-red-500">
                                <p className="break-words">{error}</p>
                                <Button variant="outline" size="sm" className="mt-4" onClick={() => loadFiles(currentFolderId)}>
                                    Retry
                                </Button>
                            </div>
                        ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>{searchTerm ? 'No files match your search' : 'No files found in this folder'}</p>
                                <div className="mt-4">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => setShowManualInput(true)}
                                    >
                                        <Key className="w-4 h-4 mr-2" />
                                        Import by File ID Instead
                                    </Button>
                                </div>
                            </div>
                        ) : (
                        <div className="space-y-2">
                            {/* Folders */}
                            {filteredFolders.map((folder) => (
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

                            {/* Files */}
                            {filteredFiles.map((file) => (
                                <div
                                    key={file.id}
                                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors gap-2"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <File className="w-5 h-5 text-orange-400 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium truncate">{file.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {file.size ? formatSize(parseInt(file.size)) : 'Unknown size'}
                                                {file.modifiedTime && ` • ${new Date(file.modifiedTime).toLocaleDateString()}`}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleFileSelect(file.id)}
                                        className="flex-shrink-0"
                                    >
                                        Select
                                    </Button>
                                </div>
                            ))}
                        </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function formatSize(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

