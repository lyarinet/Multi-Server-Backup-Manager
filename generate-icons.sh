#!/bin/bash

# Generate App Icons for Android and iOS
# This script uses @capacitor/assets to generate all required icon sizes

set -e

echo "🎨 Generating App Icons..."

# Check if @capacitor/assets is installed
if ! npm list @capacitor/assets >/dev/null 2>&1; then
    echo "📦 Installing @capacitor/assets..."
    npm install --save-dev @capacitor/assets
fi

# Check if source icon exists, if not try to generate it
if [ ! -f "assets/icon.png" ]; then
    echo "⚠️  Icon not found, attempting to generate..."
    
    # Try to generate icon using Node.js script
    if [ -f "generate-icon.js" ]; then
        node generate-icon.js
        if [ ! -f "assets/icon.png" ]; then
            echo "❌ Failed to generate icon automatically"
            echo ""
            echo "📝 Please create a 1024x1024 PNG icon file at: assets/icon.png"
            echo ""
            echo "You can:"
            echo "1. Install sharp: npm install --save-dev sharp (then run: node generate-icon.js)"
            echo "2. Use an online tool: https://www.appicon.co/"
            echo "3. Use ImageMagick: convert -background none -size 1024x1024 assets/icon.svg assets/icon.png"
            echo "4. Create your own 1024x1024 PNG icon"
            echo ""
            echo "The icon should represent a server backup/cloud storage theme."
            echo ""
            exit 1
        fi
    else
        echo "❌ assets/icon.png not found and generate-icon.js not available!"
        echo ""
        echo "📝 Please create a 1024x1024 PNG icon file at: assets/icon.png"
        exit 1
    fi
fi

# Generate icons using Capacitor Assets CLI
echo "🔄 Generating Android icons..."
npx @capacitor/assets generate \
    --iconBackgroundColor "#0ea5e9" \
    --iconBackgroundColorDark "#0369a1" \
    --splashBackgroundColor "#0ea5e9" \
    --android

echo "🔄 Generating iOS icons..."
npx @capacitor/assets generate \
    --iconBackgroundColor "#0ea5e9" \
    --iconBackgroundColorDark "#0369a1" \
    --splashBackgroundColor "#0ea5e9" \
    --ios

echo "✅ Icons generated successfully!"
echo ""
echo "📱 Icons are now in:"
echo "   - Android: android/app/src/main/res/"
echo "   - iOS: ios/App/App/Assets.xcassets/AppIcon.appiconset/"
echo ""
echo "🔄 Next steps:"
echo "   1. Rebuild the app: npm run android:build-apk"
echo "   2. Or sync: npm run android:build"

