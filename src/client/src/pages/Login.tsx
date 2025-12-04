import React, { useState } from 'react';
import { Button } from '../components/ui/button';

export default function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const submit = async () => {
        setLoading(true);
        setError('');
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 10000);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                signal: ctrl.signal,
            });
            const data = await res.json();
            if (!res.ok || !data.token) {
                // Check if it's a login IP whitelist error
                if (res.status === 403 && data.code === 'LOGIN_IP_WHITELIST') {
                    setError('Access denied. Your IP address is not whitelisted for login.');
                } else {
                    setError(data?.error || 'Login failed');
                }
            } else {
                onLogin(data.token);
            }
        } catch (e: any) {
            setError(e?.name === 'AbortError' ? 'Login timed out. Check API proxy/ports.' : 'Login failed');
        } finally {
            clearTimeout(timer);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-sm mx-auto mt-20 border border-border rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-4">Login</h1>
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
            </div>
        </div>
    );
}
