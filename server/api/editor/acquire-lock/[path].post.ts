import { getFileLockManager } from '../../../utils/FileLockManager'
import { requireEditorPermission } from '../../../utils/editor-permissions'
import { requireAuthenticatedUser, validateFilePath, validateTabId } from '../../../utils/editor-validation'

export default defineEventHandler(async (event) => {
  // Check editor permissions (throws 403 if not allowed)
  await requireEditorPermission(event)

  // Get authenticated user
  const user = await requireAuthenticatedUser(event)

  // Get and validate file path
  const decodedPath = validateFilePath(event)

  // Get and validate tabId from request body
  const body = await readBody(event)
  const tabId = validateTabId(body)

  // Get lock manager
  const lockManager = getFileLockManager()

  // Attempt to acquire lock
  const result = lockManager.acquireLock(
    decodedPath,
    user.id,
    user.name || user.username,
    tabId,
    user.avatar
  )

  if (!result.success) {
    throw createError({
      statusCode: 423, // 423 Locked
      statusMessage: result.error || 'Failed to acquire lock',
      data: {
        lockedBy: result.lockedBy
      }
    })
  }

  return {
    success: true,
    lock: {
      filePath: result.lock!.filePath,
      userId: result.lock!.userId,
      userName: result.lock!.userName,
      userAvatar: result.lock!.userAvatar,
      lockedAt: result.lock!.lockedAt.toISOString(),
      expiresAt: result.lock!.expiresAt.toISOString(),
      timeoutMinutes: Math.round((result.lock!.expiresAt.getTime() - result.lock!.lockedAt.getTime()) / 60000)
    }
  }
})
