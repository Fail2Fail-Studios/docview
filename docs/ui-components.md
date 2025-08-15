# UI/UX Patterns & Components

This document outlines the design system, component usage patterns, and styling conventions used throughout F2F DocView.

## Design System

### Color Palette
```typescript
// app/app.config.ts
ui: {
  colors: {
    primary: 'red',      // Main brand color
    neutral: 'neutral',  // Text and backgrounds
    discord: 'indigo'    // Discord-themed elements
  }
}
```

### Theme Configuration
```typescript
// nuxt.config.ts
ui: {
  theme: {
    colors: [
      'primary',
      'secondary', 
      'tertiary',
      'info',
      'success',
      'warning',
      'error',
      'discord'
    ]
  }
}
```

## Component Library

### Nuxt UI + Nuxt UI Pro
The project leverages both Nuxt UI (free) and Nuxt UI Pro (premium) components for a cohesive design system.

#### Core Components Used
- **UApp**: Main application wrapper
- **UHeader**: Site header with navigation
- **UMain**: Main content area
- **UContainer**: Content containers with responsive widths
- **UPage**: Page layout structure
- **UButton**: Interactive buttons
- **UCard**: Content cards
- **UAvatar**: User profile images
- **UDropdownMenu**: Dropdown interactions

#### Pro Components Used
- **UPageAside**: Sidebar navigation
- **UContentSearchButton**: Search functionality
- **UContentNavigation**: Dynamic navigation generation
- **UContentSearch**: Full-text search interface

## Layout Structure

### App-level Layout
```vue
<!-- app/app.vue -->
<template>
  <UApp>
    <NuxtLoadingIndicator />
    
    <AppHeader />
    
    <UMain>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UMain>
    
    <AppFooter />
    
    <ClientOnly>
      <LazyUContentSearch
        :files="files"
        :navigation="navigation"
      />
    </ClientOnly>
  </UApp>
</template>
```

### Documentation Layout
```vue
<!-- app/layouts/docs.vue -->
<template>
  <UContainer class="w-full">
    <UPage>
      <template #left>
        <UPageAside>
          <UContentNavigation :navigation="navigation" />
        </UPageAside>
      </template>
      
      <main>
        <slot />
      </main>
    </UPage>
  </UContainer>
</template>
```

## Header Component Pattern

### Structure & Features
```vue
<!-- app/components/AppHeader.vue -->
<template>
  <UHeader :ui="{ center: 'flex-1' }">
    <!-- Search (authenticated users only) -->
    <UContentSearchButton
      v-if="header?.search && loggedIn"
      :collapsed="false"
      class="w-full"
    />

    <!-- Logo/Title -->
    <template #title>
      <NuxtLink :to="header?.to || '/'">
        <UColorModeImage
          :light="header?.logo?.light!"
          :dark="header?.logo?.dark!"
          :alt="header?.logo?.alt"
          class="h-6 w-auto shrink-0"
        />
      </NuxtLink>
    </template>

    <!-- Right side actions -->
    <template #right>
      <UContentSearchButton class="lg:hidden" />
      <UColorModeButton v-if="header?.colorMode" />
      
      <!-- User dropdown -->
      <UDropdownMenu v-if="loggedIn" :items="userMenuItems">
        <UAvatar
          :src="user?.avatar"
          :alt="user?.name"
          size="sm"
          class="cursor-pointer"
        />
      </UDropdownMenu>
    </template>

    <!-- Mobile navigation -->
    <template #body>
      <UContentNavigation
        highlight
        :navigation="navigation"
      />
    </template>
  </UHeader>
</template>
```

### Responsive Design
- **Desktop**: Full search bar, logo, and user controls
- **Mobile**: Collapsed search, hamburger navigation
- **Dark/Light Mode**: Automatic theme switching with `UColorModeButton`

## Styling Conventions

### Tailwind CSS v4
```css
/* app/assets/css/main.css */
@import "tailwindcss";

/* Custom utilities and overrides */
```

### Component Styling
```vue
<style>
/* Content-specific styles */
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
</style>
```

## Footer Configuration

### Footer Structure
```typescript
// app/app.config.ts
footer: {
  credits: `Copyright © ${new Date().getFullYear()}`,
  colorMode: false,
  links: [
    {
      icon: 'i-simple-icons-nuxtdotjs',
      to: 'https://nuxt.com',
      target: '_blank',
      'aria-label': 'Nuxt Website'
    },
    {
      icon: 'i-simple-icons-discord',
      to: 'https://discord.com/invite/ps2h6QT',
      target: '_blank',
      'aria-label': 'Nuxt UI on Discord'
    }
    // Additional links...
  ]
}
```

### UI Pro Footer Customization
```typescript
uiPro: {
  footer: {
    slots: {
      root: 'border-t border-default',
      left: 'text-sm text-muted'
    }
  }
}
```

## Icon System

