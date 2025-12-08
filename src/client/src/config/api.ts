// Runtime API URL configuration
// Supports both web (localStorage) and mobile (Capacitor Preferences)

const API_URL_KEY = 'api_base_url';
const DEFAULT_API_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Detect default API URL from current domain
 * Automatically converts frontend domain to API domain
 * 
 * Patterns supported:
 * - bk.lyarinet.com -> apibk.lyarinet.com
 * - app.example.com -> api.example.com or apiapp.example.com
 * - www.example.com -> api.example.com
 * - example.com -> api.example.com
 */
export function detectDefaultApiUrl(): string {
    if (typeof window === 'undefined' || !window.location) {
        return '';
    }
    
    const origin = window.location.origin;
    const hostname = window.location.hostname;
    const protocol = window.location.protocol; // http: or https:
    
    // For localhost, use relative URLs (Vite proxy handles it)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return ''; // Use relative URLs for localhost (Vite proxy handles it)
    }
    
    // For local network IPs, try to detect API URL with common port
    if (hostname.startsWith('192.168.') || hostname.startsWith('10.0.') || hostname.startsWith('172.')) {
        // For local network, try same IP with common API port
        // e.g., 192.168.1.100 -> http://192.168.1.100:3010
        // User can modify this in settings if different
        return `${protocol}//${hostname}:3010`;
    }
    
    // Split hostname into parts
    const parts = hostname.split('.');
    
    // Handle different domain patterns
    if (parts.length === 1) {
        // Single domain (e.g., "example")
        return `${protocol}//api.${hostname}`;
    } else if (parts.length === 2) {
        // Main domain (e.g., "example.com")
        return `${protocol}//api.${hostname}`;
    } else if (parts.length >= 3) {
        // Subdomain + domain (e.g., "bk.lyarinet.com", "app.example.com", "test.example.com")
        const subdomain = parts[0];
        const domain = parts.slice(1).join('.'); // Get domain part
        
        // Generic pattern: Try api{subdomain}.{domain} first (most common pattern)
        // e.g., bk.lyarinet.com -> apibk.lyarinet.com
        // e.g., app.example.com -> apiapp.example.com
        // e.g., test.example.com -> apitest.example.com
        if (subdomain !== 'api') {
            return `${protocol}//api${subdomain}.${domain}`;
        }
        
        // If subdomain is already 'api', try api.{domain}
        // e.g., api.example.com -> api.example.com (same)
        return `${protocol}//api.${domain}`;
    }
    
    // Fallback: Use same origin (API might be on same domain)
    return origin;
}

// Default API URL to use if none is configured
// For web: detect from domain but allow relative URLs (empty string) to work
// For mobile: detect from current location or use smart detection
const FALLBACK_API_URL = (() => {
    if (typeof window === 'undefined' || !window.location) {
        return '';
    }
    
    // Always try to detect the API URL from current domain (works for both web and mobile)
    const detected = detectDefaultApiUrl();
    
    // If we're in a native app, use the detected URL or fallback
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
        if (detected) {
            return detected;
        }
        // If detection fails, try to use current origin
        if (window.location && window.location.origin) {
            return window.location.origin;
        }
        // Last resort: use a default (can be overridden)
        return 'https://apibk.lyarinet.com';
    }
    
    // For web: return detected URL if available, but empty string is also valid (uses relative URLs)
    // The detected URL will be shown in Settings for user convenience
    // But empty string allows the app to work with relative URLs automatically
    // Vite proxy handles it in dev, same origin in production
    return detected || '';
})();

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
 * Priority: User setting > Environment variable > Fallback default URL
 */
