---
title: Simplified Markdown Editor Implementation Plan
description: Streamlined mavonEditor integration with immediate GitHub submission and file locking
---

# F2F DocView - Simplified Markdown Editor Implementation Plan

## Overview
Simple file-locking editor using mavonEditor for immediate edits with direct GitHub submission. No complex session management or drafts - edit one file at a time, submit immediately.

## Core Principles
- **Single file editing**: One file locked per user at a time
- **Immediate submission**: Changes go directly to GitHub when saved
- **File locking**: Server-side memory state prevents concurrent edits
- **Role-based access**: Discord role `doc-edit` (ID: 1406031220772438137) required
- **No persistence**: All state in server memory, no database needed

## Architecture Overview

### Permission System
1. **Discord Role Check**
   - Check for `doc-edit` role (ID: 1406031220772438137) during authentication
   - Cache role information in user session
   - Middleware protection on all editor endpoints

2. **Admin Override**
   - Environment variable for admin user IDs
   - Admins bypass all restrictions
   - Admin panel for managing file locks

### File Locking System
```typescript
// Server memory state
interface FileLock {
  filePath: string
  userId: string
  userName: string
  lockedAt: Date
  expiresAt: Date
}

// Global state map
const activeFileLocks = new Map<string, FileLock>()
```

1. **Lock Acquisition**
   - User clicks "Edit" button
   - Server checks if file is already locked
   - If available, creates lock with 30-minute timeout
   - Returns lock token or "file busy" error

2. **Lock Management**
   - Automatic cleanup of expired locks
   - Manual lock release on save/cancel
   - Admin override capability
   - Visual indicators of who's editing

### Frontend Components
1. **Edit Mode Toggle**
   - "Edit" button on each documentation page
   - Check lock status before allowing edit
   - Show "Currently being edited by {user}" if locked
   - Modal editor overlay (not full page)

2. **mavonEditor Integration**
   - Modal popup with mavonEditor
   - Front matter editor section
   - Direct save to GitHub (no draft state)
   - Real-time lock refresh to maintain editing session

3. **Lock Status Indicators**
   - Visual indicators in navigation for locked files
   - Tooltip showing who's editing and when lock expires
   - Auto-refresh lock status every 30 seconds

### Backend API Endpoints
1. **Permission & Lock Management**
   - `GET /api/editor/can-edit/{path}` - Check edit permissions and lock status
   - `POST /api/editor/acquire-lock/{path}` - Acquire file lock
   - `DELETE /api/editor/release-lock/{path}` - Release file lock
   - `GET /api/editor/lock-status` - Get all current locks (admin)

2. **Content Management**
   - `GET /api/editor/content/{path}` - Get raw markdown + front matter
   - `POST /api/editor/save/{path}` - Save directly to GitHub and release lock
   - `POST /api/editor/upload-image` - Handle image uploads

3. **GitHub Integration**
   - `POST /api/github/commit-file` - Direct commit to external repo
   - `GET /api/github/sync-content` - Manual content sync trigger

## User Experience Flow

### Simple Edit Workflow
1. **Enter Edit Mode**
   - User clicks "Edit" button on documentation page
   - System checks permissions and file lock status
   - If available, acquires lock and opens modal editor
   - If locked, shows "Being edited by {user}" message

2. **Edit Content**
   - Modal opens with mavonEditor pre-populated
   - Front matter editor in collapsible section
   - Lock timer visible with refresh capability
   - "Save" and "Cancel" buttons always visible

3. **Save Changes**
   - Single "Save" button commits directly to GitHub
   - Automatic lock release on save
   - Modal closes and page refreshes with new content
   - Discord notification sent

4. **Cancel/Timeout**
   - Cancel button releases lock immediately
   - Lock auto-expires after 30 minutes
   - Warning at 25 minutes with extend option

## Technical Implementation Details

### Discord Role Integration
```typescript
interface DiscordUser {
  id: string
  roles: string[]
  isDocEditor: boolean // computed from roles
  isAdmin: boolean // from environment config
}

// Role checking function
function canUserEdit(user: DiscordUser): boolean {
  return user.isAdmin || user.roles.includes('1406031220772438137')
}
```

