<script setup lang="ts">
import type { Ref } from 'vue'
import type { ContentNavigationItem } from '@nuxt/content'

const navigation = inject<Ref<ContentNavigationItem[]>>('navigation')
const { header } = useAppConfig()
const { loggedIn, clear } = useUserSession()

// Simple logout handler that uses nuxt-auth-utils properly
async function handleLogout() {
  await clear()
  await navigateTo('/login')
}
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
        color="primary"
        variant="soft"
        size="sm"
        icon="i-lucide-log-in"
      >
        Sign In
      </UButton>

      <UButton
        v-else
        color="primary"
        variant="soft"
        size="sm"
        icon="i-lucide-log-out"
        @click="handleLogout"
      >
        Sign Out
      </UButton>
    </template>

    <template #body>
      <UContentNavigation
        highlight
        :navigation="navigation"
      />
    </template>
  </UHeader>
</template>
