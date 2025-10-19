/* eslint-disable nuxt/nuxt-config-keys-order */
// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/content',
    '@nuxt/ui',
    'nuxt-og-image',
    'nuxt-auth-utils'
  ],

  ui: {
    theme: {
      colors: [
        'primary',
        'secondary',
        'tertiary',
        'info',
        'success',
        'warning',
        'error',
        'discord'
      ]
    }
  },

  devtools: {
    enabled: true
  },

  css: ['app/assets/css/main.css'],

  image: {
    // Disable IPX/sharp during dev to avoid native binding errors and 500s
    provider: 'none',
    presets: {
      logo: {
        modifiers: {
          format: 'webp',
          quality: 90,
          fit: 'contain'
        }
      }
    }
  },

  content: {
    build: {
      markdown: {
        toc: {
          searchDepth: 1
        }
      }
    },
    // Disable WebSocket in development (doesn't work well in Docker)
    watch: false
  },

  compatibilityDate: '2024-07-11',

  // Remove prerender configuration - rely on SSR only
  nitro: {
    // Empty - no prerendering
  },

  // Force SSR for all routes, disable prerendering
  routeRules: {
    '/**': {
      ssr: true,
      prerender: false
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  icon: {
    provider: 'iconify'
  },

  colorMode: {
    preference: 'dark', // Default to dark mode
    fallback: 'dark', // Fallback to dark if preference can't be determined
    classSuffix: '' // Use class="dark" instead of class="dark-mode"
  },

  runtimeConfig: {
    // Private keys (only available on server-side)
    oauthDiscordClientSecret: process.env.NUXT_OAUTH_DISCORD_CLIENT_SECRET,
    requiredDiscordGuildId: process.env.NUXT_REQUIRED_DISCORD_GUILD_ID || '1402498073350901800',
    discordBotToken: process.env.NUXT_DISCORD_BOT_TOKEN,
    discordEditorRoleId: process.env.NUXT_DISCORD_EDITOR_ROLE_ID || '1406031220772438137',
    adminUserIds: process.env.NUXT_ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [],

    // Git repository configuration
    gitRepoPath: process.env.NUXT_GIT_REPO_PATH || '/usr/src/app/una-repo', // Optional: matches static path in entrypoint.sh
    gitRepoUrl: process.env.NUXT_GIT_REPO_URL || 'https://github.com/Fail2Fail-Studios/una',
    gitBranch: process.env.NUXT_GIT_BRANCH || 'main',
    gitTimeout: parseInt(process.env.NUXT_GIT_TIMEOUT || '60000'),
    gitUsername: process.env.NUXT_GIT_USERNAME,
    gitToken: process.env.NUXT_GIT_TOKEN,

    // Editor and Presence configuration
    editorLockTimeoutMs: parseInt(process.env.NUXT_EDITOR_LOCK_TIMEOUT_MS || '1800000'), // Default: 30 minutes
    presenceTtlMs: parseInt(process.env.NUXT_PRESENCE_TTL_MS || '45000'), // Default: 45 seconds

    // Session configuration
    session: {
      name: 'nuxt-session',
      password: process.env.NUXT_SESSION_PASSWORD || '',
      cookie: {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production', // Automatic: false in dev, true in production
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7 // 1 week
      },
      maxAge: 60 * 60 * 24 * 7 // 1 week session duration
    },

    // Public keys (exposed to client-side)
    public: {
      oauthDiscordClientId: process.env.NUXT_OAUTH_DISCORD_CLIENT_ID,
      authBaseUrl: process.env.NUXT_AUTH_BASE_URL || 'http://localhost:3000'
    }
  },
  vite: {
    resolve: {
      alias: {
        '~': fileURLToPath(new URL('./', import.meta.url)),
        '@': fileURLToPath(new URL('./', import.meta.url)),
        'app': fileURLToPath(new URL('./app', import.meta.url))
      }
    },
    server: {
      allowedHosts: ['docs.fail2.fail'],
      hmr: {
        protocol: 'ws',
        host: 'localhost'
        // Use the same port as the dev server (3000)
      },
      watch: {
        usePolling: true // Better compatibility with Docker volumes
      }
    },
    optimizeDeps: {
      include: ['@toast-ui/editor', '@toast-ui/vue-editor'],
      timeout: 60000 // Increase timeout to 60 seconds for Docker builds
    },
    ssr: {
      // Externalize Toast UI Editor for SSR to avoid build issues
      external: ['@toast-ui/editor'],
      noExternal: ['@toast-ui/vue-editor']
    }
  },

  build: {
    transpile: ['@toast-ui/editor', '@toast-ui/vue-editor']
  }
})
