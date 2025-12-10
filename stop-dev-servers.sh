#!/bin/bash
# Script to stop development servers
# This script is called by systemd ExecStop

# Kill by process name (all users) - use -9 for force kill
pkill -9 -f "vite" 2>/dev/null || true
pkill -9 -f "npm run dev" 2>/dev/null || true  
pkill -9 -f "nodemon.*dev:server" 2>/dev/null || true
pkill -9 -f "tsx.*dev:server" 2>/dev/null || true
pkill -9 -f "node.*vite" 2>/dev/null || true
pkill -9 -f "node.*5173" 2>/dev/null || true

# Kill by port (all users)
fuser -k 5173/tcp 2>/dev/null || true
fuser -k 3010/tcp 2>/dev/null || true

# Also try lsof method (more reliable)
if command -v lsof >/dev/null 2>&1; then
    lsof -ti:5173 | xargs -r kill -9 2>/dev/null || true
    lsof -ti:3010 | xargs -r kill -9 2>/dev/null || true
fi

# Final cleanup - kill any remaining node processes on these ports
for port in 5173 3010; do
    if ss -tlnp | grep -q ":$port "; then
        ss -tlnp | grep ":$port " | awk '{print $6}' | cut -d',' -f2 | cut -d'=' -f2 | xargs -r kill -9 2>/dev/null || true
    fi
done

