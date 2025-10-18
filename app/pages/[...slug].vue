<script setup lang="ts">
import type { ContentNavigationItem } from "@nuxt/content";
import { findPageHeadline } from "@nuxt/content/utils";

// ===== Content Loading and SEO =====
const route = useRoute();
const { toc } = useAppConfig();
const navigation = inject<Ref<ContentNavigationItem[]>>("navigation");

// Fetch page content
const { data: page } = await useAsyncData(route.path, () =>
  queryCollection("docs").path(route.path).first(),
);
if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: "Page not found",
    fatal: true,
  });
}

// Lazy-load surrounding pages for navigation (non-critical)
const { data: surround } = useLazyAsyncData(`${route.path}-surround`, () => {
  return queryCollectionItemSurroundings("docs", route.path, {
    fields: ["description"],
  });
});

// SEO metadata
const title = page.value.seo?.title || page.value.title;
const description = page.value.seo?.description || page.value.description;

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description,
});

const headline = computed(() =>
  findPageHeadline(navigation?.value, page.value),
);

defineOgImageComponent("Docs", {
  headline: headline.value,
});

// ===== Computed Properties =====

const links = computed(() => {
  const links = [];
  if (toc?.bottom?.edit) {
    links.push({
      icon: "i-lucide-external-link",
      label: "Edit this page",
      to: `${toc.bottom.edit}/${page?.value?.stem}.${page?.value?.extension}`,
      target: "_blank",
    });
  }

  return [...links, ...(toc?.bottom?.links || [])].filter(Boolean);
});

// ===== Editor State =====
// Editor composable now handles navigation blocking, keyboard shortcuts, and modal logic
const {
  state: editorState,
  registerPresenceCallback,
  showUnsavedChangesModal,
  handleUnsavedChangesChoice
} = useEditor();

// Editable content refs (synced with editor state)
const editableTitle = ref(page.value.title || "");
const editableDescription = ref(page.value.description || "");
const editableBody = ref("");

watch(
  () => editorState.value.currentContent,
  (content) => {
    editableTitle.value = content.title;
    editableDescription.value = content.description;
    editableBody.value = content.body;
  },
  { deep: true },
);

// ===== Presence Tracking =====
// Track who is viewing/editing this page
const presence = usePagePresence(route.path);
const currentEditor = computed(() => {
  const editorId = presence.editorUserId.value;
  if (!editorId) return null;
  return presence.viewers.value.find((v) => v.id === editorId) ?? null;
});

// ===== Layout Integration =====
// Share TOC and viewer data with layout via useState (only serializable data)
const sharedTocData = useState('tocData', () => null as any)

watchEffect(() => {
  if (page.value) {
    sharedTocData.value = {
      hasToc: !!page.value?.body?.toc?.links?.length,
      tocLinks: page.value?.body?.toc?.links,
      tocTitle: toc?.title,
      tocBottom: toc?.bottom,
      links: links.value,
      viewers: presence.viewers.value,
      currentEditor: currentEditor.value,
      isEditorEnabled: editorState.value.isEnabled
    }
  }
})

// ===== Lifecycle =====
// Connect presence tracking to editor on mount
onMounted(() => {
  registerPresenceCallback(presence.setIsEditing);
});
</script>

<template>
  <UPage
    v-if="page"
    :ui="{
      root: 'flex flex-col lg:grid lg:grid-cols-12 lg:gap-4',
      left: 'lg:col-span-3',
      center: 'lg:col-span-9',
      right: 'lg:col-span-3 order-first lg:order-last',
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

<<<<<<< HEAD
    <UPageBody v-show="!editorState.isEnabled" id="main-content">
      <ContentRenderer v-if="page" :value="page" />
=======
    <UPageBody
      v-show="!editorState.isEnabled"
      id="main-content"
      class="ml-4"
    >
      <ContentRenderer
        v-if="page"
        :value="page"
      />
>>>>>>> 7013010 (fix(page): add left margin to main content for improved layout)

      <USeparator v-if="surround?.length" />

      <UContentSurround :surround="surround" />
    </UPageBody>

    <!-- Editor Mode - Client Only -->
    <ClientOnly>
      <div v-if="editorState.isEnabled" class="space-y-4 px-4 py-6">
        <EditorEditableTitle
          v-model="editableTitle"
          :editor-enabled="editorState.isEnabled"
        />
        <EditorEditableDescription
          v-model="editableDescription"
          :editor-enabled="editorState.isEnabled"
        />
        <div class="mt-6">
          <EditorContentEditor v-model="editableBody" />
        </div>
      </div>
    </ClientOnly>

    <template
      v-if="page?.body?.toc?.links?.length && !editorState.isEnabled"
      #right
    >
      <aside class="flex flex-col lg:col-span-3 right-0">
        <CurrentPageViewers :editor="currentEditor" :viewers="presence.viewers.value ?? []" />
        <UContentToc :title="toc?.title" :links="page.body?.toc?.links" />
      </aside>
    </template>
  </UPage>

  <!-- Unsaved Changes Modal -->
  <UModal v-model:open="showUnsavedChangesModal" :dismissible="false">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20">
          <UIcon name="i-lucide-alert-triangle" class="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 class="text-lg font-semibold">Unsaved Changes</h3>
      </div>
    </template>

    <template #body>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        You have unsaved changes. What would you like to do?
      </p>
    </template>

    <template #footer>
      <div class="flex flex-col gap-2 sm:flex-row-reverse">
        <UButton color="green" icon="i-lucide-save" label="Save & Close" size="sm" @click="handleUnsavedChangesChoice('save')" />
        <UButton color="red" variant="soft" icon="i-lucide-trash-2" label="Discard Changes" size="sm" @click="handleUnsavedChangesChoice('discard')" />
        <UButton color="gray" variant="ghost" label="Cancel" size="sm" @click="handleUnsavedChangesChoice('cancel')" />
      </div>
    </template>
  </UModal>
</template>
