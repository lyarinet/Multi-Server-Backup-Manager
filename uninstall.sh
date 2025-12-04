#!/bin/bash
#
# Multi-Server Backup Manager Uninstall Script
# This script removes the application and cleans up files
#

echo "=========================================================="
echo "   Multi-Server Backup Manager Uninstaller"
echo "=========================================================="
echo ""

# Check if script is running as root
if [[ $EUID -ne 0 ]]; then
   echo "⚠️  This script requires root privileges for complete removal."
   echo "   Some operations may require sudo."
   echo ""
fi

# Auto-detect installation directory
detect_installation() {
    # Try to detect from current directory
    if [ -f "package.json" ] && [ -f "src/server/index.ts" ]; then
        INSTALL_DIR="$(pwd)"
        echo "Detected installation directory: $INSTALL_DIR"
        return 0
    fi
    
    # Try default installation location
    if [ -d "/opt/server-backup" ] && [ -f "/opt/server-backup/package.json" ]; then
        INSTALL_DIR="/opt/server-backup"
        echo "Detected installation directory: $INSTALL_DIR"
        return 0
    fi
    
    # Ask user for installation directory
    echo "Could not auto-detect installation directory."
    read -p "Enter the installation directory path: " INSTALL_DIR
    
    if [ ! -d "$INSTALL_DIR" ]; then
        echo "❌ Directory not found: $INSTALL_DIR"
        exit 1
    fi
    
    if [ ! -f "$INSTALL_DIR/package.json" ]; then
        echo "❌ This doesn't appear to be a valid installation directory."
        exit 1
    fi
    
    return 0
}

# Stop running processes
stop_processes() {
    echo ""
    echo "Stopping running processes..."
    
    cd "$INSTALL_DIR" 2>/dev/null || return
    
    # Stop using stop.sh if available
    if [ -f "stop.sh" ]; then
        echo "Stopping application using stop.sh..."
        ./stop.sh 2>/dev/null || true
    fi
    
    # Kill processes by PID files
    if [ -d "logs" ]; then
        if [ -f "logs/backend.pid" ]; then
            BACKEND_PID=$(cat logs/backend.pid 2>/dev/null)
            if [ ! -z "$BACKEND_PID" ] && ps -p $BACKEND_PID > /dev/null 2>&1; then
                echo "Stopping backend process (PID: $BACKEND_PID)..."
                kill $BACKEND_PID 2>/dev/null || true
            fi
        fi
        
        if [ -f "logs/frontend.pid" ]; then
            FRONTEND_PID=$(cat logs/frontend.pid 2>/dev/null)
            if [ ! -z "$FRONTEND_PID" ] && ps -p $FRONTEND_PID > /dev/null 2>&1; then
                echo "Stopping frontend process (PID: $FRONTEND_PID)..."
                kill $FRONTEND_PID 2>/dev/null || true
            fi
        fi
    fi
    
    # Kill processes by port (fallback)
    echo "Cleaning up ports..."
    sudo fuser -k 3010/tcp 2>/dev/null || sudo lsof -ti:3010 | xargs -r sudo kill 2>/dev/null || true
    sudo fuser -k 5173/tcp 2>/dev/null || sudo lsof -ti:5173 | xargs -r sudo kill 2>/dev/null || true
    sudo fuser -k 3000/tcp 2>/dev/null || sudo lsof -ti:3000 | xargs -r sudo kill 2>/dev/null || true
    
    echo "✅ Processes stopped"
}

# Uninstall systemd service
uninstall_service() {
    echo ""
    echo "Checking for systemd service..."
    
    SERVICE_NAME="backup-system"
    SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
    
    if [ -f "$SERVICE_FILE" ]; then
        echo "Systemd service found. Uninstalling..."
        
        if [ "$EUID" -ne 0 ]; then
            echo "⚠️  Root privileges required to uninstall systemd service."
            echo "   Run: sudo systemctl stop $SERVICE_NAME"
            echo "   Run: sudo systemctl disable $SERVICE_NAME"
            echo "   Run: sudo rm $SERVICE_FILE"
            echo "   Run: sudo systemctl daemon-reload"
        else
            systemctl stop "$SERVICE_NAME" 2>/dev/null || true
            systemctl disable "$SERVICE_NAME" 2>/dev/null || true
            
            if [ -f "$SERVICE_FILE" ]; then
                rm "$SERVICE_FILE"
            fi
            
            systemctl daemon-reload
            
            echo "✅ Systemd service uninstalled"
        fi
    else
        echo "No systemd service found (skipping)"
    fi
}

# Remove installation directory
remove_installation() {
    echo ""
    echo "Removing installation directory..."
    echo "Installation directory: $INSTALL_DIR"
    
    # Confirm deletion
    read -p "⚠️  This will permanently delete all files in $INSTALL_DIR. Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Uninstallation cancelled."
        exit 0
    fi
    
    # Backup database if user wants
    if [ -f "$INSTALL_DIR/sqlite.db" ]; then
        read -p "Do you want to backup the database before deletion? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            BACKUP_FILE="server-backup-db-$(date +%Y%m%d-%H%M%S).db"
            cp "$INSTALL_DIR/sqlite.db" "$HOME/$BACKUP_FILE"
            echo "✅ Database backed up to: $HOME/$BACKUP_FILE"
        fi
    fi
    
    # Remove directory
    if [ "$EUID" -eq 0 ]; then
        rm -rf "$INSTALL_DIR"
    else
        sudo rm -rf "$INSTALL_DIR"
    fi
    
    if [ $? -eq 0 ]; then
        echo "✅ Installation directory removed"
    else
        echo "❌ Failed to remove installation directory"
        exit 1
    fi
}

# Clean up logs and temporary files
cleanup_files() {
    echo ""
    echo "Cleaning up temporary files..."
    
    # Remove logs directory if it exists outside installation
    if [ -d "$HOME/.server-backup-logs" ]; then
        rm -rf "$HOME/.server-backup-logs"
        echo "✅ Removed log files"
    fi
}

# Main function
main() {
    detect_installation
    
    echo ""
    echo "Uninstallation will:"
    echo "  - Stop all running processes"
    echo "  - Uninstall systemd service (if installed)"
    echo "  - Remove installation directory: $INSTALL_DIR"
    echo "  - Clean up temporary files"
    echo ""
    
    read -p "Continue with uninstallation? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Uninstallation cancelled."
        exit 0
    fi
    
    stop_processes
    uninstall_service
    remove_installation
    cleanup_files
    
    echo ""
    echo "=========================================================="
    echo "   Uninstallation Complete!"
    echo "=========================================================="
    echo ""
    echo "✅ Multi-Server Backup Manager has been removed."
    echo ""
    echo "Note: Node.js and npm are not removed as they may be"
    echo "      used by other applications on your system."
    echo ""
}

# Run main function
main

