# Production Git Authentication Troubleshooting

## Overview

This guide provides comprehensive troubleshooting steps for Git authentication issues in production environments. The F2F DocView system now includes multiple authentication methods and enhanced diagnostics to resolve common production issues.

## Quick Diagnosis

### 1. Access Git Diagnostics Endpoint

Navigate to your application and access the diagnostics endpoint:

```
GET /api/git-diagnostics
```

This will provide:
- Current configuration status
- Credential validation results
- System information
- Specific recommendations

### 2. Check Server Logs

Look for these log entries in your production environment:
- `Git pull initiated by user:`
- `Git diagnostics:`
- `Attempting Git pull with robust authentication...`
- `Git pull completed using method:`

The `method` field tells you which authentication approach succeeded:
- `credential-helper`: Git credential helper (most secure)
- `url-auth`: URL-based authentication (fallback)
- `local-config`: Local Git configuration
- `ssh`: SSH key authentication

## Common Production Issues

### Issue 1: "All authentication methods failed"

**Symptoms:**
- Error message: "Git authentication failed with all available methods"
- Status code: 401
- Git operations consistently fail

**Diagnosis Steps:**

1. **Verify Environment Variables:**
   ```bash
   # Check if variables are set (don't print values for security)
   echo "GIT_USERNAME set: ${NUXT_GIT_USERNAME:+yes}"
   echo "GIT_TOKEN set: ${NUXT_GIT_TOKEN:+yes}"
   ```

2. **Test Credentials Manually:**
   ```bash
   # Replace with your actual credentials
   git ls-remote https://username:token@github.com/Fail2Fail-Studios/una
   ```

