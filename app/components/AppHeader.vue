<script setup lang="ts">
const navigation = useSanitizedNavigation()
const { header } = useAppConfig()
const { user, isLoggedIn, logout } = useAuth()

// User menu items for dropdown
const userMenuItems = computed(() => [
  [{
    label: user.value?.email || 'User',
    slot: 'account',
    disabled: true
  }],
  [{
    label: 'Profile',
    icon: 'i-lucide-user',
    click: () => navigateTo('/profile')
  }, {
    label: 'Settings',
    icon: 'i-lucide-settings',
    click: () => navigateTo('/settings')
  }],
  [{
    label: 'Sign out',
    icon: 'i-lucide-log-out',
    click: logout
  }]
])
</script>

<template>
  <UHeader
    :ui="{ center: 'flex-1' }"
    :to="header?.to || '/'"
  >
    <UContentSearchButton
      v-if="header?.search"
      :collapsed="false"
      class="w-full"
    />

    <template
      v-if="header?.logo?.dark || header?.logo?.light || header?.title"
      #title
    >
      <UColorModeImage
        v-if="header?.logo?.dark || header?.logo?.light"
        :light="header?.logo?.light!"
        :dark="header?.logo?.dark!"
        :alt="header?.logo?.alt"
        class="h-6 w-auto shrink-0"
      />

      <span v-else-if="header?.title">
        {{ header.title }}
      </span>
    </template>

    <template
      v-else
      #left
    >
      <NuxtLink :to="header?.to || '/'">
        <LogoPro class="w-auto h-6 shrink-0" />
      </NuxtLink>

      <TemplateMenu />
    </template>

    <template #right>
      <UContentSearchButton
        v-if="header?.search"
        class="lg:hidden"
      />

      <UColorModeButton v-if="header?.colorMode" />

      <template v-if="header?.links">
        <UButton
          v-for="(link, index) of header.links"
          :key="index"
          v-bind="{ color: 'neutral', variant: 'ghost', ...link }"
        />
      </template>

      <!-- Auth Section -->
      <UButton
        v-if="!isLoggedIn"
        to="/login"
        color="primary"
        variant="soft"
        size="sm"
        icon="i-lucide-log-in"
      >
        Sign In
      </UButton>

      <UDropdownMenu
        v-else
        :items="userMenuItems"
        :popper="{ placement: 'bottom-end' }"
      >
        <UAvatar
          :src="user?.avatar"
          :alt="user?.name || user?.email"
          size="sm"
          :icon="!user?.avatar ? 'i-lucide-user' : undefined"
          class="cursor-pointer"
        />

        <template #account="{ item }">
          <div class="text-left">
            <p class="truncate font-medium text-gray-900 dark:text-white">
              {{ user?.name || 'User' }}
            </p>
            <p class="truncate text-sm text-gray-500 dark:text-gray-400">
              {{ item.label }}
            </p>
          </div>
        </template>
      </UDropdownMenu>
    </template>

    <template #body>
      <UContentNavigation
        highlight
        :navigation="navigation"
      />
    </template>
  </UHeader>
</template>
