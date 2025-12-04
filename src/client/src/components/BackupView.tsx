import React, { useEffect, useRef, useState } from 'react';
import { BackupLog } from '../../../shared/types';
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface BackupViewProps {
    logId: number;
    onClose: () => void;
}

export function BackupView({ logId, onClose }: BackupViewProps) {
    const [log, setLog] = useState<BackupLog | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const fetchLog = async () => {
            try {
                const res = await fetch(`/api/backup/${logId}/status`);
                const data = await res.json();
                setLog(data);

                if (data.status === 'success' || data.status === 'failed') {
                    clearInterval(interval);
                }
            } catch (error) {
                console.error(error);
            }
        };

        fetchLog();
        interval = setInterval(fetchLog, 1000);

        return () => clearInterval(interval);
    }, [logId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [log?.logs]);

    if (!log) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-lg w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold">Backup Status</h2>
                        {log.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                        {log.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {log.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-500" />}
                        <span className="text-sm text-muted-foreground capitalize">({log.status})</span>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4 bg-black/90 font-mono text-sm" ref={scrollRef}>
                    <pre className="whitespace-pre-wrap text-green-400">
                        {log.logs || 'Waiting for logs...'}
                    </pre>
                </div>
            </div>
        </div>
    );
}
