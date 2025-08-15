<script setup lang="ts">
import type { Ref } from 'vue'
import type { ContentNavigationItem } from '@nuxt/content'

// Extended user interface for Discord auth
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

const navigation = inject<Ref<ContentNavigationItem[]>>('navigation')
const { header } = useAppConfig()
const { user: rawUser, loggedIn, clear } = useUserSession()

// Type-safe user with Discord properties
const user = computed(() => rawUser.value as DiscordUser | null)

// Simple logout handler that uses nuxt-auth-utils properly
async function handleLogout() {
  console.log('handleLogout called')
  await clear()
  await navigateTo('/login')
}

// Handle dropdown menu selection - not needed with onClick pattern
</script>

<template>
  <UHeader :ui="{ center: 'flex-1' }">
    <UContentSearchButton
      v-if="header?.search && loggedIn"
      :collapsed="false"
      class="w-full"
    />

    <template #title>
      <NuxtLink
        v-if="header?.logo?.dark || header?.logo?.light"
        :to="header?.to || '/'"
      >
        <UColorModeImage
          :light="header?.logo?.light!"
          :dark="header?.logo?.dark!"
          :alt="header?.logo?.alt"
          class="h-6 w-auto shrink-0"
        />
      </NuxtLink>

      <span v-else-if="header?.title">
        {{ header.title }}
      </span>
    </template>

    <template #right>
      <UContentSearchButton
        v-if="header?.search"
        class="lg:hidden"
      />

      <UColorModeButton v-if="header?.colorMode" />

      <!-- Auth Section -->
      <UButton
        v-if="!loggedIn"
        to="/login"
        color="neutral"
        variant="soft"
        size="sm"
        icon="i-lucide-log-in"
      >
        Sign In
      </UButton>

      <UDropdownMenu
        v-else
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
              onClick: () => {
                console.log('Sign Out clicked!');
                handleLogout();
              }
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
    </template>

    <template #body>
      <UContentNavigation
        highlight
        :navigation="navigation"
      />
    </template>
  </UHeader>
</template>
