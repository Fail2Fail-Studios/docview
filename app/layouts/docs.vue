<script setup lang="ts">
const navigation = useSanitizedNavigation()
</script>

<template>
  <UContainer>
    <UPage>
      <template #left>
        <UPageAside>
          <UContentNavigation highlight :navigation="navigation" />
        </UPageAside>
      </template>
      <main>
        <slot />
      </main>
    </UPage>
  </UContainer>
</template>

<style>
#main-content ul {
  padding-left: 1rem;
  line-height: 1.5;
  list-style-type: disc;
}

#main-content ul li {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}
</style>
