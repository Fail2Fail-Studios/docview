import type { DiscordUser } from '../../../types/auth'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)

  const { pagePath, tabId, isEditing } = body

  if (!pagePath || typeof pagePath !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Invalid pagePath'
    })
  }

  if (!tabId || typeof tabId !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Invalid tabId'
    })
  }

  const user = session.user as DiscordUser
  const registry = usePresenceRegistry()
  registry.heartbeat(pagePath, tabId, user.id, !!isEditing)

  return { success: true }
})
