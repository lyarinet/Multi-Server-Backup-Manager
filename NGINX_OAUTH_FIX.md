# Nginx OAuth Callback Fix

## Issue
The OAuth callback route handler works when accessed directly, but when accessed via HTTPS through nginx, it may not execute properly.

## Root Cause Analysis

From debug logs:
1. ✅ Route handler IS executing (logs show "OAuth callback route EXECUTING")
2. ✅ Server on port 3000 is running and responding
3. ❌ Token exchange fails with `invalid_grant` error
4. ⚠️ When accessed via HTTPS, nginx may be serving cached content or proxying incorrectly

## Fix Required

### 1. Update Nginx Configuration

Edit `/etc/nginx/sites-available/bk` and add explicit OAuth callback location:

```nginx
server {
  listen 80;
  server_name bk.lyarinet.com;

  # Disable caching for dynamic content
  proxy_cache off;
  proxy_no_cache 1;
  proxy_cache_bypass 1;

  # CRITICAL: OAuth callback must be handled by Node.js server, not static files
  location /oauth_callback {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Disable buffering for OAuth callback to ensure immediate response
    proxy_buffering off;
    proxy_cache off;
    
    # Longer timeout for OAuth token exchange
    proxy_connect_timeout 30s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
  }

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # Timeout settings
    proxy_connect_timeout 5s;
    proxy_send_timeout 5s;
    proxy_read_timeout 5s;
    
    # Don't buffer responses
    proxy_buffering off;
    
    # Return 502 if backend is down
    proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
  }
}
```

### 2. Reload Nginx

```bash
sudo nginx -t  # Test configuration
sudo systemctl reload nginx  # Reload nginx
```

### 3. Ensure Production Server is Running

The production server must be running on port 3000. Currently it's running via `npx tsx` which is temporary.

To make it permanent:
1. Fix the production service (backup-system.service) 
2. Or ensure PORT=3000 is set in the environment
3. Or update nginx to proxy to the correct port (3010-3016 range)

### 4. Important Notes

- OAuth authorization codes expire within 1 minute
- Codes can only be used once
- If a code is used or expired, you'll get `invalid_grant` error
- Always get a fresh code by clicking "Get via OAuth" again
