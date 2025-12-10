#!/bin/bash
# Script to start development servers (backend 3010, frontend 5173)
# This is called by systemd service to start dev servers

WORKING_DIR="/var/www/html/backup/bk"
cd "$WORKING_DIR" || exit 1

# Create logs directory with proper permissions
mkdir -p logs
chmod 755 logs 2>/dev/null || true

# Kill any existing dev servers
pkill -f "vite" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "nodemon.*dev:server" 2>/dev/null || true
pkill -f "tsx.*dev:server" 2>/dev/null || true
fuser -k 3010/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true

# Start backend dev server in background (setsid to create new session, survives parent exit)
cd "$WORKING_DIR"
(setsid bash -c "cd '$WORKING_DIR' && PORT=3010 npm run dev:server" > logs/backend-dev.log 2>&1) &
BACKEND_PID=$!
echo $BACKEND_PID > logs/backend-dev.pid 2>/dev/null || true

# Wait a bit for backend to start
sleep 2

# Start frontend dev server in background (setsid to create new session, survives parent exit)
(setsid bash -c "cd '$WORKING_DIR' && FRONTEND_PORT=5173 BACKEND_PORT=3010 npm run dev:client" > logs/frontend-dev.log 2>&1) &
FRONTEND_PID=$!
echo $FRONTEND_PID > logs/frontend-dev.pid 2>/dev/null || true

echo "Dev servers started:"
echo "  Backend: PID $BACKEND_PID (port 3010)"
echo "  Frontend: PID $FRONTEND_PID (port 5173)"

# Exit successfully
exit 0
