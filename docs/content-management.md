# Content Management

This document explains how F2F DocView handles content management using Nuxt Content, including markdown processing, content collections, navigation generation, and search functionality.

## Nuxt Content Overview

### Configuration
```typescript
// nuxt.config.ts
modules: ['@nuxt/content']

content: {
  build: {
    markdown: {
      toc: {
        searchDepth: 1  // Optimize TOC generation for performance
      }
    }
  }
}
```

### Content Collections
```typescript
// content.config.ts
export default defineContentConfig({
  collections: {
    landing: defineCollection({
      type: 'page',
      source: 'index.md'  // Homepage content
    }),
    docs: defineCollection({
      type: 'page',
      source: {
        include: '**',      // All markdown files
        exclude: ['index.md']  // Except homepage
      },
      schema: z.object({
        links: z.array(z.object({
          label: z.string(),
          icon: z.string(),
          to: z.string(),
          target: z.string().optional()
        })).optional()
      })
    })
  }
})
```

## Content Structure

### Directory Organization
```
content/
├── index.md              # Homepage content
├── getting-started/
│   ├── index.md
│   ├── installation.md
│   └── configuration.md
├── guides/
│   ├── authentication.md
│   └── deployment.md
└── api/
    ├── components.md
    └── composables.md
```

### Frontmatter Schema
```yaml
---
title: "Page Title"
description: "Page description for SEO"
navigation:
  title: "Nav Title"  # Optional: different title in navigation
  order: 1           # Optional: custom ordering
links:               # Optional: page-specific links
  - label: "External Resource"
    icon: "i-lucide-external-link"
    to: "https://example.com"
    target: "_blank"
---

# Page Content

Your markdown content here...
```

## Navigation System

### Automatic Navigation Generation
```typescript
// app/app.vue
const { data: navigation } = await useAsyncData('navigation', () => 
  queryCollectionNavigation('docs')
)

// Provide navigation to all components
provide('navigation', navigation)
```

### Navigation Usage in Components
```vue
<!-- app/components/AppHeader.vue -->
<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'

const navigation = inject<Ref<ContentNavigationItem[]>>('navigation')
</script>

<template>
  <UHeader>
    <template #body>
      <UContentNavigation
        highlight
        :navigation="navigation"
      />
    </template>
  </UHeader>
</template>
```

### Sidebar Navigation
```vue
<!-- app/layouts/docs.vue -->
<template>
  <UPageAside>
    <UContentNavigation :navigation="navigation" />
  </UPageAside>
</template>
```

## Search Functionality

### Search Data Collection
```typescript
// app/app.vue
const { data: files } = useLazyAsyncData('search', () => 
  queryCollectionSearchSections('docs'), {
    server: false  // Client-side only for better performance
  }
)
```

### Search Interface
```vue
<!-- app/app.vue -->
<ClientOnly>
  <LazyUContentSearch
    :files="files"
    :navigation="navigation"
  />
</ClientOnly>
```

### Search Button Integration
```vue
<!-- app/components/AppHeader.vue -->
<!-- Desktop search bar -->
<UContentSearchButton
  v-if="header?.search && loggedIn"
  :collapsed="false"
  class="w-full"
/>

<!-- Mobile search button -->
<UContentSearchButton
  v-if="header?.search"
  class="lg:hidden"
/>
```

## MDC (Markdown Components)

### Built-in Components
Nuxt Content provides MDC (Markdown Components) that allow you to use Vue components directly in markdown:

```markdown
<!-- Using Nuxt UI components in markdown -->
::card{title="Important Note"}
This is a highlighted note using a Card component.
::

::button-link{to="/getting-started"}
Get Started
::

<!-- Code blocks with syntax highlighting -->
```typescript
const user = useUserSession()
```

<!-- Callouts and alerts -->
::alert{type="warning"}
Make sure to configure your environment variables!
::
```

### Custom Components
You can create custom components for use in markdown:

```vue
<!-- components/content/CustomCallout.vue -->
<template>
  <div class="custom-callout" :class="type">
    <div class="callout-title">
      <UIcon :name="icon" />
      {{ title }}
    </div>
    <div class="callout-content">
      <ContentSlot :use="$slots.default" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: 'info' | 'warning' | 'error'
  title: string
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  icon: 'i-lucide-info'
})
</script>
```

Usage in markdown:
```markdown
::custom-callout{title="Pro Tip" type="info"}
This is a custom callout component used in markdown.
::
```

## Content Queries

### Available Query Functions
```typescript
// Navigation queries
const navigation = await queryCollectionNavigation('docs')

// Search sections
const searchSections = await queryCollectionSearchSections('docs')

// Get specific content
const page = await queryContent('/path/to/page').findOne()

// List content with filtering
const posts = await queryContent('/blog')
  .where({ published: true })
  .sort({ date: -1 })
  .find()
```

