---
title: Project Improvements & TODO
description: Comprehensive analysis of improvements, optimizations, and issues to address in the F2F DocView project
---

# Project Improvements & TODO

This document outlines identified improvements, optimizations, and potential issues in the F2F DocView project, organized by priority and impact.

## 🔴 Critical Issues (High Priority)

### 1. Configuration Inconsistencies ✅ COMPLETED
- **Issue**: Pinia was included in dependencies and nuxt.config.ts but not used anywhere in the codebase
- **Impact**: Unnecessary bundle size and potential confusion
- **Action**: ✅ Removed `@pinia/nuxt` from modules array in nuxt.config.ts and removed pinia dependencies from package.json
- **Files**: `nuxt.config.ts`, `package.json`

### 2. ~~Content Structure Mismatch~~ ❌ INVALID
- **Issue**: ~~Project has both `content/` and `docs/` folders with overlapping purposes~~
- **Correction**: The `content/` and `docs/` directories serve completely different purposes with NO overlap:
  - `docs/` contains documentation for the DocView application itself
  - `content/` is the main directory for @nuxt/content and holds the content displayed by the DocView app
- **Status**: No action needed - structure is correct as designed

### 3. ~~Missing Environment Variables Documentation~~ ❌ INVALID
- **Issue**: ~~Runtime config expects Discord OAuth variables but no .env.example exists~~
- **Correction**: `.env.example` and `.env` files already exist and contain the required Discord OAuth variables
- **Status**: No action needed - environment documentation already exists

## 🟡 Performance & Optimization (Medium Priority)

### 4. Bundle Optimization ✅ COMPLETED
- **Issue**: Potentially unused icon packs being loaded
- **Impact**: Larger bundle size than necessary
- **Action**: ✅ Audited icon usage and removed unused `@iconify-json/vscode-icons` package from dependencies
- **Results**: 
  - Kept `@iconify-json/lucide` (used: i-lucide-log-out, i-lucide-external-link, i-lucide-star, i-lucide-book-open)
  - Kept `@iconify-json/simple-icons` (used: i-simple-icons-github, i-simple-icons-discord, i-simple-icons-x, i-simple-icons-nuxtdotjs)
  - Removed `@iconify-json/vscode-icons` (not used anywhere)
- **Files**: `package.json`

### 5. Image Optimization Setup ✅ COMPLETED
- **Issue**: Logo images not using NuxtImage component optimization
- **Impact**: Missed performance opportunities
- **Action**: ✅ Replaced UColorModeImage with optimized NuxtPicture component and added logo preset
- **Improvements**:
  - Added `NuxtPicture` component with automatic WebP conversion
  - Created dedicated logo preset with optimized settings (WebP format, 90% quality, contain fit)
  - Maintained color mode switching functionality with reactive `$colorMode.value`
  - Added proper sizing hints and preload optimization
  - Reduced bundle size and improved loading performance
- **Files**: `app/components/AppHeader.vue`, `nuxt.config.ts`

### 6. Content Prerendering Enhancement ✅ COMPLETED
- **Issue**: Limited prerender routes configuration
- **Impact**: Reduced SSG benefits
- **Action**: ✅ Expanded prerender routes to include key documentation pages and main content sections
- **Improvements**:
  - Added main content sections (/overview, /game-design, /features, /systems, /stages)
  - Added key feature pages (/features/mission-system, /features/squad-system, etc.)
  - Added stage overview pages (/stages/stage-1, /stages/stage-2, /stages/stage-3)
  - Maintained crawlLinks for automatic discovery of additional pages
  - Improved SEO and initial page load performance
- **Files**: `nuxt.config.ts`

### 7. CSS Organization ✅ COMPLETED
- **Issue**: Some styling is inline in components rather than using design tokens
- **Impact**: Inconsistent styling, harder maintenance
- **Action**: ✅ Moved hardcoded styles to reusable utility classes and improved design token usage
- **Improvements**:
  - Created component-specific utility classes (.login-container, .toc-container, etc.)
  - Replaced hardcoded colors with design tokens (text-muted, text-foreground, bg-muted, border-border)
  - Organized CSS into logical @layer components structure
  - Improved consistency across login, page layout, and header components
  - Enhanced maintainability and theme compatibility
