import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Folder, FileArchive, CloudDownload, Upload } from 'lucide-react';
import { DriveFileSelectorModal } from '@/components/DriveFileSelectorModal';
import { DriveExportModal } from '@/components/DriveExportModal';

interface BackupFile {
    name: string;
    path: string;
    size: number;
    date: string;
    isDirectory: boolean;
}

export function DownloadPage() {
    const [files, setFiles] = useState<BackupFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState<string>('');
    const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
    const [basePath, setBasePath] = useState<string>('');
    const [showDriveModal, setShowDriveModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFile, setExportFile] = useState<{ path: string; name: string; isDirectory: boolean } | null>(null);

    const loadFiles = async (path = '') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/backups/list?path=${encodeURIComponent(path)}`);
            if (res.ok) {
                const data = await res.json();
                setFiles(data.files);
                setCurrentPath(data.currentPath);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Fetch base path from settings
        const fetchBasePath = async () => {
            try {
                const res = await fetch('/api/settings');
                if (res.ok) {
                    const data = await res.json();
                    setBasePath(data.globalLocalBackupPath || '~/Server-Backups');
                }
            } catch (error) {
                console.error(error);
                setBasePath('~/Server-Backups');
            }
        };
        fetchBasePath();
        loadFiles();
    }, []);

    const handleNavigate = (folderName: string) => {
        const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        loadFiles(newPath);
        setBreadcrumbs([...breadcrumbs, folderName]);
    };

    const handleUp = () => {
        const newBreadcrumbs = [...breadcrumbs];
        newBreadcrumbs.pop();
        setBreadcrumbs(newBreadcrumbs);
        loadFiles(newBreadcrumbs.join('/'));
    };

    const handleDownload = async (fileName: string) => {
        const fullPath = currentPath ? `${currentPath}/${fileName}` : fileName;
        const token = localStorage.getItem('auth_token');
        window.location.href = `/api/backups/download?path=${encodeURIComponent(fullPath)}&token=${token}`;
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Downloads</h1>
                    <p className="text-muted-foreground mt-1">Browse and download backup files</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => loadFiles(currentPath)}>
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                        console.log('Opening Drive modal...');
                        setShowDriveModal(true);
                    }}>
                        <CloudDownload className="w-4 h-4" />
                        Import from Drive
                    </Button>
                </div>
            </div>

            <div className="border border-border rounded-lg bg-card">
                <div className="p-4 border-b border-border flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleUp} disabled={breadcrumbs.length === 0}>
                        Up Level
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowDriveModal(true)}>
                        Import from Drive
                    </Button>
                    <div className="text-sm font-mono text-muted-foreground ml-2">
                        {basePath}{breadcrumbs.length > 0 ? '/' + breadcrumbs.join('/') : ''}
                    </div>
                </div>

                <div className="divide-y divide-border">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading...</div>
                    ) : files.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">No files found</div>
                    ) : (
                        files.map((file) => (
                            <div key={file.name} className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    {file.isDirectory ? (
                                        <Folder className="w-5 h-5 text-blue-400" />
                                    ) : (
                                        <FileArchive className="w-5 h-5 text-orange-400" />
                                    )}
                                    <div>
                                        <div
                                            className={`font-medium ${file.isDirectory ? 'cursor-pointer hover:underline' : ''}`}
                                            onClick={() => file.isDirectory && handleNavigate(file.name)}
                                        >
                                            {file.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {new Date(file.date).toLocaleString()} • {file.isDirectory ? 'Directory' : formatSize(file.size)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {!file.isDirectory && (
                                        <Button size="sm" variant="outline" className="gap-2" onClick={() => handleDownload(file.name)}>
                                            <Download className="w-4 h-4" />
                                            Download
                                        </Button>
                                    )}
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="gap-2" 
                                        onClick={() => {
                                            const fullPath = currentPath ? `${currentPath}/${file.name}` : file.name;
                                            setExportFile({
                                                path: fullPath,
                                                name: file.name,
                                                isDirectory: file.isDirectory
                                            });
                                            setShowExportModal(true);
                                        }}
                                    >
                                        <Upload className="w-4 h-4" />
                                        Export to Drive
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {showDriveModal && (
                <DriveFileSelectorModal
                    isOpen={showDriveModal}
                    onClose={() => {
                        setShowDriveModal(false);
                    }}
                    onSelect={async (fileId) => {
                        try {
                            setShowDriveModal(false);
                            
                            // Show loading message
                            const loadingMsg = 'Importing file from Google Drive... This may take a while for large files.';
                            if (!confirm(loadingMsg + '\n\nClick OK to continue, or Cancel to abort.')) {
                                return;
                            }
                            
                            // Create abort controller for timeout
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes
                            
                            const r = await fetch('/api/drive/import', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ fileId }),
                                signal: controller.signal
                            });
                            
                            clearTimeout(timeoutId);
                            
                            if (!r.ok) {
                                let errorMessage = 'Unknown error';
                                try {
                                    const j = await r.json();
                                    errorMessage = j.error || j.details || j.message || `HTTP ${r.status}`;
                                    console.error('Import error response:', j);
                                } catch (e) {
                                    errorMessage = `HTTP ${r.status}: ${r.statusText}`;
                                }
                                
                                if (r.status === 504) {
                                    alert('⏱️ Import timeout - The file may be too large or the connection is slow. Please try again or use a smaller file.');
                                } else if (r.status === 400) {
                                    let userMessage = errorMessage;
                                    
                                    // Check for Google Docs error
                                    if (errorMessage.includes('Google Docs') || errorMessage.includes('fileNotDownloadable') || errorMessage.includes('binary content')) {
                                        userMessage = '❌ Cannot import Google Docs/Sheets/Slides files directly.\n\n' +
                                            'This file type needs to be exported first.\n\n' +
                                            'Please:\n' +
                                            '1. Open the file in Google Drive\n' +
                                            '2. Go to File → Download → Choose format (e.g., .docx, .xlsx, .pptx)\n' +
                                            '3. Import the downloaded file instead\n\n' +
                                            'Or select a binary file (like .zip, .tar.gz, .sql.gz, etc.)';
                                    } else {
                                        userMessage = '❌ Import failed (400 Bad Request):\n\n' + errorMessage + '\n\nPlease check:\n- File ID is correct\n- File is accessible in Google Drive\n- You have permission to access the file';
                                    }
                                    
                                    alert(userMessage);
                                } else {
                                    alert('❌ Import failed:\n\n' + errorMessage);
                                }
                                return;
                            }
                            
                            const j = await r.json();
                            alert('✅ Imported successfully!\n\nFile: ' + (j.fileName || 'Unknown') + '\nLocation: ' + j.path);
                            loadFiles(currentPath);
                        } catch (e: any) {
                            if (e.name === 'AbortError') {
                                alert('⏱️ Import timeout - The operation took too long. Please try again with a smaller file or check your connection.');
                            } else {
                                alert('Drive import failed: ' + (e.message || 'Unknown error'));
                            }
                        }
                    }}
                />
            )}

            {showExportModal && exportFile && (
                <DriveExportModal
                    isOpen={showExportModal}
                    onClose={() => {
                        setShowExportModal(false);
                        setExportFile(null);
                    }}
                    onSuccess={() => {
                        loadFiles(currentPath);
                    }}
                    filePath={exportFile.path}
                    fileName={exportFile.name}
                    isDirectory={exportFile.isDirectory}
                />
            )}
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
