import type { DiscordUser } from '~/types/auth'

export default defineNuxtRouteMiddleware((to) => {
  // Allow public routes
  const publicPaths = ['/login', '/access-denied']
  if (publicPaths.includes(to.path)) {
    return
  }

  const { user } = useUserSession()

  // Not authenticated → go to login
  if (!user.value) {
    return navigateTo('/login')
  }

  // Type-safe check for Discord membership
  const discordUser = user.value as DiscordUser
  if (!discordUser.isDiscordMember) {
    return navigateTo('/login')
  }
})
