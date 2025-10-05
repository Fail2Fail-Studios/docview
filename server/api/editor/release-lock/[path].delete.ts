import { getFileLockManager } from '../../../utils/FileLockManager'
import type { DiscordUser } from '../../../../types/auth'

export default defineEventHandler(async (event) => {
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

  // Check if user is admin
  const user = session.user as DiscordUser
  const isAdmin = user.isAdmin === true

  // Attempt to release lock
  const success = lockManager.releaseLock(decodedPath, session.user.id, isAdmin)

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

