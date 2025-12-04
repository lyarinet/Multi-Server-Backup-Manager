# Google Drive API Setup Guide

This guide will walk you through creating a Google Cloud Project, enabling the Google Drive API, and obtaining OAuth credentials for automatic backup uploads.

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Your application URL: `https://bk.lyarinet.com`

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click **"New Project"**
4. Enter a project name (e.g., "Server Backup App")
5. Click **"Create"**
6. Wait for the project to be created, then select it from the project dropdown

## Step 2: Enable Google Drive API

1. In the Google Cloud Console, navigate to **"APIs & Services"** → **"Library"**
2. Search for **"Google Drive API"**
3. Click on **"Google Drive API"** from the results
4. Click **"Enable"**
5. Wait for the API to be enabled (this may take a few seconds)

## Step 3: Configure OAuth Consent Screen

1. Navigate to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** user type (unless you have a Google Workspace account)
3. Click **"Create"**
4. Fill in the required information:
   - **App name**: Server Backup App (or your preferred name)
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **"Save and Continue"**
6. On the **"Scopes"** page:
   - Click **"Add or Remove Scopes"**
   - Search for and add:
     - `https://www.googleapis.com/auth/drive.file` (View and manage Google Drive files and folders that you have opened or created)
     - `https://www.googleapis.com/auth/drive.metadata.readonly` (View metadata for files in your Google Drive)
   - Click **"Update"** then **"Save and Continue"**
7. On the **"Test users"** page (if External):
   - Click **"Add Users"**
   - Add your Google account email
   - Click **"Add"** then **"Save and Continue"**
8. Review and click **"Back to Dashboard"**

> **Note**: If your app is in "Testing" mode, only test users can authorize it. To make it available to all users, you'll need to submit it for verification (or keep it in testing mode with your email as a test user).

## Step 4: Create OAuth 2.0 Credentials

1. Navigate to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. If prompted, select **"Web application"** as the application type
5. Fill in the OAuth client details:
   - **Name**: Server Backup App Client (or your preferred name)
   - **Authorized JavaScript origins**: 
     - `https://bk.lyarinet.com`
   - **Authorized redirect URIs**:
     - `https://bk.lyarinet.com/oauth_callback`
