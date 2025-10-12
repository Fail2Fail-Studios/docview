export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)

  const { pagePath, tabId } = body

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

  const registry = usePresenceRegistry()
  registry.join(pagePath, tabId, (session.user as any).id)

  return { success: true }
})