### Iconify Integration
```typescript
// nuxt.config.ts
icon: {
  provider: 'iconify'
}

// Available icon sets
dependencies: {
  "@iconify-json/lucide": "^1.2.57",
  "@iconify-json/simple-icons": "^1.2.43", 
  "@iconify-json/vscode-icons": "^1.2.23"
}
```

### Icon Usage Patterns
```vue
<!-- Lucide icons for UI elements -->
<UButton icon="i-lucide-log-out">
  Sign Out
</UButton>

<!-- Simple icons for brand logos -->
<ULink
  icon="i-simple-icons-github"
  to="https://github.com"
  target="_blank"
  aria-label="GitHub"
/>

<!-- VS Code icons for file types -->
<UIcon name="i-vscode-icons-file-type-vue" />
```

## Content Navigation

### Table of Contents Configuration
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
      },
      {
        icon: 'i-lucide-book-open',
        label: 'Nuxt UI Pro docs',
        to: 'https://ui.nuxt.com/getting-started/installation/pro/nuxt',
        target: '_blank'
      }
    ]
  }
}
```

## Search Interface

### Content Search Configuration
```vue
<!-- Lazy-loaded search component -->
<ClientOnly>
  <LazyUContentSearch
    :files="files"
    :navigation="navigation"
  />
</ClientOnly>

<script setup>
// Search data (client-side only)
const { data: files } = useLazyAsyncData('search', () => 
  queryCollectionSearchSections('docs'), {
    server: false
  }
)
</script>
```

### Search Button Integration
```vue
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

## Responsive Patterns

### Breakpoint Strategy
```vue
<!-- Mobile-first responsive design -->
<template>
  <div class="block lg:hidden">
    <!-- Mobile layout -->
  </div>
  
  <div class="hidden lg:block">
    <!-- Desktop layout -->
  </div>
</template>
```

### Container Patterns
```vue
<!-- Full-width container -->
<UContainer class="w-full">
  <UPage>
    <!-- Content with proper spacing -->
  </UPage>
</UContainer>
```

## Authentication UI States

### Conditional Rendering
```vue
<template>
  <!-- Show different content based on auth state -->
  <div v-if="loggedIn">
    <!-- Authenticated user content -->
    <UContentSearchButton />
    <UserDropdown />
  </div>
  
  <div v-else>
    <!-- Public/unauthenticated content -->
    <UButton to="/login">
      Sign In
    </UButton>
  </div>
</template>
```

### User Avatar Display
```vue
<UAvatar
  :src="user?.avatar"
  :alt="user?.name || user?.username"
  size="sm"
  class="cursor-pointer"
/>
```

## Dark Mode Support

### Automatic Theme Switching
```vue
<!-- Logo that adapts to theme -->
<UColorModeImage
  :light="header?.logo?.light!"
  :dark="header?.logo?.dark!"
  :alt="header?.logo?.alt"
  class="h-6 w-auto shrink-0"
/>

<!-- Manual theme toggle -->
<UColorModeButton v-if="header?.colorMode" />
```

### Color Mode Variables
```css
/* Automatic dark/light mode classes */
.text-gray-900.dark:text-white { }
.text-gray-500.dark:text-gray-400 { }
.border-default { /* Adapts to theme */ }
```

## Performance Considerations

### Lazy Loading
```vue
<!-- Lazy load heavy components -->
<ClientOnly>
  <LazyUContentSearch />
</ClientOnly>

<!-- Async component loading -->
const HeavyComponent = defineAsyncComponent(() => 
  import('~/components/HeavyComponent.vue')
)
```

### Image Optimization
```vue
<!-- Optimized logo images -->
<UColorModeImage
  :light="header?.logo?.light!"
  :dark="header?.logo?.dark!"
  :alt="header?.logo?.alt"
  class="h-6 w-auto shrink-0"
/>
```

## Accessibility Features

### ARIA Labels
```vue
<ULink
  icon="i-simple-icons-github"
  to="https://github.com"
  target="_blank"
  aria-label="GitHub Repository"
/>
```

### Semantic HTML
```vue
<template>
  <header>
    <nav aria-label="Main navigation">
      <!-- Navigation content -->
    </nav>
  </header>
  
  <main>
    <!-- Main content -->
  </main>
  
  <footer>
    <!-- Footer content -->
  </footer>
</template>
```

## Custom Components

### Extending Nuxt UI
```vue
<!-- Custom component extending UButton -->
<template>
  <UButton
    v-bind="$attrs"
    :variant="variant"
    :color="color"
    class="custom-button-extensions"
  >
    <slot />
  </UButton>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'solid' | 'outline' | 'ghost'
  color?: string
}

withDefaults(defineProps<Props>(), {
  variant: 'solid',
  color: 'primary'
})
</script>
```

This design system provides a cohesive, accessible, and responsive user experience while maintaining consistency with Nuxt UI's design principles and leveraging the full power of Tailwind CSS v4.
