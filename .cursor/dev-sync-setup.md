# Development Environment Setup for Document Sync

## Overview
This guide explains how to set up the document sync feature for local development on Windows, with the projects located at:
- **F2F DocView**: `D:\Projects\F2F Corp\f2f-docview`  
- **F2F Una**: `D:\Projects\F2F Corp\f2f-una`

## Environment Configuration

### 1. Create .env File
Create a `.env` file in your F2F DocView project root with the following configuration:

```env
# Document Sync Configuration for Development
NUXT_SYNC_SOURCE_PATH=D:\Projects\F2F Corp\f2f-una\content
NUXT_SYNC_DESTINATION_PATH=D:\Projects\F2F Corp\f2f-docview\content
NUXT_SYNC_TIMEOUT=30000

# Git Repository Configuration for Development
NUXT_GIT_REPO_PATH=D:\Projects\F2F Corp\f2f-una
NUXT_GIT_REPO_URL=https://github.com/Fail2Fail-Studios/una
NUXT_GIT_BRANCH=main
NUXT_GIT_TIMEOUT=60000

# Your other existing environment variables...
NUXT_SESSION_PASSWORD=your-session-password
NUXT_OAUTH_DISCORD_CLIENT_ID=your-discord-client-id
NUXT_OAUTH_DISCORD_CLIENT_SECRET=your-discord-client-secret
NUXT_AUTH_BASE_URL=http://localhost:3000
NUXT_REQUIRED_DISCORD_GUILD_ID=your-discord-guild-id
```

### 2. Directory Structure
Ensure your directory structure looks like this:

```
D:\Projects\F2F Corp\
├── f2f-docview\           # This project (document viewer)
│   ├── content\           # Destination for synced content
│   ├── app\
│   ├── server\
│   └── .env               # Environment configuration
└── f2f-una\              # Git repository (https://github.com/Fail2Fail-Studios/una)
    ├── .git\              # Git repository data
    └── content\           # Source content to sync FROM
        ├── *.md files
        └── subdirectories...
```

## How It Works

### Two-Step Update Process
The system now provides a complete two-step workflow for updating documentation:

1. **Git Pull** (🔄 Git icon): Pulls latest content from GitHub repository into f2f-una directory
2. **Content Sync** (🔄 Refresh icon): Syncs content from f2f-una to f2f-docview for display

**Workflow:**
```
GitHub Repository → Git Pull → f2f-una → Content Sync → f2f-docview
```

### Button Functions
- **Git Pull Button** (`i-lucide-git-pull-request` icon): 
  - Executes `git pull origin main` in the f2f-una directory
  - Updates the source content from the GitHub repository
  - Shows "Repository Updated" or "Already up to date" notifications

- **Content Sync Button** (`i-lucide-refresh-cw` icon):
  - Copies content from f2f-una/content to f2f-docview/content 
  - Uses robocopy (Windows) or rsync (Linux) for efficient copying
  - Shows "Documents Synced" notifications

### Cross-Platform Compatibility
The sync system automatically detects the operating system and uses the appropriate command:

- **Windows**: Uses `robocopy` (built-in Windows command)
  - Command: `robocopy "source" "destination" /MIR /E /R:2 /W:1`
  - `/MIR` = Mirror directory (deletes files not in source)
  - `/E` = Copy subdirectories including empty ones
  - `/R:2 /W:1` = Retry 2 times with 1 second wait

- **Linux/macOS**: Uses `rsync` (must be installed)
  - Command: `rsync -av --delete "source/" "destination/"`
  - `-a` = Archive mode (preserves permissions, timestamps)
  - `-v` = Verbose output
  - `--delete` = Remove files not in source

### Security Features
- **Authentication Required**: Only authenticated Discord server members can trigger sync
- **Path Validation**: Validates that both source and destination paths exist
- **Command Injection Prevention**: Uses parameterized paths, no user input in commands
- **Timeout Protection**: Configurable timeout (default 30 seconds)

## Testing the Setup

### 1. Verify Environment Variables
Start your development server and check the console for any configuration errors:

```bash
npm run dev
```

If paths are not configured, you'll see an error message about missing environment variables.

### 2. Test Directory Access
The sync endpoint will validate that both directories exist and are accessible before attempting to sync.

### 3. Manual Test
1. Log in to your local development site with Discord authentication
2. Look for the refresh icon button in the header (next to the color mode toggle)
3. Click the sync button
4. Check the browser console and server logs for sync progress
5. Verify that content from `f2f-una\content` appears in `f2f-docview\content`

## Troubleshooting

### Common Issues

**"Sync paths not configured" Error**
- Verify your `.env` file exists and contains the `NUXT_SYNC_SOURCE_PATH` and `NUXT_SYNC_DESTINATION_PATH` variables
- Restart your development server after adding environment variables

**"Source/Destination path does not exist" Error**
- Check that both directory paths exist and are spelled correctly
- Use absolute paths with proper Windows backslashes or forward slashes
- Example: `D:\Projects\F2F Corp\f2f-una\content` or `D:/Projects/F2F Corp/f2f-una/content`

**Permission Denied Errors**
- Ensure your development server has read access to the source directory
- Ensure your development server has write access to the destination directory
- Try running your development server as administrator if needed

**Robocopy Exit Codes (Windows)**
- Exit codes 0-3 are considered successful for robocopy
- Exit code 0: No files copied
- Exit code 1: Files copied successfully
- Exit code 2: Extra files/directories detected and removed
- Exit code 3: Files copied and extra files/directories removed

### Debug Logging
The sync operation provides detailed logging in your server console:

```
Document sync initiated by user: username (discord-id)
Syncing from: D:\Projects\F2F Corp\f2f-una\content  
Syncing to: D:\Projects\F2F Corp\f2f-docview\content
Executing robocopy command: robocopy "source" "dest" /MIR /E /R:2 /W:1
Document sync completed successfully in 1234ms
robocopy output: [detailed output]
```

## Production Deployment

For production deployment on Linux, update your environment variables to use Linux paths:

```env
# Production Configuration (Linux)
NUXT_SYNC_SOURCE_PATH=/user/ubuntu/una/content
NUXT_SYNC_DESTINATION_PATH=/user/ubuntu/f2f-docview/content
NUXT_SYNC_TIMEOUT=30000
```

The system will automatically use `rsync` instead of `robocopy` on Linux systems.

## Environment Variable Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NUXT_SYNC_SOURCE_PATH` | Absolute path to source content directory | Yes | - |
| `NUXT_SYNC_DESTINATION_PATH` | Absolute path to destination content directory | Yes | - |
| `NUXT_SYNC_TIMEOUT` | Timeout in milliseconds for sync operation | No | 30000 |

## Security Considerations

- Environment variables containing file paths are server-side only and not exposed to clients
- The sync endpoint requires Discord authentication and server membership
- File paths are validated before execution to prevent directory traversal attacks
- Commands use absolute paths with no user input to prevent command injection
- Sync operations are logged for audit purposes
