# Session Storage Setup Guide

## Problem: Sessions Not Persisting

If your sessions are not being stored properly in your Nuxt Auth Utils application, it's likely due to a missing or improperly configured `NUXT_SESSION_PASSWORD` environment variable.

## Solution

### 1. Generate a Secure Session Password

The `NUXT_SESSION_PASSWORD` is **required** for nuxt-auth-utils to encrypt and store session cookies. It must be at least 32 characters long.

Generate a secure password using one of these methods:

**Option A: Using OpenSSL (Recommended)**
```bash
openssl rand -base64 32
```

**Option B: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Option C: Using PowerShell (Windows)**
```powershell
[System.Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}))
```

### 2. Create Your .env File

Copy the `.env.example` file to create your `.env`:

```bash
cp .env.example .env
```

Or on Windows:
```powershell
copy .env.example .env
```

### 3. Configure Your Environment Variables

Edit your `.env` file and add:

```bash
# REQUIRED: Session password for encrypting cookies (minimum 32 characters)
NUXT_SESSION_PASSWORD=your-generated-password-here

# Discord OAuth Configuration
NUXT_OAUTH_DISCORD_CLIENT_ID=your-discord-client-id
NUXT_OAUTH_DISCORD_CLIENT_SECRET=your-discord-client-secret

# Base URL for authentication callbacks
NUXT_AUTH_BASE_URL=http://localhost:3000  # For development
# NUXT_AUTH_BASE_URL=https://yourdomain.com  # For production
```

### 4. Session Configuration in nuxt.config.ts

The session configuration has been added to `nuxt.config.ts`:

```typescript
runtimeConfig: {
  session: {
    name: 'nuxt-session',
    password: process.env.NUXT_SESSION_PASSWORD || '',
    cookie: {
      sameSite: 'lax',
      secure: true, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7 // 1 week
    },
    maxAge: 60 * 60 * 24 * 7 // 1 week session duration
  }
}
```

### 5. Important Cookie Settings

#### For Development (localhost)
If you're running on `http://localhost:3000`, you might need to adjust the `secure` cookie setting:

```typescript
cookie: {
  sameSite: 'lax',
  secure: false, // Set to false for HTTP in development
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 7
}
```

#### For Production (HTTPS)
Always use secure cookies in production:

```typescript
cookie: {
  sameSite: 'lax',
  secure: true, // Required for HTTPS
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 7
}
```

### 6. Dynamic Configuration Based on Environment

You can make the secure setting dynamic based on your environment:

```typescript
cookie: {
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 7
}
```

## Troubleshooting

### Sessions Still Not Working?

1. **Check Browser DevTools**
   - Open Network tab and look for the `/auth/discord` callback
   - Check the Response Headers for `Set-Cookie`
   - Verify cookies are being set in Application > Cookies

2. **Verify Environment Variables**
   ```bash
   # Check if environment variables are loaded
   npm run dev
   # Look for any warnings about missing NUXT_SESSION_PASSWORD
   ```

3. **Common Issues**
   - **Missing password**: Sessions won't work without `NUXT_SESSION_PASSWORD`
   - **Password too short**: Must be at least 32 characters
   - **Secure cookie on HTTP**: If `secure: true` on localhost, cookies won't be set
   - **SameSite issues**: Some OAuth providers require `sameSite: 'lax'` or `'none'`

4. **Test Session Storage**
   After logging in, you can test if sessions are working:
   - Navigate to different pages - you should stay logged in
   - Refresh the page - you should stay logged in
   - Close and reopen the browser tab - you should stay logged in (within session duration)

## Session Security Best Practices

1. **Never commit your .env file** - It's already in `.gitignore`
2. **Use different passwords** for development and production
3. **Rotate session passwords** periodically in production
4. **Monitor session duration** - Balance security with user experience
5. **Use HTTPS in production** - Required for secure cookies

## Additional Session Options

You can customize session behavior further:

```typescript
session: {
  // Session name (cookie name)
  name: 'nuxt-session',
  
  // Encryption password
  password: process.env.NUXT_SESSION_PASSWORD,
  
  // Cookie configuration
  cookie: {
    sameSite: 'lax', // 'strict', 'lax', or 'none'
    secure: true,     // HTTPS only
    httpOnly: true,   // Not accessible via JavaScript
    maxAge: 60 * 60 * 24 * 7, // Cookie lifetime in seconds
    domain: '.yourdomain.com', // Cookie domain (optional)
    path: '/',        // Cookie path (default: '/')
    encode: value => value, // Custom encoding (optional)
    decode: value => value  // Custom decoding (optional)
  },
  
  // Session duration (server-side)
  maxAge: 60 * 60 * 24 * 7,
  
  // Custom session data
  // You can extend this in your auth handler
}
