<script setup lang="ts">
import type { Ref } from 'vue'
import type { ContentNavigationItem } from '@nuxt/content'

const navigation = inject<Ref<ContentNavigationItem[]>>('navigation')
const { header } = useAppConfig()

// Use composables for auth and menu logic
const { user, loggedIn, avatarUrl } = useAuth()
const { menuItems, accountSlotData } = useUserMenu()
</script>

<template>
  <UHeader :ui="{ center: 'flex-1', container: 'max-w-full' }">
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
        <NuxtPicture
          :src="$colorMode.value === 'dark' ? header?.logo?.dark! : header?.logo?.light!"
          :alt="header?.logo?.alt"
          class="h-6 w-auto shrink-0"
          sizes="sm:64px md:64px lg:64px"
          preset="logo"
          preload
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
      <UDropdownMenu
        v-if="loggedIn"
        :items="menuItems"
      >
        <UAvatar
          :src="avatarUrl"
          :alt="accountSlotData.name"
          size="sm"
          class="cursor-pointer"
        />

        <template #account="{ item }">
          <div class="text-left">
            <p class="font-medium text-gray-900 dark:text-white">
              {{ item.label }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ accountSlotData.email }}
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
