import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { buildApiUrl, getApiBaseUrl, setApiBaseUrl, clearApiBaseUrl } from '../config/api';
import { Settings } from 'lucide-react';

export default function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showApiConfig, setShowApiConfig] = useState(false);
    const [apiBaseUrl, setApiBaseUrlState] = useState('');
    
    // Load API URL on mount (for Android app)
    useEffect(() => {
        const loadApiUrl = async () => {
            const url = await getApiBaseUrl();
            setApiBaseUrlState(url);
            // Only show config if URL is explicitly empty (not using default)
            // Default URL will be used automatically, so no need to show config
            const stored = localStorage.getItem('api_base_url');
            if (!stored && !url && typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
                // Only show if truly no URL is set (not even default)
                // But since we have a default now, this should rarely happen
                setShowApiConfig(false); // Don't force config, use default
            }
        };
        loadApiUrl();
    }, []);

    const handleSaveApiUrl = async () => {
        try {
            const cleanUrl = apiBaseUrl.trim().replace(/\/$/, ''); // Remove trailing slash
            if (!cleanUrl) {
                alert('Please enter a valid API URL');
                return;
            }
            
            // Save to localStorage and Capacitor Preferences
            await setApiBaseUrl(cleanUrl);
            setApiBaseUrlState(cleanUrl);
            setShowApiConfig(false);
            
            // Verify the URL was saved
            const saved = await getApiBaseUrl();
            console.log('API URL saved:', saved);
            
            alert(`API URL saved: ${saved}\nYou can now login.`);
        } catch (e: any) {
            console.error('Failed to save API URL:', e);
            alert(`Failed to save API URL: ${e.message || 'Unknown error'}`);
        }
    };

    const submit = async () => {
        setLoading(true);
        setError('');
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 30000); // Increased timeout for mobile
        
        // Try login with current API URL first
        const tryLogin = async (useRelativeUrl = false): Promise<boolean> => {
            try {
                let apiUrl: string;
                if (useRelativeUrl) {
                    // Use relative URL directly
                    apiUrl = '/api/auth/login';
                    console.log('Retrying login with relative URL:', apiUrl);
                } else {
                    // Use configured API URL
                    apiUrl = await buildApiUrl('/api/auth/login');
                    console.log('Login attempt to:', apiUrl);
                }
            
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                signal: ctrl.signal,
            });
            
            // Check if response is JSON
            const contentType = res.headers.get('content-type');
            let data;
            if (contentType && contentType.includes('application/json')) {
                try {
                    data = await res.json();
                } catch (e) {
                    const text = await res.text();
                    console.error('Failed to parse JSON response:', text);
                        throw new Error(`Server error: ${res.status} ${res.statusText}`);
                }
            } else {
                const text = await res.text();
                console.error('Non-JSON response:', text.substring(0, 200));
                if (res.status === 502 || res.status === 503) {
                        throw new Error(`API server is not running or not accessible (${res.status})`);
                } else {
                        throw new Error(`Server returned non-JSON response (${res.status})`);
                }
            }
            
            if (!res.ok || !data.token) {
                // Check if it's a login IP whitelist error
                if (res.status === 403 && data.code === 'LOGIN_IP_WHITELIST') {
                        throw new Error('Access denied. Your IP address is not whitelisted for login.');
                } else if (res.status === 401) {
                        throw new Error('Invalid username or password');
                } else {
                        throw new Error(data?.error || `Login failed (${res.status})`);
                    }
                }
                
                // Success!
                onLogin(data.token);
                return true;
            } catch (e: any) {
                // Re-throw to be handled by caller
                throw e;
            }
        };
        
        try {
            // First try with configured API URL
            await tryLogin(false);
        } catch (e: any) {
            console.error('Login error with configured API URL:', e);
            
            // Check if it's a network/connection error
            const isConnectionError = 
                e?.name === 'AbortError' ||
                e?.message?.includes('Failed to fetch') ||
                e?.message?.includes('NetworkError') ||
                e?.message?.includes('not accessible') ||
                e?.message?.includes('timeout');
            
            // If it's a connection error and we're on web, try with relative URL
            if (isConnectionError && typeof window !== 'undefined' && !(window as any).Capacitor?.isNativePlatform()) {
                const currentUrl = await getApiBaseUrl();
                
                // Only try fallback if we have a configured API URL (not already using relative)
                if (currentUrl) {
                    console.log('API URL failed, trying fallback to relative URL...');
                    
                    try {
                        // Clear the bad API URL
                        await clearApiBaseUrl();
                        
                        // Retry with relative URL
                        await tryLogin(true);
                        
                        // Show success message
                        setError('⚠️ Configured API URL was not accessible. Using default (relative URL) instead.');
                        setTimeout(() => setError(''), 5000); // Clear message after 5 seconds
                        return;
                    } catch (retryError: any) {
                        // Even relative URL failed
                        console.error('Login failed even with relative URL:', retryError);
                        if (retryError.message?.includes('Invalid username or password') || 
                            retryError.message?.includes('Access denied')) {
                            // These are actual login errors, not connection errors
                            setError(retryError.message);
                        } else {
                            setError(`Cannot connect to API server.\n\nTried:\n1. ${currentUrl}\n2. Relative URL (/api/*)\n\nPlease check if the backend server is running.`);
                        }
                    }
                } else {
                    // Already using relative URL, show the error
                    if (e?.name === 'AbortError') {
                        setError('Login timed out. Check your internet connection.');
                    } else {
                        setError(`Cannot connect to API server.\n\nPlease check:\n1. API server is running\n2. Internet connection`);
                    }
                }
            } else {
                // Not a connection error or on mobile - show the actual error
            if (e?.name === 'AbortError') {
                setError('Login timed out. Check your internet connection and API URL.');
            } else if (e?.message?.includes('Failed to fetch') || e?.message?.includes('NetworkError')) {
                const currentUrl = await getApiBaseUrl();
                setError(`Cannot connect to API server.\n\nAPI URL: ${currentUrl || 'Not configured'}\n\nPlease check:\n1. API server is running\n2. Internet connection\n3. API URL is correct`);
            } else {
                    setError(e?.message || `Login failed: ${e?.message || 'Unknown error'}`);
                }
            }
        } finally {
            clearTimeout(timer);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-sm mx-auto mt-20 border border-border rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-4">Login</h1>
            
            {/* API Configuration for Android App */}
            {showApiConfig && (
                <div className="mb-4 p-4 bg-muted rounded-md border border-border">
                    <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-4 h-4" />
                        <h3 className="font-semibold text-sm">API Configuration Required</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                        Please enter the API server URL (e.g., https://apibk.lyarinet.com)
                    </p>
                    <input
                        type="text"
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm mb-2"
                        value={apiBaseUrl}
                        onChange={(e) => setApiBaseUrlState(e.target.value)}
                        placeholder="https://apibk.lyarinet.com"
                    />
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveApiUrl} disabled={!apiBaseUrl.trim()}>
                            Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowApiConfig(false)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
            
            <div className="space-y-3">
                <div>
                    <label className="block text-sm font-medium mb-1">Username</label>
                    <input className="w-full h-10 px-3 rounded-md border border-input bg-background" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <input type="password" className="w-full h-10 px-3 rounded-md border border-input bg-background" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button disabled={loading || !username || !password} onClick={submit}>{loading ? 'Logging in...' : 'Login'}</Button>
                </div>
                {error && <div className="text-destructive text-sm">{error}</div>}
                
                {/* Show API Config button for native apps */}
                {!showApiConfig && typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform() && (
                    <button
                        onClick={() => setShowApiConfig(true)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                        <Settings className="w-3 h-3" />
                        Configure API URL
                    </button>
                )}
            </div>
        </div>
    );
}