6. Click **"Create"**
7. **IMPORTANT**: A popup will appear with your credentials:
   - **Client ID**: Copy this value (you'll need it)
   - **Client Secret**: Copy this value (you'll need it)
   - Click **"OK"** to close the popup

> **⚠️ Security Note**: Keep your Client Secret secure. Do not share it publicly or commit it to version control.

## Step 5: Get Refresh Token

You have two options to get the refresh token:

### Option A: Using the In-App OAuth Flow (Recommended)

1. Open your backup application
2. Navigate to **Settings** → **Cloud Storage**
3. Click **"Add Provider"** or **"Edit Provider"**
4. Fill in the form:
   - **Provider Name**: Google Drive (or your preferred name)
   - **Select Type**: Google Drive
   - **Client ID**: Paste the Client ID from Step 4
   - **Client Secret**: Paste the Client Secret from Step 4
   - **Redirect URI**: This should automatically show `https://bk.lyarinet.com/oauth_callback`
5. Click **"Get via OAuth"** button next to the Refresh Token field
6. A new window will open asking you to sign in with Google
7. Sign in with your Google account (the one you added as a test user)
8. Review the permissions and click **"Allow"**
9. You'll be redirected back to your application
10. The refresh token will be automatically saved

### Option B: Using the Command-Line Script (Alternative Method)

If the in-app OAuth flow doesn't work, you can use the provided script:

1. **Get the authorization code:**
   ```bash
   cd /var/www/html/backup/bk
   node get-refresh-token.js
   ```
   
2. **The script will display a URL** - Open it in your browser:
   ```
   https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=...
   ```

3. **Authorize the application:**
   - Sign in with your Google account
   - Click **"Allow"** when prompted
   - You'll be redirected to: `https://bk.lyarinet.com/oauth_callback?code=XXXXX`

4. **Copy the authorization code:**
   - From the redirect URL, copy the entire `code` parameter
   - It will look like: `4/0Ab32j91PE6rl7MJfXdo_cH4tiHRRRpYWZHb54RHL6wLXEfbwLf4gqfLtAGuW5NhCI07RBA`

5. **Exchange the code for a refresh token:**
   ```bash
   node exchange-code.js "YOUR_AUTHORIZATION_CODE_HERE"
   ```
   
   Example:
   ```bash
   node exchange-code.js "4/0Ab32j91PE6rl7MJfXdo_cH4tiHRRRpYWZHb54RHL6wLXEfbwLf4gqfLtAGuW5NhCI07RBA"
   ```

6. **Copy the refresh token** from the output:
   ```
   ✅ SUCCESS! Refresh token obtained!
   
   📋 COPY THIS REFRESH TOKEN:
   
   1//099zaDp3er3ERCgYIARAAGAkSNwF-L9IrAY6qdgPG9nP2V0sWsw0OZouZLN5Eqp_P_sl0lUEbAOUr_na8KNucFiH16JYPznCMg1k
   ```

## Step 6: Configure in Your Application

1. Open your backup application
2. Navigate to **Settings** → **Cloud Storage**
3. Click **"Add Provider"** or **"Edit Provider"**
4. Fill in the form:
   - **Provider Name**: Google Drive (or your preferred name)
   - **Select Type**: Google Drive
   - **Client ID**: Paste the Client ID from Step 4
   - **Client Secret**: Paste the Client Secret from Step 4
   - **Refresh Token**: 
     - If using Option A: Already saved automatically
     - If using Option B: Paste the refresh token you copied
   - **Redirect URI**: This should automatically show `https://bk.lyarinet.com/oauth_callback`
5. Enable **"Automatically upload backups to Google Drive after completion"** checkbox
6. (Optional) Enter a **Default Folder ID** if you want backups in a specific folder
7. Click **"Update Provider"** to save

## Step 7: Test the Connection

1. After saving, click the **"Test Connection"** button
2. You should see a success message: "Connection successful!"
3. If you see an error, check:
   - Client ID and Client Secret are correct
   - Redirect URI matches exactly: `https://bk.lyarinet.com/oauth_callback`
   - OAuth consent screen is configured correctly
   - Your email is added as a test user (if app is in testing mode)

## Step 8: Verify Auto-Upload

1. Go to the main dashboard
2. Trigger a backup for any server
3. After the backup completes, check the backup logs
4. You should see messages like:
   - "Starting Google Drive upload..."
   - "Uploading backup directory to Google Drive..."
   - "Successfully uploaded X items to Google Drive"
5. Check your Google Drive for the uploaded backup files

## Troubleshooting

### Issue: "Redirect URI mismatch" error

**Solution**: 
- Ensure the redirect URI in Google Cloud Console exactly matches: `https://bk.lyarinet.com/oauth_callback`
- Check for trailing slashes or protocol mismatches (http vs https)

### Issue: "Access blocked: This app's request is invalid"

**Solution**:
- Make sure your email is added as a test user in OAuth consent screen
- Verify the OAuth consent screen is properly configured
- Check that the required scopes are added

### Issue: "No refresh token received"

**Solution**:
- Make sure `prompt=consent` is used (this is already set in the code)
- Revoke access to your app in [Google Account Settings](https://myaccount.google.com/permissions)
- Try the OAuth flow again
- **Alternative**: Use the command-line script method (Option B in Step 5) to get the refresh token

### Issue: "Drive connection failed" when testing

**Solution**:
- Verify Client ID and Client Secret are correct
- Check that Google Drive API is enabled
- Ensure the refresh token was saved correctly
- Try regenerating the refresh token

### Issue: Backups not uploading automatically

**Solution**:
- Verify "Automatically upload backups to Google Drive" is enabled
- Check backup logs for error messages
- Ensure the backup completed successfully before upload
- Verify Google Drive API quota hasn't been exceeded

## Security Best Practices

1. **Never commit credentials to version control**
   - Use environment variables for production
   - Keep credentials in secure storage

2. **Limit API access**
   - Only grant necessary scopes
   - Regularly review and revoke unused access

3. **Monitor usage**
   - Check Google Cloud Console for API usage
   - Set up alerts for unusual activity

4. **Rotate credentials periodically**
   - Regenerate Client Secret if compromised
   - Update refresh tokens as needed

## API Quotas and Limits

Google Drive API has the following limits:
- **Queries per 100 seconds per user**: 1,000
- **Queries per 100 seconds**: 10,000
- **File upload size**: Up to 5TB per file

For most backup scenarios, these limits should be sufficient. If you encounter quota issues, consider:
- Reducing backup frequency
- Compressing backups before upload
- Using batch uploads for multiple files

## Additional Resources

- [Google Drive API Documentation](https://developers.google.com/drive/api)
- [OAuth 2.0 for Web Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google API Client Libraries](https://developers.google.com/api-client-library)

## Quick Reference

**Redirect URI**: `https://bk.lyarinet.com/oauth_callback`

**Required Scopes**:
- `https://www.googleapis.com/auth/drive.file`
- `https://www.googleapis.com/auth/drive.metadata.readonly`

**Where to find credentials**:
- Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs

**Test your setup**:
- Settings → Cloud Storage → Test Connection button

---

**Need Help?** If you encounter issues not covered in this guide, check the application logs or contact support.

