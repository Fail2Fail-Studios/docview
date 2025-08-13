export default defineOAuthDiscordEventHandler({
  config: {
    emailRequired: true,
    scope: ['identify', 'email', 'guilds']
  },

  async onSuccess(event, { user, tokens }) {
    // Check if user is member of required Discord server
    const requiredGuildId = useRuntimeConfig().requiredDiscordGuildId

    if (requiredGuildId) {
      try {
        // Fetch user's guilds using the access token
        const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`
          }
        })

        if (!guildsResponse.ok) {
          throw new Error('Failed to fetch user guilds')
        }

        interface DiscordGuild { id: string }
        const guilds = (await guildsResponse.json()) as DiscordGuild[]
        const isMember = guilds.some(guild => guild.id === requiredGuildId)

        if (!isMember) {
          console.log(`User ${user.username} not member of required Discord server`)
          return sendRedirect(event, '/access-denied?reason=not_member')
        }
      } catch (error) {
        console.error('Error checking Discord server membership:', error)
        return sendRedirect(event, '/access-denied?reason=verification_failed')
      }
    }

    // Set user session
    await setUserSession(event, {
      user: {
        id: user.id,
        email: user.email,
        name: user.global_name || user.username,
        avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : undefined,
        discordId: user.id,
        username: user.username,
        discriminator: user.discriminator,
        // Mark membership as validated for middleware checks
        isDiscordMember: true
      },
      loggedInAt: Date.now()
    })

    // Redirect to home page after successful login
    return sendRedirect(event, '/')
  },

  async onError(event, error) {
    console.error('Discord OAuth error:', error)
    return sendRedirect(event, '/login?error=oauth_error')
  }
})
