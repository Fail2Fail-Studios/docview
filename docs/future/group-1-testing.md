# Group 1 Testing Guide: File Lock Manager

## What We Built

✅ **FileLockManager** - In-memory lock management system  
✅ **API Endpoints:**
- `POST /api/editor/acquire-lock/{path}` - Acquire a lock on a file
- `DELETE /api/editor/release-lock/{path}` - Release a lock
- `GET /api/editor/lock-status` - View all active locks

## Prerequisites

1. Start the dev server: `pnpm dev`
2. Make sure you're logged in (visit http://localhost:3000 and authenticate with Discord)

## Testing with Browser Console

Open your browser's Developer Tools (F12) and use the console to test the API.

### Test 1: Check Lock Status (Empty)

```javascript
// Should show no locks initially
const status = await $fetch('/api/editor/lock-status')
console.log('Lock Status:', status)
// Expected: { locks: [], stats: { totalLocks: 0, activeLocks: 0, lockTimeoutMinutes: 30 }, currentUser: {...} }
```

### Test 2: Acquire a Lock

```javascript
// Acquire lock on a test file
const acquireResult = await $fetch('/api/editor/acquire-lock/test-file.md', {
  method: 'POST'
})
console.log('Acquire Lock:', acquireResult)
// Expected: { success: true, lock: { filePath, userId, userName, lockedAt, expiresAt, timeoutMinutes: 30 } }
```

### Test 3: Try to Acquire Same Lock Again (Should Extend)

```javascript
// Try to acquire the same lock again - should extend it
const acquireAgain = await $fetch('/api/editor/acquire-lock/test-file.md', {
  method: 'POST'
})
console.log('Acquire Again:', acquireAgain)
// Expected: Success with extended expiration time
```

### Test 4: Check Lock Status (Should Show 1 Lock)

```javascript
const statusWithLock = await $fetch('/api/editor/lock-status')
console.log('Lock Status:', statusWithLock)
// Expected: { locks: [{ filePath: 'test-file.md', ... }], stats: { totalLocks: 1, activeLocks: 1 } }
```

### Test 5: Release the Lock

```javascript
const releaseResult = await $fetch('/api/editor/release-lock/test-file.md', {
  method: 'DELETE'
})
console.log('Release Lock:', releaseResult)
// Expected: { success: true, message: 'Lock released successfully' }
```

### Test 6: Check Lock Status (Should Be Empty Again)

```javascript
const finalStatus = await $fetch('/api/editor/lock-status')
console.log('Final Status:', finalStatus)
// Expected: { locks: [], stats: { totalLocks: 0, activeLocks: 0 } }
```

### Test 7: Multiple Files

```javascript
// Lock multiple files
await $fetch('/api/editor/acquire-lock/file1.md', { method: 'POST' })
await $fetch('/api/editor/acquire-lock/file2.md', { method: 'POST' })
await $fetch('/api/editor/acquire-lock/file3.md', { method: 'POST' })

const multiStatus = await $fetch('/api/editor/lock-status')
console.log('Multiple Locks:', multiStatus)
// Expected: 3 locks shown

// Release all
await $fetch('/api/editor/release-lock/file1.md', { method: 'DELETE' })
await $fetch('/api/editor/release-lock/file2.md', { method: 'DELETE' })
await $fetch('/api/editor/release-lock/file3.md', { method: 'DELETE' })
```

### Test 8: Error Cases

```javascript
// Try to release a lock that doesn't exist
try {
  await $fetch('/api/editor/release-lock/nonexistent.md', { method: 'DELETE' })
} catch (error) {
  console.log('Expected Error:', error.data)
  // Expected: 404 - No lock exists for this file
}
```

## Testing with Incognito Window (Multi-User Scenario)

1. **Regular Window**: Login and acquire a lock
   ```javascript
   await $fetch('/api/editor/acquire-lock/shared-file.md', { method: 'POST' })
   ```

2. **Incognito Window**: Login with a different Discord account and try to acquire the same lock
   ```javascript
   await $fetch('/api/editor/acquire-lock/shared-file.md', { method: 'POST' })
   ```
   
   **Expected:** Should fail with 423 Locked status and show who owns the lock

## Key Features to Verify

✅ **Lock Acquisition**: Users can lock files  
✅ **Lock Ownership**: Only lock owner can release their lock  
✅ **Lock Extension**: Re-acquiring your own lock extends it  
✅ **Lock Timeout**: Locks expire after 30 minutes (set by `FILE_LOCK_TIMEOUT_MS`)  
✅ **Multiple Locks**: Users can lock multiple files simultaneously  
✅ **Lock Status**: All active locks are visible  
✅ **Path Normalization**: Paths with slashes/backslashes are handled correctly

## Expected Behavior

- ✅ Authenticated users can acquire locks
- ✅ Unauthenticated requests get 401 errors
- ✅ Locks expire after 30 minutes automatically
- ✅ Lock status shows who owns what
- ✅ Users can only release their own locks
- ❌ Admin override not yet implemented (Group 2)
- ❌ Role-based permissions not yet implemented (Group 2)

## Troubleshooting

**401 Unauthorized**: Make sure you're logged in via Discord OAuth

**Lock not releasing**: Check the file path matches exactly (case-insensitive, but format matters)

**Multiple instances**: Each server restart clears all locks (in-memory only)

## Next Steps

Once you've verified these endpoints work correctly, we'll move to **Group 2: Discord Role Permissions** to add proper role-based access control.

