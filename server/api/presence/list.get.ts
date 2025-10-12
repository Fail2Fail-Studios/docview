import type { PresenceSnapshot } from '../../../types/presence'

export default defineEventHandler(async (event): Promise<PresenceSnapshot> => {
  const session = await requireUserSession(event)
  const query = getQuery(event)

  const pagePath = query.pagePath as string

  if (!pagePath || typeof pagePath !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Invalid pagePath'
    })
  }

  const registry = usePresenceRegistry()

  // Provide a function to resolve user metadata from session
  const getUserData = async (userId: string) => {
    // In production, query user store/DB
    // For now, return minimal info based on session
    const user = session.user as any
    if (userId === user.id) {
      return {
        id: user.id,
        name: user.name || user.login || user.username || 'Unknown',
        avatar: user.avatar || user.avatar_url
      }
    }
    // For other users, would query from DB/cache
    return {
      id: userId,
      name: userId,
      avatar: undefined
    }
  }

  return registry.list(pagePath, getUserData)
})
