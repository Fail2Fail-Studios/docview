# Authentication System

F2F DocView implements a sophisticated Discord-based authentication system that ensures only authorized Discord server members can access the documentation. This document explains the authentication flow, middleware, and security considerations.

## Overview

The authentication system is built on:
- **Discord OAuth 2.0**: Primary authentication provider
- **nuxt-auth-utils**: Session management and OAuth handling
- **Server Membership Validation**: Ensures users belong to required Discord server
- **Global Middleware**: Route protection across the entire application

## Authentication Flow

### 1. Initial Access
```typescript
// app/middleware/auth.global.ts
export default defineNuxtRouteMiddleware((to) => {
  // Allow public routes
  const publicPaths = ['/login', '/access-denied']
  if (publicPaths.includes(to.path)) {
    return
  }

  const { user } = useUserSession()

  // Not authenticated → redirect to login
  if (!user.value) {
    return navigateTo('/login')
  }

  // Authenticated but not Discord member → access denied
  if (!(user.value as any).isDiscordMember) {
    return navigateTo('/login')
  }
})
```

### 2. Discord OAuth Handler
```typescript
// server/api/auth/[...].ts
export default defineOAuthDiscordEventHandler({
  config: {
    emailRequired: true,
    scope: ['identify', 'email', 'guilds']
  },

  async onSuccess(event, { user, tokens }) {
    // Verify Discord server membership
    const requiredGuildId = useRuntimeConfig().requiredDiscordGuildId
    
    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    })

    const guilds = await guildsResponse.json()
    const isMember = guilds.some(guild => guild.id === requiredGuildId)

    if (!isMember) {
      return sendRedirect(event, '/access-denied?reason=not_member')
    }

    // Set authenticated session
    await setUserSession(event, {
      user: {
        id: user.id,
        email: user.email,
        name: user.global_name || user.username,
        avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : undefined,
        discordId: user.id,
        username: user.username,
        discriminator: user.discriminator,
        isDiscordMember: true
      },
      loggedInAt: Date.now()
    })

    return sendRedirect(event, '/')
  }
})
```

## User Session Management

### Session Structure
```typescript
interface DiscordUser {
  id: string
  email: string
  name: string
  avatar?: string
  discordId: string
  username: string
  discriminator: string
  isDiscordMember: boolean
}

interface UserSession {
  user: DiscordUser
  loggedInAt: number
}
```

### Accessing User Data
```typescript
// In components or composables
const { user, loggedIn, clear } = useUserSession()

// Type-safe user access
const typedUser = computed(() => user.value as DiscordUser | null)

// Check authentication status
if (!loggedIn.value) {
  // Handle unauthenticated state
}
```

## Route Protection

### Global Middleware
The global authentication middleware (`auth.global.ts`) protects all routes by default with exceptions for:
- `/login` - Authentication page
- `/access-denied` - Error page for unauthorized users

### Public Routes Configuration
```typescript
const publicPaths = ['/login', '/access-denied']
```

To add new public routes, update this array in the middleware.

### Protected Route Examples
```typescript
// All these routes are automatically protected:
/                    # Home page
/docs/getting-started # Documentation pages
/api/*               # API endpoints (server-side protection)
```

## UI Integration

### Header Authentication Display
```vue
<!-- app/components/AppHeader.vue -->
<template>
  <UHeader>
    <!-- Authenticated user dropdown -->
    <UDropdownMenu
      v-if="loggedIn"
      :items="[
        [
          {
            label: user?.name || user?.username || 'User',
            slot: 'account'
          }
        ],
        [
          {
            label: 'Sign Out',
            icon: 'i-lucide-log-out',
            onClick: handleLogout
          }
        ]
      ]"
    >
      <UAvatar
        :src="user?.avatar"
        :alt="user?.name || user?.username"
        size="sm"
        class="cursor-pointer"
      />

      <template #account="{ item }">
        <div class="text-left">
          <p class="font-medium text-gray-900 dark:text-white">
            {{ item.label }}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ user?.email }}
          </p>
        </div>
      </template>
    </UDropdownMenu>
  </UHeader>
</template>

<script setup lang="ts">
const { user, loggedIn, clear } = useUserSession()

async function handleLogout() {
  await clear()
  await navigateTo('/login')
}
</script>
```

