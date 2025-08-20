export const useUserMenu = () => {
  const { user, displayName, logout } = useAuth()

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
      // Actions section
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
