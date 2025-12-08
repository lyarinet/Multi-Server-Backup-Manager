#!/bin/bash

# Exit on error (but allow graceful fallback for systemd)
# We'll handle errors manually for systemd operations
set -e

# Show usage if help requested
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "Usage: ./start.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  BACKGROUND=1    Start in background mode (default if not interactive terminal)"
    echo "  FORCE_DIRECT=1  Force direct start even if systemd service exists"
    echo "  FAST=1          Skip dependency install, database setup, and build"
    echo "  SKIP_FRONTEND=1 Start backend only"
    echo ""
    echo "Examples:"
    echo "  ./start.sh                    # Auto-detect best mode"
    echo "  BACKGROUND=1 ./start.sh      # Start in background"
    echo "  FORCE_DIRECT=1 ./start.sh    # Force direct start (dev mode)"
    echo ""
    exit 0
fi

# Service management variables
SERVICE_NAME="backup-system"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check if systemd service is installed and should be used
check_systemd_service() {
    if [ -f "$SERVICE_FILE" ]; then
        return 0  # Service exists
    else
        return 1  # Service doesn't exist
    fi
}

# Start via systemd service
start_via_systemd() {
    echo "🔧 Systemd service detected - using service management"
    
    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        echo "✅ Service is already running"
        echo ""
        echo "Service Status:"
        systemctl status "$SERVICE_NAME" --no-pager -l || true
        echo ""
        echo "To view logs: sudo journalctl -u $SERVICE_NAME -f"
        return 0
    fi
    
    if [ "$EUID" -ne 0 ]; then
        echo "⚠️  Service is installed but not running"
        echo "   Starting service requires root privileges"
        echo ""
        echo "To start the service, run:"
        echo "  sudo systemctl start $SERVICE_NAME"
        echo ""
        echo "Or start directly (development mode) with:"
        echo "  FORCE_DIRECT=1 ./start.sh"
        echo ""
        read -p "Start directly in development mode instead? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
        return 1  # Fall through to direct start
    else
        echo "🚀 Starting systemd service..."
        systemctl start "$SERVICE_NAME"
        sleep 2
        
        if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
            echo "✅ Service started successfully"
            echo ""
            echo "Service Status:"
            systemctl status "$SERVICE_NAME" --no-pager -l || true
            echo ""
            echo "Useful commands:"
            echo "  View logs: sudo journalctl -u $SERVICE_NAME -f"
            echo "  Stop: sudo systemctl stop $SERVICE_NAME"
            echo "  Restart: sudo systemctl restart $SERVICE_NAME"
            echo "  Status: sudo systemctl status $SERVICE_NAME"
            return 0
        else
            echo "❌ Failed to start service"
            echo "   Check logs: sudo journalctl -u $SERVICE_NAME -n 50"
            return 1
        fi
    fi
}

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
  if npm run build:server 2>&1; then
    echo "✅ Server built successfully"
  else
    echo "⚠️  Server build had errors, but continuing..."
    echo "   Run 'npm run build:server' manually to see full errors"
  fi
fi

# Android SDK setup (for mobile builds)
if [ "$FAST" = "1" ] || [ "$SKIP_ANDROID_SDK" = "1" ]; then
  echo "🤖 Skipping Android SDK check (FAST mode)"
else
  echo "🤖 Checking Android SDK..."
  
  # Check if Android SDK is configured
  ANDROID_SDK_PATH=""
  if [ -n "$ANDROID_HOME" ]; then
    ANDROID_SDK_PATH="$ANDROID_HOME"
  elif [ -d "$HOME/Android/Sdk" ]; then
    ANDROID_SDK_PATH="$HOME/Android/Sdk"
  elif [ -d "$HOME/.android/sdk" ]; then
    ANDROID_SDK_PATH="$HOME/.android/sdk"
  fi
  
  if [ -n "$ANDROID_SDK_PATH" ] && [ -d "$ANDROID_SDK_PATH" ]; then
    echo "✅ Android SDK found at: $ANDROID_SDK_PATH"
    export ANDROID_HOME="$ANDROID_SDK_PATH"
    
    # Create/update local.properties file
    if [ -d "android" ]; then
      echo "📝 Updating android/local.properties..."
      echo "sdk.dir=$ANDROID_SDK_PATH" > android/local.properties
      echo "✅ Android SDK configured"
    fi
  else
    echo "⚠️  Android SDK not found"
    echo "   To build Android APK, install Android SDK:"
    echo "   1. Install Android Studio or command-line tools"
    echo "   2. Set ANDROID_HOME environment variable"
    echo "   3. Or create android/local.properties with: sdk.dir=/path/to/android/sdk"
    echo ""
    echo "   For now, Android builds will be skipped."
  fi