### Conditional Content Rendering
```vue
<template>
  <!-- Only show search for authenticated users -->
  <UContentSearchButton
    v-if="header?.search && loggedIn"
    :collapsed="false"
    class="w-full"
  />
</template>
```

## Environment Configuration

### Required Environment Variables
```bash
# Discord OAuth Application
NUXT_OAUTH_DISCORD_CLIENT_ID=your_discord_client_id
NUXT_OAUTH_DISCORD_CLIENT_SECRET=your_discord_client_secret

# Discord Server Validation
NUXT_REQUIRED_DISCORD_GUILD_ID=your_discord_server_id

# Application URLs
NUXT_AUTH_BASE_URL=http://localhost:3000  # Development
# NUXT_AUTH_BASE_URL=https://yourdomain.com  # Production
```

### Runtime Configuration
```typescript
// nuxt.config.ts
runtimeConfig: {
  // Server-only (secure)
  oauthDiscordClientSecret: process.env.NUXT_OAUTH_DISCORD_CLIENT_SECRET,
  requiredDiscordGuildId: process.env.NUXT_REQUIRED_DISCORD_GUILD_ID || '1402498073350901800',

  // Public (exposed to client)
  public: {
    oauthDiscordClientId: process.env.NUXT_OAUTH_DISCORD_CLIENT_ID,
    authBaseUrl: process.env.NUXT_AUTH_BASE_URL || 'http://localhost:3000'
  }
}
```

## Security Considerations

### Server Membership Validation
- **Real-time Check**: Membership is verified during OAuth callback using Discord's API
- **Token Usage**: Uses the OAuth access token to fetch user's guild memberships
- **Fail-safe**: Denies access if guild membership cannot be verified

### Session Security
- **Server-side Sessions**: Session data stored securely on the server
- **Token Expiration**: Sessions have automatic expiration
- **Secure Headers**: Proper security headers for session cookies

### Error Handling
```typescript
// Graceful error handling in OAuth flow
async onError(event, error) {
  console.error('Discord OAuth error:', error)
  return sendRedirect(event, '/login?error=oauth_error')
}
```

### Access Denied Scenarios
```typescript
// Different denial reasons for debugging
if (!isMember) {
  return sendRedirect(event, '/access-denied?reason=not_member')
}

// On API failure
return sendRedirect(event, '/access-denied?reason=verification_failed')
```

## Discord Application Setup

### Required Discord OAuth Scopes
```typescript
scope: ['identify', 'email', 'guilds']
```

- **identify**: Basic user information
- **email**: User's email address
- **guilds**: List of Discord servers user belongs to

### Discord Application Configuration
1. Create Discord application at https://discord.com/developers/applications
2. Configure OAuth2 redirect URIs:
   - Development: `http://localhost:3000/api/auth/discord`
   - Production: `https://yourdomain.com/api/auth/discord`
3. Note Client ID and Client Secret for environment variables
4. Get your Discord server ID for `NUXT_REQUIRED_DISCORD_GUILD_ID`

## Troubleshooting

### Common Issues

**Authentication Loop**
- Check Discord application redirect URIs
- Verify environment variables are set correctly
- Ensure Discord server ID matches the required guild

**Session Not Persisting**
- Check cookie settings in browser
- Verify server-side session storage
- Confirm runtime configuration

**Guild Membership Not Detected**
- Verify user is actually in the Discord server
- Check Discord API permissions
- Ensure OAuth scope includes 'guilds'

### Debug Logging
```typescript
// Add debug logging to OAuth handler
console.log('User guilds:', guilds)
console.log('Required guild ID:', requiredGuildId)
console.log('Is member:', isMember)
```

## API Protection

Server API routes are automatically protected through the session system:

```typescript
// server/api/protected.ts
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  // Your protected API logic
  return { data: 'Protected content' }
})
```

This authentication system provides robust security while maintaining a smooth user experience for authorized Discord server members.
