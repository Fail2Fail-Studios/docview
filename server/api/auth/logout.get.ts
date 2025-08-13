export default defineEventHandler(async (event) => {
  try {
    await clearUserSession(event)
  } catch (error) {
    // no-op; ensure redirect regardless
  }
  return sendRedirect(event, '/login')
})


