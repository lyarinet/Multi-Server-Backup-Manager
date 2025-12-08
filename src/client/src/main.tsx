import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { initializeApiConfig, buildApiUrlSync, getApiBaseUrlSync } from './config/api';

// Initialize API configuration
initializeApiConfig();

const origFetch = window.fetch;
window.fetch = async (input: any, init?: any) => {
    const headers = new Headers(init?.headers || {});
    const t = localStorage.getItem('auth_token');
    if (t) headers.set('Authorization', `Bearer ${t}`);
    
    // If input is a string and starts with /api, convert it to full URL (sync version)
    let url = input;
    if (typeof input === 'string' && input.startsWith('/api')) {
        // CRITICAL: Check if we should force relative URLs
        // First check the base URL synchronously - if it's empty, we're using relative URLs
        const baseUrl = getApiBaseUrlSync();
        
        // If baseUrl is empty (meaning we're using relative URLs), use the path directly
        // This prevents rebuilding the URL with a bad domain
        if (!baseUrl || baseUrl === '') {
            url = input; // Use relative path directly
        } else {
            // Only build URL if we have a valid base URL
        url = buildApiUrlSync(input);
    }
    }
    
    try {
        const response = await origFetch(url, { ...(init || {}), headers });
        return response;
    } catch (error: any) {
        // If it's a connection error and we're using an absolute URL, try relative URL fallback
        if (typeof input === 'string' && input.startsWith('/api')) {
            const { isConnectionError, clearApiBaseUrlSync } = await import('./config/api');
            
            if (isConnectionError(error)) {
                const currentUrl = getApiBaseUrlSync();
                
                // Only try fallback if we have a configured API URL (not already using relative)
                // and we're on web (not mobile)
                if (currentUrl && typeof window !== 'undefined' && !(window as any).Capacitor?.isNativePlatform()) {
                    console.log('API call failed in main.tsx, trying fallback to relative URL for:', input);
                    
                    // Clear the bad API URL SYNCHRONOUSLY (critical for immediate effect)
                    clearApiBaseUrlSync();
                    
                    // Retry with relative URL directly using origFetch to bypass interceptor
                    // This prevents infinite loops and ensures we use the relative path
                    // Auth headers are already set in the headers object above
                    return origFetch(input, { ...(init || {}), headers });
                }
            }
        }
        
        // Re-throw the original error
        throw error;
    }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider>
            <App />
        </ThemeProvider>
    </React.StrictMode>,
);
