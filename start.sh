#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Server Backup Web App Setup..."

# Install dependencies
if [ "$FAST" = "1" ] || [ "$SKIP_INSTALL" = "1" ]; then
  echo "📦 Skipping dependency install (FAST mode)"
else
  echo "📦 Installing dependencies..."
  
  # Check if running as root/sudo, use sudo for npm install if needed
  if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Running as root, using npm install..."
    npm install
  else
    # Try normal install first
    if npm install 2>/dev/null; then
      echo "✅ Dependencies installed successfully"
    else
      echo "⚠️  Permission error detected, trying with sudo..."
      sudo npm install
    fi
  fi
  
  # Verify critical dependencies are installed
  echo "🔍 Verifying critical dependencies..."
  if [ ! -d "node_modules/cors" ]; then
    echo "⚠️  CORS package missing, installing..."
    if [ "$EUID" -eq 0 ]; then
      npm install cors @types/cors
    else
      sudo npm install cors @types/cors || npm install cors @types/cors
    fi
  fi
  
  echo "✅ All dependencies installed"
fi

# Database setup
if [ "$FAST" = "1" ] || [ "$SKIP_DB" = "1" ]; then
  echo "🗄️  Skipping database migration (FAST mode)"
else
  echo "🗄️  Setting up database..."
  npm run db:generate
  npm run db:migrate
fi

# Build server (to ensure latest changes are compiled)
if [ "$FAST" = "1" ] || [ "$SKIP_BUILD" = "1" ]; then
  echo "🔨 Skipping server build (FAST mode)"
else
  echo "🔨 Building server..."
  npm run build:server
  echo "✅ Server built successfully"
fi

# Kill any processes using the ports
echo "🔧 Cleaning up ports..."
sudo fuser -k 3010/tcp 2>/dev/null || sudo lsof -ti:3010 | xargs -r sudo kill 2>/dev/null || true
sudo fuser -k 5173/tcp 2>/dev/null || sudo lsof -ti:5173 | xargs -r sudo kill 2>/dev/null || true
echo "✅ Ports cleaned"

# Start the application
echo "✨ Starting application..."
if [ -n "$BACKEND_PORT" ]; then
  echo "Backend port: $BACKEND_PORT"
fi
if [ -n "$FRONTEND_PORT" ]; then
  echo "Frontend port: $FRONTEND_PORT"
fi

# Start backend and frontend with explicit ports
CONCURRENT_CMD="PORT=${BACKEND_PORT:-3010} npm run dev:server"
CONCURRENT_CMD2="FRONTEND_PORT=${FRONTEND_PORT:-5173} BACKEND_PORT=${BACKEND_PORT:-3010} npm run dev:client"

echo "Starting: $CONCURRENT_CMD"
echo "Starting: $CONCURRENT_CMD2"
if [ "$FAST" = "1" ] || [ "$SKIP_FRONTEND" = "1" ]; then
  echo "✨ Starting backend only (FAST mode)"
  PORT=${BACKEND_PORT:-3010} npm run dev:server
else
  ./node_modules/.bin/concurrently "$CONCURRENT_CMD" "$CONCURRENT_CMD2"
fi
