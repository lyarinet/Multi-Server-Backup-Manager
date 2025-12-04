# Google Drive API - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### 1. Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Google Drive API**:
   - APIs & Services → Library → Search "Google Drive API" → Enable
4. Configure OAuth Consent Screen:
   - APIs & Services → OAuth consent screen
   - Choose "External" → Fill required fields → Save
   - Add scopes: `drive.file` and `drive.metadata.readonly`
   - Add your email as a test user
5. Create OAuth Client:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Authorized redirect URIs: `https://bk.lyarinet.com/oauth_callback`
   - Copy **Client ID** and **Client Secret**

### 2. Get Refresh Token

**Method A: In-App OAuth (Recommended)**
1. Open your app: Settings → Cloud Storage
2. Click "Add Provider"
3. Enter Client ID and Client Secret
4. Click **"Get via OAuth"** → Authorize → Token saved automatically

**Method B: Command-Line Script (If Method A fails)**
```bash
cd /var/www/html/backup/bk
node get-refresh-token.js
# Open the URL shown, authorize, copy the code from redirect URL
node exchange-code.js "YOUR_CODE_HERE"
# Copy the refresh token from output
```

### 3. Configure in App

1. Open your app: Settings → Cloud Storage
2. Click "Add Provider" or "Edit Provider"
3. Enter:
   - **Client ID**: (from Google Cloud Console)
   - **Client Secret**: (from Google Cloud Console)
   - **Refresh Token**: (from Method A or B above)
4. Enable **"Automatically upload backups to Google Drive"**
5. Click **"Update Provider"**

### 4. Test

- Click **"Test Connection"** → Should show "Connection successful!"
- Run a backup → Check logs for "Successfully uploaded to Google Drive"

## 📋 Required Information

| Item | Value |
|------|-------|
| **Redirect URI** | `https://bk.lyarinet.com/oauth_callback` |
| **Required Scopes** | `drive.file`, `drive.metadata.readonly` |
| **API to Enable** | Google Drive API |

## 🔗 Important Links

- [Google Cloud Console](https://console.cloud.google.com/)
- [Full Setup Guide](./GOOGLE_DRIVE_SETUP.md)
- [Google Drive API Docs](https://developers.google.com/drive/api)

## ❓ Common Issues

**"Redirect URI mismatch"**
→ Check redirect URI matches exactly: `https://bk.lyarinet.com/oauth_callback`

**"No refresh token"**
→ Revoke access in [Google Account](https://myaccount.google.com/permissions) and try again
→ Or use the command-line script: `node get-refresh-token.js` then `node exchange-code.js "CODE"`

**"Access blocked"**
→ Add your email as a test user in OAuth consent screen

---

For detailed instructions, see [GOOGLE_DRIVE_SETUP.md](./GOOGLE_DRIVE_SETUP.md)

