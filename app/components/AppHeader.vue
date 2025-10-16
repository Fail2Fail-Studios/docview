<script setup lang="ts">
import type { Ref } from 'vue'
import type { ContentNavigationItem } from '@nuxt/content'

const navigation = inject<Ref<ContentNavigationItem[]>>('navigation')
const { header } = useAppConfig()

// Use composables for auth and menu logic
const { loggedIn, avatarUrl } = useAuth()
const { menuItems, accountSlotData } = useUserMenu()

// App version information
const { displayVersion, fetchVersionInfo, versionInfo, isLoading: isVersionLoading } = useAppVersion()

// Track if version has been fetched successfully
const showVersion = computed(() => versionInfo.value.lastUpdated !== null && !isVersionLoading.value)

// Fetch version info on mount
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
        >
        <div class="flex flex-col w-auto font-sans">
          <span class="text-xl font-bold text-primary-500 dark:text-primary-400">UNA</span>
          <span
            class="text-sm text-gray-500 dark:text-gray-500 transition-opacity duration-500"
            :class="showVersion ? 'opacity-100' : 'opacity-0'"
          >
            {{ displayVersion }}
          </span>
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

      <!-- Auth-dependent UI - client only to avoid hydration mismatch -->
      <ClientOnly>
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

        <!-- Fallback: Reserve space for auth buttons to prevent layout shift -->
        <template #fallback>
          <div class="flex items-center gap-1.5">
            <!-- Placeholder for editor button (8x8 = 32px) -->
            <div class="size-8" />
            <!-- Placeholder for avatar (8x8 = 32px) -->
            <div class="size-8" />
          </div>
        </template>
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