### Lock Management System
```typescript
class FileLockManager {
  private locks = new Map<string, FileLock>()
  private lockTimeout = 30 * 60 * 1000 // 30 minutes
  
  acquireLock(filePath: string, user: DiscordUser): FileLock | null
  releaseLock(filePath: string, userId: string): boolean
  isLocked(filePath: string): boolean
  getLockInfo(filePath: string): FileLock | null
  cleanupExpiredLocks(): void
  extendLock(filePath: string, userId: string): boolean
}
```

### GitHub Direct Commit
```typescript
interface GitHubCommit {
  filePath: string
  content: string
  message: string
  author: {
    name: string
    email: string
  }
}

async function commitToGitHub(commit: GitHubCommit): Promise<string> {
  // Direct commit to external docs repo
  // Return commit SHA or throw error
}
```

## Configuration & Settings

### Environment Variables
```
# GitHub Integration
GITHUB_TOKEN=<personal access token>
GITHUB_DOCS_REPO=<owner/repo-name>
GITHUB_DOCS_BRANCH=<main/staging>

# Discord Integration
DISCORD_WEBHOOK_URL=<webhook for notifications>
REQUIRED_DISCORD_ROLE_ID=1406031220772438137

# Admin Users (comma separated Discord IDs)
ADMIN_USER_IDS=<discord_id1,discord_id2>

# Lock Settings
FILE_LOCK_TIMEOUT_MS=1800000
LOCK_WARNING_MS=1500000
```

### App Configuration
```typescript
// app.config.ts additions
editor: {
  enabled: true,
  lockTimeoutMinutes: 30,
  lockWarningMinutes: 25,
  commitMessageTemplate: "docs: update {fileName} via editor",
  autoSyncAfterCommit: true
}
```

## Component Implementation Plan

### 1. Nuxt Plugin Setup
- `app/plugins/mavon-editor.client.ts` - Client-side mavonEditor registration
- Update `nuxt.config.ts` with plugin configuration
- Add CSS imports for mavonEditor styling

### 2. Server-Side Lock Manager
- `server/utils/FileLockManager.ts` - Core lock management class
- `server/api/editor/` - API endpoints for editor functionality
- Middleware for permission checking and lock validation

### 3. Frontend Components
- `app/components/EditorModal.vue` - Main editing interface
- `app/components/EditorButton.vue` - Edit button for pages
- `app/components/LockIndicator.vue` - Visual lock status display

### 4. Page Integration
- Modify `app/pages/[...slug].vue` to include edit button
- Add lock status indicators to navigation
- Handle modal state and content refresh

### 5. Store Management
- `app/stores/editor.ts` - Pinia store for editor state
- Track current editing status, lock information
- Handle modal visibility and content state

## Security Considerations
1. **Authentication Required**
   - Discord OAuth with role verification
   - Session-based authentication for all endpoints
   - Lock ownership validation

2. **Content Validation**
   - Front matter schema validation
   - Markdown syntax checking
   - File path validation (no directory traversal)

3. **Rate Limiting**
   - Prevent rapid successive commits
   - Lock acquisition rate limiting
   - Image upload restrictions

## Implementation Phases

### Phase 1: Core Infrastructure
1. Install and configure mavonEditor
2. Create file lock manager system
3. Implement basic API endpoints
4. Add Discord role checking

### Phase 2: Frontend Integration
1. Create editor modal component
2. Add edit buttons to pages
3. Implement lock status indicators
4. Connect frontend to backend APIs

### Phase 3: GitHub Integration
1. Direct commit functionality
2. Content synchronization
3. Discord notifications
4. Error handling and recovery

### Phase 4: Polish & Testing
1. User experience refinements
2. Admin tools for lock management
3. Comprehensive testing
4. Documentation and deployment

## Success Criteria
- Users with correct role can edit any unlocked file
- Only one user can edit a file at a time
- Changes commit directly to GitHub immediately
- Clear visual feedback about edit status
- Simple, intuitive editing experience
- No complex state management or persistence
