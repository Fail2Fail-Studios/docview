<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'
import { findPageHeadline } from '@nuxt/content/utils'

// Layout automatically uses default.vue

const route = useRoute()
const { toc } = useAppConfig()
const navigation = inject<Ref<ContentNavigationItem[]>>('navigation')

const { data: page } = await useAsyncData(route.path, () => queryCollection('docs').path(route.path).first())
if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

// Make surround lazy - it's nice-to-have, not critical for initial render
const { data: surround } = useLazyAsyncData(`${route.path}-surround`, () => {
  return queryCollectionItemSurroundings('docs', route.path, {
    fields: ['description']
  })
})

const title = page.value.seo?.title || page.value.title
const description = page.value.seo?.description || page.value.description

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description
})

const headline = computed(() => findPageHeadline(navigation?.value, page.value))

defineOgImageComponent('Docs', {
  headline: headline.value
})

const links = computed(() => {
  const links = []
  if (toc?.bottom?.edit) {
    links.push({
      icon: 'i-lucide-external-link',
      label: 'Edit this page',
      to: `${toc.bottom.edit}/${page?.value?.stem}.${page?.value?.extension}`,
      target: '_blank'
    })
  }

  return [...links, ...(toc?.bottom?.links || [])].filter(Boolean)
})

// TOC collapse state
const tocCollapsed = ref(false)

// Editor state
const { state: editorState, registerPresenceCallback, registerConfirmationCallback, disableEditor, save } = useEditor()

// Unsaved changes confirmation modal
const showUnsavedChangesModal = ref(false)
let unsavedChangesResolve: ((value: 'save' | 'discard' | 'cancel') => void) | null = null

const requestUnsavedChangesConfirmation = (): Promise<'save' | 'discard' | 'cancel'> => {
  return new Promise((resolve) => {
    unsavedChangesResolve = resolve
    showUnsavedChangesModal.value = true
  })
}

const handleUnsavedChangesChoice = (choice: 'save' | 'discard' | 'cancel') => {
  showUnsavedChangesModal.value = false
  if (unsavedChangesResolve) {
    unsavedChangesResolve(choice)
    unsavedChangesResolve = null
  }
}

// Reactive title and description for editor mode
const editableTitle = ref(page.value.title || '')
const editableDescription = ref(page.value.description || '')
const editableBody = ref('')

// Watch for changes from the editor state
watch(() => editorState.value.currentContent, (content) => {
  editableTitle.value = content.title
  editableDescription.value = content.description
  editableBody.value = content.body
}, { deep: true })

// Presence tracking
const presence = usePagePresence(route.path)
const currentEditor = computed(() => {
  const editorId = presence.editorUserId.value
  if (!editorId) return null
  return presence.viewers.value.find(v => v.id === editorId) ?? null
})

// Register callbacks with editor
onMounted(() => {
  registerPresenceCallback(presence.setIsEditing)
  registerConfirmationCallback(requestUnsavedChangesConfirmation)

  // Global Esc handler to close editor
  const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && editorState.value.isEnabled) {
      // Only close editor if not actively editing an input/textarea
      // Allow Esc from the main content editor (Toast UI) to trigger modal
      const activeElement = document.activeElement
      const isEditingTitleOrDescription =
        (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') &&
        (activeElement?.closest('[data-editable-title]') || activeElement?.closest('[data-editable-description]'))

      // If editing title or description, let their own Esc handlers deal with it
      if (isEditingTitleOrDescription) {
        return
      }

      // Otherwise, try to close the editor (will show modal if dirty)
      disableEditor()
    }
  }

  window.addEventListener('keydown', handleEscapeKey)

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleEscapeKey)
  })
})

// Clean up editor state when navigating away from the page
onBeforeUnmount(async () => {
  // Force disable editor without confirmation on navigation
  if (editorState.value.isEnabled) {
    await disableEditor(true)
  }
})
</script>

