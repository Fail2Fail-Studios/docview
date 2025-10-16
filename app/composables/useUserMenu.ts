export const useUserMenu = () => {
  const { user, displayName, logout } = useAuth()
  const colorMode = useColorMode()
  const { isLoading: isSyncing, performFullSync } = useFullSync()

  // Build the dropdown menu items structure
  const menuItems = computed(() => {
    if (!user.value) return []

    return [
      // Account section
      [
        {
          label: displayName.value || 'User',
          slot: 'account'
        }
      ],
      // Settings and actions
      [
        {
          label: 'Update Docs',
          icon: isSyncing.value ? 'i-lucide-loader-2' : 'i-lucide-refresh-cw',
          disabled: isSyncing.value,
          onClick: async () => {
            await performFullSync()
          }
        },
        {
          label: colorMode.value === 'dark' ? 'Light Mode' : 'Dark Mode',
          icon: colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon',
          onClick: () => {
            colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
          }
        }
      ],
      // Sign out section
      [
        {
          label: 'Sign Out',
          icon: 'i-lucide-log-out',
          onClick: async () => {
            console.log('Sign Out clicked!')
            await logout()
          }
        }
      ]
    ]
  })

  // Account slot data for template
  const accountSlotData = computed(() => ({
    name: displayName.value,
    email: user.value?.email
  }))

  return {
    menuItems,
    accountSlotData: readonly(accountSlotData)
  }
}
