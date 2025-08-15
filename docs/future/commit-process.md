---
title: Simplified Commit Process Implementation Plan  
description: Direct GitHub commit workflow with immediate submission and file locking
---

# F2F DocView - Simplified Commit Process Implementation Plan

## Overview
Streamlined process that commits individual file changes directly to the external GitHub repository immediately upon save. No batching, no review process - simple, immediate commits with proper file locking.

## Process Flow Architecture

### 1. Edit Initiation
**Location**: Client-side permission check + server lock acquisition

1. **Permission Validation**
   - Check user has `doc-edit` role (1406031220772438137) or is admin
   - Verify user session is valid and not expired
   - Return permission status to client

2. **File Lock Acquisition**
   - Check if file is currently locked by another user
   - If available, create lock with user info and 30-minute timeout
   - Return lock token or "file busy" error with current editor info

### 2. Content Editing
**Location**: Modal editor with real-time lock management

1. **Lock Maintenance**
   - Ping server every 30 seconds to refresh lock
   - Show lock timer countdown to user
   - Warn at 25 minutes with option to extend
   - Auto-extend on user activity

2. **Content Validation**
   - Real-time front matter validation
   - Markdown syntax checking
   - Image reference validation
   - Required field validation

### 3. Direct GitHub Commit
**Location**: Server-side GitHub API integration

1. **Pre-commit Validation**
   - Verify user still has lock
   - Final content validation
   - Check external repo accessibility

2. **GitHub Commit Process**
   ```typescript
   interface CommitProcess {
     // Get current file from GitHub
     getCurrentContent(filePath: string): Promise<string>
     
     // Commit new content directly
     commitFile(filePath: string, content: string, message: string): Promise<string>
     
     // Trigger content sync back to Nuxt app
     syncContent(): Promise<void>
   }
   ```

3. **Post-commit Actions**
   - Release file lock immediately
   - Send Discord notification
   - Trigger content sync to update local content
   - Return success status to client

### 4. Notification & Cleanup
**Location**: Webhook integrations and state cleanup

1. **Discord Notification**
   ```typescript
   interface CommitNotification {
     author: string
     fileName: string
     commitMessage: string
     commitUrl: string
     timestamp: Date
   }
   ```

2. **State Cleanup**
   - Remove file lock from server memory
   - Clear any temporary data
   - Update client UI with new content

## Technical Implementation Strategy

### Lock Management
```typescript
interface FileLock {
  filePath: string
  userId: string
  userName: string
  userAvatar?: string
  lockedAt: Date
  expiresAt: Date
  lastPing: Date
}

class SimpleLockManager {
  private locks = new Map<string, FileLock>()
  
  // Core lock operations
  acquireLock(filePath: string, user: DiscordUser): FileLock | null
  refreshLock(filePath: string, userId: string): boolean
  releaseLock(filePath: string, userId: string): boolean
  
  // Status checking
  isLocked(filePath: string): boolean
  getLockOwner(filePath: string): FileLock | null
  getAllLocks(): FileLock[]
  
  // Maintenance
  cleanupExpiredLocks(): void
  forceReleaseLock(filePath: string): boolean // admin only
}
```

### API Endpoint Design

1. **Lock Management Endpoints**
   - `POST /api/editor/lock/{path}` - Acquire file lock
   - `PUT /api/editor/lock/{path}/refresh` - Refresh existing lock
   - `DELETE /api/editor/lock/{path}` - Release file lock
   - `GET /api/editor/lock/{path}/status` - Check lock status

2. **Content Endpoints**
   - `GET /api/editor/content/{path}` - Get current file content
   - `POST /api/editor/commit/{path}` - Save and commit to GitHub
   - `POST /api/editor/image-upload` - Upload images

3. **Admin Endpoints**
   - `GET /api/admin/locks` - View all active locks
   - `DELETE /api/admin/locks/{path}` - Force release lock
   - `POST /api/admin/sync` - Trigger manual content sync

### GitHub Integration Strategy

1. **Direct File Commits**
   ```typescript
   async function commitFileToGitHub(
     filePath: string, 
     content: string, 
     author: DiscordUser
   ): Promise<string> {
     // Get current file SHA from GitHub
     const currentFile = await github.repos.getContent({
       owner: GITHUB_OWNER,
       repo: GITHUB_REPO,
       path: filePath
     })
     
     // Commit new content
     const commit = await github.repos.createOrUpdateFileContents({
       owner: GITHUB_OWNER,
       repo: GITHUB_REPO,
       path: filePath,
       message: generateCommitMessage(filePath, author),
       content: Buffer.from(content).toString('base64'),
       sha: currentFile.data.sha,
       author: {
         name: author.name,
         email: author.email || `${author.id}@discord.local`
       }
     })
     
     return commit.data.commit.sha
   }
   ```

