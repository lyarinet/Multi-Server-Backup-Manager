import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function AccessDeniedPage() {
    const [currentIp, setCurrentIp] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIp = async () => {
            try {
                const res = await fetch('/api/ip-whitelist/current-ip');
                if (res.ok) {
                    const data = await res.json();
                    setCurrentIp(data.ip || 'Unknown');
                }
            } catch (e) {
                console.error('Failed to fetch IP:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchIp();
    }, []);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-2xl w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="p-4 bg-destructive/10 rounded-full">
                        <Shield className="w-16 h-16 text-destructive" />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold">Access Denied</h1>
                    <p className="text-xl text-muted-foreground">
                        You do not have access to this page from your current IP address.
                    </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="text-sm">IP Whitelist is enabled</span>
                    </div>
                    
                    {!loading && currentIp && (
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Your current IP address:</p>
                            <p className="font-mono text-lg font-semibold text-foreground bg-muted px-4 py-2 rounded-lg">
                                {currentIp}
                            </p>
                        </div>
                    )}
                    
                    <div className="pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground mb-4">
                            To gain access, you can:
                        </p>
                        <div className="space-y-3 mb-4">
                            <div className="bg-muted/50 p-3 rounded-lg text-sm">
                                <p className="font-medium mb-1">Option 1: Access IP Whitelist Management</p>
                                <p className="text-muted-foreground text-xs mb-2">
                                    If you have admin access, you can manage the whitelist directly:
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        window.location.href = '#/ip-whitelist';
                                    }}
                                    className="gap-2"
                                >
                                    <Shield className="w-4 h-4" />
                                    Go to IP Whitelist Management
                                </Button>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-lg text-sm">
                                <p className="font-medium mb-1">Option 2: Use Fix Script (Server Access Required)</p>
                                <p className="text-muted-foreground text-xs">
                                    Run on the server: <code className="bg-background px-2 py-1 rounded">./fix-ip-whitelist.sh</code>
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-center">
                            <Button
                                variant="outline"
                                onClick={() => window.location.reload()}
                                className="gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Refresh
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    window.location.href = '#/ip-whitelist';
                                }}
                                className="gap-2"
                            >
                                <Shield className="w-4 h-4" />
                                Manage Whitelist
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="text-xs text-muted-foreground">
                    If you believe this is an error, please contact your system administrator.
                </div>
            </div>
        </div>
    );
}

