---
title: Simplified Markdown Editor Implementation Plan
description: Streamlined mavonEditor integration with immediate GitHub submission and file locking
---

# F2F DocView - Simplified Markdown Editor Implementation Plan

## Overview
Simple file-locking editor using mavonEditor (Vue 3) for immediate edits with commit/push to the external docs repo (local working copy) followed by content sync into this app. No complex session management or drafts — edit one file at a time, submit immediately.

## Core Principles
- **Single file editing**: One file locked per user at a time
- **Immediate submission**: Save does `git pull --rebase` → write → `git add/commit/push` on the local working copy, then triggers a content sync into this app
- **File locking**: In-memory locks in a single Node instance prevent concurrent edits
- **Role-based access**: Discord role `doc-edit` (ID: 1406031220772438137) required, or admin override
- **No persistence**: All lock state in server memory (no DB)
- **Media**: Uploads saved to `public/media/` in this app for now (no media sync yet)

## Architecture Overview

### Permission System
1. **Discord Role Check (via Bot Token)**
   - Use server-side Discord Bot (admin in guild) to verify the logged-in user has the required role ID `1406031220772438137`
   - User identity comes from the session (Discord OAuth); the server calls Discord Guild Member APIs to check roles
   - Middleware protection on all editor endpoints, with cached role result per session

2. **Admin Override**
   - Environment variable for admin user IDs
   - Admins bypass editor restrictions (can force-release locks)
   - Admin tooling for listing and clearing locks

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
   - Returns lock info or "file busy" error

2. **Lock Management**
   - Automatic cleanup of expired locks
   - Manual lock release on save/cancel
   - Admin override capability
   - Visual indicators of who's editing
   - Keep-alive endpoint extends lock while editing (sent every ~60s)
   - Warning popover at 25 minutes; if not extended, editing is disabled and lock expires at 30 minutes

### Frontend Components
1. **Edit Mode Toggle**
   - "Edit" button on each documentation page
   - Only visible to users with required role or admin
   - Check lock status before allowing edit
   - Show "Currently being edited by {user}" if locked
   - Modal editor overlay (not full page)

2. **mavonEditor Integration**
   - Modal popup with mavonEditor (v3)
   - Front matter editor section
   - Save triggers local git commit/push (no draft state)
   - Real-time lock keep-alive to maintain editing session

3. **Lock Status Indicators**
   - Visual indicators in navigation for locked files
   - Tooltip showing who's editing and when lock expires
   - Auto-refresh lock status every 30 seconds

### Backend API Endpoints
1. **Permission & Lock Management**
   - `GET /api/editor/can-edit/{path}` - Check edit permissions and lock status
   - `POST /api/editor/acquire-lock/{path}` - Acquire file lock
   - `POST /api/editor/extend-lock/{path}` - Extend lock (keep-alive)
   - `DELETE /api/editor/release-lock/{path}` - Release file lock
   - `GET /api/editor/lock-status` - Get all current locks (admin)

2. **Content Management**
   - `GET /api/editor/content/{path}` - Get raw markdown + front matter
   - `POST /api/editor/save/{path}` - Write to local repo, `git add/commit/push`, then call `/api/sync-content`, release lock
   - `POST /api/editor/upload-media` - Upload files to this app's `public/media/{yyyy}/{mm}/...` (no repo commit yet)

3. **Git Integration (existing)**
   - Use configured local repo at `NUXT_GIT_REPO_PATH`
   - Save flow runs `git pull --rebase`, `git add`, `git commit --author`, `git push`
   - After push, call existing `/api/sync-content` to refresh this app's content

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

