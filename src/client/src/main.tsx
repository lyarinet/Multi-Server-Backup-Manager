import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext.tsx';

const origFetch = window.fetch;
window.fetch = (input: any, init?: any) => {
    const headers = new Headers(init?.headers || {});
    const t = localStorage.getItem('auth_token');
    if (t) headers.set('Authorization', `Bearer ${t}`);
    return origFetch(input, { ...(init || {}), headers });
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider>
            <App />
        </ThemeProvider>
    </React.StrictMode>,
);
