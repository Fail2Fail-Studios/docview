interface LoginCredentials {
  email: string
  password: string
  remember?: boolean
}

interface AppUser {
  id: string
  email: string
  name?: string
  avatar?: string
  isDiscordMember?: boolean
}

interface AuthState {
  user: AppUser | null
  isLoggedIn: boolean
  isLoading: boolean
}

export const useAuth = () => {
  // Use nuxt-auth-utils session management
  const session = useUserSession()
  const isLoading = ref(false)

  // Map session user to our User interface
  const user = computed<AppUser | null>(() => {
    if (!session.user.value) return null

    interface ServerSessionUser {
      id: string
      email: string
      name?: string
      avatar?: string
      isDiscordMember?: boolean
    }

    const rawUser = session.user.value as unknown as ServerSessionUser

    return {
      id: rawUser.id,
      email: rawUser.email,
      name: rawUser.name,
      avatar: rawUser.avatar,
      isDiscordMember: rawUser.isDiscordMember
    }
  })

  const isLoggedIn = computed(() => !!session.user.value)

  // Discord OAuth login
  const loginWithDiscord = async (): Promise<void> => {
    try {
      // Redirect to Discord OAuth endpoint provided by nuxt-auth-utils
      await navigateTo('/api/auth/discord', { external: true })
    } catch (error) {
      console.error('Discord login failed:', error)
      throw error
    }
  }

  // Logout
  const logout = async (): Promise<void> => {
    try {
      // Clear server session via API then redirect
      await navigateTo('/api/auth/logout', { external: true })
    } catch (error) {
      console.error('Logout failed:', error)
      throw error
    }
  }

  // Check if user is authenticated (no longer needed - session is reactive)
  const checkAuth = async (): Promise<void> => {
    // Session state is automatically managed by nuxt-auth-utils
    // No manual check needed as the session is reactive
  }

  // Refresh user data (no longer needed - session is reactive)
  const refreshUser = async (): Promise<void> => {
    // Session data is automatically managed by nuxt-auth-utils
    // No manual refresh needed as the session is reactive
  }

  return {
    // State
    user: readonly(user),
    isLoggedIn,
    isLoading: readonly(isLoading),

    // Actions
    loginWithDiscord,
    logout,
    checkAuth,
    refreshUser
  }
}

// Auto-export type for use in other files
export type { LoginCredentials, AppUser, AuthState }
