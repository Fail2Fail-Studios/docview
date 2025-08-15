# Tech Stack & Architecture

This document outlines the technology choices, architectural decisions, and module configurations that power F2F DocView.

## Core Technologies

### Nuxt 4
- **Framework**: Latest Nuxt 4 with the `app/` directory structure
- **Runtime**: Node.js with Nitro for optimal performance
- **Auto-imports**: Leverages Nuxt's auto-import system for composables and utilities
- **SSR/SSG**: Server-side rendering with static generation capabilities

### Vue 3 & TypeScript
- **Vue 3**: Composition API with `<script setup>` syntax
- **TypeScript**: Strict typing throughout the codebase
- **Type Safety**: Custom interfaces and runtime config typing

### Styling & UI
- **Tailwind CSS v4**: Modern utility-first CSS framework
- **Nuxt UI**: Component library for consistent design system
- **Nuxt UI Pro**: Premium components for advanced layouts
- **Color Modes**: Built-in dark/light theme support
- **Iconify**: Icon provider with extensive icon library

## Module Ecosystem

### Authentication
```typescript
// nuxt-auth-utils
modules: ['nuxt-auth-utils']
```
- **Discord OAuth**: Primary authentication method
- **Session Management**: Server-side session handling
- **Access Control**: Guild membership validation

### Content Management
```typescript
// @nuxt/content
modules: ['@nuxt/content']
```
- **Markdown Processing**: MDC (Markdown Components) support
- **Collections**: Structured content with schema validation
- **Search**: Built-in full-text search capabilities
- **Navigation**: Automatic navigation generation

### Image Optimization
```typescript
// @nuxt/image
modules: ['@nuxt/image']
```
- **Optimization**: Automatic image optimization and resizing
- **Formats**: WebP and AVIF support
- **Lazy Loading**: Built-in lazy loading with intersection observer

### Developer Experience
```typescript
// @nuxt/eslint
modules: ['@nuxt/eslint']
```
- **ESLint v9**: Modern linting with stylistic rules
- **Code Standards**: Enforced comma dangles and brace styles
- **Auto-fixing**: Integrated with development workflow

### Social & SEO
```typescript
// nuxt-og-image
modules: ['nuxt-og-image']
```
- **Open Graph**: Dynamic OG image generation
- **SEO**: Automatic meta tag management
- **Social Sharing**: Optimized social media previews

## Architecture Decisions

### Directory Structure
```
app/                    # Nuxt 4 app directory
├── components/         # Vue components with auto-imports
├── composables/        # Reusable logic
├── layouts/           # Page layouts
├── middleware/        # Route protection
├── pages/            # File-based routing
└── assets/           # Static assets and styles
```

### State Management
- **No Pinia Usage**: Despite being installed, the project relies on Nuxt's built-in state management
- **Composables**: Custom composables for shared logic
- **Session State**: Authentication state via `nuxt-auth-utils`

### Path Aliases
```typescript
alias: {
  '~': fileURLToPath(new URL('./', import.meta.url)),
  '@': fileURLToPath(new URL('./', import.meta.url)),
  'app': fileURLToPath(new URL('./app', import.meta.url))
}
```

### Runtime Configuration
```typescript
runtimeConfig: {
  // Server-only
  oauthDiscordClientSecret: process.env.NUXT_OAUTH_DISCORD_CLIENT_SECRET,
  requiredDiscordGuildId: process.env.NUXT_REQUIRED_DISCORD_GUILD_ID,
  
  // Public
  public: {
    oauthDiscordClientId: process.env.NUXT_OAUTH_DISCORD_CLIENT_ID,
    authBaseUrl: process.env.NUXT_AUTH_BASE_URL
  }
}
```

## Performance Optimizations

### Prerendering
```typescript
nitro: {
  prerender: {
    routes: ['/'],
    crawlLinks: true,
    autoSubfolderIndex: false
  }
}
```

### Content Optimization
```typescript
content: {
  build: {
    markdown: {
      toc: {
        searchDepth: 1  // Optimized TOC generation
      }
    }
  }
}
```

### Image Processing
- Automatic format selection (WebP/AVIF)
- Responsive image generation
- Lazy loading with proper placeholder handling

## Package Management

### PNPM Configuration
```json
{
  "packageManager": "pnpm@10.13.1",
  "resolutions": {
    "unimport": "4.1.1"  // Version pinning for stability
  },
  "pnpm": {
    "ignoredBuiltDependencies": ["vue-demi"]
  }
}
```

### Key Dependencies
- **Database**: `better-sqlite3` for local data storage
- **Styling**: `sass` for advanced CSS processing
- **Icons**: Multiple Iconify icon sets
- **Build Tools**: Vite with TypeScript and Vue SFC support

## Development Tools

### Code Quality
- **ESLint**: Configured with Nuxt-specific rules
- **TypeScript**: Strict type checking
- **Vue TSC**: Vue template type checking

### Build Pipeline
- **Vite**: Fast HMR and optimized bundling
- **Nitro**: Universal deployment target
- **Auto-imports**: Reduced boilerplate with type safety

## Deployment Considerations

### Static Generation
- Home page prerendered for faster loading
- Link crawling enabled for automatic route discovery
- Optimized for CDN deployment

### Environment Variables
- Server secrets properly isolated
- Public configuration exposed safely
- Runtime config for environment-specific values

This architecture provides a solid foundation for a secure, performant documentation platform with modern development practices and excellent user experience.
