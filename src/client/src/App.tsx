import React, { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import SettingsPage from './pages/Settings';
import { ServerList } from './components/ServerList';
import { AddServerModal } from './components/AddServerModal';
import { BackupView } from './components/BackupView';
import { Button } from './components/ui/button';
import { Plus } from 'lucide-react';
import { Server } from '../../shared/types';
import LoginPage from './pages/Login';

import { DownloadPage } from './pages/Download';
import IpWhitelistPage from './pages/IpWhitelist';
import AccessDeniedPage from './pages/AccessDenied';

function App() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activeBackupLogId, setActiveBackupLogId] = useState<number | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleBackup = async (server: Server) => {
        try {
            const res = await fetch(`/api/backup/${server.id}`, { method: 'POST' });
            const data = await res.json();
            setActiveBackupLogId(data.logId);
        } catch (error) {
            console.error(error);
        }
    };

    const [route, setRoute] = useState<string>(typeof window !== 'undefined' ? (window.location.hash || '#/') : '#/');
    useEffect(() => {
        const handler = () => setRoute(window.location.hash || '#/');
        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }, []);
    const isSettings = route.startsWith('#/settings');
    const isDownloads = route.startsWith('#/downloads');
    const isIpWhitelist = route.startsWith('#/ip-whitelist');
    const [token, setToken] = useState<string | null>(typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);
    const [ipWhitelisted, setIpWhitelisted] = useState<boolean | null>(null); // null = checking, true = allowed, false = blocked
    const [checkingIp, setCheckingIp] = useState(true);
    const [loginIpAllowed, setLoginIpAllowed] = useState<boolean | null>(null); // null = checking, true = allowed, false = blocked
    const [checkingLoginIp, setCheckingLoginIp] = useState(true);

    // Check login IP whitelist status when not logged in
    useEffect(() => {
        const checkLoginIpWhitelist = async () => {
            if (token) {
                setLoginIpAllowed(true);
                setCheckingLoginIp(false);
                return;
            }

            setCheckingLoginIp(true);
            try {
                const res = await fetch('/api/login-ip-whitelist/check');
                if (res.ok) {
                    const contentType = res.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        try {
                            const data = await res.json();
                            setLoginIpAllowed(data.allowed);
                        } catch (e: any) {
                            // Silently ignore JSON parse errors
                            setLoginIpAllowed(true);
                        }
                    } else {
                        // Non-JSON response, allow access (fail open)
                        setLoginIpAllowed(true);
                    }
                } else {
                    // On error, allow access (fail open)
                    setLoginIpAllowed(true);
                }
            } catch (e: any) {
                // On network error, assume allowed (fail open)
                // Only log if it's not a JSON parse error
                if (e.name !== 'SyntaxError' || !e.message.includes('JSON')) {
                    // Silently ignore - fail open
                }
                setLoginIpAllowed(true);
            } finally {
                setCheckingLoginIp(false);
            }
        };

        checkLoginIpWhitelist();
    }, [token]);

    // Listen for API URL cleared event and refresh
    useEffect(() => {
        let lastRefreshTime = 0;
        const REFRESH_DEBOUNCE_MS = 2000; // Only refresh once per 2 seconds
        
        const handleApiUrlCleared = () => {
            const now = Date.now();
            // Debounce: prevent rapid repeated refreshes
            if (now - lastRefreshTime < REFRESH_DEBOUNCE_MS) {
                return;
            }
            lastRefreshTime = now;
            
            console.log('API URL cleared event received, components will use relative URLs');
            // Force refresh of IP whitelist check and other API calls
            if (token) {
                setRefreshKey((k) => k + 1);
            }
        };
        
        window.addEventListener('api-url-cleared', handleApiUrlCleared);
        return () => window.removeEventListener('api-url-cleared', handleApiUrlCleared);
    }, [token]);

    // Check IP whitelist status on mount and when route changes (if logged in)
    useEffect(() => {
        const checkIpWhitelist = async () => {
            // Skip check for login page
            if (!token) {
                setIpWhitelisted(true);
                setCheckingIp(false);
                return;
            }

            setCheckingIp(true);
            try {
                // Try to fetch any API endpoint to check if IP is whitelisted
                // We'll use a lightweight endpoint
                const res = await fetch('/api/ip-whitelist/status', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                
                if (res.status === 403) {
                    // IP is not whitelisted
                    try {
                        const data = await res.json();
                        if (data.code === 'IP_WHITELIST') {
                            setIpWhitelisted(false);
                            setCheckingIp(false);
                            return;
                        }
                    } catch (e) {
                        // Response might not be JSON, but it's still 403
                        setIpWhitelisted(false);
                        setCheckingIp(false);
                        return;
                    }
                }
                
                // If we get here, IP is whitelisted (or whitelist is disabled)
                setIpWhitelisted(true);
                setCheckingIp(false);
            } catch (e: any) {
                // On network error, assume allowed (fail open) but log it
                console.error('IP whitelist check error:', e);
                setIpWhitelisted(true);
                setCheckingIp(false);
            }
        };

        checkIpWhitelist();
    }, [token, route, refreshKey]);

    useEffect(() => {
        const orig = window.fetch;
        window.fetch = async (input: any, init?: any) => {
            const headers = new Headers(init?.headers || {});
            const t = localStorage.getItem('auth_token');
            if (t) headers.set('Authorization', `Bearer ${t}`);
            
            // Build URL if it's a relative API path
            let url = input;
            if (typeof input === 'string' && input.startsWith('/api')) {
                const { buildApiUrlSync, getApiBaseUrlSync } = await import('./config/api');
                
                // CRITICAL: Check if we should force relative URLs (after clearing bad URL)
                // Check the base URL - if it's empty, we're using relative URLs
                const baseUrl = getApiBaseUrlSync();
                
                // If baseUrl is empty (meaning we're using relative URLs), use the path directly
                // This prevents rebuilding the URL with a bad domain
                if (!baseUrl || baseUrl === '') {
                    url = input; // Use relative path directly
                } else {
                    url = buildApiUrlSync(input);
                }
            }
            
            try {
                const res = await orig(url, { ...(init || {}), headers });
            
            // Handle 401 (unauthorized)
            if (res.status === 401) {
                localStorage.removeItem('auth_token');
                setToken(null);
            }
            
            // Handle 403 (IP whitelist blocked)
            if (res.status === 403) {
                try {
                    const data = await res.json();
                    if (data.code === 'IP_WHITELIST') {
                        setIpWhitelisted(false);
                    }
                } catch (e) {
                    // If response is not JSON, still check if it might be IP whitelist
                    const text = await res.text();
                    if (text.includes('IP address is not whitelisted') || text.includes('Access denied')) {
                        setIpWhitelisted(false);
                    }
                }
            }
            
            return res;
            } catch (error: any) {
                // If it's a connection error and we're using an absolute URL, try relative URL fallback
                if (typeof input === 'string' && input.startsWith('/api')) {
                    const { isConnectionError, clearApiBaseUrlSync, getApiBaseUrlSync } = await import('./config/api');
                    
                    if (isConnectionError(error)) {
                        const currentUrl = getApiBaseUrlSync();
                        
                        // Only try fallback if we have a configured API URL (not already using relative)
                        if (currentUrl && typeof window !== 'undefined' && !(window as any).Capacitor?.isNativePlatform()) {
                            console.log('API call failed in App.tsx, trying fallback to relative URL for:', input);
                            
                            // Clear the bad API URL SYNCHRONOUSLY (critical for immediate effect)
                            clearApiBaseUrlSync();
                            
                            // Retry with relative URL directly using origFetch to bypass interceptor
                            // This prevents infinite loops and ensures we use the relative path
                            // Auth headers are already set in the headers object above
                            return orig(input, { ...(init || {}), headers });
                        }
                    }
                }
                
                // Re-throw the original error
                throw error;
            }
        };
        return () => { window.fetch = orig; };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        setToken(null);
    };

    // Show loading while checking login IP whitelist
    if (checkingLoginIp && !token) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground">Checking access...</p>
                </div>
            </div>
        );
    }

    // Show blocked message if login IP is not whitelisted
    if (!token && loginIpAllowed === false) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 text-center space-y-4">
                    <div className="text-destructive text-4xl mb-4">🔒</div>
                    <h1 className="text-2xl font-bold">Login Access Denied</h1>
                    <p className="text-muted-foreground">
                        Your IP address is not whitelisted for login. Please contact your administrator to add your IP address to the login whitelist.
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                        className="mt-4"
                    >
                        Refresh
                    </Button>
                </div>
            </div>
        );
    }

    // Show loading while checking IP whitelist
    if (checkingIp && token) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground">Checking access...</p>
                </div>
            </div>
        );
    }

    // Show Access Denied page if IP is not whitelisted
    // BUT allow access to IP Whitelist page so admins can fix lockouts
    if (token && ipWhitelisted === false && !isIpWhitelist) {
        return <AccessDeniedPage />;
    }

    return (
        <Layout onLogout={handleLogout} isAuthenticated={!!token}>
            {!token ? (
                <LoginPage onLogin={async (tok) => { 
                    localStorage.setItem('auth_token', tok); 
                    setToken(tok);
                    // Load API URL from database after login (for Android app)
                    try {
                        const { loadApiUrlFromDatabase } = await import('./config/api');
                        await loadApiUrlFromDatabase();
                    } catch (e) {
                        console.error('Failed to load API URL from database:', e);
                    }
                }} />
            ) : isSettings ? (
                <SettingsPage />
            ) : isDownloads ? (
                <DownloadPage />
            ) : isIpWhitelist ? (
                <IpWhitelistPage />
            ) : (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Servers</h1>
                            <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage your servers and backups</p>
                        </div>
                        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 w-full sm:w-auto">
                            <Plus className="w-4 h-4" />
                            Add Server
                        </Button>
                    </div>

                    <ServerList key={refreshKey} onBackup={handleBackup} />

                    <AddServerModal
                        isOpen={isAddModalOpen}
                        onClose={() => setIsAddModalOpen(false)}
                        onSuccess={() => setRefreshKey((k) => k + 1)}
                    />

                    {activeBackupLogId && (
                        <BackupView
                            logId={activeBackupLogId}
                            onClose={() => setActiveBackupLogId(null)}
                        />
                    )}
                </>
            )}
        </Layout>
    );
}

export default App;
