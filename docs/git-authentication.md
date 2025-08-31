# Git Authentication Configuration

## Overview

The F2F DocView sync system requires Git authentication to pull updates from the GitHub repository. This guide explains how to configure authentication using GitHub Personal Access Tokens.

## Problem: Authentication Failed

If you're seeing "Git authentication failed" errors during sync operations, it's because:

1. No Git credentials are configured in the environment
2. Local Git configuration (user.name/email) is missing
3. Repository access permissions are insufficient

## Solution: Personal Access Token Authentication

### Step 1: Generate a Personal Access Token

1. Navigate to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Configure the token:
   - **Note**: `F2F DocView Sync Token` (or similar descriptive name)
   - **Expiration**: Choose appropriate duration (90 days recommended for development)
   - **Scopes**: Select the following permissions:
     - ✅ `repo` - Full control of private repositories
     - ✅ `public_repo` - Access public repositories
4. Click **"Generate token"**
5. **Important**: Copy the token immediately - you won't be able to see it again

### Step 2: Configure Environment Variables

Add the following to your `.env` file:

```env
# Git Authentication
NUXT_GIT_USERNAME=your-github-username
NUXT_GIT_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Replace:
- `your-github-username` with your GitHub username
- `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` with your generated Personal Access Token

### Step 3: Verify Configuration

After setting up the credentials, test the sync functionality:

1. Navigate to your F2F DocView application
2. Log in with Discord authentication
3. Try the Git Pull operation (🔄 Git icon)
4. Check the browser console or server logs for success messages

## Authentication Flow

### With Credentials Configured
When `NUXT_GIT_USERNAME` and `NUXT_GIT_TOKEN` are provided:

```bash
# The system executes:
git pull https://username:token@github.com/Fail2Fail-Studios/una main
```

### Without Credentials (Fallback)
When credentials are not configured:

```bash
# Falls back to:
git pull origin main
# Relies on local Git configuration
```

## Security Best Practices

### Token Management
1. **Never commit tokens to version control** - they're in `.env` which is gitignored
2. **Use minimal required permissions** - only `repo` scope for this use case
3. **Set appropriate expiration** - balance security with convenience
4. **Rotate tokens regularly** - especially in production environments

### Environment Separation
Use different tokens for different environments:

```env
# Development
NUXT_GIT_TOKEN=ghp_dev_token_here

# Production  
NUXT_GIT_TOKEN=ghp_prod_token_here
```

### Access Control
- Create tokens under accounts with minimal required repository access
- For team use, consider using a dedicated service account
- Monitor token usage in GitHub's audit logs

## Troubleshooting

### Common Issues

**"Authentication failed" after configuring token**
- Verify the token has correct permissions (`repo` scope)
- Check that the token hasn't expired
- Ensure username matches the token owner

**"Permission denied" errors**
- Verify repository access permissions
- Check if the repository is private and token has `repo` scope
- Confirm the repository URL matches your GitHub account access

**"Token not found" or similar**
- Ensure `.env` file is in the project root
- Verify environment variable names match exactly:
  - `NUXT_GIT_USERNAME` (not `GIT_USERNAME`)
  - `NUXT_GIT_TOKEN` (not `GIT_TOKEN`)
- Restart the development server after adding credentials

### Testing Authentication

To test if your credentials work outside the application:

```bash
# Test the authentication URL manually
git ls-remote https://your-username:your-token@github.com/Fail2Fail-Studios/una
```

If this command works, your credentials are valid.

## Alternative Authentication Methods

### SSH Keys (Not Recommended for this use case)
While SSH keys work for local development, they require additional configuration and don't work well in CI/CD environments.

### GitHub CLI (Development only)
For local development, you can use GitHub CLI authentication:

```bash
gh auth login
```

However, this won't work for the sync API endpoints and is only useful for manual Git operations.

## Production Considerations

### Enhanced Authentication System (v2.0)

The F2F DocView system now includes a robust multi-method authentication system that provides:

- **Multiple Authentication Methods**: Credential helper, URL auth, local config, and SSH
- **Automatic Fallback**: Tries multiple methods if one fails
- **Enhanced Diagnostics**: Detailed error reporting and system information
- **Credential Validation**: Pre-validates tokens before attempting operations

### Environment Variables
In production, ensure sensitive environment variables are:
- Stored securely (not in plain text files)
- Rotated regularly
- Monitored for unauthorized access

### Fallback Strategies
The new system includes multiple fallback authentication methods:
1. Git credential helper (most secure)
2. URL authentication (reliable fallback)
3. Local Git configuration (server-specific)
4. SSH key authentication (long-term production)

### Monitoring
Monitor sync operations for authentication failures and set up alerts for repeated failures that might indicate token expiration or access issues.

### Production Troubleshooting

For comprehensive production troubleshooting, including common issues, recovery procedures, and monitoring strategies, see:

**📖 [Production Git Troubleshooting Guide](./production-git-troubleshooting.md)**

This guide covers:
- Quick diagnosis using the `/api/git-diagnostics` endpoint
- Common production authentication failures and solutions
- Token rotation strategies
- Emergency recovery procedures
- Monitoring and alerting setup
