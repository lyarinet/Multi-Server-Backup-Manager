import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

export default defineConfig({
    plugins: [react()],
    root: 'src/client',
    build: {
        outDir: '../../dist/client',
        emptyOutDir: true,
    },
    optimizeDeps: {
        exclude: ['@capacitor/core', '@capacitor/preferences', '@capacitor/network'],
    },
    resolve: {
        alias: {
            '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src/client/src'),
            '@shared': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src/shared'),
        },
    },
    server: {
    port: Number(process.env.FRONTEND_PORT || 5173),
    host: process.env.FRONTEND_HOST || '0.0.0.0',
    strictPort: false,
    // Use ALLOWED_HOSTS env var if set; otherwise allow all hosts
    allowedHosts: process.env.ALLOWED_HOSTS
        ? process.env.ALLOWED_HOSTS.split(',').map((s) => s.trim()).filter(Boolean)
        : true,
        proxy: {
            '/api': {
                target: process.env.BACKEND_ORIGIN || `http://127.0.0.1:${Number(process.env.BACKEND_PORT || process.env.PORT || 3010)}`,
                changeOrigin: true,
                secure: false,
                ws: true,
                configure: (proxy, _options) => {
                    proxy.on('error', (err, _req, res) => {
                        console.log('Proxy error:', err);
                    });
                    proxy.on('proxyReq', (proxyReq, req, _res) => {
                        console.log(`Proxying ${req.method} ${req.url} to ${proxyReq.path}`);
                    });
                },
            },
        },
    },
});