2. **Commit Message Generation**
   ```typescript
   function generateCommitMessage(filePath: string, author: DiscordUser): string {
     const fileName = filePath.split('/').pop()
     return `docs: update ${fileName} via F2F DocView editor

Author: ${author.name} (${author.username})
File: ${filePath}
Timestamp: ${new Date().toISOString()}`
   }
   ```

### Content Synchronization

1. **Automatic Sync After Commit**
   - Trigger rsync or git pull after successful commit
   - Update Nuxt content cache
   - Notify client of successful sync

2. **Manual Sync Capability**
   - Admin button to trigger content sync
   - Sync status endpoint for monitoring
   - Error handling and retry logic

## Detailed Workflow Steps

### Step 1: User Initiates Edit
```typescript
// Client-side flow
async function startEditing(filePath: string) {
  // Check permissions
  const canEdit = await $fetch(`/api/editor/can-edit/${encodeURIComponent(filePath)}`)
  if (!canEdit.allowed) {
    throw new Error(canEdit.reason)
  }
  
  // Acquire lock
  const lockResult = await $fetch(`/api/editor/lock/${encodeURIComponent(filePath)}`, {
    method: 'POST'
  })
  
  if (!lockResult.success) {
    throw new Error(`File is being edited by ${lockResult.currentEditor}`)
  }
  
  // Open editor modal
  openEditorModal(filePath, lockResult.lockToken)
}
```

### Step 2: Content Loading and Editing
```typescript
// Load content with front matter parsing
async function loadContentForEditing(filePath: string): Promise<ParsedContent> {
  const response = await $fetch(`/api/editor/content/${encodeURIComponent(filePath)}`)
  
  return {
    frontMatter: response.frontMatter,
    content: response.content,
    originalContent: response.originalContent
  }
}
```

### Step 3: Lock Maintenance During Editing
```typescript
// Client-side lock refresh
const lockRefreshInterval = setInterval(async () => {
  try {
    await $fetch(`/api/editor/lock/${encodeURIComponent(filePath)}/refresh`, {
      method: 'PUT'
    })
  } catch (error) {
    // Lock lost - warn user and disable editing
    handleLockLoss()
  }
}, 30000) // 30 seconds
```

### Step 4: Commit Process
```typescript
// Client-side save action
async function saveContent(filePath: string, content: string, frontMatter: object) {
  const fullContent = buildMarkdownWithFrontMatter(frontMatter, content)
  
  const result = await $fetch(`/api/editor/commit/${encodeURIComponent(filePath)}`, {
    method: 'POST',
    body: {
      content: fullContent,
      lockToken: currentLockToken
    }
  })
  
  if (result.success) {
    // Close editor, refresh content
    closeEditor()
    await refreshContent()
  }
}
```

### Step 5: Server-side Commit Handler
```typescript
// server/api/editor/commit/[...path].post.ts
export default defineEventHandler(async (event) => {
  const filePath = getRouterParam(event, 'path')
  const { content, lockToken } = await readBody(event)
  
  // Validate lock ownership
  const lock = lockManager.getLockOwner(filePath)
  if (!lock || lock.userId !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Lock not owned by user'
    })
  }
  
  try {
    // Commit to GitHub
    const commitSha = await commitFileToGitHub(filePath, content, user)
    
    // Release lock
    lockManager.releaseLock(filePath, user.id)
    
    // Send Discord notification
    await sendDiscordNotification({
      author: user.name,
      fileName: filePath.split('/').pop(),
      commitUrl: `https://github.com/${GITHUB_REPO}/commit/${commitSha}`,
      timestamp: new Date()
    })
    
    // Trigger content sync
    await triggerContentSync()
    
    return { success: true, commitSha }
  } catch (error) {
    // Keep lock on failure
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to commit changes'
    })
  }
})
```

## Error Handling & Recovery

### Lock-Related Errors
1. **Lock Conflicts**
   - Clear messaging about who's editing
   - Show estimated lock expiry time
   - Admin override capabilities

2. **Lock Timeouts**
   - Grace period warnings at 25 minutes
   - Option to extend lock
   - Content preservation during timeout

### Commit Failures
1. **GitHub API Errors**
   - Retry logic with exponential backoff
   - Preserve content and lock during failures
   - Clear error messaging to users

2. **Validation Errors**
   - Inline validation feedback
   - Prevention of invalid commits
   - Helpful error messages with suggestions

### Network Issues
1. **Connection Loss**
   - Content preservation in browser
   - Lock status recovery on reconnection
   - Graceful error handling

## Configuration Management

### Environment Setup
```
# GitHub Integration
GITHUB_TOKEN=ghp_...
GITHUB_DOCS_REPO=f2f-corp/documentation
GITHUB_DOCS_BRANCH=main

