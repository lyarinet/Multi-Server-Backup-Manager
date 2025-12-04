#!/bin/bash
# Script to fix IP whitelist lockout
# This script can disable IP whitelist or add your current IP

echo "🔧 IP Whitelist Fix Tool"
echo "========================"
echo ""

# Get current IP
CURRENT_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "unknown")
echo "Your current IP: $CURRENT_IP"
echo ""

# Check if sqlite3 is available
if ! command -v sqlite3 &> /dev/null; then
    echo "❌ sqlite3 is not installed. Installing..."
    sudo apt-get update && sudo apt-get install -y sqlite3
fi

DB_PATH="sqlite.db"

if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database file not found: $DB_PATH"
    exit 1
fi

echo "Choose an option:"
echo "1) Disable General IP Whitelist (recommended)"
echo "2) Disable Login IP Whitelist (for login page access)"
echo "3) Disable Both IP Whitelists"
echo "4) Add your current IP to General Whitelist"
echo "5) Add your current IP to Login Whitelist"
echo "6) Show current whitelist status"
echo ""
read -p "Enter option (1-6): " option

case $option in
    1)
        echo "Disabling General IP Whitelist..."
        sqlite3 "$DB_PATH" "UPDATE settings SET ip_whitelist_enabled = 0 WHERE id = (SELECT id FROM settings LIMIT 1);"
        if [ $? -eq 0 ]; then
            echo "✅ General IP Whitelist has been disabled!"
            echo "You can now access the web interface (if login IP whitelist is also disabled)."
        else
            echo "❌ Failed to disable General IP Whitelist"
        fi
        ;;
    2)
        echo "Disabling Login IP Whitelist..."
        sqlite3 "$DB_PATH" "UPDATE settings SET login_ip_whitelist_enabled = 0 WHERE id = (SELECT id FROM settings LIMIT 1);"
        if [ $? -eq 0 ]; then
            echo "✅ Login IP Whitelist has been disabled!"
            echo "You can now access the login page."
        else
            echo "❌ Failed to disable Login IP Whitelist"
        fi
        ;;
    3)
        echo "Disabling Both IP Whitelists..."
        sqlite3 "$DB_PATH" "UPDATE settings SET ip_whitelist_enabled = 0, login_ip_whitelist_enabled = 0 WHERE id = (SELECT id FROM settings LIMIT 1);"
        if [ $? -eq 0 ]; then
            echo "✅ Both IP Whitelists have been disabled!"
            echo "You can now access the web interface and login page."
        else
            echo "❌ Failed to disable IP Whitelists"
        fi
        ;;
    4)
        echo "Adding your IP ($CURRENT_IP) to General Whitelist..."
        # Check if IP already exists
        EXISTS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM ip_whitelist WHERE ip_address = '$CURRENT_IP';")
        if [ "$EXISTS" -gt 0 ]; then
            echo "⚠️  IP $CURRENT_IP is already in the General Whitelist"
        else
            sqlite3 "$DB_PATH" "INSERT INTO ip_whitelist (ip_address, type) VALUES ('$CURRENT_IP', 'single');"
            if [ $? -eq 0 ]; then
                echo "✅ IP $CURRENT_IP has been added to General Whitelist!"
                echo "You can now access the web interface (if login IP whitelist allows you)."
            else
                echo "❌ Failed to add IP to General Whitelist"
            fi
        fi
        ;;
    5)
        echo "Adding your IP ($CURRENT_IP) to Login Whitelist..."
        # Check if IP already exists
        EXISTS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM login_ip_whitelist WHERE ip_address = '$CURRENT_IP';")
        if [ "$EXISTS" -gt 0 ]; then
            echo "⚠️  IP $CURRENT_IP is already in the Login Whitelist"
        else
            sqlite3 "$DB_PATH" "INSERT INTO login_ip_whitelist (ip_address, type) VALUES ('$CURRENT_IP', 'single');"
            if [ $? -eq 0 ]; then
                echo "✅ IP $CURRENT_IP has been added to Login Whitelist!"
                echo "You can now access the login page."
            else
                echo "❌ Failed to add IP to Login Whitelist"
            fi
        fi
        ;;
    6)
        echo ""
        echo "Current IP Whitelist Status:"
        echo "============================"
        GENERAL_ENABLED=$(sqlite3 "$DB_PATH" "SELECT ip_whitelist_enabled FROM settings LIMIT 1;")
        LOGIN_ENABLED=$(sqlite3 "$DB_PATH" "SELECT login_ip_whitelist_enabled FROM settings LIMIT 1;")
        echo "General IP Whitelist Enabled: $GENERAL_ENABLED"
        echo "Login IP Whitelist Enabled: $LOGIN_ENABLED"
        echo ""
        echo "General Whitelisted IPs:"
        sqlite3 -column -header "$DB_PATH" "SELECT id, ip_address, type, created_at FROM ip_whitelist;"
        echo ""
        echo "Login Whitelisted IPs:"
        sqlite3 -column -header "$DB_PATH" "SELECT id, ip_address, type, created_at FROM login_ip_whitelist;"
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "Done!"


