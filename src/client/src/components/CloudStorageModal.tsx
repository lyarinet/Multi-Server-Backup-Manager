import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X, Cloud, Info, AlertTriangle, ExternalLink, Check } from 'lucide-react';
import { GoogleDriveHelpModal } from './GoogleDriveHelpModal';

interface CloudStorageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    existingConfig?: {
        driveClientId?: string;
        driveClientSecret?: string;
        driveRefreshToken?: string;
        driveFolderId?: string;
        driveAutoUpload?: boolean;
    };
}

export function CloudStorageModal({ isOpen, onClose, onSuccess, existingConfig }: CloudStorageModalProps) {
    const [providerName, setProviderName] = useState('Google Drive');
    const [providerType, setProviderType] = useState<'google-drive' | 'ftp' | 's3'>('google-drive');
    const [enabled, setEnabled] = useState(true);
    
    // Google Drive fields
    const [clientId, setClientId] = useState(existingConfig?.driveClientId || '');
    const [clientSecret, setClientSecret] = useState(existingConfig?.driveClientSecret || '');
    const [refreshToken, setRefreshToken] = useState(existingConfig?.driveRefreshToken || '');
    const [folderId, setFolderId] = useState(existingConfig?.driveFolderId || '');
    const [autoUpload, setAutoUpload] = useState(existingConfig?.driveAutoUpload ?? false);
    
    // FTP/FTPS fields
    const [ftpHost, setFtpHost] = useState('');
    const [ftpPort, setFtpPort] = useState('21');
    const [ftpUsername, setFtpUsername] = useState('');
    const [ftpPassword, setFtpPassword] = useState('');
    const [ftpPath, setFtpPath] = useState('/');
    const [ftpUseSsl, setFtpUseSsl] = useState(false);
    const [ftpPassive, setFtpPassive] = useState(true);
    
    // S3-Compatible fields
    const [s3Endpoint, setS3Endpoint] = useState('');
    const [s3AccessKey, setS3AccessKey] = useState('');
    const [s3SecretKey, setS3SecretKey] = useState('');
    const [s3Bucket, setS3Bucket] = useState('');
    const [s3Region, setS3Region] = useState('us-east-1');
    const [s3Path, setS3Path] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [helpModalOpen, setHelpModalOpen] = useState(false);

    useEffect(() => {
        if (existingConfig) {
            setClientId(existingConfig.driveClientId || '');
            setClientSecret(existingConfig.driveClientSecret || '');
            setRefreshToken(existingConfig.driveRefreshToken || '');
            setFolderId(existingConfig.driveFolderId || '');
            setAutoUpload(existingConfig.driveAutoUpload ?? false);
        }
    }, [existingConfig]);
    
    // Update provider name when type changes
    useEffect(() => {
        if (providerType === 'google-drive') {
            setProviderName('Google Drive');
        } else if (providerType === 'ftp') {
            setProviderName('FTP/FTPS');
        } else if (providerType === 's3') {
            setProviderName('S3-Compatible');
        }
    }, [providerType]);

    if (!isOpen) return null;

    const getRedirectUri = () => {
        const protocol = window.location.protocol;
        const host = window.location.host;
        return `${protocol}//${host}/oauth_callback`;
    };

    const handleTest = async () => {
        if (!clientId || !clientSecret || !refreshToken) {
            setTestResult({ success: false, message: 'Please fill in Client ID, Client Secret, and Refresh Token' });
            return;
        }

        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/drive/test');
            if (res.ok) {
                const data = await res.json();
                setTestResult({ success: true, message: data.message || 'Connection successful!' });
            } else {
                let errorMessage = 'Connection failed';
                try {
                    const error = await res.json();
                    errorMessage = error.error || error.message || `HTTP ${res.status}: ${res.statusText}`;
                } catch (e) {
                    errorMessage = `HTTP ${res.status}: ${res.statusText}`;
                }
                console.error('Drive test error:', errorMessage);
                setTestResult({ success: false, message: errorMessage });
            }
        } catch (error: any) {
            console.error('Drive test exception:', error);
            setTestResult({ success: false, message: error.message || 'Failed to test connection' });
        } finally {
            setTesting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let payload: any = {};
            
            if (providerType === 'google-drive') {
                // Validate refresh token format
                const trimmedToken = refreshToken?.trim();
                if (trimmedToken && (!trimmedToken.startsWith('1//') || trimmedToken.length > 500)) {
                    alert('Invalid refresh token format. Refresh tokens should start with "1//" and be around 100-200 characters. Please check and try again.');
                    setLoading(false);
                    return;
                }
                
                payload = {
                    driveClientId: clientId || undefined,
                    driveClientSecret: clientSecret || undefined,
                    driveRefreshToken: trimmedToken || undefined,
                    driveFolderId: folderId || undefined,
                    driveAutoUpload: autoUpload,
                };
            } else if (providerType === 'ftp') {
                // Validate FTP fields
                if (!ftpHost || !ftpUsername || !ftpPassword) {
                    alert('Please fill in all required FTP fields (Host, Username, Password)');
                    setLoading(false);
                    return;
                }
                
                payload = {
                    ftpHost: ftpHost.trim(),
                    ftpPort: parseInt(ftpPort) || 21,
                    ftpUsername: ftpUsername.trim(),
                    ftpPassword: ftpPassword,
                    ftpPath: ftpPath.trim() || '/',
                    ftpUseSsl: ftpUseSsl,
                    ftpPassive: ftpPassive,
                    providerType: 'ftp',
                    providerName: providerName,
                    providerEnabled: enabled,
                };
            } else if (providerType === 's3') {
                // Validate S3 fields
                if (!s3Endpoint || !s3AccessKey || !s3SecretKey || !s3Bucket) {
                    alert('Please fill in all required S3 fields (Endpoint, Access Key, Secret Key, Bucket)');
                    setLoading(false);
                    return;
                }
                
                payload = {
                    s3Endpoint: s3Endpoint.trim(),
                    s3AccessKey: s3AccessKey.trim(),
                    s3SecretKey: s3SecretKey,
                    s3Bucket: s3Bucket.trim(),
                    s3Region: s3Region.trim() || undefined,
                    s3Path: s3Path.trim() || undefined,
                    providerType: 's3',
                    providerName: providerName,
                    providerEnabled: enabled,
                };
            }
            
            console.log('Saving settings:', {
                hasClientId: !!payload.driveClientId,
                hasClientSecret: !!payload.driveClientSecret,
                hasRefreshToken: !!payload.driveRefreshToken,
                refreshTokenLength: payload.driveRefreshToken?.length || 0,
                refreshTokenStartsWith: payload.driveRefreshToken?.substring(0, 10) || 'N/A',
            });
            
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const saved = await res.json();
                console.log('Settings saved successfully:', {
                    hasRefreshToken: !!saved.driveRefreshToken,
                });
                onSuccess();
                onClose();
            } else {
                const j = await res.json();
                console.error('Save failed:', j);
                alert(`Save failed: ${j?.error || 'Unknown error'}`);
            }
        } catch (error: any) {
            console.error('Save exception:', error);
            alert(`Failed to save configuration: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-10">
            <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-2xl mx-4 my-auto">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-semibold">Add Cloud Storage Provider</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Provider Name */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Provider Name</label>
                        <input
                            type="text"
                            className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                            value={providerName}
                            onChange={(e) => setProviderName(e.target.value)}
                            placeholder="Google Drive"
                        />
                    </div>

                    {/* Provider Type */}
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-2">Select Type</label>
                            <select
                                className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                value={providerType}
                                onChange={(e) => setProviderType(e.target.value as any)}
                            >
                                <option value="google-drive">Google Drive</option>
                                <option value="ftp">FTP/FTPS</option>
                                <option value="s3">S3-Compatible</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={enabled}
                                    onChange={(e) => setEnabled(e.target.checked)}
                                />
                                Enable this provider
                            </label>
                        </div>
                    </div>

                    {/* Configuration sections based on provider type */}
                    {providerType === 'google-drive' && (
                        <>
                            <div className="border-t border-border pt-6">
                                <h3 className="text-lg font-semibold mb-4">Google Drive Configuration</h3>

                                {/* Setup Required Info */}
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                                    <div className="flex items-start gap-3">
                                        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm mb-2">
                                                <strong>Setup Required:</strong> You need to create a Google Cloud Project and enable the Google Drive API.{' '}
                                                <a
                                                    href="https://console.cloud.google.com/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 hover:underline inline-flex items-center gap-1"
                                                >
                                                    Go to Google Cloud Console
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                📖 <button 
                                                    type="button"
                                                    onClick={() => setHelpModalOpen(true)}
                                                    className="text-blue-500 hover:underline font-medium"
                                                >
                                                    Need help? Click here for step-by-step instructions
                                                </button>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Library Info */}
                                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                                    <div className="flex items-start gap-3">
                                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm">
                                                <strong>Library Installed:</strong> The Google API client library (googleapis npm package) is already installed and ready to use. No additional installation required.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Client ID */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">Client ID</label>
                                    <input
                                        type="text"
                                        className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                        value={clientId}
                                        onChange={(e) => setClientId(e.target.value)}
                                        placeholder="Your Google OAuth Client ID"
                                    />
                                </div>

                                {/* Client Secret */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">Client Secret</label>
                                    <input
                                        type="password"
                                        className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                        value={clientSecret}
                                        onChange={(e) => setClientSecret(e.target.value)}
                                        placeholder="Your Google OAuth Client Secret"
                                    />
                                </div>

                                {/* Redirect URI */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">Redirect URI</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 h-10 px-3 rounded-[var(--radius)] border border-input bg-background font-mono text-sm"
                                            value="https://bk.lyarinet.com/oauth_callback"
                                            readOnly
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch('/api/drive/redirect-uri');
                                                    const data = await res.json();
                                                    const instructions = data.instructions.join('\n');
                                                    alert(`Redirect URI: ${data.redirectUri}\n\n${instructions}`);
                                                } catch (e) {
                                                    console.error(e);
                                                }
                                            }}
                                            title="Show setup instructions"
                                        >
                                            ℹ️
                                        </Button>
                                    </div>
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-2">
                                        <p className="text-xs font-semibold text-yellow-600 mb-1">⚠️ IMPORTANT: Add this EXACT URL to Google Cloud Console</p>
                                        <p className="text-xs text-muted-foreground">
                                            1. Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google Cloud Console → Credentials</a><br/>
                                            2. Click your OAuth 2.0 Client ID<br/>
                                            3. In "Authorized redirect URIs", add: <code className="bg-secondary px-1 py-0.5 rounded">https://bk.lyarinet.com/oauth_callback</code><br/>
                                            4. NO trailing slash, exact match required<br/>
                                            5. Click "Save" and wait 1-2 minutes
                                        </p>
                                    </div>
                                </div>

                                {/* Refresh Token */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">Refresh Token</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="password"
                                            className="flex-1 h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                            value={refreshToken}
                                            onChange={(e) => {
                                                const value = e.target.value.trim();
                                                // Basic validation: refresh tokens should start with "1//" and be reasonable length
                                                if (value && !value.startsWith('1//') && value.length > 200) {
                                                    alert('Warning: This does not look like a valid Google refresh token. Refresh tokens should start with "1//" and be around 100-200 characters.');
                                                }
                                                setRefreshToken(value);
                                            }}
                                            placeholder="Refresh token for automatic token renewal"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch('/api/drive/oauth-url');
                                                    if (res.ok) {
                                                        const data = await res.json();
                                                        // Show the redirect URI being used
                                                        console.log('Using redirect URI:', data.redirectUri);
                                                        
                                                        // Open OAuth window
                                                        const oauthWindow = window.open(
                                                            data.authUrl,
                                                            'oauth',
                                                            'width=600,height=700,scrollbars=yes,resizable=yes'
                                                        );
                                                        
                                                        // Listen for OAuth success message
                                                        const messageHandler = (event: MessageEvent) => {
                                                            // Only accept messages from same origin
                                                            if (event.origin !== window.location.origin) {
                                                                return;
                                                            }
                                                            if (event.data && event.data.type === 'oauth_success') {
                                                                window.removeEventListener('message', messageHandler);
                                                                try {
                                                                    if (oauthWindow) {
                                                                        oauthWindow.close();
                                                                    }
                                                                } catch (e) {
                                                                    // Ignore errors when closing window (COOP policy)
                                                                }
                                                                // Reload settings to get the new refresh token
                                                                setTimeout(() => {
                                                                    window.location.reload();
                                                                }, 1000);
                                                            }
                                                        };
                                                        
                                                        window.addEventListener('message', messageHandler);
                                                        
                                                        // Poll the API to check if refresh token was saved (instead of checking window.closed)
                                                        let pollCount = 0;
                                                        const maxPolls = 60; // Poll for up to 60 seconds
                                                        
                                                        const checkTokenSaved = setInterval(async () => {
                                                            pollCount++;
                                                            
                                                            // Stop polling after max attempts
                                                            if (pollCount > maxPolls) {
                                                                clearInterval(checkTokenSaved);
                                                                window.removeEventListener('message', messageHandler);
                                                                return;
                                                            }
                                                            
                                                            try {
                                                                // Check if refresh token was saved by polling the settings API
                                                                const res = await fetch('/api/settings');
                                                                if (res.ok) {
                                                                    const settings = await res.json();
                                                                    if (settings.driveRefreshToken) {
                                                                        // Token was saved! Reload the page
                                                                        clearInterval(checkTokenSaved);
                                                                        window.removeEventListener('message', messageHandler);
                                                                        window.location.reload();
                                                                    }
                                                                }
                                                            } catch (e) {
                                                                // Ignore API errors during polling
                                                            }
                                                        }, 1000); // Poll every second
                                                        
                                                        // Cleanup after 2 minutes to prevent memory leaks
                                                        setTimeout(() => {
                                                            clearInterval(checkTokenSaved);
                                                            window.removeEventListener('message', messageHandler);
                                                        }, 120000);
                                                    } else {
                                                        const error = await res.json();
                                                        alert(`Failed to get OAuth URL: ${error.error}`);
                                                    }
                                                } catch (error: any) {
                                                    alert(`Failed: ${error.message}`);
                                                }
                                            }}
                                        >
                                            Get via OAuth
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Click "Get via OAuth" to automatically obtain the refresh token, or paste it manually if you already have it.
                                    </p>
                                </div>

                                {/* Folder ID */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">Default Folder ID (Optional)</label>
                                    <input
                                        type="text"
                                        className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                        value={folderId}
                                        onChange={(e) => setFolderId(e.target.value)}
                                        placeholder="Google Drive folder ID for backups"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Leave empty to use root or auto-create folders
                                    </p>
                                </div>

                                {/* Auto Upload */}
                                <div className="mb-4">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={autoUpload}
                                            onChange={(e) => setAutoUpload(e.target.checked)}
                                        />
                                        Automatically upload backups to Google Drive after completion
                                    </label>
                                </div>

                                {/* Test Connection - Only for Google Drive */}
                                <div className="mb-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleTest}
                                        disabled={testing || !clientId || !clientSecret || !refreshToken}
                                        className="gap-2"
                                    >
                                        {testing ? 'Testing...' : 'Test Connection'}
                                    </Button>
                                    {testResult && (
                                        <div className={`mt-2 p-3 rounded-lg flex items-center gap-2 ${
                                            testResult.success
                                                ? 'bg-green-500/10 border border-green-500/20 text-green-500'
                                                : 'bg-red-500/10 border border-red-500/20 text-red-500'
                                        }`}>
                                            {testResult.success ? (
                                                <Check className="w-4 h-4" />
                                            ) : (
                                                <AlertTriangle className="w-4 h-4" />
                                            )}
                                            <span className="text-sm">{testResult.message}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {providerType === 'ftp' && (
                        <div className="border-t border-border pt-6">
                            <h3 className="text-lg font-semibold mb-4">FTP/FTPS Configuration</h3>
                            
                            {/* Host */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">FTP Host</label>
                                <input
                                    type="text"
                                    className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                    value={ftpHost}
                                    onChange={(e) => setFtpHost(e.target.value)}
                                    placeholder="ftp.example.com"
                                    required
                                />
                            </div>

                            {/* Port */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Port</label>
                                <input
                                    type="number"
                                    className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                    value={ftpPort}
                                    onChange={(e) => setFtpPort(e.target.value)}
                                    placeholder="21"
                                    min="1"
                                    max="65535"
                                />
                            </div>

                            {/* Username */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Username</label>
                                <input
                                    type="text"
                                    className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                    value={ftpUsername}
                                    onChange={(e) => setFtpUsername(e.target.value)}
                                    placeholder="ftp_username"
                                    required
                                />
                            </div>

                            {/* Password */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Password</label>
                                <input
                                    type="password"
                                    className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                    value={ftpPassword}
                                    onChange={(e) => setFtpPassword(e.target.value)}
                                    placeholder="ftp_password"
                                    required
                                />
                            </div>

                            {/* Path */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Remote Path</label>
                                <input
                                    type="text"
                                    className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                    value={ftpPath}
                                    onChange={(e) => setFtpPath(e.target.value)}
                                    placeholder="/backups"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Remote directory path on the FTP server (default: /)
                                </p>
                            </div>

                            {/* SSL/TLS */}
                            <div className="mb-4">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={ftpUseSsl}
                                        onChange={(e) => setFtpUseSsl(e.target.checked)}
                                    />
                                    Use FTPS (SSL/TLS)
                                </label>
                            </div>

                            {/* Passive Mode */}
                            <div className="mb-4">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={ftpPassive}
                                        onChange={(e) => setFtpPassive(e.target.checked)}
                                    />
                                    Use Passive Mode (recommended)
                                </label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Passive mode is recommended for most firewalls and NAT configurations
                                </p>
                            </div>
                        </div>
                    )}

                    {providerType === 's3' && (
                        <div className="border-t border-border pt-6">
                            <h3 className="text-lg font-semibold mb-4">S3-Compatible Configuration</h3>
                            
                            {/* Endpoint */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Endpoint URL</label>
                                <input
                                    type="text"
                                    className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                    value={s3Endpoint}
                                    onChange={(e) => setS3Endpoint(e.target.value)}
                                    placeholder="https://s3.amazonaws.com or https://s3.region.amazonaws.com"
                                    required
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    For AWS S3: https://s3.region.amazonaws.com<br/>
                                    For other S3-compatible services: your service endpoint URL
                                </p>
                            </div>

                            {/* Access Key */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Access Key ID</label>
                                <input
                                    type="text"
                                    className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                    value={s3AccessKey}
                                    onChange={(e) => setS3AccessKey(e.target.value)}
                                    placeholder="AKIAIOSFODNN7EXAMPLE"
                                    required
                                />
                            </div>

                            {/* Secret Key */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Secret Access Key</label>
                                <input
                                    type="password"
                                    className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                    value={s3SecretKey}
                                    onChange={(e) => setS3SecretKey(e.target.value)}
                                    placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                                    required
                                />
                            </div>

                            {/* Bucket */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Bucket Name</label>
                                <input
                                    type="text"
                                    className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                    value={s3Bucket}
                                    onChange={(e) => setS3Bucket(e.target.value)}
                                    placeholder="my-backup-bucket"
                                    required
                                />
                            </div>

                            {/* Region */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Region</label>
                                <input
                                    type="text"
                                    className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                    value={s3Region}
                                    onChange={(e) => setS3Region(e.target.value)}
                                    placeholder="us-east-1"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    AWS region (e.g., us-east-1, eu-west-1) or leave empty for S3-compatible services
                                </p>
                            </div>

                            {/* Path Prefix */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Path Prefix (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                    value={s3Path}
                                    onChange={(e) => setS3Path(e.target.value)}
                                    placeholder="backups/"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Optional prefix to organize files in the bucket (e.g., "backups/")
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="gap-2">
                            {loading ? 'Saving...' : existingConfig ? 'Update Provider' : 'Add Provider'}
                        </Button>
                    </div>
                </form>
            </div>

            <GoogleDriveHelpModal
                isOpen={helpModalOpen}
                onClose={() => setHelpModalOpen(false)}
            />
        </div>
    );
}

