import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import {
    Shield,
    Power,
    Plus,
    Trash2,
    Save,
    List,
    MapPin,
    Network,
    CheckCircle2,
    XCircle,
    Loader2,
} from 'lucide-react';

interface IpWhitelistEntry {
    id: number;
    ipAddress: string;
    type: 'single' | 'cidr';
    description?: string;
    createdAt: string;
}

export default function IpWhitelistPage() {
    const [enabled, setEnabled] = useState(false);
    const [status, setStatus] = useState<any>(null);
    const [entries, setEntries] = useState<IpWhitelistEntry[]>([]);
    const [currentIp, setCurrentIp] = useState<string>('');
    const [newIp, setNewIp] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState('');

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            // Load status
            const statusRes = await fetch('/api/ip-whitelist/status');
            if (statusRes.ok) {
                const statusData = await statusRes.json();
                setStatus(statusData);
                setEnabled(statusData.enabled);
            }

            // Load current IP
            const ipRes = await fetch('/api/ip-whitelist/current-ip');
            if (ipRes.ok) {
                const ipData = await ipRes.json();
                setCurrentIp(ipData.ip);
            }

            // Load entries
            const entriesRes = await fetch('/api/ip-whitelist');
            if (entriesRes.ok) {
                const entriesData = await entriesRes.json();
                setEntries(Array.isArray(entriesData) ? entriesData : []);
            }
        } catch (e: any) {
            setError(e.message || 'Failed to load IP whitelist data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleToggle = async () => {
        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/ip-whitelist/enable', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !enabled }),
            });
            if (res.ok) {
                setEnabled(!enabled);
                await loadData();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to update settings');
            }
        } catch (e: any) {
            setError(e.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleAddIp = async (ip?: string) => {
        const ipToAdd = ip || newIp;
        if (!ipToAdd.trim()) {
            setError('Please enter an IP address or CIDR range');
            return;
        }

        setAdding(true);
        setError('');
        try {
            const res = await fetch('/api/ip-whitelist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ipAddress: ipToAdd.trim() }),
            });
            if (res.ok) {
                setNewIp('');
                await loadData();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to add IP address');
            }
        } catch (e: any) {
            setError(e.message || 'Failed to add IP address');
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = async (id: number) => {
        if (!confirm('Are you sure you want to remove this IP address from the whitelist?')) {
            return;
        }

        try {
            const res = await fetch(`/api/ip-whitelist/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                await loadData();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to remove IP address');
            }
        } catch (e: any) {
            setError(e.message || 'Failed to remove IP address');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">IP Whitelist Management</h1>
                    <p className="text-muted-foreground mt-1">Control access to the backup system by IP address</p>
                </div>
                {status && (
                    <div className="flex gap-4">
                        <div className="bg-card border border-border rounded-lg p-4 min-w-[120px]">
                            <div className="flex items-center gap-2 mb-1">
                                <Shield className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Status</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {enabled ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-gray-500" />
                                )}
                                <span className="font-semibold">{enabled ? 'Enabled' : 'Disabled'}</span>
                            </div>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-4 min-w-[120px]">
                            <div className="flex items-center gap-2 mb-1">
                                <List className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Total IPs</span>
                            </div>
                            <span className="text-2xl font-bold">{status.total || 0}</span>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-4 min-w-[120px]">
                            <div className="flex items-center gap-2 mb-1">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Single IPs</span>
                            </div>
                            <span className="text-2xl font-bold">{status.singleIps || 0}</span>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-4 min-w-[120px]">
                            <div className="flex items-center gap-2 mb-1">
                                <Network className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">CIDR Ranges</span>
                            </div>
                            <span className="text-2xl font-bold">{status.cidrRanges || 0}</span>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* IP Whitelist Control */}
                <div className="bg-card border border-border rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Power className="w-5 h-5 text-primary" />
                        IP Whitelist Control
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Enable IP Whitelist</label>
                            <button
                                onClick={handleToggle}
                                disabled={saving}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    enabled ? 'bg-primary' : 'bg-muted'
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        enabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            When enabled, only whitelisted IP addresses can access the system.
                        </p>
                        <Button onClick={handleToggle} disabled={saving} className="w-full gap-2">
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Settings'}
                        </Button>

                        {currentIp && (
                            <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                                <div className="text-sm text-muted-foreground mb-2">Current IP:</div>
                                <div className="font-mono text-lg font-semibold text-primary">{currentIp}</div>
                                <Button
                                    onClick={() => handleAddIp(currentIp)}
                                    disabled={adding || entries.some(e => e.ipAddress === currentIp)}
                                    variant="outline"
                                    size="sm"
                                    className="mt-3 gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Current IP
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Add IP Address */}
                <div className="bg-card border border-border rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary" />
                        Add IP Address
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">IP Address or CIDR Range</label>
                            <input
                                type="text"
                                value={newIp}
                                onChange={(e) => setNewIp(e.target.value)}
                                placeholder="192.168.1.1 or 192.168.1.0/24"
                                className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-input"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleAddIp();
                                    }
                                }}
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                Enter a single IP address (e.g., 192.168.1.1) or CIDR range (e.g., 192.168.1.0/24)
                            </p>
                        </div>
                        <Button
                            onClick={() => handleAddIp()}
                            disabled={adding || !newIp.trim()}
                            className="w-full gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            {adding ? 'Adding...' : '+ Add IP'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Current IP Whitelist */}
            <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <List className="w-5 h-5 text-primary" />
                    Current IP Whitelist
                </h2>
                {entries.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No IP addresses whitelisted yet. Add your first IP address above.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left py-3 px-4 font-semibold">IP Address / Range</th>
                                    <th className="text-left py-3 px-4 font-semibold">Type</th>
                                    <th className="text-right py-3 px-4 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry) => (
                                    <tr key={entry.id} className="border-b border-border hover:bg-accent/50">
                                        <td className="py-3 px-4 font-mono">{entry.ipAddress}</td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                    entry.type === 'single'
                                                        ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                                        : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                                }`}
                                            >
                                                {entry.type === 'single' ? 'Single IP' : 'CIDR Range'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleRemove(entry.id)}
                                                className="gap-2 text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Remove
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

