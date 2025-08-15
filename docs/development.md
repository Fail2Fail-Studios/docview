# Development Guidelines

This guide outlines the development practices, coding standards, and workflow conventions used in the F2F DocView project.

## Development Setup

### Prerequisites
- Node.js 18+ 
- PNPM (pinned to version 10.13.1)
- Discord application for OAuth testing

### Local Environment
```bash
# Clone and install
git clone <repository-url>
cd f2f-docview
pnpm install

# Environment configuration
cp .env.example .env.local
# Edit .env.local with your Discord OAuth credentials

# Start development server
pnpm dev
```

### Environment Variables
```bash
# Required for Discord authentication
NUXT_OAUTH_DISCORD_CLIENT_ID=your_client_id
NUXT_OAUTH_DISCORD_CLIENT_SECRET=your_client_secret
NUXT_REQUIRED_DISCORD_GUILD_ID=your_server_id
NUXT_AUTH_BASE_URL=http://localhost:3000
```

## Code Style & Standards

### TypeScript Guidelines
```typescript
// ✅ Prefer interfaces over types for extensibility
interface User {
  id: string
  name: string
  email: string
}

// ✅ Use explicit return types for exported functions
export function getUserData(): Promise<User> {
  return useFetch('/api/user')
}

// ✅ Avoid 'any' - use proper typing
interface ApiResponse<T> {
  data: T
  status: string
}

// ❌ Avoid enum, use const objects with unions
const UserRole = {
  ADMIN: 'admin',
  USER: 'user'
} as const
type UserRole = typeof UserRole[keyof typeof UserRole]
```

### Vue Component Standards
```vue
<!-- ✅ Use Composition API with script setup -->
<script setup lang="ts">
// Auto-imported composables (no manual imports needed)
const user = useUserSession()
const router = useRouter()
const { data } = await useFetch('/api/data')

// Explicit interface definitions
interface Props {
  title: string
  items?: string[]
}

// Use defineProps with TypeScript
const props = defineProps<Props>()

// Prefer computed over methods for derived state
const displayTitle = computed(() => props.title.toUpperCase())
</script>

<template>
  <!-- Use Nuxt UI components consistently -->
  <UCard>
    <template #header>
      <h2>{{ displayTitle }}</h2>
    </template>
    
    <UButton
      variant="solid"
      color="primary"
      @click="handleAction"
    >
      Action
    </UButton>
  </UCard>
</template>
```

### Nuxt 4 Conventions
```typescript
// ✅ Use app/ directory structure
app/
├── components/MyComponent.vue    // PascalCase files
├── composables/useMyFeature.ts   // use prefix for composables
├── middleware/auth.global.ts     // .global for global middleware
├── pages/[...slug].vue          // Dynamic routes
└── layouts/default.vue          // Layout files

// ✅ Leverage auto-imports
const user = useUserSession()     // No import needed
const { data } = await useFetch() // No import needed
const router = useRouter()        // No import needed

// ✅ Use proper aliases
import MyUtil from '~/utils/myUtil'  // Root alias
import Component from '@/components' // Same as ~
import AppComponent from 'app/components/App' // App alias
```

### Data Fetching Patterns
```typescript
// ✅ Use useFetch for SSR-compatible data fetching
const { data: posts } = await useFetch('/api/posts')

// ✅ Use lazy for non-critical data
const { data: comments } = await useLazyFetch('/api/comments', {
  server: false  // Client-only when appropriate
})

// ✅ Use useAsyncData for complex scenarios
const { data: userData } = await useAsyncData('user-profile', async () => {
  const user = await $fetch('/api/user')
  const preferences = await $fetch('/api/preferences')
  return { user, preferences }
})

// ✅ Use $fetch for client-side interactions
async function submitForm(data: FormData) {
  return await $fetch('/api/submit', {
    method: 'POST',
    body: data
  })
}
```

## File Organization

### Component Structure
```
app/components/
├── App/              # App-level components
│   ├── AppHeader.vue
│   └── AppFooter.vue
├── Content/          # Content-specific components
├── UI/              # Reusable UI components
└── Feature/         # Feature-specific components
```