# Discord Integration
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
DOC_EDIT_ROLE_ID=1406031220772438137

# Admin Configuration
ADMIN_DISCORD_IDS=123456789,987654321

# Lock Settings
LOCK_TIMEOUT_MINUTES=30
LOCK_WARNING_MINUTES=25
LOCK_REFRESH_INTERVAL_SECONDS=30
```

### Runtime Configuration
```typescript
// app.config.ts additions
editor: {
  commit: {
    messageTemplate: "docs: update {fileName} via F2F DocView editor",
    authorFormat: "{name} ({username})",
    includeTimestamp: true,
    branchName: "main" // target branch for commits
  },
  locks: {
    timeoutMinutes: 30,
    warningMinutes: 25,
    refreshIntervalSeconds: 30,
    maxConcurrentLocks: 5 // per user
  },
  validation: {
    requiredFrontMatterFields: ["title", "description"],
    maxContentLength: 1048576, // 1MB
    allowedImageTypes: ["jpg", "jpeg", "png", "gif", "webp"]
  },
  github: {
    retryAttempts: 3,
    retryDelayMs: 1000,
    timeoutMs: 30000
  }
}
```

## Security & Permissions

### Access Control
1. **Role-Based Permissions**
   - Discord role verification on every request
   - Admin user bypass capabilities
   - Session validation middleware

2. **Lock Security**
   - Lock ownership verification
   - Protection against lock hijacking
   - Audit trail for lock operations

### Content Security
1. **Input Validation**
   - Sanitize all user input
   - Validate file paths (prevent directory traversal)
   - Check content size limits
   - Front matter schema validation

2. **GitHub Security**
   - Secure token storage in environment variables
   - Repository access validation
   - Commit author verification
   - Rate limiting for API calls

## Content Synchronization Strategy

### Immediate Sync After Commit
```typescript
async function triggerContentSync(): Promise<void> {
  // Option 1: Git pull in content directory
  await execAsync('cd content && git pull origin main')
  
  // Option 2: Rsync from external repo
  await execAsync(`rsync -av --delete ${DOCS_REPO_PATH}/content/ ./content/`)
  
  // Option 3: API-based sync (future enhancement)
  // await syncContentViaAPI()
  
  // Clear Nuxt content cache
  await $fetch('/api/_content/cache', { method: 'DELETE' })
}
```

### Manual Sync Controls
- Admin panel button for manual sync
- Sync status monitoring endpoint
- Error logging and recovery options

## Testing Strategy

### Unit Tests
- Lock manager operations
- GitHub API integration functions
- Content validation logic
- Permission checking functions

### Integration Tests
- End-to-end edit workflow
- Lock conflict scenarios
- GitHub commit process
- Discord notification delivery
- Content synchronization

### Load Testing
- Multiple concurrent users
- Lock manager performance
- GitHub API rate limits
- Memory usage monitoring

## Deployment Considerations

### Server Requirements
- Node.js process with persistent memory for locks
- GitHub API access (token with repo write permissions)
- Discord webhook connectivity
- Sufficient memory for lock state management
- File system access for content synchronization

### Environment Setup
- Secure environment variable storage
- GitHub token with appropriate scopes
- Discord webhook configuration
- Network access to external repositories

### Monitoring & Alerting
- Lock manager health checks
- GitHub API rate limit monitoring
- Discord notification delivery status
- Content synchronization success/failure alerts

## Success Metrics

### Functionality Metrics
- Successful edit completion rate
- Lock conflict frequency
- GitHub commit success rate
- Content synchronization reliability

### User Experience Metrics
- Time from edit start to completion
- User adoption rate
- Error frequency and types
- User feedback and satisfaction

This simplified commit process ensures immediate, reliable updates to the external documentation repository while maintaining proper conflict prevention through file locking.