### Advanced Querying
```typescript
// In pages or components
const { data: page } = await useAsyncData('page-content', () =>
  queryContent()
    .where({ _path: useRoute().path })
    .findOne()
)

// With error handling
const { data: content, error } = await useAsyncData('content', async () => {
  try {
    return await queryContent('/api/reference').find()
  } catch (err) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Content not found'
    })
  }
})
```

## Dynamic Pages

### Catch-all Route
```vue
<!-- app/pages/[...slug].vue -->
<script setup lang="ts">
// Get the current route path
const route = useRoute()
const path = Array.isArray(route.params.slug) 
  ? '/' + route.params.slug.join('/') 
  : '/'

// Fetch content for this path
const { data: page } = await useAsyncData(`content-${path}`, () =>
  queryContent()
    .where({ _path: path })
    .findOne()
)

// Handle 404 for missing content
if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found'
  })
}

// SEO meta
useSeoMeta({
  title: page.value.title,
  description: page.value.description
})
</script>

<template>
  <NuxtLayout name="docs">
    <UPageHeader
      :title="page.title"
      :description="page.description"
    />
    
    <UPageBody>
      <UPageGrid>
        <UPageCard>
          <ContentRenderer :value="page" />
        </UPageCard>
        
        <template #right>
          <UContentToc
            v-if="page.body?.toc"
            :links="page.body.toc.links"
          />
        </template>
      </UPageGrid>
    </UPageBody>
  </NuxtLayout>
</template>
```

## Table of Contents

### Automatic TOC Generation
```typescript
// content.config.ts - TOC configuration
content: {
  build: {
    markdown: {
      toc: {
        searchDepth: 1  // Only h1 and h2 headers
      }
    }
  }
}
```

### TOC Display Configuration
```typescript
// app/app.config.ts
toc: {
  title: 'Table of Contents',
  bottom: {
    title: 'Community',
    edit: 'https://github.com/nuxt-ui-pro/docs/edit/main/content',
    links: [
      {
        icon: 'i-lucide-star',
        label: 'Star on GitHub',
        to: 'https://github.com/nuxt/ui',
        target: '_blank'
      }
    ]
  }
}
```

### TOC Usage in Templates
```vue
<template>
  <UContentToc
    v-if="page.body?.toc"
    :links="page.body.toc.links"
  />
</template>
```

## Content Styling

### Global Content Styles
```css
/* app/layouts/docs.vue */
#main-content ul,
#main-content ol {
  padding-left: 1rem;
}

#main-content ul {
  list-style-type: disc;
}

#main-content ol {
  list-style-type: decimal;
}

#main-content li {
  line-height: 1.8;
}
```

### Prose Styling
Nuxt Content automatically applies prose styling for readable content:
- Typography scaling
- Code block styling
- Link styling
- List formatting

## SEO Integration

### Automatic Meta Tags
```vue
<script setup lang="ts">
// Page-level SEO
useSeoMeta({
  title: page.value.title,
  description: page.value.description,
  ogTitle: page.value.title,
  ogDescription: page.value.description,
  ogImage: page.value.ogImage || '/default-og.jpg'
})
</script>
```

### Site-level Configuration
```typescript
// app/app.config.ts
seo: {
  siteName: 'F2F DocView'
}
```

```vue
<!-- app/app.vue -->
<script setup lang="ts">
const { seo } = useAppConfig()

useSeoMeta({
  titleTemplate: `%s - ${seo?.siteName}`,
  ogSiteName: seo?.siteName,
  twitterCard: 'summary_large_image'
})
</script>
```

## Content Performance

### Lazy Loading
```typescript
// Lazy load search data
const { data: files } = useLazyAsyncData('search', () => 
  queryCollectionSearchSections('docs'), {
    server: false
  }
)
```

### Caching Strategy
```typescript
// Cache navigation data
const { data: navigation } = await useAsyncData('navigation', () => 
  queryCollectionNavigation('docs')
)
```

### Static Generation
```typescript
// nuxt.config.ts - Prerender configuration
nitro: {
  prerender: {
    routes: ['/'],
    crawlLinks: true,      // Crawl all content links
    autoSubfolderIndex: false
  }
}
```

## Best Practices

### Content Organization
1. Use meaningful directory structure that reflects site navigation
2. Keep related content grouped together
3. Use consistent frontmatter across similar content types
4. Optimize images and use appropriate formats

### Performance
1. Use lazy loading for non-critical content
2. Cache frequently accessed data
3. Optimize markdown processing with appropriate TOC depth
4. Prerender important pages

### SEO
1. Always include title and description in frontmatter
2. Use descriptive file names and URLs
3. Create meaningful navigation hierarchies
4. Include OG images for social sharing

### Development Workflow
1. Test content changes in development
2. Validate frontmatter schema
3. Check navigation generation
4. Verify search functionality

This content management system provides a robust foundation for creating, organizing, and presenting documentation with excellent developer experience and user performance.
