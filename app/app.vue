<script setup lang="ts">
const { seo } = useAppConfig()

// Make navigation lazy to not block initial render
const { data: navigation } = useLazyAsyncData('navigation', () => queryCollectionNavigation('docs'))
const { data: files } = useLazyAsyncData('search', async () => {
  const sections = await queryCollectionSearchSections('docs')
  // Filter out H1 anchor sections (level 1 with hash) to avoid duplicates with page titles
  // Keep page entries (no hash) and H2-H6 sections (level > 1)
  return sections.filter(section => !(section.id?.includes('#') && section.level === 1))
}, {
  server: false
})

// Fetch version on server-side for SSR hydration
const { data: versionData } = await useAsyncData('app-version', () =>
  $fetch('/api/app-version')
)

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  titleTemplate: `%s - ${seo?.siteName}`,
  ogSiteName: seo?.siteName,
  twitterCard: 'summary_large_image'
})

provide('navigation', navigation)
provide('appVersion', versionData)
</script>

<template>
  <div>
    <NuxtLoadingIndicator />

    <AppHeader />

    <main>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </main>

    <AppFooter />

    <ClientOnly>
      <LazyUContentSearch
        :files="files"
        :navigation="navigation"
      />
    </ClientOnly>
  </div>
</template>
