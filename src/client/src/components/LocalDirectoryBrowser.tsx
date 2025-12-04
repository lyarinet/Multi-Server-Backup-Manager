import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';

interface Entry { name: string; type: 'dir' | 'file'; }

export function LocalDirectoryBrowser({ initialPath, onClose, onSelect }: { initialPath: string; onClose: () => void; onSelect: (path: string) => void; }) {
    const [path, setPath] = useState(initialPath || '/');
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await fetch(`/api/local/browse?path=${encodeURIComponent(path)}`);
                const ct = res.headers.get('content-type') || '';
                if (!res.ok || !ct.includes('application/json')) {
                    const txt = await res.text();
                    throw new Error('Bad response');
                }
                const data = await res.json();
                const list: Entry[] = Array.isArray(data.entries) ? data.entries : [];
                setEntries(list.filter((e) => e.type === 'dir'));
            } catch (e) {
                setError('Failed to read local directory');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [path]);

    const up = () => {
        const p = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
        const idx = p.lastIndexOf('/');
        const next = idx <= 0 ? '/' : p.slice(0, idx);
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
                        <Button onClick={() => onSelect(path)}>Select</Button>
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
                                <li key={e.name} className="p-3 cursor-pointer hover:bg-accent" onClick={() => setPath(path.endsWith('/') ? `${path}${e.name}` : `${path}/${e.name}`)}>
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
