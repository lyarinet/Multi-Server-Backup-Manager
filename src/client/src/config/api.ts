// Runtime API URL configuration
// Supports both web (localStorage) and mobile (Capacitor Preferences)

const API_URL_KEY = 'api_base_url';
const DEFAULT_API_URL = import.meta.env.VITE_API_BASE_URL || '';

// Cache for synchronous access
let cachedApiUrl: string | null = null;

/**
 * Check if running in Capacitor native environment
 */
function isNativePlatform(): boolean {
    try {
        // Check if Capacitor is available
        if (typeof window !== 'undefined' && (window as any).Capacitor) {
            return (window as any).Capacitor.isNativePlatform();
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Get the configured API base URL
 * Priority: User setting > Environment variable > Default (empty for relative URLs)
 */
export async function getApiBaseUrl(): Promise<string> {
    try {
        // Always use localStorage for now - Capacitor Preferences will be loaded at runtime in native apps
        // The native app build will include Capacitor, and the runtime will use it
        const stored = localStorage.getItem(API_URL_KEY);
        const result = stored || DEFAULT_API_URL;
        cachedApiUrl = result;
        
        // In native apps, also try to sync with Capacitor Preferences if available
        if (isNativePlatform() && typeof window !== 'undefined') {
            try {
                // Access Capacitor at runtime (only available in native builds)
                const Capacitor = (window as any).Capacitor;
                if (Capacitor && Capacitor.Plugins && Capacitor.Plugins.Preferences) {
                    const { value } = await Capacitor.Plugins.Preferences.get({ key: API_URL_KEY });
                    if (value) {
                        cachedApiUrl = value;
                        return value;
                    }
                }
            } catch (e) {
                // Capacitor not available or Preferences plugin not loaded
                // Fall through to localStorage
            }
        }
        
        return result;
    } catch (error) {
        console.error('Failed to get API base URL:', error);
        return DEFAULT_API_URL;
    }
}

/**
 * Set the API base URL
 */
export async function setApiBaseUrl(url: string): Promise<void> {
    try {
        const cleanUrl = url.trim().replace(/\/$/, ''); // Remove trailing slash
        
        // Always save to localStorage
        localStorage.setItem(API_URL_KEY, cleanUrl);
        cachedApiUrl = cleanUrl;
        
        // In native apps, also save to Capacitor Preferences if available
        if (isNativePlatform() && typeof window !== 'undefined') {
            try {
                // Access Capacitor at runtime (only available in native builds)
                const Capacitor = (window as any).Capacitor;
                if (Capacitor && Capacitor.Plugins && Capacitor.Plugins.Preferences) {
                    await Capacitor.Plugins.Preferences.set({ key: API_URL_KEY, value: cleanUrl });
                }
            } catch (e) {
                // Capacitor not available or Preferences plugin not loaded
                // localStorage is already saved, so we're good
            }
        }
    } catch (error) {
        console.error('Failed to set API base URL:', error);
        throw error;
    }
}

/**
 * Build a full API URL from a path
 * Handles both relative and absolute URLs
 */
export async function buildApiUrl(path: string): Promise<string> {
    const baseUrl = await getApiBaseUrl();
    
    // If no base URL is configured, use relative path (works with Vite proxy in dev)
    if (!baseUrl) {
        return path;
    }
    
    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    // Combine base URL and path
    return `${baseUrl}${cleanPath}`;
}

/**
 * Synchronous version for use in contexts where async is not possible
 * Uses cached value or falls back to default
 */
export function getApiBaseUrlSync(): string {
    if (cachedApiUrl !== null) {
        return cachedApiUrl;
    }
    
    try {
        // For sync access, always use localStorage
        const stored = localStorage.getItem(API_URL_KEY);
        cachedApiUrl = stored || DEFAULT_API_URL;
        return cachedApiUrl;
    } catch (error) {
        return DEFAULT_API_URL;
    }
}

/**
 * Build API URL synchronously (uses cached value)
 */
export function buildApiUrlSync(path: string): string {
    const baseUrl = getApiBaseUrlSync();
    
    if (!baseUrl) {
        return path;
    }
    
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
}

/**
 * Load API URL from database (for mobile apps and web)
 * This should be called after login to sync database settings
 * Note: This uses the current API base URL to fetch settings, so it works even if API URL changes
 */
export async function loadApiUrlFromDatabase(): Promise<string | null> {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            return null; // Not logged in yet
        }
        
        // Use buildApiUrl to get the full URL (works with current API base URL)
        const apiUrl = await buildApiUrl('/api/settings');
        const res = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (res.ok) {
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await res.json();
                if (data?.apiBaseUrl) {
                    // Sync to localStorage and Capacitor Preferences
                    await setApiBaseUrl(data.apiBaseUrl);
                    return data.apiBaseUrl;
                }
            }
        }
        return null;
    } catch (error) {
        console.error('Failed to load API URL from database:', error);
        return null;
    }
}

/**
 * Initialize and cache the API URL on app startup
 * For mobile apps, also tries to load from database if logged in
 */
export async function initializeApiConfig(): Promise<void> {
    try {
        // First try to get from localStorage/Capacitor Preferences
        cachedApiUrl = await getApiBaseUrl();
        
        // If we have a token, try to load from database (for mobile apps)
        const token = localStorage.getItem('auth_token');
        if (token) {
            const dbUrl = await loadApiUrlFromDatabase();
            if (dbUrl) {
                cachedApiUrl = dbUrl;
            }
        }
    } catch (error) {
        console.error('Failed to initialize API config:', error);
    }
}
