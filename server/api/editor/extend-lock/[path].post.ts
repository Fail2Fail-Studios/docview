import { getFileLockManager } from '../../../utils/FileLockManager'
import { requireEditorPermission } from '../../../utils/editor-permissions'

export default defineEventHandler(async (event) => {
  // Check editor permissions (throws 403 if not allowed)
  await requireEditorPermission(event)

  // Get user session
  const session = await getUserSession(event)

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  // Get file path from route params
  const path = getRouterParam(event, 'path')

  if (!path) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File path is required'
    })
  }

  // Decode the path
  const decodedPath = decodeURIComponent(path)

  // Get lock manager
  const lockManager = getFileLockManager()

  // Attempt to extend lock
  const result = lockManager.extendLock(decodedPath, session.user.id)

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

