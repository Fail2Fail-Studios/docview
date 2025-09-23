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
    }
  },

  compatibilityDate: '2024-07-11',

  nitro: {
    prerender: {
      routes: [
        '/',
        // Main content sections
        '/overview',
        '/game-design',
        '/features',
        '/systems',
        '/stages',
        // Key feature pages
        '/features/mission-system',
        '/features/squad-system',
        '/features/combat-system',
        '/features/core-game-systems',
        // Stage overview pages
        '/stages/stage-1',
        '/stages/stage-2',
        '/stages/stage-3'
      ],
      crawlLinks: true,
      autoSubfolderIndex: false
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

  runtimeConfig: {
    // Private keys (only available on server-side)
    oauthDiscordClientSecret: process.env.NUXT_OAUTH_DISCORD_CLIENT_SECRET,
    requiredDiscordGuildId: process.env.NUXT_REQUIRED_DISCORD_GUILD_ID || '1402498073350901800',

    // Document sync configuration
    syncSourcePath: process.env.NUXT_SYNC_SOURCE_PATH,
    syncDestinationPath: process.env.NUXT_SYNC_DESTINATION_PATH,
    syncTimeout: parseInt(process.env.NUXT_SYNC_TIMEOUT || '30000'),

    // Git repository configuration
    gitRepoPath: process.env.NUXT_GIT_REPO_PATH,
    gitRepoUrl: process.env.NUXT_GIT_REPO_URL || 'https://github.com/Fail2Fail-Studios/una',
    gitBranch: process.env.NUXT_GIT_BRANCH || 'main',
    gitTimeout: parseInt(process.env.NUXT_GIT_TIMEOUT || '60000'),
    gitUsername: process.env.NUXT_GIT_USERNAME,
    gitToken: process.env.NUXT_GIT_TOKEN,

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
      allowedHosts: ['docs.fail2.fail']
    }
  }
})
