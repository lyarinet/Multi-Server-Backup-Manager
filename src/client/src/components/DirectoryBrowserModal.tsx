import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';

interface Entry { name: string; type: 'dir' | 'file'; }

interface DirectoryBrowserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (path: string) => void;
    initialPath?: string;
    serverId?: number;
    connection?: {
        host: string;
        port: number;
        user: string;
        sshKeyPath?: string;
        password?: string;
    };
}

export function DirectoryBrowserModal({ isOpen, onClose, onSelect, initialPath = '/', serverId, connection }: DirectoryBrowserModalProps) {
    const [path, setPath] = useState(initialPath);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setPath(initialPath);
    }, [isOpen, initialPath]);

    useEffect(() => {
        if (!isOpen) return;
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                let res: Response;
                if (serverId) {
                    res = await fetch(`/api/servers/${serverId}/browse?path=${encodeURIComponent(path)}`);
                } else if (connection) {
                    res = await fetch('/api/browse', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            host: connection.host,
                            port: connection.port,
                            user: connection.user,
                            sshKeyPath: connection.sshKeyPath,
                            password: connection.password,
                            path,
                        }),
                    });
                } else {
                    throw new Error('Missing connection info');
                }
                const data = await res.json();
                const result: Entry[] = Array.isArray(data.entries) ? data.entries : [];
                setEntries(result.filter((e) => e.type === 'dir'));
            } catch (e: any) {
                setError('Failed to load directory');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isOpen, path, serverId, connection]);

    if (!isOpen) return null;

    const up = () => {
        const p = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
        const idx = p.lastIndexOf('/');
        const next = idx <= 0 ? '/' : p.slice(0, idx);
        setPath(next);
    };

    const enter = (name: string) => {
        const next = path.endsWith('/') ? `${path}${name}` : `${path}/${name}`;
        setPath(next);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-lg w-full max-w-2xl h-[70vh] flex flex-col shadow-2xl">
                <div className="flex items-center justify-between p-3 border-b border-border">
                    <input
                        className="flex-1 h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring mr-3"
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={up}>Up</Button>
                        <Button onClick={() => onSelect(path)}>Add</Button>
                        <Button variant="ghost" onClick={onClose}>Close</Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {loading && <div className="p-4 text-muted-foreground">Loading...</div>}
                    {error && !loading && <div className="p-4 text-destructive">{error}</div>}
                    {!loading && !error && (
                        <ul className="divide-y divide-border">
                            <li className="p-3 cursor-pointer hover:bg-accent" onClick={up}>..</li>
                            {entries.map((e) => (
                                <li key={e.name} className="p-3 cursor-pointer hover:bg-accent" onClick={() => enter(e.name)}>
                                    {e.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