export async function getApiBaseUrl(): Promise<string> {
    try {
        // Always use localStorage for now - Capacitor Preferences will be loaded at runtime in native apps
        // The native app build will include Capacitor, and the runtime will use it
        const stored = localStorage.getItem(API_URL_KEY);
        let result = stored || DEFAULT_API_URL;
        
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
        
        // If no URL is configured, use fallback
        // For web: empty string (relative URLs work with Vite proxy)
        // For mobile: use detected/default URL
        if (!result) {
            if (isNativePlatform()) {
                // Mobile app: use detected/default URL
                if (FALLBACK_API_URL) {
                    result = FALLBACK_API_URL;
                    console.log('Using default API URL for mobile:', result);
                }
            } else {
                // Web: use empty string for relative URLs (works with Vite proxy)
                result = '';
                console.log('Using relative URLs for web (no API URL configured)');
            }
        }
        
        cachedApiUrl = result;
        return result;
    } catch (error) {
        console.error('Failed to get API base URL:', error);
        // Return fallback on error
        return FALLBACK_API_URL || DEFAULT_API_URL;
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
        // Reset the flag since we're setting a new URL
        useRelativeUrls = false;
        
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

// Flag to prevent multiple rapid clear attempts (debounce)
let lastClearTime = 0;
const CLEAR_DEBOUNCE_MS = 1000; // Only allow one clear per second

// Flag to track if we've detected a bad URL and should use relative URLs
// This is set to true when we clear a bad URL and should persist for the session
let useRelativeUrls = false;

// Track if we've ever cleared a bad URL in this session (persists across page reloads via sessionStorage)
const BAD_URL_CLEARED_KEY = 'api_url_was_cleared';

/**
 * Clear the API base URL synchronously (fallback to relative URLs)
 * Used when configured API URL fails and we want to use relative URLs instead
 * This synchronous version is critical for immediate clearing in fetch interceptors
 */
export function clearApiBaseUrlSync(): void {
    try {
        // Check if there's actually a URL to clear
        const hadUrl = localStorage.getItem(API_URL_KEY) !== null;
        
        // Debounce: prevent rapid repeated clears
        const now = Date.now();
        if (hadUrl && now - lastClearTime < CLEAR_DEBOUNCE_MS) {
            // Already cleared recently, skip
            return;
        }
        
        // Remove from localStorage immediately (synchronous)
        localStorage.removeItem(API_URL_KEY);
        // Clear cache immediately so all components use relative URLs
        cachedApiUrl = '';
        // Set flag to force relative URLs (for this session)
        useRelativeUrls = true;
        // Also mark in sessionStorage that we've cleared a bad URL (persists across page reloads)
        try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
                sessionStorage.setItem(BAD_URL_CLEARED_KEY, 'true');
            }
        } catch (e) {
            // Ignore errors
        }
        lastClearTime = now;
        
        // Only dispatch event if there was actually a URL to clear
        // This prevents infinite loops when components refresh after clearing
        if (hadUrl) {
            console.log('API URL cleared synchronously, using relative URLs');
            
            // Dispatch custom event to notify all components
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('api-url-cleared'));
            }
        }
    } catch (error) {
        console.error('Failed to clear API base URL:', error);
    }
}

/**
 * Clear the API base URL (fallback to relative URLs)
 * Used when configured API URL fails and we want to use relative URLs instead
 * This async version also clears Capacitor Preferences for native apps
 */
export async function clearApiBaseUrl(): Promise<void> {
    // Clear synchronously first (critical for immediate effect)
    clearApiBaseUrlSync();
    
    // In native apps, also clear from Capacitor Preferences (async)
    if (isNativePlatform() && typeof window !== 'undefined') {
        try {
            const Capacitor = (window as any).Capacitor;
            if (Capacitor && Capacitor.Plugins && Capacitor.Plugins.Preferences) {
                await Capacitor.Plugins.Preferences.remove({ key: API_URL_KEY });
            }
        } catch (e) {
            // Ignore errors
        }
    }
}

/**
 * Check if an API call failed due to connection error
 */
