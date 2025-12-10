#!/bin/bash
# Script to start development servers (backend 3010, frontend 5173)
# This is called by systemd service to start dev servers

WORKING_DIR="/var/www/html/backup/bk"
cd "$WORKING_DIR" || exit 1

# Create logs directory
mkdir -p logs

# Kill any existing dev servers
pkill -f "vite" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
fuser -k 3010/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true

# Start backend dev server in background
cd "$WORKING_DIR"
PORT=3010 npm run dev:server > logs/backend-dev.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > logs/backend-dev.pid
echo "Started backend dev server (PID: $BACKEND_PID, port 3010)"

# Wait a bit for backend to start
sleep 3

# Start frontend dev server in background
FRONTEND_PORT=5173 BACKEND_PORT=3010 npm run dev:client > logs/frontend-dev.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > logs/frontend-dev.pid
echo "Started frontend dev server (PID: $FRONTEND_PID, port 5173)"

# Wait a moment for both to start
sleep 2

echo "Dev servers started successfully"

