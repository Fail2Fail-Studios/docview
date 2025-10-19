import { getFileLockManager } from '../../../utils/FileLockManager'
import { requireAuthenticatedUser, validateFilePath } from '../../../utils/editor-validation'

export default defineEventHandler(async (event) => {
  // Get authenticated user
  const user = await requireAuthenticatedUser(event)

  // Get and validate file path
  const decodedPath = validateFilePath(event)

  // Get tabId from request body (optional for backwards compatibility)
  const body = await readBody(event).catch(() => ({}))
  const tabId = body?.tabId

  // Get lock manager
  const lockManager = getFileLockManager()

  // Check if user is admin
  const isAdmin = user.isAdmin === true

  // Attempt to release lock
  const success = lockManager.releaseLock(decodedPath, user.id, tabId, isAdmin)

  if (!success) {
    const lockInfo = lockManager.getLockInfo(decodedPath)

    if (!lockInfo) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No lock exists for this file'
      })
    }

    throw createError({
      statusCode: 403,
      statusMessage: 'You do not own this lock',
      data: {
        lockedBy: {
          userName: lockInfo.userName,
          lockedAt: lockInfo.lockedAt.toISOString(),
          expiresAt: lockInfo.expiresAt.toISOString()
        }
      }
    })
  }

  return {
    success: true,
    message: 'Lock released successfully'
  }
})
