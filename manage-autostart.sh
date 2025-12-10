#!/bin/bash

# Script to manage systemd service for Backup System
# Usage: ./manage-autostart.sh [install|uninstall|enable|disable|status]

SERVICE_NAME="backup-system"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# Auto-detect script directory (works even if called from another location)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE_FILE="${SCRIPT_DIR}/backup-systemd.service.template"

# Auto-detect working directory (project root)
# This is the directory where the script is located
WORKING_DIR="$SCRIPT_DIR"

# Verify this is the correct directory
if [ ! -f "${WORKING_DIR}/package.json" ]; then
    echo "Warning: package.json not found in ${WORKING_DIR}"
    echo "Make sure you're running this script from the project root directory."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

CURRENT_USER=$(whoami)
PORT=${PORT:-3000}

# Auto-detect Node.js path
NODE_PATH=$(which node 2>/dev/null)
if [ -z "$NODE_PATH" ]; then
    # Try common locations
    if [ -f "/usr/bin/node" ]; then
        NODE_PATH="/usr/bin/node"
    elif [ -f "/usr/local/bin/node" ]; then
        NODE_PATH="/usr/local/bin/node"
    else
        echo "Error: Node.js not found. Please install Node.js or specify NODE_PATH."
        exit 1
    fi
fi

# Display detected paths
function show_detected_paths() {
    echo "Detected Configuration:"
    echo "  Working Directory: $WORKING_DIR"
    echo "  Node.js Path: $NODE_PATH"
    echo "  Current User: $CURRENT_USER"
    echo "  Port: $PORT"
    echo "  Service File: $SERVICE_FILE"
    echo ""
}

function install_service() {
    if [ "$EUID" -ne 0 ]; then
        echo "Error: Installation requires root privileges. Please run with sudo."
        exit 1
    fi

    if [ ! -f "$TEMPLATE_FILE" ]; then
        echo "Error: Template file not found: $TEMPLATE_FILE"
        exit 1
    fi

    # Verify dist folder exists
    if [ ! -d "${WORKING_DIR}/dist/server" ]; then
        echo "Warning: dist/server directory not found."
        echo "The application needs to be built first. Run: npm run build"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    show_detected_paths
    
    echo "Installing systemd service..."
    
    # Create service file from template
    sed -e "s|USER_PLACEHOLDER|$CURRENT_USER|g" \
        -e "s|WORKING_DIR_PLACEHOLDER|$WORKING_DIR|g" \
        -e "s|PORT_PLACEHOLDER|$PORT|g" \
        -e "s|NODE_PATH_PLACEHOLDER|$NODE_PATH|g" \
        "$TEMPLATE_FILE" > "$SERVICE_FILE"

    # Reload systemd
    systemctl daemon-reload
    
    echo ""
    echo "✓ Service installed successfully!"
    echo "  Service file: $SERVICE_FILE"
    echo ""
    echo "Auto-restart Configuration:"
    echo "  ✓ Auto-restart on failure (Restart=on-failure)"
    echo "  ✓ Restart delay: 10 seconds"
    echo "  ✓ Restart protection: Max 5 restarts in 10 minutes"
    echo "  ✓ Service will stay stopped when explicitly stopped"
    echo ""
    # Automatically enable the service for autostart
    if systemctl enable "$SERVICE_NAME" 2>/dev/null; then
        echo "  ✓ Autostart enabled (service will start on boot)"
    else
        echo "  ⚠️  Could not enable autostart automatically"
        echo "     Run manually: sudo systemctl enable $SERVICE_NAME"
    fi
    
    echo ""
    echo "Next steps:"
    echo "  To start the service: sudo systemctl start $SERVICE_NAME"
    echo "  To check status: sudo systemctl status $SERVICE_NAME"
    echo "  To view logs: sudo journalctl -u $SERVICE_NAME -f"
    echo "  To disable autostart: sudo systemctl disable $SERVICE_NAME"
}

