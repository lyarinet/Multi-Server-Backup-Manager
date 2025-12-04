#!/bin/bash
#
# Server Backup Web Application Auto-Installation Script
# This script downloads and installs the Server Backup Web Application on any Linux distribution
#

# Check if script is running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root. Please use sudo."
   exit 1
fi

echo "=========================================================="
echo "   Server Backup Web Application Auto-Installation"
echo "=========================================================="
echo ""

# Detect Linux distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        DISTRO_FAMILY=$ID_LIKE
        DISTRO_VERSION=$VERSION_ID
    else
        echo "Cannot detect Linux distribution."
        exit 1
    fi
    
    echo "Detected distribution: $DISTRO ($DISTRO_FAMILY)"
}

# Install Node.js and npm based on distribution
install_nodejs() {
    echo "Checking for Node.js..."
    
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        NODE_VERSION=$(node -v)
        echo "Node.js is already installed: $NODE_VERSION"
        return 0
    fi
    
    echo "Installing Node.js and npm..."
    
    if [[ "$DISTRO" == "ubuntu" || "$DISTRO" == "debian" || "$DISTRO_FAMILY" == *"debian"* ]]; then
        # Ubuntu/Debian
        apt-get update
        apt-get install -y curl gnupg2 software-properties-common
        
        # Install Node.js 20.x
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
        
    elif [[ "$DISTRO" == "fedora" || "$DISTRO_FAMILY" == *"fedora"* ]]; then
        # Fedora
        dnf install -y curl
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        dnf install -y nodejs
        
    elif [[ "$DISTRO" == "rhel" || "$DISTRO" == "centos" || "$DISTRO_FAMILY" == *"rhel"* ]]; then
        # RHEL/CentOS
        if [[ "$DISTRO_VERSION" == "7"* ]]; then
            # CentOS 7
            curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
            yum install -y nodejs
        else
            # CentOS 8+/RHEL 8+
            dnf install -y curl
            curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
            dnf install -y nodejs
        fi
        
    elif [[ "$DISTRO" == "arch" || "$DISTRO" == "manjaro" || "$DISTRO_FAMILY" == *"arch"* ]]; then
        # Arch Linux
        pacman -Sy --noconfirm nodejs npm
        
    elif [[ "$DISTRO" == "opensuse" || "$DISTRO" == "sles" ]]; then
        # openSUSE/SLES
        zypper refresh
        zypper install -y nodejs20 npm20
        
    else
        echo "Unsupported distribution: $DISTRO"
        echo "Please install Node.js 18+ manually and run this script again."
        exit 1
    fi
    
    # Verify installation
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        NODE_VERSION=$(node -v)
        NPM_VERSION=$(npm -v)
        echo "Node.js installed successfully: $NODE_VERSION"
        echo "npm installed successfully: $NPM_VERSION"
    else
        echo "Failed to install Node.js. Please install manually."
        exit 1
    fi
}

# Install system dependencies
install_system_deps() {
    echo "Installing system dependencies..."
    
    if [[ "$DISTRO" == "ubuntu" || "$DISTRO" == "debian" || "$DISTRO_FAMILY" == *"debian"* ]]; then
        apt-get update
        apt-get install -y git build-essential python3 sqlite3
        
    elif [[ "$DISTRO" == "fedora" || "$DISTRO_FAMILY" == *"fedora"* ]]; then
        dnf install -y git gcc gcc-c++ make python3 sqlite
        
    elif [[ "$DISTRO" == "rhel" || "$DISTRO" == "centos" || "$DISTRO_FAMILY" == *"rhel"* ]]; then
        if [[ "$DISTRO_VERSION" == "7"* ]]; then
            yum install -y git gcc gcc-c++ make python3 sqlite
        else
            dnf install -y git gcc gcc-c++ make python3 sqlite
        fi
        
    elif [[ "$DISTRO" == "arch" || "$DISTRO" == "manjaro" || "$DISTRO_FAMILY" == *"arch"* ]]; then
        pacman -Sy --noconfirm git base-devel python sqlite
        
    elif [[ "$DISTRO" == "opensuse" || "$DISTRO" == "sles" ]]; then
        zypper install -y git gcc gcc-c++ make python3 sqlite3
        
    else
        echo "Warning: Cannot auto-install system dependencies for $DISTRO"
        echo "Please ensure git, build-essential, python3, and sqlite3 are installed."
    fi
    
    echo "System dependencies installed."
}

# Check for required tools
check_requirements() {
    echo "Checking for required tools..."
    
    # Check for git
    if ! command -v git &> /dev/null; then
        echo "Git is not installed. Installing..."
        install_system_deps
    fi
    
    echo "Git is installed."
}

# Download the application
download_application() {
    echo "Downloading Server Backup Web Application from repository..."
    
    # Default installation directory (standard location for installed software)
    INSTALL_DIR="/opt/server-backup"
    
    # Ask user for installation directory
    read -p "Enter installation directory (default: $INSTALL_DIR): " USER_DIR
    if [ ! -z "$USER_DIR" ]; then
        INSTALL_DIR="$USER_DIR"
    fi
    
    # Create directory if it doesn't exist
    mkdir -p "$INSTALL_DIR"
    
    # Check if directory is not empty
    if [ "$(ls -A $INSTALL_DIR 2>/dev/null)" ]; then
        echo "Directory $INSTALL_DIR is not empty."
        read -p "Do you want to continue? This may overwrite existing files. (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Installation cancelled."
            exit 1
        fi
    fi
    
    # Clone or update the repository
    if [ -d "$INSTALL_DIR/.git" ]; then
        echo "Repository already exists. Updating..."
        cd "$INSTALL_DIR"
        git pull
    else
        echo "Cloning repository..."
        git clone https://github.com/lyarinet/Multi-Server-Backup-Manager.git "$INSTALL_DIR"
        
        if [ $? -ne 0 ]; then
            echo "Failed to download application. Please check your internet connection and repository URL."
            exit 1
        fi
    fi
    
    cd "$INSTALL_DIR"
    echo "Download complete. Installation directory: $INSTALL_DIR"
    export INSTALL_DIR
}

