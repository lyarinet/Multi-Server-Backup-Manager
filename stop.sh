#!/bin/bash

# Stop script for Server Backup Web App

echo "🛑 Stopping Server Backup Web App..."

# Stop systemd service if it exists and is running
SERVICE_NAME="backup-system"
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo "Stopping systemd service..."
    sudo systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    echo "✅ Systemd service stopped"
fi

# Kill processes by PID files if they exist
if [ -f "logs/backend.pid" ]; then
  BACKEND_PID=$(cat logs/backend.pid)
  if ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo "Stopping backend (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null || true
    rm logs/backend.pid
    echo "✅ Backend stopped"
  else
    echo "Backend process not running"
    rm logs/backend.pid
  fi
fi

if [ -f "logs/frontend.pid" ]; then
  FRONTEND_PID=$(cat logs/frontend.pid)
  if ps -p $FRONTEND_PID > /dev/null 2>&1; then
    echo "Stopping frontend (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null || true
    rm logs/frontend.pid
    echo "✅ Frontend stopped"
  else
    echo "Frontend process not running"
    rm logs/frontend.pid
  fi
fi

# Kill any dev processes (vite, nodemon, etc.)
echo "🔧 Stopping development servers..."
sudo pkill -f "vite" 2>/dev/null || true
sudo pkill -f "npm run dev" 2>/dev/null || true
sudo pkill -f "nodemon.*dev:server" 2>/dev/null || true
sudo pkill -f "tsx.*dev:server" 2>/dev/null || true

# Also kill by port (fallback)
echo "🔧 Cleaning up ports..."
sudo fuser -k 3010/tcp 2>/dev/null || sudo lsof -ti:3010 | xargs -r sudo kill 2>/dev/null || true
sudo fuser -k 5173/tcp 2>/dev/null || sudo lsof -ti:5173 | xargs -r sudo kill 2>/dev/null || true

echo "✅ All processes stopped"
