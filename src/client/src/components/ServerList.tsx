import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Server } from '../../shared/types';
import { 
    Server as ServerIcon, 
    Play, 
    Edit, 
    Trash2, 
    Loader2,
    Database,
    Globe,
    FileText,
    Settings as SettingsIcon,
    HardDrive
} from 'lucide-react';
import { EditServerModal } from './EditServerModal';

interface ServerListProps {
    onBackup: (server: Server) => void;
}

export function ServerList({ onBackup }: ServerListProps) {
    const [servers, setServers] = useState<Server[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingServer, setEditingServer] = useState<Server | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const loadServers = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/servers');
            if (!res.ok) {
                throw new Error(`Failed to load servers: ${res.status}`);
            }
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                // Server not running - Vite dev server returned HTML
                setServers([]);
                setError('API server is not running. Please start the server with: npm run dev:server');
                return;
            }
            let data;
            try {
                data = await res.json();
            } catch (e: any) {
                setServers([]);
                setError('Failed to parse servers response. Server may not be running.');
                return;
            }
            setServers(Array.isArray(data) ? data : []);
        } catch (e: any) {
            // Only log if it's not a JSON parse error (which we handle above)
            if (e.name !== 'SyntaxError' || !e.message.includes('JSON')) {
                console.error('Server load error:', e);
            }
            setError(e.message || 'Failed to load servers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadServers();
    }, []);

    // Listen for API URL cleared event and reload servers
    useEffect(() => {
        let lastReloadTime = 0;
        const RELOAD_DEBOUNCE_MS = 2000; // Only reload once per 2 seconds
        
        const handleApiUrlCleared = () => {
            const now = Date.now();
            // Debounce: prevent rapid repeated reloads
            if (now - lastReloadTime < RELOAD_DEBOUNCE_MS) {
                return;
            }
            lastReloadTime = now;
            
            console.log('API URL cleared, reloading servers with relative URL');
            loadServers();
        };
        
        window.addEventListener('api-url-cleared', handleApiUrlCleared);
        return () => window.removeEventListener('api-url-cleared', handleApiUrlCleared);
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this server?')) {
            return;
        }

        setDeletingId(id);
        try {
            const res = await fetch(`/api/servers/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                await loadServers();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete server');
            }
        } catch (e: any) {
            alert(`Failed to delete server: ${e.message || 'Unknown error'}`);
        } finally {
            setDeletingId(null);
        }
    };

    const handleEditSuccess = () => {
        setEditingServer(null);
        loadServers();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">Loading servers...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={loadServers} variant="outline">
                    Retry
                </Button>
            </div>
        );
    }

    if (servers.length === 0) {
        return (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
                <ServerIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No servers configured</h3>
                <p className="text-muted-foreground mb-6">
                    Get started by adding your first server to manage backups.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {servers.map((server) => (
                    <div
                        key={server.id}
                        className="bg-card border border-border rounded-lg p-4 sm:p-6 theme-shadow hover:theme-shadow-md transition-all group overflow-hidden"
                    >
                        <div className="flex justify-between items-start mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-border">
                            <div className="flex-1 min-w-0 pr-2">
                                <h3 className="text-base sm:text-lg font-semibold truncate mb-1">
                                    {server.name}
                                </h3>
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                                    <span className="bg-secondary px-2 py-0.5 rounded text-xs font-mono truncate max-w-full">
                                        {server.user}@{server.ip}:{server.port}
                                    </span>
                                </div>
                            </div>
                            <div className="p-1.5 sm:p-2 bg-primary/5 rounded-full group-hover:bg-primary/10 transition-colors flex-shrink-0">
                                <ServerIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            </div>
                        </div>

                        <div className="space-y-3 sm:space-y-4 mb-3 sm:mb-4">
                            {/* Backup Options */}
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    TARGETS
                                </h4>
                                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                                    <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${server.backupWww ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                                        <Globe className="w-3 h-3" />
                                        /var/www
                                    </div>
                                    <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${server.backupLogs ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                                        <FileText className="w-3 h-3" />
                                        /var/log
                                    </div>
                                    <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${server.backupNginx ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                                        <SettingsIcon className="w-3 h-3" />
                                        /etc/nginx
                                    </div>
                                    <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${server.backupDb ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                                        <Database className="w-3 h-3" />
                                        Database
                                    </div>
                                </div>
                            </div>

                            {/* Database Info */}
                            {server.backupDb && server.dbUser && (
                                <div className="bg-secondary/30 rounded-lg p-2 text-xs">
                                    <div className="flex items-center gap-1 font-medium mb-1 text-primary">
                                        <Database className="w-3 h-3" />
                                        Database
                                    </div>
                                    <div className="text-muted-foreground">
                                        {server.dbHost || 'localhost'}:{server.dbPort || 3306}
                                        {server.dbSelected && server.dbSelected.length > 0 && (
                                            <span className="ml-1">
                                                ({server.dbSelected.length} selected)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Local Backup Path */}
                            {server.localBackupPath && (
                                <div className="flex items-center gap-2 text-xs bg-background border border-border rounded px-2 py-1 text-muted-foreground">
                                    <HardDrive className="w-3 h-3" />
                                    <span className="truncate">{server.localBackupPath}</span>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1.5 sm:gap-2 pt-3 sm:pt-4 border-t border-border">
                            <Button
                                onClick={() => onBackup(server)}
                                className="flex-1 gap-1.5 sm:gap-2 text-xs sm:text-sm"
                                size="sm"
                            >
                                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="hidden xs:inline">Backup</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingServer(server)}
                                className="gap-0 p-2 sm:p-2.5"
                            >
                                <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(server.id)}
                                disabled={deletingId === server.id}
                                className="gap-0 p-2 sm:p-2.5 text-destructive hover:text-destructive"
                            >
                                {deletingId === server.id ? (
                                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {editingServer && (
                <EditServerModal
                    isOpen={!!editingServer}
                    onClose={() => setEditingServer(null)}
                    onSuccess={handleEditSuccess}
                    server={editingServer}
                />
            )}
        </>
    );
}

