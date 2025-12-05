import { buildApiUrl } from '../config/api';

/**
 * Fetch wrapper that automatically handles API URL configuration
 * Use this instead of fetch() for all API calls
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
    const url = await buildApiUrl(path);
    const headers = new Headers(options?.headers || {});
    
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    
    return fetch(url, {
        ...options,
        headers,
    });
}

/**
 * Convenience methods for common HTTP methods
 */
export const api = {
    get: (path: string, options?: RequestInit) => apiFetch(path, { ...options, method: 'GET' }),
    post: (path: string, body?: any, options?: RequestInit) => 
        apiFetch(path, {
            ...options,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            body: body ? JSON.stringify(body) : undefined,
        }),
    put: (path: string, body?: any, options?: RequestInit) =>
        apiFetch(path, {
            ...options,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            body: body ? JSON.stringify(body) : undefined,
        }),
    delete: (path: string, options?: RequestInit) => apiFetch(path, { ...options, method: 'DELETE' }),
};

