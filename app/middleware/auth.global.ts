export default defineNuxtRouteMiddleware((to) => {
  // Allow public routes
  const publicPaths = ['/login', '/access-denied', '/']
  if (publicPaths.includes(to.path)) {
    return
  }

  const { user } = useUserSession()

  // Not authenticated → go to login
  if (!user.value) {
    return navigateTo('/login')
  }

  // Authenticated but not in required Discord guild → access denied
  if (!user.value.isDiscordMember) {
    return navigateTo('/access-denied')
  }
})
