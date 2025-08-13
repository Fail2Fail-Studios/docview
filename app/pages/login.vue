<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div class="text-center">
        <LogoPro class="mx-auto h-12 w-auto" />
        <h2 class="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
          Sign in to your account
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Sign in with Discord to access the documentation
        </p>

        <!-- Error Messages -->
        <UAlert
          v-if="errorMessage"
          color="red"
          variant="soft"
          :title="errorTitle"
          :description="errorMessage"
          class="mt-4"
        />
      </div>

      <!-- Login Form -->
      <UCard class="mt-8">
        <template #header>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            Login
          </h3>
        </template>

                <!-- Discord Login -->
        <div class="space-y-6">
          <UButton
            block
            size="xl"
            color="indigo"
            variant="solid"
            :loading="isLoading"
            :disabled="isLoading"
            @click="handleDiscordLogin"
            class="justify-center"
          >
            <template #leading>
              <Icon name="i-simple-icons-discord" class="w-5 h-5" />
            </template>
            {{ isLoading ? 'Connecting...' : 'Continue with Discord' }}
          </UButton>

          <div class="text-center">
            <p class="text-xs text-gray-500 dark:text-gray-400">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </UCard>

            <!-- Footer Info -->
      <div class="text-center">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          New users will automatically get an account created when signing in with Discord
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Meta
definePageMeta({
  layout: false,
  title: 'Login'
})

useSeoMeta({
  title: 'Login - F2F DocView',
  description: 'Sign in to access the F2F documentation platform with Discord'
})

// Reactive state
const isLoading = ref(false)
const route = useRoute()
const session = useUserSession()

// Auth composable
const { loginWithDiscord } = useAuth()

// Error handling
const errorMessages = {
  oauth_error: {
    title: 'Authentication Failed',
    message: 'There was an error with Discord authentication. Please try again.'
  },
  server_access_denied: {
    title: 'Access Denied',
    message: 'You must be a member of our Discord server to access this documentation.'
  },
  verification_failed: {
    title: 'Verification Failed',
    message: 'Unable to verify your Discord server membership. Please try again.'
  }
}

const errorCode = computed(() => route.query.error as string)
const errorTitle = computed(() => errorCode.value ? errorMessages[errorCode.value as keyof typeof errorMessages]?.title : '')
const errorMessage = computed(() => errorCode.value ? errorMessages[errorCode.value as keyof typeof errorMessages]?.message : '')

// Discord login handler
async function handleDiscordLogin() {
  isLoading.value = true

  try {
    await loginWithDiscord()
  } catch (error) {
    console.error('Discord login error:', error)
    // Error will be handled via URL redirect with error query param
  } finally {
    isLoading.value = false
  }
}

// If already authenticated (and has access), redirect to home
if (session.user.value && (session.user.value as any).isDiscordMember) {
  await navigateTo('/')
}

watch(
  () => (session.user.value as any)?.isDiscordMember,
  async (isMember) => {
    if (isMember) {
      await navigateTo('/')
    }
  }
)
</script>
