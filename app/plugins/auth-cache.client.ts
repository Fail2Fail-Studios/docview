/**
 * Client-side auth cache plugin
 *
 * Caches authentication state to localStorage for instant UI rendering
 * Still validates with server in background for security
 *
 * This prevents the late pop-in of search bar, dropdown menu, and edit button
 * by providing cached auth state immediately while the server validates
 */

export default defineNuxtPlugin({
  name: 'auth-cache',
  enforce: 'pre',
  async setup() {
    const { $fetch } = useNuxtApp()
    const AUTH_CACHE_KEY = 'nuxt-auth-cache'
    const AUTH_CACHE_TIMESTAMP_KEY = 'nuxt-auth-cache-timestamp'
    const CACHE_MAX_AGE = 1000 * 60 * 5 // 5 minutes

    // Get cached auth state from localStorage
    const getCachedAuth = () => {
      try {
        const cached = localStorage.getItem(AUTH_CACHE_KEY)
        const timestamp = localStorage.getItem(AUTH_CACHE_TIMESTAMP_KEY)

        if (!cached || !timestamp) return null

        // Check if cache is still valid
        const age = Date.now() - parseInt(timestamp, 10)
        if (age > CACHE_MAX_AGE) {
          // Cache expired, clear it
          localStorage.removeItem(AUTH_CACHE_KEY)
          localStorage.removeItem(AUTH_CACHE_TIMESTAMP_KEY)
          return null
        }

        return JSON.parse(cached)
      } catch (error) {
        console.warn('[AuthCache] Failed to read from cache:', error)
        return null
      }
    }

    // Save auth state to localStorage
    const setCachedAuth = (session: any) => {
      try {
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(session))
        localStorage.setItem(AUTH_CACHE_TIMESTAMP_KEY, Date.now().toString())
      } catch (error) {
        console.warn('[AuthCache] Failed to write to cache:', error)
      }
    }

    // Clear cached auth state
    const clearCachedAuth = () => {
      try {
        localStorage.removeItem(AUTH_CACHE_KEY)
        localStorage.removeItem(AUTH_CACHE_TIMESTAMP_KEY)
      } catch (error) {
        console.warn('[AuthCache] Failed to clear cache:', error)
      }
    }

    // Get the Nuxt session state
    const sessionState = useState('nuxt-session')
    const authReadyState = useState('nuxt-auth-ready')

    // Restore cached auth state immediately for instant UI
    const cachedAuth = getCachedAuth()
    if (cachedAuth && !sessionState.value) {
      console.log('[AuthCache] Restoring cached auth state for instant UI')
      sessionState.value = cachedAuth
    }

    // Fetch fresh auth state from server
    // We need to await this to ensure the session is validated before API calls
    try {
      const freshSession = await $fetch('/api/_auth/session', {
        headers: {
          accept: 'application/json'
        },
        retry: false
      }).catch(() => null)

      // Update session state with fresh data
      sessionState.value = freshSession

      // Update cache with fresh data
      if (freshSession) {
        setCachedAuth(freshSession)
        console.log('[AuthCache] Updated with fresh auth state from server')
      } else {
        clearCachedAuth()
        console.log('[AuthCache] Cleared auth - no valid session')
      }
    } catch (error) {
      console.warn('[AuthCache] Failed to fetch fresh auth:', error)
      // Keep cached data on error, but log it
    } finally {
      // Mark auth as ready
      authReadyState.value = true
    }

    // Watch for session changes and update cache
    watch(sessionState, (newSession) => {
      if (newSession) {
        setCachedAuth(newSession)
      } else {
        clearCachedAuth()
      }
    }, { deep: true })
  }
})