### Composables Organization
```typescript
// app/composables/useAuth.ts
export function useAuth() {
  const { user, loggedIn } = useUserSession()
  
  const isAdmin = computed(() => user.value?.role === 'admin')
  
  return {
    user: readonly(user),
    loggedIn: readonly(loggedIn),
    isAdmin
  }
}

// app/composables/useContent.ts
export function useContentNavigation() {
  return useAsyncData('navigation', () => 
    queryCollectionNavigation('docs')
  )
}
```

## ESLint Configuration

The project uses ESLint v9 with Nuxt-specific rules:

```javascript
// eslint.config.mjs
export default defineEslintConfig({
  stylistic: {
    commaDangle: 'never',    // No trailing commas
    braceStyle: '1tbs'       // One true brace style
  }
})
```

### Common Lint Rules
```typescript
// ✅ No trailing commas
const config = {
  apiUrl: '/api',
  timeout: 5000 // No comma here
}

// ✅ One true brace style
if (condition) {
  doSomething()
} else {
  doSomethingElse()
}

// ✅ Consistent quote usage
const message = 'Use single quotes for strings'
```

## Testing Strategy

### Component Testing
```typescript
// Use @nuxt/test-utils for component testing
import { mountSuspended } from '@nuxt/test-utils/runtime'
import MyComponent from '~/components/MyComponent.vue'

test('component renders correctly', async () => {
  const component = await mountSuspended(MyComponent, {
    props: { title: 'Test Title' }
  })
  
  expect(component.text()).toContain('Test Title')
})
```

### API Testing
```typescript
// Test server API routes
import { describe, it, expect } from 'vitest'

describe('/api/auth', () => {
  it('requires authentication', async () => {
    const response = await $fetch('/api/protected', {
      headers: { authorization: 'Bearer invalid' }
    })
    
    expect(response.status).toBe(401)
  })
})
```

## Git Workflow

### Branch Naming
```bash
feature/discord-auth-improvements
bugfix/navigation-mobile-issue
docs/api-documentation
hotfix/security-patch
```

### Commit Messages
```bash
# ✅ Clear, descriptive commits
feat: add Discord server membership validation
fix: resolve mobile navigation overlay issue
docs: update authentication flow documentation
style: fix ESLint violations in auth middleware

# ❌ Avoid vague commits
fix: bug
update: stuff
misc: changes
```

### Pull Request Process
1. Create feature branch from `main`
2. Make changes following style guidelines
3. Run `pnpm lint` and `pnpm typecheck`
4. Test authentication flows thoroughly
5. Update documentation if needed
6. Submit PR with clear description

## Performance Considerations

### Bundle Optimization
```typescript
// ✅ Use dynamic imports for large components
const HeavyComponent = defineAsyncComponent(() => 
  import('~/components/HeavyComponent.vue')
)

// ✅ Lazy load non-critical data
const { data } = await useLazyFetch('/api/heavy-data', {
  server: false
})

// ✅ Use proper image optimization
<NuxtImage
  src="/large-image.jpg"
  width="800"
  height="600"
  format="webp"
  placeholder
/>
```

### SEO & Meta Tags
```typescript
// ✅ Use useSeoMeta for proper SEO
useSeoMeta({
  title: 'Page Title',
  description: 'Page description',
  ogImage: '/og-image.jpg'
})

// ✅ Use useHead for custom head elements
useHead({
  link: [
    { rel: 'canonical', href: 'https://example.com/page' }
  ]
})
```

## Common Patterns

### Error Handling
```typescript
// ✅ Graceful error handling
const { data, error } = await useFetch('/api/data')

if (error.value) {
  throw createError({
    statusCode: 500,
    statusMessage: 'Failed to load data'
  })
}
```

### Authentication Checks
```typescript
// ✅ Consistent auth pattern
const { user, loggedIn } = useUserSession()

if (!loggedIn.value) {
  throw createError({
    statusCode: 401,
    statusMessage: 'Authentication required'
  })
}
```

## Tools & Scripts

### Available Commands
```bash
pnpm dev          # Development server
pnpm build        # Production build
pnpm generate     # Static generation
pnpm preview      # Preview production build
pnpm lint         # Run ESLint
pnpm typecheck    # TypeScript checking
```

### Pre-commit Hooks
Consider setting up pre-commit hooks for:
- ESLint auto-fixing
- TypeScript checking
- Test running
- Formatting validation

This development approach ensures consistency, maintainability, and optimal performance while leveraging the full power of the Nuxt 4 ecosystem.
