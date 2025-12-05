#!/usr/bin/env node

/**
 * Generate a simple app icon (1024x1024 PNG)
 * This creates a basic icon with server/backup theme
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if we can use sharp (better) or need to create SVG
let useSharp = false;
try {
    await import('sharp');
    useSharp = true;
} catch (e) {
    // sharp not available
}

if (useSharp) {
    const sharp = (await import('sharp')).default;
    
    // Create icon with sharp
    const size = 1024;
    const center = size / 2;
    const radius = size * 0.4;
    
    // Create SVG for the icon - File & DB Backup Theme (matching provided design)
    const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#14b8a6;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#22c55e;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Background Circle with gradient -->
            <circle cx="${center}" cy="${center}" r="${size/2}" fill="url(#bg)"/>
            
            <!-- Main Content Group -->
            <g transform="translate(${center}, ${center})">
                <!-- Shield Outline -->
                <path d="M 0 -200 L -120 -200 L -160 -120 L -160 80 L 0 200 L 160 80 L 160 -120 L 120 -200 Z" 
                      fill="none" stroke="white" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
                
                <!-- Cloud Icon at top of shield -->
                <path d="M -80 -160 Q -120 -180 -160 -160 Q -200 -140 -240 -160 L -240 -140 Q -200 -120 -160 -140 Q -120 -120 -80 -140 Z" 
                      fill="white" opacity="0.95"/>
                
                <!-- Downward Arrow from cloud -->
                <path d="M 0 -140 L -20 -100 L 0 -60 L 20 -100 Z" 
                      fill="white" opacity="0.95"/>
                <rect x="-8" y="-100" width="16" height="60" fill="white" opacity="0.95"/>
                
                <!-- Database Icon (Left side) -->
                <ellipse cx="-100" cy="20" rx="40" ry="12" fill="white" opacity="0.95"/>
                <rect x="-140" y="8" width="80" height="100" rx="8" fill="white" opacity="0.95"/>
                <ellipse cx="-100" cy="108" rx="40" ry="12" fill="white" opacity="0.95"/>
                <line x1="-100" y1="20" x2="-100" y2="108" stroke="#0ea5e9" stroke-width="4"/>
                <!-- DB Text -->
                <text x="-100" y="70" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle" opacity="0.95">DB</text>
                
                <!-- File Folder Icon (Right side) -->
                <path d="M 60 10 L 60 30 L 140 30 L 140 10 L 100 10 L 80 10 Z" 
                      fill="white" opacity="0.95"/>
                <rect x="60" y="30" width="80" height="80" rx="4" fill="white" opacity="0.95"/>
                <!-- Document lines inside folder -->
                <line x1="75" y1="50" x2="135" y2="50" stroke="#0ea5e9" stroke-width="3"/>
                <line x1="75" y1="65" x2="135" y2="65" stroke="#0ea5e9" stroke-width="3"/>
                <line x1="75" y1="80" x2="125" y2="80" stroke="#0ea5e9" stroke-width="3"/>
                <!-- Small arrow on folder -->
                <path d="M 120 20 L 130 25 L 120 30 Z" 
                      fill="#0ea5e9" opacity="0.8"/>
            </g>
            
            <!-- Text "FILE & DB BACKUP" below shield -->
            <text x="${center}" y="${center + 280}" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle" opacity="0.95">FILE &amp; DB BACKUP</text>
        </svg>
    `.trim();
    
    sharp(Buffer.from(svg))
        .png()
        .resize(size, size)
        .toFile(path.join(__dirname, 'assets', 'icon.png'))
        .then(() => {
            console.log('✅ Icon generated successfully at: assets/icon.png');
            console.log('📱 Now run: npm run icons:generate');
        })
        .catch(err => {
            console.error('❌ Error generating icon:', err);
            process.exit(1);
        });
} else {
    // Fallback: Create instructions
    console.log('📦 Installing sharp for icon generation...');
    console.log('   Run: npm install --save-dev sharp');
    console.log('');
    console.log('📝 Or create icon manually:');
    console.log('   1. Create a 1024x1024 PNG image');
    console.log('   2. Save it as: assets/icon.png');
    console.log('   3. Use design tool or online generator');
    console.log('   4. Recommended: Server/backup/cloud theme with #0ea5e9 color');
    console.log('');
    console.log('🌐 Online tools:');
    console.log('   - https://www.appicon.co/');
    console.log('   - https://www.favicon-generator.org/');
    console.log('   - https://icon.kitchen/');
    process.exit(0);
}