### Git Commit & Push (Local Repo)
```typescript
interface CommitPayload {
  filePath: string // relative to repo root (e.g. content/02.game-design/01.index.md)
  content: string
  message: string // e.g. "docs: update {relativePath} via editor by {DiscordName}"
  authorName: string // e.g. Discord display name
  authorEmail: string // e.g. docs@fail2.fail
}

async function commitAndPush(payload: CommitPayload): Promise<string> {
  // 1) git pull --rebase
  // 2) write file
  // 3) git add + git commit --author "{authorName} <{authorEmail}>"
  // 4) git push
  // 5) return commit SHA
}
```

## Configuration & Settings

### Environment Variables
```
# Git local repo (existing)
NUXT_GIT_REPO_PATH=<absolute path to local working copy>
NUXT_GIT_REPO_URL=<https repo url>
NUXT_GIT_BRANCH=main
NUXT_GIT_USERNAME=<github username>
NUXT_GIT_TOKEN=<github token with repo scope>

# Discord (role enforcement)
NUXT_DISCORD_BOT_TOKEN=<discord bot token with guild access>
NUXT_REQUIRED_DISCORD_GUILD_ID=1402498073350901800
NUXT_REQUIRED_DISCORD_ROLE_ID=1406031220772438137
NUXT_ADMIN_USER_IDS=<discord_id1,discord_id2>

# Content sync (existing)
NUXT_SYNC_SOURCE_PATH=<repo>/content
NUXT_SYNC_DESTINATION_PATH=<app>/content

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
  commitMessageTemplate: "docs: update {relativePath} via editor by {DiscordName}",
  autoSyncAfterCommit: true
}
```

## Component Implementation Plan

### 1. Nuxt Plugin Setup
- `app/plugins/mavon-editor.client.ts` - Client-side mavonEditor (v3) registration
- Include mavonEditor CSS in the plugin
- No SSR usage; editor only renders in modal on client

### 2. Server-Side Lock Manager
- `server/utils/FileLockManager.ts` - Core lock management class (in-memory)
- `server/api/editor/` - API endpoints for editor functionality
- Middleware for permission checking and lock validation (Discord role via bot)

### 3. Frontend Components
- `app/components/EditorModal.vue` - Main editing interface (mavonEditor, front matter, Save/Cancel, timeout popover)
- `app/components/EditorButton.vue` - Edit button for pages (role-gated)
- `app/components/LockIndicator.vue` - Visual lock status display

### 4. Page Integration
- Modify `app/pages/[...slug].vue` to include role-gated edit button
- Add lock status indicators to navigation
- Handle modal state and content refresh after save

### 5. State Management (Composable)
- `app/composables/useEditorState.ts` - Composable for editor state (modal visibility, lock info, file content)
- Uses `useState`/injection, no Pinia

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
   - Media upload restrictions (500 MB limit; images/audio/video)

## Implementation Phases

**Overall Status: Phases 1-3 Complete ✅ | Ready for Production Testing**

The simplified markdown editor is now **fully functional** with all core features implemented:
- ✅ **Backend Infrastructure**: File locking, permissions, API endpoints
- ✅ **Frontend Integration**: Editor UI, lock management, real-time keep-alive
- ✅ **Git Workflow**: Commit, push, and content sync on save
- 🔄 **Phase 4 (Next)**: Polish, admin tools, and comprehensive testing

### Phase 1: Core Infrastructure
**STATUS: ✅ 100% Complete - All backend and frontend infrastructure ready**

**✅ Completed:**
1. ✅ Editor library installed - **Toast UI Editor** (v3.2.2) instead of mavonEditor
   - Better Vue 3 support and more feature-rich
   - Configured with dark theme matching Nuxt UI
   - Tab-based preview mode
2. ✅ Frontend components built:
   - `app/components/editor/ContentEditor.client.vue` - Full markdown editor
   - `app/components/editor/EditableTitle.vue` - Inline title editing
   - `app/components/editor/EditableDescription.vue` - Inline description editing
   - `app/components/editor/EditorToggleButton.vue` - Smart edit/save toggle
