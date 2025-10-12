import { checkEditorPermission } from '../../../utils/editor-permissions'
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

  // Check editor permissions
  const user = session.user as DiscordUser
  const permission = checkEditorPermission(user)

  // Check lock status
  const lockManager = getFileLockManager()
  const lockInfo = lockManager.getLockInfo(decodedPath)

  return {
    canEdit: permission.canEdit,
    isAdmin: permission.isAdmin,
    isDocEditor: permission.isDocEditor,
    reason: permission.reason,
    lock: lockInfo
      ? {
          isLocked: true,
          filePath: lockInfo.filePath,
          userId: lockInfo.userId,
          userName: lockInfo.userName,
          userAvatar: lockInfo.userAvatar,
          lockedAt: lockInfo.lockedAt.toISOString(),
          expiresAt: lockInfo.expiresAt.toISOString(),
          timeRemainingMinutes: Math.round((lockInfo.expiresAt.getTime() - Date.now()) / 60000),
          isOwnedByCurrentUser: lockInfo.userId === user.id
        }
      : {
          isLocked: false
        },
    user: {
      id: user.id,
      name: user.name || user.username,
      roles: user.roles || []
    }
  }
})
