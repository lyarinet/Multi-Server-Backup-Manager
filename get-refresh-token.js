#!/usr/bin/env node

/**
 * Simple script to get Google Drive refresh token
 * 
 * Usage:
 *   1. Run: node get-refresh-token.js
 *   2. Open the URL shown in your browser
 *   3. Authorize and copy the code from the redirect URL
 *   4. Paste the code when prompted
 *   5. Copy the refresh_token from the output
 */

import { google } from 'googleapis';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CONFIGURATION
// ============================================
let CLIENT_ID, CLIENT_SECRET;

// Try to read from JSON file if it exists
const jsonPath = process.argv[2] || path.join(__dirname, 'client_secret.json');
if (fs.existsSync(jsonPath)) {
    try {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        CLIENT_ID = jsonData.web.client_id;
        CLIENT_SECRET = jsonData.web.client_secret;
        console.log(`✅ Loaded credentials from: ${jsonPath}`);
    } catch (e) {
        console.error(`⚠️  Failed to read JSON file: ${e.message}`);
    }
}

// Option 2: Manual configuration (if JSON not found)
if (!CLIENT_ID || !CLIENT_SECRET) {
    CLIENT_ID = '681671342232-rge5qmra7th86l20fkgj142d0ddvtq71.apps.googleusercontent.com';
    CLIENT_SECRET = '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';
    console.log('⚠️  Using hardcoded credentials. To use JSON file:');
    console.log(`   node get-refresh-token.js /path/to/client_secret.json`);
}

const REDIRECT_URI = 'https://bk.lyarinet.com/oauth_callback';

// Scopes needed
const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
];

// ============================================
// Script Logic
// ============================================

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
    console.log('\n🔐 Google Drive Refresh Token Generator\n');
    console.log('='.repeat(50));
    
    const oauth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI
    );

    // Generate the authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent' // Force consent screen to get refresh token
    });

    console.log('\n📋 Step 1: Open this URL in your browser:\n');
    console.log(authUrl);
    console.log('\n');
    console.log('📋 Step 2: After authorizing, you will be redirected to:');
    console.log(`   ${REDIRECT_URI}?code=XXXXX`);
    console.log('\n📋 Step 3: Copy the ENTIRE "code" parameter from the URL');
    console.log('   (It will look like: 4/0Ab32j93zayAeeoTXC6eECa0LGVWqQbNBEpbcIN10JpLgGsIlCsQI5euZMD2hJ5-OdxP_SQ)');
    console.log('\n');

    const code = await question('Paste the authorization code here: ');

    if (!code || code.trim() === '') {
        console.error('\n❌ No code provided. Exiting.');
        rl.close();
        process.exit(1);
    }

    try {
        console.log('\n⏳ Exchanging code for tokens...\n');
        
        const { tokens } = await oauth2Client.getToken(code.trim());
        
        if (!tokens.refresh_token) {
            console.error('\n❌ ERROR: No refresh token received!');
            console.error('\nThis usually happens if:');
            console.error('  1. You already authorized this app before');
            console.error('  2. Google didn\'t return a refresh token');
            console.error('\nSolution:');
            console.error('  1. Go to: https://myaccount.google.com/permissions');
            console.error('  2. Find and REVOKE access for this app');
            console.error('  3. Run this script again');
            console.error('\nAccess Token:', tokens.access_token ? '✅ Received' : '❌ Missing');
            rl.close();
            process.exit(1);
        }

        console.log('✅ SUCCESS! Refresh token obtained!\n');
        console.log('='.repeat(50));
        console.log('\n📋 COPY THIS REFRESH TOKEN:\n');
        console.log(tokens.refresh_token);
        console.log('\n' + '='.repeat(50));
        console.log('\n📝 Next steps:');
        console.log('  1. Copy the refresh token above');
        console.log('  2. Go to your backup app: https://bk.lyarinet.com/#/settings');
        console.log('  3. Open Cloud Storage → Edit Configuration');
        console.log('  4. Paste the refresh token in the "Refresh Token" field');
        console.log('  5. Click "Update Provider"');
        console.log('  6. Click "Test Connection" to verify\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        if (error.message.includes('redirect_uri_mismatch')) {
            console.error('\n⚠️  Redirect URI mismatch!');
            console.error('Make sure this EXACT URL is in Google Cloud Console:');
            console.error(`   ${REDIRECT_URI}`);
            console.error('\nGo to: https://console.cloud.google.com/apis/credentials');
            console.error('Click your OAuth 2.0 Client ID');
            console.error('Add the redirect URI in "Authorized redirect URIs"');
        }
        rl.close();
        process.exit(1);
    }

    rl.close();
}

main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    rl.close();
    process.exit(1);
});
