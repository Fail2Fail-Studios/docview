import { getFileLockManager } from '../../utils/FileLockManager'

export default defineEventHandler(async (event) => {
  // Get user session
  const session = await getUserSession(event)

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  // Get lock manager
  const lockManager = getFileLockManager()

  // Get all active locks
  const locks = lockManager.getAllLocks()

  // Get statistics
  const stats = lockManager.getStats()

  // Format locks for response
  const formattedLocks = locks.map(lock => ({
    filePath: lock.filePath,
    userId: lock.userId,
    userName: lock.userName,
    userAvatar: lock.userAvatar,
    lockedAt: lock.lockedAt.toISOString(),
    expiresAt: lock.expiresAt.toISOString(),
    lastExtendedAt: lock.lastExtendedAt?.toISOString(),
    timeRemainingMinutes: Math.round((lock.expiresAt.getTime() - Date.now()) / 60000),
    isOwnedByCurrentUser: lock.userId === session.user.id
  }))

  return {
    locks: formattedLocks,
    stats: {
      totalLocks: stats.totalLocks,
      activeLocks: stats.activeLocks,
      lockTimeoutMinutes: stats.lockTimeoutMinutes
    },
    currentUser: {
      id: session.user.id,
      name: session.user.name || session.user.username
    }
  }
})

