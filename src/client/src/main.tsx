import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { initializeApiConfig, buildApiUrlSync } from './config/api';

// Initialize API configuration
initializeApiConfig();

const origFetch = window.fetch;
window.fetch = (input: any, init?: any) => {
    const headers = new Headers(init?.headers || {});
    const t = localStorage.getItem('auth_token');
    if (t) headers.set('Authorization', `Bearer ${t}`);
    
    // If input is a string and starts with /api, convert it to full URL (sync version)
    let url = input;
    if (typeof input === 'string' && input.startsWith('/api')) {
        url = buildApiUrlSync(input);
    }
    
    return origFetch(url, { ...(init || {}), headers });
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider>
            <App />
        </ThemeProvider>
    </React.StrictMode>,
);
