<template>
  <div class="min-h-[calc(100vh-(var(--ui-header-height)*2))] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div class="text-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 418.9 203.75" class="fill-black dark:fill-white pb-12">
          <path d="M44.59,0L0,203.75h86.33l18.92-85.96h28.75l-18.81,85.96h201.52l18.92-85.96h57.61L418.9,0H44.59ZM374.61,71.51l-4.72,21.06h-57.66l-18.55,85.96h-28.91l33.58-153.3h86.42l-4.7,21.06h-57.4l-5.53,25.22h57.47ZM162.72,117.79h.14l5.76-26.45h57.5l9.84-45.06h-28.78l-4.06,19.84h-28.86l7.59-35.57,1.16-5.33h86.43l-19.32,87.18h-57.32l-9.84,45.06h28.71l4.33-19.84h28.63l-8.52,39.9-.22,1h-86.48l13.29-60.73ZM34.38,178.52L67.96,25.22h86.31l-4.61,21.06h-57.38l-5.53,25.22h57.38l-3.79,17.34-.83,3.72h-57.66l-18.55,85.96h-28.91Z"/>
        </svg>
        <h2 class="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
          Please login to continue
        </h2>

        <!-- Error Messages -->
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          :title="errorTitle"
          :description="errorMessage"
          class="mt-4"
        />
      </div>

      <!-- Login Form -->
      <UCard class="mt-8">
        <div class="space-y-6">
          <!-- Discord Login -->
          <UButton
            block
            size="xl"
            color="discord"
            variant="solid"
            :loading="isLoading"
            :disabled="isLoading"
            class="justify-center text-white cursor-pointer"
            @click="handleDiscordLogin"
          >
            <template #leading>
              <Icon
                name="i-simple-icons-discord"
                class="w-5 h-5"
              />
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
const { user } = useUserSession()

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
    // Redirect to Discord OAuth endpoint provided by nuxt-auth-utils
    await navigateTo('/api/auth/discord', { external: true })
  } catch (error) {
    console.error('Discord login error:', error)
    // Error will be handled via URL redirect with error query param
  } finally {
    isLoading.value = false
  }
}

// Cast user to include Discord member property
interface AuthUser {
  isDiscordMember?: boolean
}

// If already authenticated (and has access), redirect to home
if ((user.value as AuthUser)?.isDiscordMember) {
  await navigateTo('/')
}

watch(
  () => (user.value as AuthUser)?.isDiscordMember,
  async (isMember) => {
    if (isMember) {
      await navigateTo('/')
    }
  }
)
</script>
