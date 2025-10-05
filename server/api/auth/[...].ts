export default defineOAuthDiscordEventHandler({
  config: {
    emailRequired: true,
    scope: ['identify', 'email', 'guilds']
  },

  async onSuccess(event, { user, tokens }) {
    // Check if user is member of required Discord server
    const config = useRuntimeConfig()
    const requiredGuildId = config.requiredDiscordGuildId
    const botToken = config.discordBotToken
    const editorRoleId = config.discordEditorRoleId
    const adminUserIds = config.adminUserIds || []

    let userRoles: string[] = []
    let isDocEditor = false

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

        // Fetch user's roles using Bot Token
        if (botToken) {
          try {
            const memberResponse = await fetch(`https://discord.com/api/guilds/${requiredGuildId}/members/${user.id}`, {
              headers: {
                Authorization: `Bot ${botToken}`
              }
            })

            if (memberResponse.ok) {
              interface DiscordGuildMember {
                roles: string[]
              }
              const member = (await memberResponse.json()) as DiscordGuildMember
              userRoles = member.roles || []

              // Check if user has editor role
              isDocEditor = userRoles.includes(editorRoleId)

              console.log(`User ${user.username} roles:`, userRoles)
              console.log(`User ${user.username} is doc editor:`, isDocEditor)
            } else {
              console.warn(`Failed to fetch guild member roles for ${user.username}: ${memberResponse.status}`)
            }
          } catch (roleError) {
            console.error('Error fetching user roles:', roleError)
            // Don't fail auth if role fetch fails - just continue without role info
          }
        }
      } catch (error) {
        console.error('Error checking Discord server membership:', error)
        return sendRedirect(event, '/access-denied?reason=verification_failed')
      }
    }

    // Check if user is admin
    const isAdmin = adminUserIds.includes(user.id)

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
        isDiscordMember: true,
        roles: userRoles,
        isDocEditor,
        isAdmin
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