<template>
  <UPage
    v-if="page"
    :ui="{
      root: 'flex flex-col lg:grid lg:grid-cols-12 lg:gap-4',
      left: 'lg:col-span-3',
      center: tocCollapsed ? 'lg:col-span-12' : 'lg:col-span-9',
      right: 'lg:col-span-3 order-first lg:order-last'
    }"
  >
    <!-- Always render normal view for SSR, then show editor mode on client if enabled -->
    <UPageHeader
      v-show="!editorState.isEnabled"
      :title="page.title"
      :description="page.description"
      :links="page.links"
      :headline="headline"
    />

    <UPageBody
      v-show="!editorState.isEnabled"
      id="main-content"
    >
      <ContentRenderer
        v-if="page"
        :value="page"
      />

      <USeparator v-if="surround?.length" />

      <UContentSurround :surround="surround" />
    </UPageBody>

    <!-- Editor Mode - Client Only -->
    <ClientOnly>
      <div
        v-if="editorState.isEnabled"
        class="space-y-4 px-4 py-6"
      >
        <EditorEditableTitle
          v-model="editableTitle"
          :editor-enabled="editorState.isEnabled"
        />
        <EditorEditableDescription
          v-model="editableDescription"
          :editor-enabled="editorState.isEnabled"
        />
        <div class="mt-6">
          <EditorContentEditor
            v-model="editableBody"
          />
        </div>
      </div>
    </ClientOnly>

    <template
      v-if="page?.body?.toc?.links?.length && !editorState.isEnabled"
      #right
    >
      <!-- TOC Expanded View -->
      <div
        v-if="!tocCollapsed"
        class="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden"
      >
        <!-- TOC Collapse Toggle -->
        <div class="relative">
          <UButton
            icon="i-lucide-chevron-right"
            variant="ghost"
            size="xs"
            :aria-label="'Collapse table of contents'"
            class="absolute -left-6 top-0 z-10"
            @click="tocCollapsed = true"
          />
        </div>

        <UContentToc
          :title="toc?.title"
          :links="page.body?.toc?.links"
        >
          <template
            v-if="toc?.bottom"
            #bottom
          >
            <div
              class="hidden lg:block space-y-6"
              :class="{ '!mt-6': page.body?.toc?.links?.length }"
            >
              <USeparator
                v-if="page.body?.toc?.links?.length"
                type="dashed"
              />

              <UPageLinks
                :title="toc.bottom.title"
                :links="links"
              />
            </div>
          </template>
        </UContentToc>
        <ClientOnly>
          <CurrentPageViewers
            :viewers="presence.viewers.value"
            :editor="currentEditor"
          />
        </ClientOnly>
      </div>

      <!-- TOC Collapsed View -->
      <div
        v-else
        class="sticky top-16"
      >
        <UButton
          icon="i-lucide-chevron-left"
          variant="ghost"
          size="xs"
          :aria-label="'Expand table of contents'"
          class="ml-2"
          @click="tocCollapsed = false"
        />
      </div>
    </template>
  </UPage>

  <!-- Unsaved Changes Confirmation Modal -->
  <UModal
    v-model="showUnsavedChangesModal"
    :dismissible="false"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20">
          <UIcon
            name="i-lucide-alert-triangle"
            class="w-6 h-6 text-amber-600 dark:text-amber-400"
          />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Unsaved Changes
        </h3>
      </div>
    </template>

    <template #body>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        You have unsaved changes. What would you like to do?
      </p>
    </template>

    <template #footer>
      <div class="flex flex-col gap-2 sm:flex-row-reverse">
        <UButton
          color="green"
          icon="i-lucide-save"
          label="Save & Close"
          size="sm"
          @click="handleUnsavedChangesChoice('save')"
        />
        <UButton
          color="red"
          variant="soft"
          icon="i-lucide-trash-2"
          label="Discard Changes"
          size="sm"
          @click="handleUnsavedChangesChoice('discard')"
        />
        <UButton
          color="gray"
          variant="ghost"
          label="Cancel"
          size="sm"
          @click="handleUnsavedChangesChoice('cancel')"
        />
      </div>
    </template>
  </UModal>
</template>
