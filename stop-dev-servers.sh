#!/bin/bash
# Script to stop development servers (backend 3010, frontend 5173)
# This is called by systemd service ExecStop to ensure all dev processes are killed

WORKING_DIR="/var/www/html/backup/bk"
cd "$WORKING_DIR" || exit 1

echo "🔧 Stopping development servers..."

# Kill processes by PID files if they exist
if [ -f logs/backend-dev.pid ]; then
    BACKEND_PID=$(cat logs/backend-dev.pid 2>/dev/null)
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    rm -f logs/backend-dev.pid
fi

if [ -f logs/frontend-dev.pid ]; then
    FRONTEND_PID=$(cat logs/frontend-dev.pid 2>/dev/null)
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    rm -f logs/frontend-dev.pid
fi

# Kill processes by name
pkill -f "vite" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "nodemon.*dev:server" 2>/dev/null || true
pkill -f "tsx.*dev:server" 2>/dev/null || true

# Kill processes by port (fallback)
fuser -k 5173/tcp 2>/dev/null || true
fuser -k 3010/tcp 2>/dev/null || true

echo "✅ Development servers stopped"

