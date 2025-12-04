#!/usr/bin/env node

/**
 * Exchange authorization code for refresh token
 * Usage: node exchange-code.js <authorization_code>
 */

import { google } from 'googleapis';

const CLIENT_ID = '681671342232-rge5qmra7th86l20fkgj142d0ddvtq71.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'https://bk.lyarinet.com/oauth_callback';

const code = process.argv[2];

if (!code) {
    console.error('❌ Please provide the authorization code');
    console.error('Usage: node exchange-code.js <authorization_code>');
    process.exit(1);
}

async function main() {
    try {
        console.log('\n⏳ Exchanging code for tokens...\n');
        
        const oauth2Client = new google.auth.OAuth2(
            CLIENT_ID,
            CLIENT_SECRET,
            REDIRECT_URI
        );
        
        const { tokens } = await oauth2Client.getToken(code.trim());
        
        if (!tokens.refresh_token) {
            console.error('\n❌ ERROR: No refresh token received!');
            console.error('\nThis usually happens if:');
            console.error('  1. You already authorized this app before');
            console.error('  2. Google didn\'t return a refresh token');
            console.error('\nSolution:');
            console.error('  1. Go to: https://myaccount.google.com/permissions');
            console.error('  2. Find and REVOKE access for this app');
            console.error('  3. Run the script again with a new code');
            console.error('\nAccess Token:', tokens.access_token ? '✅ Received' : '❌ Missing');
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
        } else if (error.message.includes('invalid_grant')) {
            console.error('\n⚠️  Invalid grant! The authorization code may have expired.');
            console.error('Authorization codes expire quickly. Please run get-refresh-token.js again to get a new code.');
        }
        process.exit(1);
    }
}

main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});

