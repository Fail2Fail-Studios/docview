<script setup lang="ts">
// Check authentication - the global middleware will handle this
// but we check here too for extra safety on the main page

const { data: page } = await useAsyncData('index', () => queryCollection('landing').path('/').first())
if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const title = page.value.seo?.title || page.value.title
const description = page.value.seo?.description || page.value.description

useSeoMeta({
  titleTemplate: '',
  title,
  ogTitle: title,
  description,
  ogDescription: description,
  ogImage: 'https://assets.hub.nuxt.com/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJodHRwczovL2RvY3MtdGVtcGxhdGUubnV4dC5kZXYiLCJpYXQiOjE3Mzk0NjM0MTd9.ltVAqPgKG38O01X1zl6MXfrJc55nf9OewXNFjpZ_2JY.jpg?theme=light',
  twitterImage: 'https://assets.hub.nuxt.com/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJodHRwczovL2RvY3MtdGVtcGxhdGUubnV4dC5kZXYiLCJpYXQiOjE3Mzk0NjM0MTd9.ltVAqPgKG38O01X1zl6MXfrJc55nf9OewXNFjpZ_2JY.jpg?theme=light'
})
</script>

<template>
  <UPage>
    <UPageBody class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <ContentRenderer
        v-if="page"
        id="main-content"
        :prose="false"
        :value="page"
      />
    </UPageBody>
  </UPage>
</template>
