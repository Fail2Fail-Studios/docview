import { getFileLockManager } from '../../../utils/FileLockManager'
import { requireAuthenticatedUser, validateFilePath, validateTabId } from '../../../utils/editor-validation'
import { requireEditorPermission } from '../../../utils/editor-permissions'

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

  // Attempt to extend lock
  const result = lockManager.extendLock(decodedPath, user.id, tabId)

  if (!result.success) {
    throw createError({
      statusCode: result.lockedBy ? 423 : 404,
      statusMessage: result.error || 'Failed to extend lock',
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
      lastExtendedAt: result.lock!.lastExtendedAt?.toISOString(),
      timeoutMinutes: Math.round((result.lock!.expiresAt.getTime() - Date.now()) / 60000)
    }
  }
})