3. ✅ Editor state management - `app/composables/useEditor.ts`
   - State tracking (enabled, original, current, dirty)
   - Update handlers for title, description, body
   - Save/cancel with dirty checking
4. ✅ Editor plugin - `app/plugins/toast-ui-editor.client.ts`
5. ✅ Discord authentication with role checking:
   - Guild membership checking in `server/api/auth/[...].ts`
   - Role fetching via Discord Bot API
   - Session includes roles, isDocEditor, isAdmin flags
   - `types/auth.ts` updated with full role support
6. ✅ File lock manager system - `server/utils/FileLockManager.ts`
   - In-memory lock management
   - Automatic expiration and cleanup
   - Lock extension support
   - Admin override capability
7. ✅ Editor permissions system - `server/utils/editor-permissions.ts`
   - Role-based access control
   - Admin override support
   - Helper functions for middleware
8. ✅ Complete API endpoint suite - `server/api/editor/`:
   - `can-edit/[path].get.ts` - Check permissions and lock status
   - `acquire-lock/[path].post.ts` - Acquire file lock
   - `extend-lock/[path].post.ts` - Keep-alive for lock
   - `release-lock/[path].delete.ts` - Release lock
   - `content/[path].get.ts` - Fetch raw markdown from git repo
   - `save/[path].post.ts` - Commit, push, sync workflow
   - `upload-media.post.ts` - Media file uploads to public/media/
   - `lock-status.get.ts` - Admin: view all locks

### Phase 2: Frontend Integration
**STATUS: ✅ 100% Complete - Full editor integration with lock management**

**✅ Completed:**
1. ✅ Enhanced `EditorToggleButton` component:
   - Permission checking via `/api/editor/can-edit` endpoint
   - Lock status display (shows who is editing)
   - Real content fetching from git repo via API
   - Lock acquisition before editing
   - Role-gated visibility (only shows for users with edit permissions)
   - Disabled state when file is locked by another user
2. ✅ Updated `useEditor` composable with full lock management:
   - Lock keep-alive mechanism (extends lock every 60 seconds)
   - Lock timeout warnings at 25 minutes
   - Real save functionality calling `/api/editor/save` endpoint
   - Git commit/push/sync workflow on save
   - Automatic lock release on save or cancel
   - Dirty state tracking for unsaved changes
   - Confirmation dialog before exiting with unsaved changes
3. ✅ Integrated with backend APIs:
   - Permission checks and lock status queries
   - Content fetching from git repository
   - Lock acquisition and extension
   - Save with git workflow
   - Lock release on completion
4. ✅ User feedback and notifications:
   - Toast notifications for all operations
   - Lock status indicators in button state
   - Loading states during operations
   - Error handling with user-friendly messages

### Phase 3: Commit & Sync
**STATUS: ✅ 100% Complete - Git workflow fully integrated**

**✅ Completed:**
1. ✅ Local repo commit/push functionality in `/api/editor/save` endpoint:
   - Git pull --rebase before writing changes
   - File write to git repository
   - Git add and commit with proper author attribution
   - Git push to remote repository
   - Commit message format: "docs: update {path} via editor by {userName}"
2. ✅ Content synchronization after save:
   - Automatic call to `/api/sync-content` after successful push
   - Content directory sync from git repo to app content folder
   - Page reload to display updated content
3. ✅ Comprehensive error handling:
   - Lock validation before save
   - Git conflict detection and reporting
   - Network error handling
   - User-friendly error messages
   - Automatic lock release on errors
   - No-changes detection (doesn't fail if nothing to commit)

### Phase 4: Polish & Testing
1. User experience refinements
2. Admin tools for lock management
3. Comprehensive testing
4. Documentation and deployment

## Success Criteria
- Users with correct role can edit any unlocked file
- Only one user can edit a file at a time
- Changes commit and push to the external docs repo immediately; app content syncs after save
- Clear visual feedback about edit status
- Simple, intuitive editing experience
- No complex state management or persistence