export function isConnectionError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString() || '';
    const errorName = error.name || '';
    
    return (
        errorName === 'AbortError' ||
        errorName === 'TypeError' ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('ERR_CERT') ||
        errorMessage.includes('ERR_CONNECTION') ||
        errorMessage.includes('not accessible') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('CORS')
    );
}

/**
 * Build a full API URL from a path
 * Handles both relative and absolute URLs
 * For web: uses relative URLs if no API URL is configured (works with Vite proxy)
 * For mobile: requires absolute URL
 */
export async function buildApiUrl(path: string): Promise<string> {
    const baseUrl = await getApiBaseUrl();
    
    // If no base URL is configured
    if (!baseUrl) {
        // For web, use relative URLs (Vite proxy handles it in dev, same origin in prod)
        if (!isNativePlatform()) {
            return path; // Relative URL works for web
        }
        // For mobile, try to use fallback
        const fallback = FALLBACK_API_URL || '';
        if (fallback) {
            const cleanPath = path.startsWith('/') ? path : `/${path}`;
            return `${fallback}${cleanPath}`;
        }
        // Last resort: return path and let fetch handle it
        console.warn('No API base URL configured for mobile app, using path:', path);
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
 * IMPORTANT: Always checks localStorage directly to get the latest value
 */
export function getApiBaseUrlSync(): string {
    // If we've detected a bad URL and cleared it, force relative URLs for web
    // This check MUST come first to prevent using any bad URL from localStorage
    // Also check sessionStorage to see if we've cleared a bad URL in a previous page load
    const wasCleared = useRelativeUrls || 
        (typeof window !== 'undefined' && window.sessionStorage && 
         window.sessionStorage.getItem(BAD_URL_CLEARED_KEY) === 'true');
    
    if (wasCleared && !isNativePlatform()) {
        // Double-check: if localStorage still has a value, remove it to be safe
        try {
            const stillHasValue = localStorage.getItem(API_URL_KEY);
            if (stillHasValue) {
                // Remove it again to be safe (might have been set by another component)
                localStorage.removeItem(API_URL_KEY);
                cachedApiUrl = '';
    }
        } catch (e) {
            // Ignore errors
        }
        // Ensure flag is set
        useRelativeUrls = true;
        cachedApiUrl = '';
        return '';
    }
    
    // CRITICAL: Also check if localStorage has a bad URL that should be cleared
    // This is a safety check in case the flag wasn't set but we detect a problematic URL
    // For web, if we have an absolute URL stored but the flag is not set, check if it's problematic
    if (!isNativePlatform()) {
        try {
            const stored = localStorage.getItem(API_URL_KEY);
            // If we have a stored URL but useRelativeUrls flag is not set, and we're on web,
            // this might indicate a bad URL that needs to be cleared
            // We'll be conservative and only clear if we detect known bad patterns
            if (stored && stored.trim() !== '' && !useRelativeUrls) {
                // Check for known problematic patterns (certificate errors, wrong domains, etc.)
                const lowerStored = stored.toLowerCase();
                if (lowerStored.includes('apibk1') || 
                    lowerStored.includes('err_cert') ||
                    (lowerStored.startsWith('https://') && !lowerStored.includes(window.location.hostname.replace('bk.', 'apibk.')))) {
                    // Potentially bad URL detected, clear it and set flag
                    console.warn('Potentially bad API URL detected, clearing it and using relative URLs:', stored);
                    localStorage.removeItem(API_URL_KEY);
                    useRelativeUrls = true;
                    cachedApiUrl = '';
                    return '';
                }
            }
        } catch (e) {
            // Ignore errors
        }
    }
    
    // Always check localStorage first to get latest value (in case it was cleared)
    // This ensures we never use a stale cached value
    try {
        const stored = localStorage.getItem(API_URL_KEY);
        
        // If nothing in localStorage, use fallback logic
        if (!stored || stored === '') {
            if (isNativePlatform()) {
                // Mobile app: use detected/default URL
                if (FALLBACK_API_URL) {
                    cachedApiUrl = FALLBACK_API_URL;
                    return FALLBACK_API_URL;
                }
            } else {
                // Web: use empty string for relative URLs
                cachedApiUrl = '';
                return '';
            }
        }
        
        // If we have a stored value, use it (and update cache)
        // TypeScript: stored is guaranteed to be string here (not null) due to check above
        const storedValue = stored as string;
        cachedApiUrl = storedValue;
        return storedValue;
    } catch (error) {
        // On error, return fallback
        const fallback = isNativePlatform() ? (FALLBACK_API_URL || '') : '';
        cachedApiUrl = fallback;
        return fallback;
    }
}

/**
 * Build API URL synchronously (uses cached value)
 * For web: uses relative URLs if no API URL is configured
 * For mobile: requires absolute URL
 * IMPORTANT: Always calls getApiBaseUrlSync() to get the latest value from localStorage
 */
export function buildApiUrlSync(path: string): string {
    // CRITICAL: Check flag first before doing anything else
    // This ensures that if we've cleared a bad URL, we immediately use relative URLs
    if (useRelativeUrls && !isNativePlatform()) {
        // Force relative URL for web if we've detected and cleared a bad URL
        return path;
    }
    
    // Always get fresh value from localStorage (not from cache)
    // This ensures we get the latest value even if it was just cleared
    const baseUrl = getApiBaseUrlSync();
    
    // If no base URL is configured
    if (!baseUrl || baseUrl === '') {
        // For web, use relative URLs (Vite proxy handles it in dev, same origin in prod)
        if (!isNativePlatform()) {
            return path; // Relative URL works for web
        }
        // For mobile, try to use fallback
        const fallback = FALLBACK_API_URL || '';
        if (fallback) {
            const cleanPath = path.startsWith('/') ? path : `/${path}`;
            return `${fallback}${cleanPath}`;
        }
        // Last resort: return path
        console.warn('No API base URL configured for mobile app, using path:', path);
        return path;
    }
    
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
}

/**
 * Load API URL from database (for mobile apps and web)
 * This should be called after login to sync database settings
 * Note: For web, uses relative URLs to avoid issues with bad configured URLs
 */
export async function loadApiUrlFromDatabase(): Promise<string | null> {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            return null; // Not logged in yet
        }
        
        // For web, always use relative URL to avoid issues with bad configured URLs
        // For mobile, use buildApiUrl to respect configured API URL
        let apiUrl: string;
        if (isNativePlatform()) {
            apiUrl = await buildApiUrl('/api/settings');
        } else {
            // Web: use relative URL directly (will work with Vite proxy or same origin)
            apiUrl = '/api/settings';
        }
        
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
 * Note: For web, if no URL is configured, we'll use relative URLs (empty string)
 */
export async function initializeApiConfig(): Promise<void> {
    try {
        // First try to get from localStorage/Capacitor Preferences
        // Use sync version to get immediate value (localStorage is synchronous)
        cachedApiUrl = getApiBaseUrlSync();
        
        // For web, if we have a configured URL, we'll let the fetch interceptor validate it
        // For mobile, we need to use the configured URL or fallback
        if (isNativePlatform()) {
            // Mobile: try to load from database if logged in
        const token = localStorage.getItem('auth_token');
        if (token) {
            const dbUrl = await loadApiUrlFromDatabase();
            if (dbUrl) {
                cachedApiUrl = dbUrl;
            }
            }
        } else {
            // Web: For web, we prefer relative URLs, but if a URL is configured,
            // we'll let the fetch interceptor handle validation and fallback
            // Don't try to load from database during initialization on web
            // (it will be loaded after login if needed)
        }
    } catch (error) {
        console.error('Failed to initialize API config:', error);
        // On error, ensure we use fallback (empty string for web, default for mobile)
        cachedApiUrl = isNativePlatform() ? (FALLBACK_API_URL || '') : '';
    }
}