3. **Check Token Validity:**
   - Visit [GitHub Token Settings](https://github.com/settings/tokens)
   - Verify token hasn't expired
   - Confirm token has `repo` scope

**Solutions:**

- **Expired Token:** Generate new GitHub Personal Access Token
- **Wrong Scopes:** Create token with `repo` and `public_repo` scopes
- **Environment Issues:** Verify environment variables are properly loaded in production

### Issue 2: Environment Variables Not Loading

**Symptoms:**
- Credentials validation shows "No credentials provided"
- System falls back to local Git configuration
- Inconsistent authentication behavior

**Diagnosis Steps:**

1. **Check Environment Loading:**
   ```bash
   # In production environment
   printenv | grep NUXT_GIT
   ```

2. **Verify Production Configuration:**
   - Confirm `.env` file exists and is readable
   - Check if variables are set in deployment platform (Docker, PM2, etc.)
   - Verify variable names match exactly: `NUXT_GIT_USERNAME`, `NUXT_GIT_TOKEN`

**Solutions:**

- **Docker:** Use environment variables in docker-compose or Dockerfile
- **PM2:** Configure in ecosystem.config.js
- **Platform Services:** Set in platform-specific environment configuration

### Issue 3: Git Repository Path Issues

**Symptoms:**
- Error: "Git repository path does not exist"
- Error: "Directory is not a git repository"
- Repository operations fail before authentication

**Diagnosis Steps:**

1. **Verify Repository Path:**
   ```bash
   ls -la /usr/src/app/una-repo
   ls -la /usr/src/app/una-repo/.git
   ```

2. **Check Git Repository Status:**
   ```bash
cd /usr/src/app/una-repo
git status
git remote -v
   ```

**Solutions:**

- **Missing Repository:** Clone repository to correct path
- **Wrong Path:** Verify repository is at `/usr/src/app/una-repo` (static path, rarely needs changing)
- **Permissions:** Ensure application has read/write access to repository directory

### Issue 4: Network Connectivity Problems

**Symptoms:**
- Error: "Could not resolve host"
- Timeout errors
- Intermittent authentication failures

**Diagnosis Steps:**

1. **Test Network Access:**
   ```bash
   # Test GitHub connectivity
   curl -I https://github.com
   
   # Test API access
   curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user
   ```

2. **Check Firewall/Proxy Settings:**
   - Verify outbound HTTPS (port 443) is allowed
   - Check for corporate proxy requirements
   - Test from production server directly

**Solutions:**

- **Firewall:** Configure firewall rules for GitHub access
- **Proxy:** Configure Git proxy settings if required
- **DNS:** Verify DNS resolution for github.com

## Enhanced Authentication Methods

The new Git authentication system tries multiple methods in order:

### 1. Git Credential Helper (Recommended)

**How it works:**
- Creates temporary credential helper script
- Provides secure token authentication
- Doesn't expose credentials in process list

**Configuration:**
```bash
NUXT_GIT_USERNAME=your-username
NUXT_GIT_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

### 2. URL Authentication (Fallback)

**How it works:**
- Injects credentials directly into Git URL
- Compatible with most Git versions
- Less secure but more reliable

**When used:**
- Credential helper setup fails
- Git version doesn't support credential helpers
- Fallback scenario

### 3. Local Git Configuration

**How it works:**
- Uses existing Git configuration on server
- Relies on pre-configured credentials
- Works with SSH keys or stored credentials

**Setup for production:**
```bash
# On production server
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"

# For HTTPS with token
git config --global credential.helper store
echo "https://username:token@github.com" > ~/.git-credentials

# For SSH (requires key setup)
ssh-keygen -t ed25519 -C "your-email@example.com"
# Add public key to GitHub
```

### 4. SSH Authentication

**How it works:**
- Uses SSH keys for authentication
- Most secure for long-term production use
- Requires SSH key setup

**Setup for production:**
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "production-server@yourdomain.com"

# Add to GitHub
cat ~/.ssh/id_ed25519.pub
# Copy and add to GitHub SSH keys

# Update Git remote to use SSH
cd /usr/src/app/una-repo
git remote set-url origin git@github.com:Fail2Fail-Studios/una.git
```

## Production Deployment Best Practices

### 1. Secure Environment Variables

**Docker Compose:**
```yaml
services:
  docview:
    environment:
      - NUXT_GIT_USERNAME=${GIT_USERNAME}
      - NUXT_GIT_TOKEN=${GIT_TOKEN}
      - NUXT_GIT_REPO_PATH=/app/content-repo  # Optional: override default path
```

**PM2 Ecosystem:**
```javascript
module.exports = {
  apps: [{
    name: 'f2f-docview',
    script: '.output/server/index.mjs',
    env: {
      NUXT_GIT_USERNAME: process.env.GIT_USERNAME,
      NUXT_GIT_TOKEN: process.env.GIT_TOKEN,
      NUXT_GIT_REPO_PATH: '/var/www/content-repo'  # Optional: override default path
    }
  }]
}
```

### 2. Repository Setup

**Clone Repository:**
```bash
# On production server
cd /var/www
git clone https://github.com/Fail2Fail-Studios/una.git content-repo
chown -R app:app content-repo
```

**Set Environment Variable:**
```bash
export NUXT_GIT_REPO_PATH=/var/www/content-repo  # Optional: override default /usr/src/app/una-repo
```

### 3. Monitoring and Alerts

**Log Monitoring:**
```bash
# Monitor authentication methods
tail -f /var/log/docview.log | grep "Git pull completed using method"

# Monitor failures
tail -f /var/log/docview.log | grep "Git authentication failed"
```

**Health Check Script:**
```bash
#!/bin/bash
# git-health-check.sh

RESPONSE=$(curl -s -H "Authorization: Bearer $API_TOKEN" \
  https://yourdomain.com/api/git-diagnostics)

if echo "$RESPONSE" | grep -q "credentialsValid.*true"; then
  echo "Git authentication: OK"
  exit 0
else
  echo "Git authentication: FAILED"
  echo "$RESPONSE"
  exit 1
fi
```

## Token Rotation Strategy

### 1. Regular Token Rotation

**Monthly Rotation Script:**
```bash
#!/bin/bash
# rotate-git-token.sh

# Generate new token (manual step)
echo "1. Generate new token at: https://github.com/settings/tokens"
echo "2. Update production environment variable"
echo "3. Restart application"
echo "4. Test authentication"

# Test new token
curl -H "Authorization: token $NEW_TOKEN" https://api.github.com/user
```

### 2. Zero-Downtime Token Updates

**For containerized deployments:**
1. Update environment variable in orchestrator
2. Rolling restart of application instances
3. Monitor logs for successful authentication

**For PM2 deployments:**
```bash
# Update environment and restart
pm2 restart docview --update-env
pm2 logs docview | grep "Git pull completed"
```

## Troubleshooting Commands

### Quick Health Check
```bash
# Test all components
curl -H "Cookie: your-session-cookie" \
  https://yourdomain.com/api/git-diagnostics | jq '.'
```

### Manual Git Test
```bash
# Test authentication from server
cd /usr/src/app/una-repo
git ls-remote origin

# Test pull operation
git pull origin main
```

### Debug Environment
```bash
# Check all Git-related environment variables
printenv | grep -E "(GIT|NUXT)" | sort

# Verify repository setup
ls -la /usr/src/app/una-repo
git -C /usr/src/app/una-repo status
```

## Recovery Procedures

### Complete Authentication Failure

1. **Immediate Recovery:**
   ```bash
   # Switch to SSH authentication temporarily
   cd /usr/src/app/una-repo
   git remote set-url origin git@github.com:Fail2Fail-Studios/una.git
   ```

2. **Token Recovery:**
   - Generate new GitHub Personal Access Token
   - Update production environment variables
   - Restart application
   - Test with diagnostics endpoint

3. **Repository Recovery:**
   ```bash
   # Re-clone if repository is corrupted
   cd /var/www
   mv content-repo content-repo.backup
   git clone https://github.com/Fail2Fail-Studios/una.git content-repo
   chown -R app:app content-repo
   ```

### Emergency Manual Sync

If automated sync fails completely:

```bash
# Manual git pull (content is automatically available via symlink)
cd /usr/src/app/una-repo
git pull origin main
# Note: Content is immediately available at /usr/src/app/content via symlink
```

## Support Information

For additional support:

1. **Check application logs** for specific error messages
2. **Use the diagnostics endpoint** for detailed system information
3. **Verify GitHub token status** in GitHub settings
4. **Test network connectivity** from production server
5. **Review environment variable configuration** in deployment platform

The enhanced authentication system provides multiple fallback methods and detailed logging to help diagnose and resolve production authentication issues quickly.
