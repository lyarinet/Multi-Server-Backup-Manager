# App Icons

This directory contains the source icon files for generating app icons for Android and iOS.

## Required Files

- `icon.png` - 1024x1024 PNG icon (required)
- `icon.svg` - SVG version (optional, for editing)

## Generating Icons

Run the icon generation script:

```bash
npm run icons:generate
```

Or directly:

```bash
./generate-icons.sh
```

## Creating Your Icon

### Option 1: Use Online Tool
1. Go to https://www.appicon.co/ or https://www.favicon-generator.org/
2. Upload your 1024x1024 PNG image
3. Download and save as `assets/icon.png`

### Option 2: Convert SVG to PNG
If you have ImageMagick installed:

```bash
convert -background none -size 1024x1024 assets/icon.svg assets/icon.png
```

### Option 3: Create with Design Tool
- Use Figma, Photoshop, GIMP, or any design tool
- Create a 1024x1024 PNG with:
  - Transparent or solid background
  - App logo/icon in center
  - Recommended: Use the app's primary color (#0ea5e9)

## Icon Design Guidelines

- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency
- **Content**: Should represent server backup/cloud storage
- **Colors**: Use app theme colors (#0ea5e9 for primary)
- **Style**: Modern, clean, recognizable at small sizes

## Generated Icons

After running the script, icons will be generated in:
- **Android**: `android/app/src/main/res/mipmap-*/`
- **iOS**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

## Notes

- The script uses `@capacitor/assets` to generate all required sizes
- Icons are automatically optimized for each platform
- Round icons are generated for Android
- All density variants are created (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)

