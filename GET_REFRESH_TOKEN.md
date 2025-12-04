# How to Get Google Drive Refresh Token

This guide shows you how to get a Google Drive refresh token using the command-line script method.

## Quick Steps

### Step 1: Run the Script

```bash
cd /var/www/html/backup/bk
node get-refresh-token.js
```

### Step 2: Authorize in Browser

The script will display a URL like:
```
https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=...
```

1. **Copy and open this URL** in your browser
2. **Sign in** with your Google account
3. **Click "Allow"** to authorize the application
4. You'll be redirected to: `https://bk.lyarinet.com/oauth_callback?code=XXXXX`

### Step 3: Copy the Authorization Code

From the redirect URL, copy the entire `code` parameter.

**Example:**
```
https://bk.lyarinet.com/oauth_callback?code=4/0Ab32j91PE6rl7MJfXdo_cH4tiHRRRpYWZHb54RHL6wLXEfbwLf4gqfLtAGuW5NhCI07RBA
```

Copy this part: `4/0Ab32j91PE6rl7MJfXdo_cH4tiHRRRpYWZHb54RHL6wLXEfbwLf4gqfLtAGuW5NhCI07RBA`

### Step 4: Exchange Code for Refresh Token

Go back to your terminal and run:

```bash
node exchange-code.js "YOUR_AUTHORIZATION_CODE_HERE"
```

**Example:**
```bash
node exchange-code.js "4/0Ab32j91PE6rl7MJfXdo_cH4tiHRRRpYWZHb54RHL6wLXEfbwLf4gqfLtAGuW5NhCI07RBA"
```

### Step 5: Copy the Refresh Token

The script will output something like:

```
✅ SUCCESS! Refresh token obtained!

==================================================

📋 COPY THIS REFRESH TOKEN:

1//099zaDp3er3ERCgYIARAAGAkSNwF-L9IrAY6qdgPG9nP2V0sWsw0OZouZLN5Eqp_P_sl0lUEbAOUr_na8KNucFiH16JYPznCMg1k

==================================================
```

**Copy the entire refresh token** (starts with `1//`)

### Step 6: Paste in Your App

1. Go to your backup app: **Settings → Cloud Storage → Edit Configuration**
2. Paste the refresh token in the **"Refresh Token"** field
3. Click **"Update Provider"**
4. Click **"Test Connection"** to verify

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Solution:**
- Make sure this EXACT URL is in Google Cloud Console:
  - `https://bk.lyarinet.com/oauth_callback`
- Go to: [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
- Click your OAuth 2.0 Client ID
- Add the redirect URI in "Authorized redirect URIs"

### Error: "No refresh token received"

**Solution:**
1. Go to: [Google Account Permissions](https://myaccount.google.com/permissions)
2. Find and **REVOKE** access for this app
3. Run the script again

### Error: "Invalid grant"

**Solution:**
- Authorization codes expire quickly (within minutes)
- Run `get-refresh-token.js` again to get a fresh code
- Complete the exchange immediately

## Script Files

- **`get-refresh-token.js`** - Generates OAuth URL and gets authorization code
- **`exchange-code.js`** - Exchanges authorization code for refresh token

## Notes

- Refresh tokens start with `1//`
- Refresh tokens are typically 100-200 characters long
- Keep your refresh token secure - it provides access to your Google Drive
- The refresh token doesn't expire (unless revoked)

## Quick Reference

```bash
# Get authorization URL
node get-refresh-token.js

# Exchange code for token
node exchange-code.js "YOUR_CODE"
```

---

For more details, see [GOOGLE_DRIVE_SETUP.md](./GOOGLE_DRIVE_SETUP.md)

