# Group 2 Testing Guide: Discord Role Permissions

## What We Built

✅ **Enhanced Discord OAuth** - Now fetches user roles from guild  
✅ **Updated Types** - Added roles, isDocEditor, isAdmin to DiscordUser  
✅ **Editor Permissions Helper** - `server/utils/editor-permissions.ts`  
✅ **New API Endpoint:**
- `GET /api/editor/can-edit/{path}` - Check if user can edit a file

✅ **Updated Endpoints:**
- `POST /api/editor/acquire-lock/{path}` - Now requires doc-edit role
- `DELETE /api/editor/release-lock/{path}` - Admin override support

## Prerequisites

1. **Environment Variables** - Add to your `.env` file:
   ```bash
   NUXT_DISCORD_BOT_TOKEN=your_bot_token_here
   NUXT_DISCORD_EDITOR_ROLE_ID=1406031220772438137
   NUXT_ADMIN_USER_IDS=your_discord_id,another_admin_id  # Optional
   ```

2. **Discord Bot Setup:**
   - Your bot must be in the Discord server with appropriate permissions
   - Bot needs `Read Messages/View Channels` and `Manage Roles` permissions (or at least permission to view member roles)
   - The bot token is used to fetch guild member information

3. **Restart dev server** after adding environment variables: `pnpm dev`

4. **Re-authenticate:** Logout and login again to fetch your roles

## Testing Role-Based Access

### Test 1: Check Your Permissions

```javascript
// Check if you can edit a test file
const canEdit = await $fetch('/api/editor/can-edit/test.md')
console.log('Can Edit:', canEdit)
```

**Expected Response (WITH doc-edit role):**
```json
{
  "canEdit": true,
  "isAdmin": false,
  "isDocEditor": true,
  "lock": { "isLocked": false },
  "user": {
    "id": "your_discord_id",
    "name": "Your Name",
    "roles": ["role_id_1", "role_id_2", "1406031220772438137"]
  }
}
```

**Expected Response (WITHOUT doc-edit role):**
```json
{
  "canEdit": false,
  "isAdmin": false,
  "isDocEditor": false,
  "reason": "User does not have doc-edit role",
  "lock": { "isLocked": false },
  "user": {
    "id": "your_discord_id",
    "name": "Your Name",
    "roles": ["role_id_1", "role_id_2"]
  }
}
```

### Test 2: Try to Acquire Lock (WITH doc-edit role)

```javascript
// If you have the doc-edit role, this should work
const lock = await $fetch('/api/editor/acquire-lock/test.md', {
  method: 'POST'
})
console.log('Lock Acquired:', lock)
// Expected: { success: true, lock: {...} }
```

### Test 3: Try to Acquire Lock (WITHOUT doc-edit role)

```javascript
// If you DON'T have the doc-edit role, this should fail
try {
  await $fetch('/api/editor/acquire-lock/test.md', {
    method: 'POST'
  })
} catch (error) {
  console.log('Expected Error:', error.data)
  // Expected: 403 Forbidden - "You do not have permission to edit content"
}
```

### Test 4: Verify Session Data

```javascript
// Check what's stored in your session
const { data } = await useFetch('/api/_auth/session')
console.log('Session Data:', data.value)
```

**Look for:**
- `user.roles` - Array of Discord role IDs
- `user.isDocEditor` - Should be `true` if you have the doc-edit role
- `user.isAdmin` - Should be `true` if your Discord ID is in `NUXT_ADMIN_USER_IDS`

### Test 5: Admin Override (Release Someone Else's Lock)

**Setup:**
1. User A (with doc-edit role) acquires a lock
2. User B (admin) tries to release it

**User A:**
```javascript
await $fetch('/api/editor/acquire-lock/admin-test.md', { method: 'POST' })
```

**User B (in different browser/incognito, must be admin):**
```javascript
// Admin can force-release any lock
await $fetch('/api/editor/release-lock/admin-test.md', { method: 'DELETE' })
// Expected: { success: true, message: 'Lock released successfully' }
```

## Testing Multi-User Scenarios

### Scenario 1: User Without Role Tries to Lock

1. Login with account that does NOT have doc-edit role
2. Try to acquire lock:
   ```javascript
   await $fetch('/api/editor/acquire-lock/test.md', { method: 'POST' })
   ```
3. **Expected:** 403 Forbidden error

### Scenario 2: User With Role Can Lock

1. Login with account that HAS doc-edit role
2. Try to acquire lock:
   ```javascript
   await $fetch('/api/editor/acquire-lock/test.md', { method: 'POST' })
   ```
3. **Expected:** Success with lock info

### Scenario 3: Check Lock Status Shows Role Info

```javascript
const status = await $fetch('/api/editor/lock-status')
console.log('Lock Status:', status)
// Locks should show who owns them
// currentUser should show your info
```

## Verifying Role Fetch

Check your server logs after logging in. You should see:
```
[log] User YourUsername roles: ["role_id_1", "role_id_2", "1406031220772438137"]
[log] User YourUsername is doc editor: true
```

If you DON'T see this:
- ✅ Check `NUXT_DISCORD_BOT_TOKEN` is set correctly
- ✅ Verify bot is in your Discord server
- ✅ Ensure bot has permission to view member roles
- ✅ Check `NUXT_DISCORD_EDITOR_ROLE_ID` matches your role ID

## Key Features to Verify

✅ **Role Checking**: Only users with doc-edit role can acquire locks  
✅ **Admin Override**: Admins can release any lock  
✅ **Session Storage**: Roles are stored in session on login  
✅ **Can-Edit Endpoint**: Provides comprehensive permission info  
✅ **Graceful Degradation**: Auth doesn't fail if role fetch fails  

## Troubleshooting

**"User does not have doc-edit role" but you DO have it:**
- Logout and login again to refresh your session
- Verify role ID matches: `1406031220772438137`
- Check server logs to see what roles were fetched

**403 on acquire-lock even with role:**
- Check `can-edit` endpoint first to see what the server thinks
- Verify `isDocEditor` is `true` in your session

**Bot token not working:**
- Ensure bot token starts with proper format
- Verify bot is in the correct Discord server
- Check bot permissions in Discord

**Admin override not working:**
- Verify your Discord ID is in `NUXT_ADMIN_USER_IDS`
- IDs should be comma-separated with no quotes
- Logout and login to refresh session

## Next Steps

Once you've verified role checking works correctly, we'll move to **Group 3: Content Reading** to load real markdown files from the git repo.

