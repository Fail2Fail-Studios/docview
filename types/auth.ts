export interface DiscordUser {
  id: string
  email: string
  name: string
  avatar?: string
  discordId: string
  username: string
  discriminator: string
  isDiscordMember: boolean
}

export interface AuthSession {
  user: DiscordUser | null
  loggedIn: boolean
}

export interface UserMenuAction {
  label: string
  icon?: string
  onClick?: () => void | Promise<void>
}

export interface UserMenuSection {
  label?: string
  slot?: string
  actions?: UserMenuAction[]
}
