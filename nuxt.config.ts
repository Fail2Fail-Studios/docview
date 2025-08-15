/* eslint-disable nuxt/nuxt-config-keys-order */
// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/content',
    '@nuxt/ui',
    '@nuxt/ui-pro',
    'nuxt-og-image',
    'nuxt-auth-utils',
    '@pinia/nuxt'
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
        '/'
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
    }
  }
})
