<script setup lang="ts">
import type { Ref } from 'vue'
import type { ContentNavigationItem } from '@nuxt/content'

const navigation = inject<Ref<ContentNavigationItem[]>>('navigation')
const { header } = useAppConfig()

// Use composables for auth and menu logic
const { loggedIn, avatarUrl } = useAuth()
const { menuItems, accountSlotData } = useUserMenu()

// Full sync functionality (git pull + content sync)
const {
  isLoading: isSyncing,
  performFullSync,
  lastCheckedFormatted,
  currentStep
} = useFullSync()

// App version information
const { displayVersion, fetchVersionInfo } = useAppVersion()

// Fetch version info on component mount
onMounted(() => {
  fetchVersionInfo()
})
</script>

<template>
  <UHeader :ui="{ center: 'flex-1', container: 'max-w-full' }">
    <!-- Search in center - client only to avoid hydration mismatch with auth state -->
    <ClientOnly>
      <UContentSearchButton
        v-if="header?.search && loggedIn"
        :collapsed="false"
        class="w-full"
      />
    </ClientOnly>

    <template #title>
      <NuxtLink
        v-if="header?.logo?.dark || header?.logo?.light"
        :to="header?.to || '/'"
        class="flex items-center justify-center gap-2"
      >
        <img
          :src="$colorMode.value === 'dark' ? header?.logo?.dark! : header?.logo?.light!"
          :alt="header?.logo?.alt || 'Logo'"
          class="h-6 min-h-[31px] w-auto shrink-0 mr-2"
        />
        <div class="flex flex-col w-auto font-sans">
          <span class="text-md text-primary-500 dark:text-primary-400">UNA</span>
          <span class="text-sm text-gray-500 dark:text-gray-500">{{ displayVersion }}</span>
        </div>
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

      <!-- Auth-dependent UI - client only to avoid hydration mismatch -->
      <ClientOnly>
        <!-- Full Sync Button -->
        <UButton
          v-if="loggedIn"
          :icon="isSyncing ? 'i-lucide-loader-2' : 'i-lucide-refresh-cw'"
          variant="ghost"
          size="sm"
          :loading="isSyncing"
          :disabled="isSyncing"
          :aria-label="currentStep || 'Update Docs'"
          :title="
            currentStep || `Update Docs | Last checked: ${lastCheckedFormatted}`
          "
          @click="() => performFullSync()"
        />

        <!-- Editor Toggle Button -->
        <EditorToggleButton v-if="loggedIn" />

        <!-- Auth Section -->
        <UDropdownMenu
          v-if="loggedIn"
          :items="menuItems"
        >
          <UAvatar
            :src="avatarUrl || undefined"
            :alt="accountSlotData.name || undefined"
            size="sm"
            class="cursor-pointer"
          />

          <template #account>
            <div class="text-left">
              <p class="font-medium text-gray-900 dark:text-white">
                {{ accountSlotData.name }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ accountSlotData.email }}
              </p>
            </div>
          </template>
        </UDropdownMenu>
      </ClientOnly>
    </template>

    <template #body>
      <UContentNavigation
        highlight
        :navigation="navigation"
      />
    </template>
  </UHeader>
</template>
