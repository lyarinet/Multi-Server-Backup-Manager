#!/bin/bash

# Setup Android Studio path for macOS
# This script helps configure the Android Studio path for Capacitor on macOS

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=macOS;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGW;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

echo "🔧 Setting up Android Studio path..."

if [ "$MACHINE" != "macOS" ]; then
    echo "⚠️  Warning: This script is designed for macOS"
    echo "   Current OS: $MACHINE"
    echo ""
    echo "📝 Instructions for macOS:"
    echo "   1. Run this script on your macOS machine"
    echo "   2. Or manually set the environment variable:"
    echo ""
    echo "      export CAPACITOR_ANDROID_STUDIO_PATH=\"/Applications/Android Studio.app/Contents/MacOS/studio\""
    echo ""
    echo "   3. Add to ~/.zshrc or ~/.bash_profile for permanent setup:"
    echo "      echo 'export CAPACITOR_ANDROID_STUDIO_PATH=\"/Applications/Android Studio.app/Contents/MacOS/studio\"' >> ~/.zshrc"
    echo "      source ~/.zshrc"
    echo ""
    echo "   4. Then run 'npm run android:open' on your macOS machine"
    exit 0
fi

echo "✅ Detected macOS"

# Default macOS Android Studio path
DEFAULT_PATH="/Applications/Android Studio.app/Contents/MacOS/studio"

# Check if Android Studio exists at default location
if [ -f "$DEFAULT_PATH" ]; then
    echo "✅ Found Android Studio at: $DEFAULT_PATH"
    STUDIO_PATH="$DEFAULT_PATH"
else
    echo "⚠️  Android Studio not found at default location"
    echo "Please enter the path to Android Studio executable:"
    echo "   (Usually: /Applications/Android Studio.app/Contents/MacOS/studio)"
    read -p "Path: " STUDIO_PATH
    
    if [ ! -f "$STUDIO_PATH" ]; then
        echo "❌ Error: File not found at: $STUDIO_PATH"
        exit 1
    fi
fi

# Detect shell
if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bash_profile"
    if [ ! -f "$SHELL_RC" ]; then
        SHELL_RC="$HOME/.bashrc"
    fi
else
    SHELL_RC="$HOME/.profile"
fi

# Check if already set
if grep -q "CAPACITOR_ANDROID_STUDIO_PATH" "$SHELL_RC" 2>/dev/null; then
    echo "⚠️  CAPACITOR_ANDROID_STUDIO_PATH already set in $SHELL_RC"
    read -p "Update it? (y/n): " UPDATE
    if [ "$UPDATE" = "y" ] || [ "$UPDATE" = "Y" ]; then
        # Remove old entry
        sed -i.bak "/CAPACITOR_ANDROID_STUDIO_PATH/d" "$SHELL_RC"
        echo "✅ Removed old entry"
    else
        echo "Keeping existing configuration"
        exit 0
    fi
fi

# Add to shell RC
echo "" >> "$SHELL_RC"
echo "# Capacitor Android Studio Path (added by setup script)" >> "$SHELL_RC"
echo "export CAPACITOR_ANDROID_STUDIO_PATH=\"$STUDIO_PATH\"" >> "$SHELL_RC"

echo "✅ Added to $SHELL_RC"
echo ""
echo "To apply immediately, run:"
echo "  export CAPACITOR_ANDROID_STUDIO_PATH=\"$STUDIO_PATH\""
echo ""
echo "Or restart your terminal/shell"
echo ""
echo "You can now run:"
echo "  npm run android:open"

