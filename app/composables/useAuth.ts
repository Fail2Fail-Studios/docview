import type { DiscordUser } from '~/types/auth'

export const useAuth = () => {
  const { user: rawUser, loggedIn, clear } = useUserSession()

  // Type-safe user with Discord properties
  const user = computed(() => rawUser.value as DiscordUser | null)

  // Handle user logout
  const logout = async (): Promise<void> => {
    try {
      console.log('Logging out user...')
      await clear()
      await navigateTo('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      throw error
    }
  }

  // Check if user is authenticated and has required permissions
  const isAuthenticated = computed(() => {
    return loggedIn.value && user.value?.isDiscordMember === true
  })

  // Get user display name with fallback
  const displayName = computed(() => {
    if (!user.value) return null
    return user.value.name || user.value.username || 'User'
  })

  // Get user avatar with fallback
  const avatarUrl = computed(() => {
    return user.value?.avatar || null
  })

  return {
    user: readonly(user),
    loggedIn: readonly(loggedIn),
    isAuthenticated: readonly(isAuthenticated),
    displayName: readonly(displayName),
    avatarUrl: readonly(avatarUrl),
    logout
  }
}