function uninstall_service() {
    if [ "$EUID" -ne 0 ]; then
        echo "Error: Uninstallation requires root privileges. Please run with sudo."
        exit 1
    fi

    echo "Uninstalling systemd service..."
    
    # Stop and disable service
    systemctl stop "$SERVICE_NAME" 2>/dev/null
    systemctl disable "$SERVICE_NAME" 2>/dev/null
    
    # Remove service file
    if [ -f "$SERVICE_FILE" ]; then
        rm "$SERVICE_FILE"
    fi
    
    # Reload systemd
    systemctl daemon-reload
    
    echo "Service uninstalled successfully!"
}

function enable_service() {
    if [ "$EUID" -ne 0 ]; then
        echo "Error: Enabling service requires root privileges. Please run with sudo."
        exit 1
    fi

    if [ ! -f "$SERVICE_FILE" ]; then
        echo "Error: Service not installed. Please run: sudo $0 install"
        exit 1
    fi

    echo "Enabling autostart..."
    systemctl enable "$SERVICE_NAME"
    systemctl daemon-reload
    echo "Autostart enabled!"
}

function disable_service() {
    if [ "$EUID" -ne 0 ]; then
        echo "Error: Disabling service requires root privileges. Please run with sudo."
        exit 1
    fi

    echo "Disabling autostart..."
    systemctl disable "$SERVICE_NAME"
    echo "Autostart disabled!"
}

function status_service() {
    if [ ! -f "$SERVICE_FILE" ]; then
        echo "Status: Service not installed"
        echo ""
        echo "To install, run: sudo $0 install"
        return
    fi

    echo "Service Status:"
    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        echo "  Status: ✓ Running"
    else
        echo "  Status: ✗ Stopped"
    fi

    if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
        echo "  Autostart: ✓ Enabled"
    else
        echo "  Autostart: ✗ Disabled"
    fi
    
    # Show restart policy
    RESTART_POLICY=$(grep "^Restart=" "$SERVICE_FILE" | cut -d'=' -f2)
    RESTART_SEC=$(grep "^RestartSec=" "$SERVICE_FILE" | cut -d'=' -f2)
    if [ -n "$RESTART_POLICY" ]; then
        echo "  Auto-restart: ✓ Enabled ($RESTART_POLICY, delay: ${RESTART_SEC}s)"
    fi
    
    # Show restart count if service is running
    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        RESTART_COUNT=$(systemctl show "$SERVICE_NAME" -p NRestarts --value 2>/dev/null || echo "0")
        if [ -n "$RESTART_COUNT" ] && [ "$RESTART_COUNT" != "0" ]; then
            echo "  Restart Count: $RESTART_COUNT"
        fi
    fi
    
    # Show service file info
    if [ -f "$SERVICE_FILE" ]; then
        echo ""
        echo "Service Configuration:"
        WORKING_DIR_FROM_SERVICE=$(grep "^WorkingDirectory=" "$SERVICE_FILE" | cut -d'=' -f2)
        NODE_PATH_FROM_SERVICE=$(grep "^ExecStart=" "$SERVICE_FILE" | awk '{print $1}' | cut -d'=' -f2)
        USER_FROM_SERVICE=$(grep "^User=" "$SERVICE_FILE" | cut -d'=' -f2)
        echo "  Working Directory: $WORKING_DIR_FROM_SERVICE"
        echo "  Node.js Path: $NODE_PATH_FROM_SERVICE"
        echo "  User: $USER_FROM_SERVICE"
    fi
}

# Main
case "$1" in
    install)
        install_service
        ;;
    uninstall)
        uninstall_service
        ;;
    enable)
        enable_service
        ;;
    disable)
        disable_service
        ;;
    status)
        status_service
        ;;
    *)
        echo "Usage: $0 {install|uninstall|enable|disable|status}"
        echo ""
        echo "Commands:"
        echo "  install   - Install the systemd service (requires sudo)"
        echo "  uninstall - Remove the systemd service (requires sudo)"
        echo "  enable    - Enable autostart on boot (requires sudo)"
        echo "  disable   - Disable autostart on boot (requires sudo)"
        echo "  status    - Show service status"
        echo ""
        echo "Note: This script auto-detects the installation directory."
        echo "      It should be run from the project root where package.json is located."
        echo ""
        show_detected_paths
        exit 1
        ;;
esac

