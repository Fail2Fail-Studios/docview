export default defineEventHandler(async (event) => {
  await requireUserSession(event)
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
  registry.leave(pagePath, tabId)

  return { success: true }
})
