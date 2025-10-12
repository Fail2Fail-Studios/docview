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

  // Get tabId from request body
  const body = await readBody(event)
  const tabId = body?.tabId

  if (!tabId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tab ID is required'
    })
  }

  // Decode the path (it will be URL-encoded)
  const decodedPath = decodeURIComponent(path)

  // Get lock manager
  const lockManager = getFileLockManager()

  // Attempt to acquire lock
  const result = lockManager.acquireLock(
    decodedPath,
    session.user.id,
    session.user.name || session.user.username,
    tabId,
    session.user.avatar
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