- **Files**: `app/assets/css/main.css`, `app/pages/login.vue`, `app/pages/index.vue`, `app/pages/[...slug].vue`, `app/components/AppHeader.vue`

## 🟢 Code Quality & Best Practices (Medium Priority)

### 8. TypeScript Improvements
- **Issue**: Some type assertions using `any` in middleware and components
- **Impact**: Lost type safety benefits
- **Action**: Create proper TypeScript interfaces for user session and Discord data
- **Files**: `app/middleware/auth.global.ts`, `app/components/AppHeader.vue`, `types/auth.ts`

### 9. Error Handling Enhancement
- **Issue**: Limited error boundaries and error handling in components
- **Impact**: Poor user experience during failures
- **Action**: Add comprehensive error handling and loading states
- **Files**: `app/pages/login.vue`, `app/error.vue`, auth components

### 10. Component Composition
- **Issue**: AppHeader component is doing too many things (auth, navigation, UI)
- **Impact**: Harder to test and maintain
- **Action**: Extract auth-related logic into composables
- **Files**: `app/components/AppHeader.vue`, create auth composables

### 11. Accessibility Improvements
- **Issue**: Missing ARIA labels and semantic HTML in some areas
- **Impact**: Poor accessibility compliance
- **Action**: Add proper ARIA attributes and semantic markup
- **Files**: `app/components/AppHeader.vue`, `app/pages/login.vue`

## 🔵 Enhancement Opportunities (Low Priority)

### 12. Content Management Enhancements
- **Issue**: Content lacks consistent front matter and navigation structure
- **Impact**: Inconsistent user experience, poor SEO
- **Action**: Standardize front matter across all content files, add proper navigation metadata
- **Files**: All content files, add `.navigation.yml` files

### 13. SEO Optimization
- **Issue**: Hardcoded OG images and limited SEO metadata
- **Impact**: Suboptimal social sharing and search visibility
- **Action**: Implement dynamic OG image generation and enhanced SEO meta
- **Files**: `app/pages/index.vue`, `app/pages/[...slug].vue`

### 14. Development Experience
- **Issue**: Missing development tooling (debug tools, better error pages)
- **Impact**: Slower development workflow
- **Action**: Add development-specific tooling and enhanced error pages
- **Files**: `nuxt.config.ts`, development configurations

### 15. Security Enhancements
- **Issue**: No rate limiting or additional security headers
- **Impact**: Potential security vulnerabilities
- **Action**: Add security headers and rate limiting for auth endpoints
- **Files**: `server/api/auth/[...].ts`, Nitro configuration

### 16. Content Search Optimization
- **Issue**: Search functionality could be enhanced with better indexing
- **Impact**: Suboptimal content discoverability
- **Action**: Optimize content search with better indexing and filtering
- **Files**: Search implementation, content structure

## 🛠️ Recommended Implementation Order

1. **Phase 1** (Critical): ✅ ~~Remove Pinia~~, ~~consolidate content structure~~, ~~add environment documentation~~ - **COMPLETED**
2. **Phase 2** (Performance): ✅ ~~Bundle optimization~~, ✅ ~~image optimization~~, ✅ ~~prerendering~~, ✅ ~~CSS organization~~ - **COMPLETED**
3. **Phase 3** (Quality): TypeScript improvements, error handling, component refactoring
4. **Phase 4** (Enhancement): Content standardization, SEO, security improvements

## 📝 Notes

- All changes should maintain backward compatibility where possible
- Follow existing code style and conventions [[memory:6038969]]
- Test authentication flows thoroughly after any auth-related changes
- Ensure all linting rules continue to pass after modifications
- Consider creating feature branches for major refactoring efforts

## 🔍 Files Requiring Attention

### High Priority
- `nuxt.config.ts` - Remove Pinia, enhance prerendering
- `package.json` - Clean up dependencies
- `app/middleware/auth.global.ts` - Improve TypeScript types
- `types/auth.ts` - Create proper interfaces

### Medium Priority
- `app/components/AppHeader.vue` - Refactor and improve accessibility
- `app/pages/login.vue` - Enhanced error handling
- `content/` directory - Standardize front matter
- `app/assets/css/main.css` - Optimize CSS organization

### Lower Priority
- All content files - SEO and navigation improvements
- `server/api/auth/[...].ts` - Security enhancements
- Development tooling and configuration files
