<script setup lang="ts">
definePageMeta({
  layout: false,
  title: 'Access denied'
})

useSeoMeta({
  title: 'Access denied',
  description: 'You must be a member of the required Discord server to access this site.'
})

const route = useRoute()
const reason = computed(() => route.query.reason as string | undefined)

const { public: publicConfig } = useRuntimeConfig()
const discordClientId = publicConfig.oauthDiscordClientId
const authBaseUrl = publicConfig.authBaseUrl

const reauthUrl = computed(() => `${authBaseUrl}/api/auth/discord`)
</script>

<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 text-center">
      <LogoPro class="mx-auto h-12 w-auto" />
      <h1 class="mt-6 text-3xl font-bold text-gray-900 dark:text-white">Access denied</h1>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
        You must be a member of our Discord server to access this site.
        <span v-if="reason === 'verification_failed'"> We couldn't verify your membership. Please try again.</span>
      </p>

      <div class="mt-6">
        <UButton
          :to="reauthUrl"
          external
          size="lg"
          color="indigo"
          icon="i-simple-icons-discord"
        >
          Re-authenticate with Discord
        </UButton>
      </div>

      <div class="mt-4">
        <UButton to="/login" variant="ghost" color="neutral">Back to login</UButton>
      </div>
    </div>
  </div>
</template>


