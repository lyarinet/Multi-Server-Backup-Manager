import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { LocalDirectoryBrowser } from '../components/LocalDirectoryBrowser';
import { getApiBaseUrl, setApiBaseUrl, buildApiUrl } from '../config/api';
import {
    Settings as SettingsIcon,
    Folder,
    Server,
    Database,
    FileText,
    Globe,
    HardDrive,
    CheckCircle2,
    XCircle,
    Save,
    Lock,
    Key,
    Cloud,
    Plus,
    Clock,
    Trash2,
    Edit,
    Play,
    Pause,
    ChevronDown,
    ChevronUp,
    Power
} from 'lucide-react';
import { CloudStorageModal } from '../components/CloudStorageModal';
import { CronJobModal } from '../components/CronJobModal';

export default function SettingsPage() {
    const [servers, setServers] = useState<any[]>([]);
    const [globalLocalBackupPath, setGlobalLocalBackupPath] = useState<string>('');
    const [localBrowserOpen, setLocalBrowserOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [sslEnabled, setSslEnabled] = useState(false);
    const [sslPort, setSslPort] = useState<number | ''>('');
    const [sslCertPath, setSslCertPath] = useState('');
    const [sslKeyPath, setSslKeyPath] = useState('');

    // Cloud Storage state
    const [cloudStorageModalOpen, setCloudStorageModalOpen] = useState(false);
    const [driveClientId, setDriveClientId] = useState('');
    const [driveClientSecret, setDriveClientSecret] = useState('');
    const [driveRefreshToken, setDriveRefreshToken] = useState('');
    const [driveFolderId, setDriveFolderId] = useState('');
    const [driveAutoUpload, setDriveAutoUpload] = useState(false);

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passLoading, setPassLoading] = useState(false);

    // Cron jobs state
    const [cronJobs, setCronJobs] = useState<any[]>([]);
    const [cronLoading, setCronLoading] = useState(false);
    const [showCronModal, setShowCronModal] = useState(false);
    const [editingCronJob, setEditingCronJob] = useState<any>(null);

    // Login IP Whitelist state
    const [loginIpWhitelistEnabled, setLoginIpWhitelistEnabled] = useState(false);
    const [loginIpWhitelistEntries, setLoginIpWhitelistEntries] = useState<any[]>([]);
    const [loginIpWhitelistLoading, setLoginIpWhitelistLoading] = useState(false);
    const [loginIpWhitelistCurrentIp, setLoginIpWhitelistCurrentIp] = useState('');
    const [loginIpWhitelistNewIp, setLoginIpWhitelistNewIp] = useState('');
    const [loginIpWhitelistAdding, setLoginIpWhitelistAdding] = useState(false);

    // Autostart state
    const [autostartStatus, setAutostartStatus] = useState<any>(null);
    const [autostartLoading, setAutostartLoading] = useState(false);

    // API Configuration state
    const [apiBaseUrl, setApiBaseUrlState] = useState('');
    const [apiUrlLoading, setApiUrlLoading] = useState(false);
    const [apiUrlSaving, setApiUrlSaving] = useState(false);

    // Collapsible sections state
    const [expandedSections, setExpandedSections] = useState({
        apiConfig: true,
        security: true,
        globalConfig: true,
        cloudStorage: true,
        scheduledBackups: true,
        serverConfig: true,
        autostart: true,
    });

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Helper function to fetch with timeout
    const fetchWithTimeout = useCallback((url: string, timeout = 10000): Promise<Response> => {
        return Promise.race([
            fetch(url),
            new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error(`Request timeout - Backend server may not be running`)), timeout)
            )
        ]);
    }, []);

    const loadData = useCallback(async () => {
            setLoading(true);
            setError('');
        
            try {
            // Load servers
            const res = await fetchWithTimeout('/api/servers');
                if (!res.ok) {
                if (res.status === 401) {
                    throw new Error('Unauthorized - Please login');
                }
                throw new Error(`Failed to load servers: ${res.status} ${res.statusText}`);
                }
                const contentType = res.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    // Server not running - Vite dev server returned HTML
                    // Don't throw error, just set empty servers and show message
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
                
            // Load settings
            const sres = await fetchWithTimeout('/api/settings');
                if (!sres.ok) {
                if (sres.status === 401) {
                    throw new Error('Unauthorized - Please login');
                }
                throw new Error(`Failed to load settings: ${sres.status} ${sres.statusText}`);
                }
                const sContentType = sres.headers.get('content-type');
                if (!sContentType || !sContentType.includes('application/json')) {
                    // Server not running - don't throw, just skip settings load
                    console.warn('Settings endpoint returned non-JSON. API server may not be running.');
                    return;
                }
                let sdata;
                try {
                    sdata = await sres.json();
                } catch (e: any) {
                    console.warn('Failed to parse settings response. Server may not be running.');
                    return;
                }
                if (sdata && typeof sdata.globalLocalBackupPath === 'string') {
                    setGlobalLocalBackupPath(sdata.globalLocalBackupPath);
                }
                if (sdata) {
                    // Load API Base URL from database, fallback to localStorage
                    if (sdata.apiBaseUrl) {
                        setApiBaseUrlState(sdata.apiBaseUrl);
                        // Also sync to localStorage
                        await setApiBaseUrl(sdata.apiBaseUrl);
                    }
                    setSslEnabled(!!sdata.sslEnabled);
                    setSslPort(typeof sdata.sslPort === 'number' ? sdata.sslPort : '');
                    setSslCertPath(sdata.sslCertPath || '');
                    setSslKeyPath(sdata.sslKeyPath || '');
                setDriveClientId(sdata.driveClientId || '');
                setDriveClientSecret(sdata.driveClientSecret || '');
                setDriveRefreshToken(sdata.driveRefreshToken || '');
                setDriveFolderId(sdata.driveFolderId || '');
                setDriveAutoUpload(!!sdata.driveAutoUpload);
                }
                
                // Load cron jobs
                await loadCronJobs();
            } catch (e: any) {
                // Only log actual errors, not expected ones (like server not running)
                if (e.message && !e.message.includes('non-JSON') && !e.message.includes('parse')) {
                    console.error('Settings load error:', e);
                }
                const errorMsg = e.message || 'Failed to load data. Check if the backend server is running on port 3010.';
                if (errorMsg && !errorMsg.includes('non-JSON') && !errorMsg.includes('parse')) {
                    setError(errorMsg);
                }
            } finally {
                setLoading(false);
            }
    }, [fetchWithTimeout]);

    const loadCronJobs = useCallback(async () => {
        setCronLoading(true);
        try {
            const res = await fetchWithTimeout('/api/cron-jobs');
            if (res.ok) {
                const data = await res.json();
                setCronJobs(Array.isArray(data) ? data : []);
            }
        } catch (e: any) {
            console.error('Failed to load cron jobs:', e);
        } finally {
            setCronLoading(false);
        }
    }, [fetchWithTimeout]);

    const loadLoginIpWhitelist = useCallback(async () => {
        try {
            const statusRes = await fetch('/api/login-ip-whitelist/status');
            if (statusRes.ok) {
                const contentType = statusRes.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    try {
                        const statusData = await statusRes.json();
                        setLoginIpWhitelistEnabled(statusData.enabled);
                    } catch (e) {
                        // Silently ignore JSON parse errors
                    }
                }
            }

            const ipRes = await fetch('/api/login-ip-whitelist/current-ip');
            if (ipRes.ok) {
                const contentType = ipRes.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    try {
                        const ipData = await ipRes.json();
                        setLoginIpWhitelistCurrentIp(ipData.ip);
                    } catch (e) {
                        // Silently ignore JSON parse errors
                    }
                }
            }

            const entriesRes = await fetch('/api/login-ip-whitelist');
            if (entriesRes.ok) {
                const contentType = entriesRes.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    try {
                        const entriesData = await entriesRes.json();
                        setLoginIpWhitelistEntries(Array.isArray(entriesData) ? entriesData : []);
                    } catch (e) {
                        // Silently ignore JSON parse errors
                    }
                }
            }
        } catch (e: any) {
            // Only log if it's not a network error (server not running)
            if (e.name !== 'TypeError' || !e.message.includes('fetch')) {
                console.error('Failed to load login IP whitelist:', e);
            }
        }
    }, []);

    useEffect(() => {
        loadLoginIpWhitelist();
    }, [loadLoginIpWhitelist]);

    const loadAutostartStatus = useCallback(async () => {
        try {
            setAutostartLoading(true);
            const res = await fetch('/api/autostart/status');
            if (res.ok) {
                const contentType = res.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    try {
                        const data = await res.json();
                        setAutostartStatus(data);
                    } catch (e) {
                        // Silently ignore JSON parse errors
                    }
                }
            }
        } catch (e: any) {
            // Only log if it's not a network error (server not running)
            if (e.name !== 'TypeError' || !e.message.includes('fetch')) {
                console.error('Failed to load autostart status:', e);
            }
        } finally {
            setAutostartLoading(false);
        }
    }, []);

    // Load API URL configuration (fallback to localStorage if database doesn't have it)
    useEffect(() => {
        const loadApiUrl = async () => {
            setApiUrlLoading(true);
            try {
                // First try to get from localStorage (will be synced from database by loadData)
                const url = await getApiBaseUrl();
                setApiBaseUrlState(url);
            } catch (e) {
                console.error('Failed to load API URL:', e);
            } finally {
                setApiUrlLoading(false);
            }
        };
        loadApiUrl();
    }, []);

    useEffect(() => {
        loadData();
        loadAutostartStatus();
    }, [loadData, loadAutostartStatus]);

    const handleSaveApiUrl = async () => {
        setApiUrlSaving(true);
        try {
            // Save to database via API
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiBaseUrl: apiBaseUrl || '',
                }),
            });
            if (!res.ok) {
                const j = await res.json();
                throw new Error(j?.error || 'Failed to save API URL');
            }
            
            // Also save to localStorage and Capacitor Preferences for immediate use
            await setApiBaseUrl(apiBaseUrl);
            
            alert('API URL saved successfully! The app will use this URL for all API calls.');
            // For Android app, reload to apply changes
            if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
                window.location.reload();
            } else {
                // For web, just reload
                window.location.reload();
            }
        } catch (e: any) {
            alert(`Failed to save API URL: ${e.message || 'Unknown error'}`);
        } finally {
            setApiUrlSaving(false);
        }
    };

    const handleSaveGlobalPath = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    globalLocalBackupPath,
                    sslEnabled,
                    sslPort: sslPort === '' ? undefined : sslPort,
                    sslCertPath,
                    sslKeyPath,
                }),
            });
            if (!res.ok) {
                const j = await res.json();
                alert(`Save failed: ${j?.error || 'Unknown error'} `);
            }
        } catch (err) {
            alert('Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            alert("New passwords don't match");
            return;
        }
        if (newPassword.length < 6) {
            alert("Password must be at least 6 characters");
            return;
        }
        setPassLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token} `
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            if (res.ok) {
                const result = await res.json();
                alert(result.message || 'Password changed successfully. You will be logged out.');
                // Clear token and reload to force re-login (sessions are invalidated)
                localStorage.removeItem('auth_token');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                const j = await res.json();
                alert(`Failed: ${j.error} `);
            }
        } catch (e) {
            alert('Failed to change password');
        } finally {
            setPassLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 rounded-[var(--radius)] bg-primary/10">
                    <SettingsIcon className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground mt-1">Manage global preferences and view server configurations</p>
                </div>
            </div>

            <div className="space-y-8">
                {/* API Configuration Section */}
                <section>
                    <button
                        onClick={() => toggleSection('apiConfig')}
                        className="w-full text-xl font-semibold mb-4 flex items-center justify-between gap-2 hover:text-primary transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-primary" />
                            API Configuration
                        </div>
                        {expandedSections.apiConfig ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                    </button>
                    {expandedSections.apiConfig && (
                        <div className="bg-card border border-border rounded-[var(--radius)] p-6 theme-shadow hover:theme-shadow-md transition-all">
                            <div className="max-w-2xl space-y-4">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Configure the API base URL for the application. This is especially important for mobile apps or when accessing the API from a different domain.
                                    </p>
                                    <label className="block text-sm font-medium mb-2">
                                        API Base URL
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background focus:ring-2 focus:ring-ring focus:border-input transition-all font-mono text-sm"
                                        value={apiBaseUrl}
                                        onChange={(e) => setApiBaseUrlState(e.target.value)}
                                        placeholder="https://your-server.com:3010 or http://192.168.1.100:3010"
                                        disabled={apiUrlLoading}
                                    />
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Leave empty to use relative URLs (works with Vite proxy in development).
                                        <br />
                                        For mobile apps, enter the full URL including protocol (http:// or https://) and port.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleSaveApiUrl}
                                        disabled={apiUrlSaving || apiUrlLoading}
                                        className="gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        {apiUrlSaving ? 'Saving...' : 'Save API URL'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={async () => {
                                            setApiBaseUrlState('');
                                            await setApiBaseUrl('');
                                            alert('API URL reset. Using relative URLs.');
                                            window.location.reload();
                                        }}
                                        disabled={apiUrlSaving || apiUrlLoading}
                                    >
                                        Reset to Default
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* Security Section */}
                <section>
                    <button
                        onClick={() => toggleSection('security')}
                        className="w-full text-xl font-semibold mb-4 flex items-center justify-between gap-2 hover:text-primary transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-primary" />
                            Security
                        </div>
                        {expandedSections.security ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                    </button>
                    {expandedSections.security && (
                    <div className="bg-card border border-border rounded-[var(--radius)] p-6 theme-shadow hover:theme-shadow-md transition-all">
                        <div className="max-w-md space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Current Password</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="password"
                                        className="w-full h-10 pl-10 pr-3 rounded-[var(--radius)] border border-input bg-background focus:ring-2 focus:ring-ring focus:border-input transition-all"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="password"
                                        className="w-full h-10 pl-10 pr-3 rounded-[var(--radius)] border border-input bg-background focus:ring-2 focus:ring-ring focus:border-input transition-all"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="password"
                                        className="w-full h-10 pl-10 pr-3 rounded-[var(--radius)] border border-input bg-background focus:ring-2 focus:ring-ring focus:border-input transition-all"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <Button onClick={handleChangePassword} disabled={passLoading} className="w-full gap-2">
                                {passLoading ? 'Updating...' : 'Update Password'}
                            </Button>
                        </div>

                        {/* Login IP Whitelist */}
                        <div className="mt-8 pt-8 border-t border-border">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Lock className="w-5 h-5 text-primary" />
                                Login IP Whitelist
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Restrict which IP addresses can access the login page. This is separate from the general IP whitelist.
                            </p>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">Enable Login IP Whitelist</label>
                                    <button
                                        onClick={async () => {
                                            setLoginIpWhitelistLoading(true);
                                            try {
                                                const res = await fetch('/api/login-ip-whitelist/enable', {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ enabled: !loginIpWhitelistEnabled }),
                                                });
                                                if (res.ok) {
                                                    setLoginIpWhitelistEnabled(!loginIpWhitelistEnabled);
                                                }
                                            } catch (e) {
                                                console.error('Failed to toggle login IP whitelist:', e);
                                            } finally {
                                                setLoginIpWhitelistLoading(false);
                                            }
                                        }}
                                        disabled={loginIpWhitelistLoading}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                            loginIpWhitelistEnabled ? 'bg-primary' : 'bg-muted'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                loginIpWhitelistEnabled ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {loginIpWhitelistEnabled && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Add IP Address or CIDR Range</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    className="flex-1 h-10 px-3 rounded-[var(--radius)] border border-input bg-background focus:ring-2 focus:ring-ring focus:border-input transition-all"
                                                    value={loginIpWhitelistNewIp}
                                                    onChange={(e) => setLoginIpWhitelistNewIp(e.target.value)}
                                                    placeholder="192.168.1.1 or 192.168.1.0/24"
                                                />
                                                <Button
                                                    onClick={async () => {
                                                        if (!loginIpWhitelistNewIp.trim()) return;
                                                        setLoginIpWhitelistAdding(true);
                                                        try {
                                                            const res = await fetch('/api/login-ip-whitelist', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ ipAddress: loginIpWhitelistNewIp.trim() }),
                                                            });
                                                            if (res.ok) {
                                                                setLoginIpWhitelistNewIp('');
                                                                loadLoginIpWhitelist();
                                                            } else {
                                                                const data = await res.json();
                                                                alert(data.error || 'Failed to add IP');
                                                            }
                                                        } catch (e) {
                                                            alert('Failed to add IP');
                                                        } finally {
                                                            setLoginIpWhitelistAdding(false);
                                                        }
                                                    }}
                                                    disabled={loginIpWhitelistAdding || !loginIpWhitelistNewIp.trim()}
                                                    className="gap-2"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    Add
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Your current IP: <span className="font-mono">{loginIpWhitelistCurrentIp}</span>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="ml-2 h-6 text-xs"
                                                    onClick={() => {
                                                        if (loginIpWhitelistCurrentIp) {
                                                            setLoginIpWhitelistNewIp(loginIpWhitelistCurrentIp);
                                                        }
                                                    }}
                                                >
                                                    Use Current IP
                                                </Button>
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Whitelisted IPs</label>
                                            {loginIpWhitelistEntries.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">No IPs whitelisted yet.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {loginIpWhitelistEntries.map((entry) => (
                                                        <div
                                                            key={entry.id}
                                                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                                        >
                                                            <div>
                                                                <span className="font-mono text-sm">{entry.ipAddress}</span>
                                                                <span className="ml-2 text-xs text-muted-foreground">
                                                                    ({entry.type})
                                                                </span>
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={async () => {
                                                                    if (confirm('Remove this IP from login whitelist?')) {
                                                                        try {
                                                                            const res = await fetch(`/api/login-ip-whitelist/${entry.id}`, {
                                                                                method: 'DELETE',
                                                                            });
                                                                            if (res.ok) {
                                                                                loadLoginIpWhitelist();
                                                                            }
                                                                        } catch (e) {
                                                                            alert('Failed to remove IP');
                                                                        }
                                                                    }
                                                                }}
                                                                className="gap-2"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Remove
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    )}
                </section>

                {/* Global Settings Section */}
                <section>
                    <button
                        onClick={() => toggleSection('globalConfig')}
                        className="w-full text-xl font-semibold mb-4 flex items-center justify-between gap-2 hover:text-primary transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-primary" />
                            Global Configuration
                        </div>
                        {expandedSections.globalConfig ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                    </button>
                    {expandedSections.globalConfig && (
                    <div className="bg-card border border-border rounded-[var(--radius)] p-6 theme-shadow hover:theme-shadow-md transition-all">
                        <div className="max-w-2xl">
                            <label className="block text-sm font-medium mb-2">Global Backup Output Location</label>
                            <p className="text-sm text-muted-foreground mb-4">
                                All backups will be copied to this directory unless a server overrides it.
                            </p>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        className="w-full h-10 pl-10 pr-3 rounded-[var(--radius)] border border-input bg-background focus:ring-2 focus:ring-ring focus:border-input transition-all"
                                        value={globalLocalBackupPath}
                                        onChange={(e) => setGlobalLocalBackupPath(e.target.value)}
                                        placeholder="~/Server-Backups"
                                    />
                                </div>
                                <Button type="button" variant="outline" onClick={() => setLocalBrowserOpen(true)}>
                                    Browse
                                </Button>
                                <Button onClick={handleSaveGlobalPath} disabled={saving} className="gap-2">
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Saving...' : 'Save'}
                                </Button>
                            </div>

                            <div className="mt-10 space-y-2">
                                <h3 className="text-sm font-semibold">SSL (HTTPS) Server</h3>
                                <p className="text-sm text-muted-foreground">Enable HTTPS for the backend by providing certificate and key paths.</p>
                                <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={sslEnabled} onChange={(e)=> setSslEnabled(e.target.checked)} />
                                        Enable HTTPS
                                    </label>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <input
                                        className="h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                        placeholder="SSL Port (default 3443)"
                                        value={sslPort === '' ? '' : String(sslPort)}
                                        onChange={(e)=>{
                                            const v = e.target.value;
                                            setSslPort(v === '' ? '' : Number(v));
                                        }}
                                    />
                                    <input
                                        className="h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                        placeholder="Cert Path"
                                        value={sslCertPath}
                                        onChange={(e)=> setSslCertPath(e.target.value)}
                                    />
                                    <input
                                        className="h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                        placeholder="Key Path"
                                        value={sslKeyPath}
                                        onChange={(e)=> setSslKeyPath(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <Button onClick={handleSaveGlobalPath} disabled={saving} className="gap-2">
                                        <Save className="w-4 h-4" />
                                        {saving ? 'Saving...' : 'Save'}
                                    </Button>
                                </div>
                                <div className="text-xs text-muted-foreground">Restart the server after saving to apply HTTPS. Self-signed certs work for testing.</div>
                            </div>
                        </div>
                        {localBrowserOpen && (
                            <LocalDirectoryBrowser
                                initialPath={globalLocalBackupPath || (typeof window !== 'undefined' ? (window.process?.env?.HOME || '/') : '/')}
                                onClose={() => setLocalBrowserOpen(false)}
                                onSelect={(p) => { setGlobalLocalBackupPath(p); setLocalBrowserOpen(false); }}
                            />
                        )}
                    </div>
                    )}
                </section>

                {/* Cloud Storage Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => toggleSection('cloudStorage')}
                            className="flex items-center gap-2 text-xl font-semibold hover:text-primary transition-colors"
                        >
                            <Cloud className="w-5 h-5 text-primary" />
                            Cloud Storage
                            {expandedSections.cloudStorage ? (
                                <ChevronUp className="w-5 h-5 text-muted-foreground ml-2" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-muted-foreground ml-2" />
                            )}
                        </button>
                        {expandedSections.cloudStorage && (
                        <Button onClick={() => setCloudStorageModalOpen(true)} className="gap-2">
                            <Plus className="w-4 h-4" />
                            {driveClientId ? 'Edit Provider' : 'Add Provider'}
                        </Button>
                        )}
                    </div>
                    {expandedSections.cloudStorage && (
                        <>
                            {driveClientId ? (
                        <div className="bg-card border border-border rounded-[var(--radius)] p-6 theme-shadow hover:theme-shadow-md transition-all">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Cloud className="w-5 h-5 text-primary" />
                                        Google Drive
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Configured and {driveAutoUpload ? 'enabled' : 'disabled'} for auto-upload
                                    </p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    driveAutoUpload
                                        ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                        : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                                }`}>
                                    {driveAutoUpload ? 'Auto-Upload Enabled' : 'Auto-Upload Disabled'}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Client ID:</span>
                                    <p className="font-mono text-xs mt-1 break-all">{driveClientId || 'Not set'}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Folder ID:</span>
                                    <p className="font-mono text-xs mt-1 break-all">{driveFolderId || 'Not set (will use root)'}</p>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-muted-foreground">Status:</span>
                                    <p className="mt-1">
                                        {driveRefreshToken ? (
                                            <span className="text-green-500 flex items-center gap-1">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Configured
                                            </span>
                                        ) : (
                                            <span className="text-yellow-500 flex items-center gap-1">
                                                <XCircle className="w-4 h-4" />
                                                Missing refresh token
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-border">
                                <Button
                                    variant="outline"
                                    onClick={() => setCloudStorageModalOpen(true)}
                                    className="gap-2"
                                >
                                    <SettingsIcon className="w-4 h-4" />
                                    Edit Configuration
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-card border border-border rounded-[var(--radius)] p-6 theme-shadow">
                            <div className="text-center py-8">
                                <Cloud className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">No Cloud Storage Provider</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Add a cloud storage provider to automatically upload backups
                                </p>
                                <Button onClick={() => setCloudStorageModalOpen(true)} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Add Provider
                                </Button>
                            </div>
                        </div>
                    )}
                        </>
                    )}
                </section>

                {/* Scheduled Backups (Cron Jobs) Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => toggleSection('scheduledBackups')}
                            className="flex items-center gap-2 text-xl font-semibold hover:text-primary transition-colors"
                        >
                            <Clock className="w-5 h-5 text-primary" />
                            Scheduled Backups
                            {expandedSections.scheduledBackups ? (
                                <ChevronUp className="w-5 h-5 text-muted-foreground ml-2" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-muted-foreground ml-2" />
                            )}
                        </button>
                        {expandedSections.scheduledBackups && (
                        <Button onClick={() => { setEditingCronJob(null); setShowCronModal(true); }} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add Schedule
                        </Button>
                        )}
                    </div>
                    {expandedSections.scheduledBackups && (
                        <>
                            {cronLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : cronJobs.length === 0 ? (
                        <div className="bg-card border border-border rounded-[var(--radius)] p-8 text-center">
                            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Scheduled Backups</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Create a schedule to automatically backup your servers
                            </p>
                            <Button onClick={() => { setEditingCronJob(null); setShowCronModal(true); }} className="gap-2">
                                <Plus className="w-4 h-4" />
                                Create Schedule
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {cronJobs.map((job) => (
                                <div key={job.id} className="bg-card border border-border rounded-[var(--radius)] p-6 theme-shadow hover:theme-shadow-md transition-all">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold">{job.name}</h3>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    job.enabled
                                                        ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                                        : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                                                }`}>
                                                    {job.enabled ? 'Active' : 'Disabled'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                                <div>
                                                    <span className="font-medium text-foreground">Schedule:</span> {job.scheduleType === 'daily' ? 'Daily' : job.scheduleType === 'weekly' ? 'Weekly' : job.scheduleType === 'monthly' ? 'Monthly' : 'Custom'}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-foreground">Time:</span> {job.scheduleTime || '02:00'}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-foreground">Server:</span> {job.serverName || 'All Servers'}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-foreground">Cron:</span> <span className="font-mono text-xs">{job.schedule}</span>
                                                </div>
                                                {job.lastRun && (
                                                    <div>
                                                        <span className="font-medium text-foreground">Last Run:</span> {new Date(job.lastRun).toLocaleString()}
                                                    </div>
                                                )}
                                                {job.nextRun && (
                                                    <div>
                                                        <span className="font-medium text-foreground">Next Run:</span> {new Date(job.nextRun).toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={async () => {
                                                    const res = await fetch(`/api/cron-jobs/${job.id}`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ enabled: !job.enabled }),
                                                    });
                                                    if (res.ok) {
                                                        await loadCronJobs();
                                                    }
                                                }}
                                                className="gap-2"
                                            >
                                                {job.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                                {job.enabled ? 'Disable' : 'Enable'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => { setEditingCronJob(job); setShowCronModal(true); }}
                                                className="gap-2"
                                            >
                                                <Edit className="w-4 h-4" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={async () => {
                                                    if (confirm('Are you sure you want to delete this schedule?')) {
                                                        const res = await fetch(`/api/cron-jobs/${job.id}`, { method: 'DELETE' });
                                                        if (res.ok) {
                                                            await loadCronJobs();
                                                        }
                                                    }
                                                }}
                                                className="gap-2 text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                        </>
                    )}
                </section>

                {/* Server Configurations Section */}
                <section>
                    <button
                        onClick={() => toggleSection('serverConfig')}
                        className="w-full text-xl font-semibold mb-4 flex items-center justify-between gap-2 hover:text-primary transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Server className="w-5 h-5 text-primary" />
                            Server Configurations
                        </div>
                        {expandedSections.serverConfig ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                    </button>
                    {expandedSections.serverConfig && (
                        <>
                            {loading && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <p className="text-sm text-muted-foreground">Loading server configurations...</p>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="bg-destructive/10 text-destructive p-4 rounded-[var(--radius)] border border-destructive/20 space-y-3">
                            <p className="font-medium">{error}</p>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={loadData}
                            >
                                Retry
                            </Button>
                        </div>
                    )}

                    {!loading && !error && (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                            {servers.map((s) => (
                                <div key={s.id} className="bg-card border border-border rounded-[var(--radius)] p-6 theme-shadow hover:theme-shadow-md transition-all group">
                                    <div className="flex justify-between items-start mb-6 pb-4 border-b border-border">
                                        <div>
                                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                                {s.name}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                <span className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">
                                                    {s.user}@{s.ip}:{s.port}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-2 bg-primary/5 rounded-full group-hover:bg-primary/10 transition-colors">
                                            <Server className="w-5 h-5 text-primary" />
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Backup Options Grid */}
                                        <div>
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Backup Targets</h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                <StatusItem label="/var/www" active={s.backupWww} icon={Globe} />
                                                <StatusItem label="/var/log" active={s.backupLogs} icon={FileText} />
                                                <StatusItem label="/etc/nginx" active={s.backupNginx} icon={SettingsIcon} />
                                                <StatusItem label="Database" active={s.backupDb} icon={Database} />
                                            </div>
                                        </div>

                                        {/* Database Details */}
                                        {s.backupDb && (
                                            <div className="bg-secondary/30 rounded-[var(--radius)] p-3 text-sm">
                                                <div className="flex items-center gap-2 font-medium mb-2 text-primary">
                                                    <Database className="w-3 h-3" />
                                                    Database Settings
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                                                    <span>Host: <span className="text-foreground">{s.dbHost || 'localhost'}</span></span>
                                                    <span>Port: <span className="text-foreground">{s.dbPort || 3306}</span></span>
                                                    <span>User: <span className="text-foreground">{s.dbUser || '-'}</span></span>
                                                    <span className="col-span-2 truncate">DBs: <span className="text-foreground">{(s.dbSelected || []).join(', ') || 'All'}</span></span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Paths */}
                                        <div className="space-y-3">
                                            <div>
                                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Custom Paths</h4>
                                                {(!s.backupPaths || s.backupPaths.length === 0) ? (
                                                    <span className="text-sm text-muted-foreground italic">None configured</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {s.backupPaths.map((p: string, idx: number) => (
                                                            <span key={idx} className="text-xs bg-secondary px-2 py-1 rounded border border-border font-mono">
                                                                {p}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Local Output</h4>
                                                <div className="flex items-center gap-2 text-sm bg-background border border-border rounded px-3 py-2 font-mono text-muted-foreground">
                                                    <HardDrive className="w-3 h-3" />
                                                    <span className="truncate">{s.localBackupPath || '~/Server-Backups'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                        </>
                    )}
                </section>

                {/* Autostart Daemon Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => toggleSection('autostart')}
                            className="flex items-center gap-2 text-xl font-semibold hover:text-primary transition-colors"
                        >
                            <Power className="w-5 h-5 text-primary" />
                            Autostart Daemon
                            {expandedSections.autostart ? (
                                <ChevronUp className="w-5 h-5 text-muted-foreground ml-2" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-muted-foreground ml-2" />
                            )}
                        </button>
                    </div>
                    {expandedSections.autostart && (
                        <div className="bg-card border border-border rounded-[var(--radius)] p-6 theme-shadow hover:theme-shadow-md transition-all">
                            {autostartLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : autostartStatus ? (
                                <>
                                    <div className="mb-6">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                            <Power className="w-5 h-5 text-primary" />
                                            Systemd Service Status
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-secondary/30 rounded-[var(--radius)] p-4">
                                                <div className="text-sm text-muted-foreground mb-1">Service Installed</div>
                                                <div className={`text-lg font-semibold flex items-center gap-2 ${
                                                    autostartStatus.installed ? 'text-green-500' : 'text-gray-500'
                                                }`}>
                                                    {autostartStatus.installed ? (
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    ) : (
                                                        <XCircle className="w-5 h-5" />
                                                    )}
                                                    {autostartStatus.installed ? 'Yes' : 'No'}
                                                </div>
                                            </div>
                                            <div className="bg-secondary/30 rounded-[var(--radius)] p-4">
                                                <div className="text-sm text-muted-foreground mb-1">Service Enabled</div>
                                                <div className={`text-lg font-semibold flex items-center gap-2 ${
                                                    autostartStatus.enabled ? 'text-green-500' : 'text-gray-500'
                                                }`}>
                                                    {autostartStatus.enabled ? (
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    ) : (
                                                        <XCircle className="w-5 h-5" />
                                                    )}
                                                    {autostartStatus.enabled ? 'Yes' : 'No'}
                                                </div>
                                            </div>
                                            <div className="bg-secondary/30 rounded-[var(--radius)] p-4">
                                                <div className="text-sm text-muted-foreground mb-1">Service Active</div>
                                                <div className={`text-lg font-semibold flex items-center gap-2 ${
                                                    autostartStatus.active ? 'text-green-500' : 'text-gray-500'
                                                }`}>
                                                    {autostartStatus.active ? (
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    ) : (
                                                        <XCircle className="w-5 h-5" />
                                                    )}
                                                    {autostartStatus.active ? 'Running' : 'Stopped'}
                                                </div>
                                            </div>
                                            <div className="bg-secondary/30 rounded-[var(--radius)] p-4">
                                                <div className="text-sm text-muted-foreground mb-1">Autostart Setting</div>
                                                <div className={`text-lg font-semibold flex items-center gap-2 ${
                                                    autostartStatus.autostartEnabled ? 'text-green-500' : 'text-gray-500'
                                                }`}>
                                                    {autostartStatus.autostartEnabled ? (
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    ) : (
                                                        <XCircle className="w-5 h-5" />
                                                    )}
                                                    {autostartStatus.autostartEnabled ? 'Enabled' : 'Disabled'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-border pt-6 space-y-4">
                                        <div>
                                            <h4 className="text-sm font-semibold mb-3">Service Management</h4>
                                            <div className="flex flex-wrap gap-3">
                                                {!autostartStatus.installed && (
                                                    <Button
                                                        variant="outline"
                                                        onClick={async () => {
                                                            if (confirm('This will install the systemd service. It requires sudo privileges. Continue?')) {
                                                                try {
                                                                    const res = await fetch('/api/autostart/install', { method: 'POST' });
                                                                    const data = await res.json();
                                                                    if (res.ok) {
                                                                        alert(data.message || 'Service installed successfully');
                                                                        await loadAutostartStatus();
                                                                    } else {
                                                                        alert(data.error || 'Failed to install service');
                                                                    }
                                                                } catch (e) {
                                                                    alert('Failed to install service. You may need to run: sudo ./manage-autostart.sh install');
                                                                }
                                                            }
                                                        }}
                                                        className="gap-2"
                                                    >
                                                        <Power className="w-4 h-4" />
                                                        Install Service
                                                    </Button>
                                                )}
                                                {autostartStatus.installed && (
                                                    <>
                                                        <Button
                                                            variant={autostartStatus.autostartEnabled ? "outline" : "default"}
                                                            onClick={async () => {
                                                                try {
                                                                    const res = await fetch('/api/autostart/enable', { method: 'POST' });
                                                                    const data = await res.json();
                                                                    if (res.ok) {
                                                                        alert(data.message || 'Autostart enabled');
                                                                        if (data.warning) {
                                                                            alert(data.warning);
                                                                        }
                                                                        await loadAutostartStatus();
                                                                    } else {
                                                                        alert(data.error || 'Failed to enable autostart');
                                                                    }
                                                                } catch (e) {
                                                                    alert('Failed to enable autostart');
                                                                }
                                                            }}
                                                            disabled={autostartStatus.autostartEnabled}
                                                            className="gap-2"
                                                        >
                                                            <Play className="w-4 h-4" />
                                                            Enable Autostart
                                                        </Button>
                                                        <Button
                                                            variant={!autostartStatus.autostartEnabled ? "outline" : "default"}
                                                            onClick={async () => {
                                                                if (confirm('Are you sure you want to disable autostart?')) {
                                                                    try {
                                                                        const res = await fetch('/api/autostart/disable', { method: 'POST' });
                                                                        const data = await res.json();
                                                                        if (res.ok) {
                                                                            alert(data.message || 'Autostart disabled');
                                                                            if (data.warning) {
                                                                                alert(data.warning);
                                                                            }
                                                                            await loadAutostartStatus();
                                                                        } else {
                                                                            alert(data.error || 'Failed to disable autostart');
                                                                        }
                                                                    } catch (e) {
                                                                        alert('Failed to disable autostart');
                                                                    }
                                                                }
                                                            }}
                                                            disabled={!autostartStatus.autostartEnabled}
                                                            className="gap-2"
                                                        >
                                                            <Pause className="w-4 h-4" />
                                                            Disable Autostart
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            onClick={loadAutostartStatus}
                                                            className="gap-2"
                                                        >
                                                            <SettingsIcon className="w-4 h-4" />
                                                            Refresh Status
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-muted/30 rounded-[var(--radius)] p-4 text-sm">
                                            <h4 className="font-semibold mb-2">About Autostart</h4>
                                            <p className="text-muted-foreground mb-2">
                                                The autostart daemon allows the backup system to automatically start on server boot using systemd.
                                            </p>
                                            <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-3">
                                                <li>Install the service to create the systemd unit file</li>
                                                <li>Enable autostart to start the service on boot</li>
                                                <li>The service will automatically restart if it crashes</li>
                                                <li>Requires sudo privileges for installation and management</li>
                                            </ul>
                                            <div className="mt-3 pt-3 border-t border-border">
                                                <h5 className="font-semibold mb-2 text-xs uppercase tracking-wider">Auto-Detection</h5>
                                                <p className="text-muted-foreground text-xs mb-2">
                                                    The installation directory is automatically detected from where the script is located.
                                                </p>
                                                <div className="bg-background/50 rounded p-2 text-xs font-mono space-y-1">
                                                    <div className="text-muted-foreground">Script Location:</div>
                                                    <div className="text-foreground">./manage-autostart.sh</div>
                                                    <div className="text-muted-foreground mt-2">Detected Directory:</div>
                                                    <div className="text-foreground">Project root (where package.json exists)</div>
                                                </div>
                                                <p className="text-muted-foreground text-xs mt-2">
                                                    You can run the script from any location - it will automatically find the project root.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    Failed to load autostart status
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>

            <CloudStorageModal
                isOpen={cloudStorageModalOpen}
                onClose={() => setCloudStorageModalOpen(false)}
                onSuccess={() => {
                    loadData();
                }}
                existingConfig={{
                    driveClientId,
                    driveClientSecret,
                    driveRefreshToken,
                    driveFolderId,
                    driveAutoUpload,
                }}
            />

            <CronJobModal
                isOpen={showCronModal}
                onClose={() => { setShowCronModal(false); setEditingCronJob(null); }}
                onSuccess={() => {
                    loadCronJobs();
                }}
                job={editingCronJob}
                servers={servers}
            />
        </div>
    );
}

function StatusItem({ label, active, icon: Icon }: { label: string, active: boolean, icon: any }) {
    return (
        <div className={`flex items - center gap - 2 p - 2 rounded border ${active
                ? 'bg-primary/5 border-primary/20 text-foreground'
                : 'bg-muted/30 border-transparent text-muted-foreground'
            } `}>
            {active ? (
                <CheckCircle2 className="w-4 h-4 text-primary" />
            ) : (
                <XCircle className="w-4 h-4 text-muted-foreground/50" />
            )}
            <span className="text-sm font-medium">{label}</span>
        </div>
    );
}