fi

# Check if systemd service should be used
USE_SYSTEMD=0
if [ "$FORCE_DIRECT" != "1" ] && check_systemd_service; then
    USE_SYSTEMD=1
fi

# If systemd service exists and should be used, start via systemd
if [ "$USE_SYSTEMD" -eq 1 ]; then
    if start_via_systemd; then
        exit 0  # Successfully started via systemd
    fi
    # If start_via_systemd returns 1, fall through to direct start
    echo ""
    echo "📝 Falling back to direct start (development mode)..."
    echo ""
fi

# Direct start mode (development)
echo "🔧 Starting in development mode (direct start)"
echo ""

# Check if background mode is requested
# Default to background mode (non-blocking) unless explicitly running in foreground
BACKGROUND_MODE=1  # Default to background
if [ "$FOREGROUND" = "1" ] || [ "$FG" = "1" ]; then
    BACKGROUND_MODE=0  # Explicitly request foreground
elif [ "$BACKGROUND" = "1" ] || [ "$BG" = "1" ] || [ "$DAEMON" = "1" ]; then
    BACKGROUND_MODE=1  # Explicitly request background
fi

# Create logs directory if it doesn't exist
mkdir -p logs

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
if [ "$FAST" = "1" ] || [ "$SKIP_FRONTEND" = "1" ]; then
  echo "✨ Starting backend only (FAST mode)"
  
  if [ "$BACKGROUND_MODE" -eq 1 ]; then
    echo "🚀 Starting in background mode..."
    PORT=${BACKEND_PORT:-3010} npm run dev:server > logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > logs/backend.pid
    echo "✅ Backend started in background (PID: $BACKEND_PID)"
    echo "   Logs: tail -f logs/backend.log"
    echo "   Stop: ./stop.sh or kill $BACKEND_PID"
  else
    PORT=${BACKEND_PORT:-3010} npm run dev:server
  fi
else
  if [ "$BACKGROUND_MODE" -eq 1 ]; then
    echo "🚀 Starting in background mode..."
    
    # Start backend in background
    PORT=${BACKEND_PORT:-3010} npm run dev:server > logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > logs/backend.pid
    echo "✅ Backend started in background (PID: $BACKEND_PID)"
    
    # Start frontend in background
    FRONTEND_PORT=${FRONTEND_PORT:-5173} BACKEND_PORT=${BACKEND_PORT:-3010} npm run dev:client > logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > logs/frontend.pid
    echo "✅ Frontend started in background (PID: $FRONTEND_PID)"
    
    echo ""
    echo "📋 Process Information:"
    echo "   Backend PID: $BACKEND_PID (logs: logs/backend.log)"
    echo "   Frontend PID: $FRONTEND_PID (logs: logs/frontend.log)"
    echo ""
    echo "📝 Useful commands:"
    echo "   View backend logs: tail -f logs/backend.log"
    echo "   View frontend logs: tail -f logs/frontend.log"
    echo "   Stop all: ./stop.sh"
    echo "   Check status: ps -p $BACKEND_PID,$FRONTEND_PID"
  else
    # Start in foreground using concurrently
    CONCURRENT_CMD="PORT=${BACKEND_PORT:-3010} npm run dev:server"
    CONCURRENT_CMD2="FRONTEND_PORT=${FRONTEND_PORT:-5173} BACKEND_PORT=${BACKEND_PORT:-3010} npm run dev:client"
    
    echo "Starting: $CONCURRENT_CMD"
    echo "Starting: $CONCURRENT_CMD2"
    echo ""
    echo "💡 Tip: To run in foreground, use: FOREGROUND=1 ./start.sh"
    echo ""
    ./node_modules/.bin/concurrently "$CONCURRENT_CMD" "$CONCURRENT_CMD2"
  fi
fi
