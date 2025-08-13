export default defineNuxtRouteMiddleware((to) => {
  // Allow public routes
  const publicPaths = new Set(['/login', '/access-denied'])
  if (publicPaths.has(to.path)) {
    return
  }

  const session = useUserSession()

  // Not authenticated → go to login
  if (!session.user.value) {
    return navigateTo('/login')
  }

  // Authenticated but not in required Discord guild → access denied
  const isDiscordMember = (session.user.value as any)?.isDiscordMember === true
  if (!isDiscordMember) {
    return navigateTo('/access-denied')
  }
})