# Install Node.js dependencies
install_dependencies() {
    echo "Installing Node.js dependencies..."
    
    cd "$INSTALL_DIR"
    
    # Install dependencies
    npm install
    
    if [ $? -ne 0 ]; then
        echo "Failed to install dependencies. Please check the error messages above."
        exit 1
    fi
    
    echo "Dependencies installed successfully."
}

# Set up database
setup_database() {
    echo "Setting up database..."
    
    cd "$INSTALL_DIR"
    
    # Generate database migrations
    npm run db:generate
    
    # Run database migrations
    npm run db:migrate
    
    if [ $? -ne 0 ]; then
        echo "Warning: Database setup may have encountered issues."
    else
        echo "Database setup complete."
    fi
}

# Build the application
build_application() {
    echo "Building the application..."
    
    cd "$INSTALL_DIR"
    
    # Build for production
    npm run build
    
    if [ $? -ne 0 ]; then
        echo "Warning: Build may have encountered issues. You can build manually later with 'npm run build'."
    else
        echo "Build complete."
    fi
}

# Create systemd service (automatic)
create_systemd_service() {
    echo ""
    echo "Setting up systemd service for autostart..."
    
    cd "$INSTALL_DIR"
    
    if [ -f "manage-autostart.sh" ]; then
        chmod +x manage-autostart.sh
        
        # Install systemd service
        echo "Installing systemd service..."
        ./manage-autostart.sh install
        
        if [ $? -eq 0 ]; then
            # Enable autostart on boot
            echo "Enabling autostart on boot..."
            ./manage-autostart.sh enable
            
            if [ $? -eq 0 ]; then
                echo "✅ Systemd service installed and enabled successfully!"
                echo "   Service will start automatically on system boot."
            else
                echo "⚠️  Service installed but failed to enable. You can enable it manually:"
                echo "   sudo systemctl enable backup-system"
            fi
        else
            echo "⚠️  Failed to install systemd service. You can install it manually:"
            echo "   cd $INSTALL_DIR"
            echo "   sudo ./manage-autostart.sh install"
            echo "   sudo ./manage-autostart.sh enable"
        fi
    else
        echo "⚠️  Autostart script not found. Skipping systemd setup."
    fi
}

# Set permissions
set_permissions() {
    echo "Setting permissions..."
    
    cd "$INSTALL_DIR"
    
    # Make scripts executable
    find . -name "*.sh" -type f -exec chmod +x {} \;
    
    # Set ownership to current user (or www-data if exists)
    if id "www-data" &>/dev/null; then
        chown -R www-data:www-data "$INSTALL_DIR"
        echo "Permissions set to www-data:www-data"
    else
        # Get the user who ran sudo
        SUDO_USER=${SUDO_USER:-$USER}
        if [ "$SUDO_USER" != "root" ]; then
            chown -R "$SUDO_USER:$SUDO_USER" "$INSTALL_DIR"
            echo "Permissions set to $SUDO_USER:$SUDO_USER"
        else
            echo "Permissions set (running as root)"
        fi
    fi
    
    echo "Permissions set."
}

# Main function
main() {
    detect_distro
    check_requirements
    install_nodejs
    install_system_deps
    download_application
    install_dependencies
    setup_database
    build_application
    set_permissions
    create_systemd_service
    
    echo ""
    echo "=========================================================="
    echo "   Server Backup Web Application Installation Complete!"
    echo "=========================================================="
    echo ""
    echo "Installation directory: $INSTALL_DIR"
    echo ""
    echo "Next steps:"
    echo "1. Navigate to the installation directory:"
    echo "   cd $INSTALL_DIR"
    echo ""
    echo "2. Start the development server:"
    echo "   npm run dev"
    echo "   - Frontend will be available at: http://$(hostname -I | awk '{print $1}'):5173"
    echo "   - Backend API will be available at: http://$(hostname -I | awk '{print $1}'):3010"
    echo ""
    echo "3. Or start the production server:"
    echo "   npm start"
    echo "   - Application will be available at: http://$(hostname -I | awk '{print $1}'):3000"
    echo ""
    echo "4. Access the application:"
    echo "   Development: http://$(hostname -I | awk '{print $1}'):5173"
    echo "   Production:  http://$(hostname -I | awk '{print $1}'):3000"
    echo ""
    echo "5. Default credentials:"
    echo "   Username: admin"
    echo "   Password: admin123"
    echo "   ⚠️  IMPORTANT: Change the default password after first login!"
    echo ""
    echo "6. Systemd service:"
    echo "   ✅ Service installed and enabled automatically"
    echo "   The application will start automatically on system boot"
    echo "   To manage the service:"
    echo "   - Start:   sudo systemctl start backup-system"
    echo "   - Stop:    sudo systemctl stop backup-system"
    echo "   - Status:  sudo systemctl status backup-system"
    echo "   - Restart: sudo systemctl restart backup-system"
    echo ""
    echo "Note: Application is installed in $INSTALL_DIR"
    echo "      This is the standard location for installed software (/opt/)"
    echo ""
    echo "For more information, see README.md"
    echo "=========================================================="
}

# Run the main function
main
