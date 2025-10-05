# Hydration Mismatch Strategy

## Overview

This document explains our approach to handling SSR hydration mismatches in the f2f-docview Nuxt 4 application, particularly for editable content and dynamic UI elements.

## The Core Principle

**Server and client MUST render identical HTML during hydration, OR we use client-only rendering.**

## Strategy Breakdown

### ✅ SSR-Enabled Content (Keep Server Rendering)

These components **should be SSR'd** because they provide SEO value and don't change between server/client:

1. **Page Content (Title, Description, Body)**
   - Location: `app/pages/[...slug].vue`
   - Why: SEO-critical, static during initial render
   - Editable: Yes, but editability is client-only interaction AFTER hydration

2. **Navigation Structure**
   - Location: `app/components/AppHeader.vue`
   - Why: Core site structure, should be in initial HTML

3. **Static UI Components**
   - All Nuxt UI components with static props

**Key Insight:** Being "editable" doesn't mean it needs to be client-only. The content is the same on both server and client; only the editing UI appears after hydration.

---

### ❌ Client-Only Content (Disable Server Rendering)

These components **should NOT be SSR'd** because they always differ between server/client:

1. **Dynamic Timestamps**
   - Location: `app/components/AppHeader.vue` (Full Sync button tooltip)
   - Why: `Date.now()` calculations always differ
   - Solution: Wrapped in `<ClientOnly>`
   - Example:
     ```vue
     <ClientOnly>
       <UButton :title="`Last checked: ${lastCheckedFormatted}`" />
     </ClientOnly>
     ```

2. **Client-Only Plugin Data**
   - Location: `app/plugins/startup-sync.client.ts`
   - Why: Runs only on client, server has no access
   - Solution: Any UI using this data must be client-only

3. **Version Display** (fetched on mount)
   - Location: `app/components/AppHeader.vue`
   - Why: API call on mount differs from server render
   - Solution: `<ClientOnly>` with fallback
   - Example:
     ```vue
     <ClientOnly fallback-tag="span">
       <span>{{ displayVersion }}</span>
       <template #fallback>
         <span>v1.0.0</span>
       </template>
     </ClientOnly>
     ```

4. **Editor Mode UI**
   - Location: `app/pages/[...slug].vue`
   - Why: Editor state is always `false` during SSR
   - Solution: Editor UI wrapped in `<ClientOnly>`

---

## Implementation Pattern

### Pattern 1: Full Client-Only Render
Use when: Component has no SSR value and always has hydration issues

```vue
<ClientOnly>
  <DynamicComponent />
</ClientOnly>
```

### Pattern 2: Client-Only with Fallback
Use when: You want to show placeholder during SSR

```vue
<ClientOnly fallback-tag="span">
  <DynamicContent />
  <template #fallback>
    <StaticPlaceholder />
  </template>
</ClientOnly>
```

### Pattern 3: Conditional Visibility (v-show)
Use when: Content should be in DOM for SEO but hidden in certain states

```vue
<!-- Both rendered, toggle visibility -->
<NormalView v-show="!editorEnabled" />
<ClientOnly>
  <EditorView v-if="editorEnabled" />
</ClientOnly>
```

**Important:** Use `v-show` not `v-if` for the SSR'd content to avoid structural differences.

---

## Specific Fixes Applied

### 1. AppHeader.vue - Version Display
**Problem:** Using `ClientOnly` with `fallback-tag` created DOM structure mismatches

**Solution:** Remove `ClientOnly` wrapper entirely. Let both server and client render `v1.0.0` initially, then update on client after mount:
```vue
<!-- Simple, no wrapper -->
<span>{{ displayVersion }}</span>
```

**Why it works:**
- Server: renders `v1.0.0` (default in useAppVersion)
- Client: hydrates with `v1.0.0` (same default)
- After mount: updates to real version (no hydration issue)

### 2. AppHeader.vue - Search Button (Center Slot)
**Problem:** `v-if="header?.search && loggedIn"` creates different node counts between server/client

**Solution:** Wrap entire center content in `ClientOnly`:
```vue
<UHeader>
  <ClientOnly>
    <UContentSearchButton v-if="header?.search && loggedIn" />
  </ClientOnly>
</UHeader>
```

### 3. AppHeader.vue - Auth-Dependent Right Section
**Problem:** Multiple elements conditionally rendered based on `loggedIn` state

**Solution:** Wrap ALL auth-dependent UI in a SINGLE `ClientOnly`:
```vue
<ClientOnly>
  <!-- Full Sync Button -->
  <UButton v-if="loggedIn" />
  
  <!-- Editor Toggle -->
  <EditorToggleButton v-if="loggedIn" />
  
  <!-- User Menu -->
  <UDropdownMenu v-if="loggedIn" />
</ClientOnly>
```

**Why single wrapper:** Reduces comment nodes and makes structure more predictable.

### 4. [...slug].vue - Editor Mode Toggle
**Problem:** Template structure changes with `v-if="editorState.isEnabled"`

**Solution:**
```vue
<!-- Normal view: Always rendered for SSR -->
<UPageHeader v-show="!editorState.isEnabled" />
<UPageBody v-show="!editorState.isEnabled" />

<!-- Editor view: Client-only -->
<ClientOnly>
  <EditorView v-if="editorState.isEnabled" />
</ClientOnly>
```

---

## Key Lessons Learned

### Lesson 1: Simple is Better
**Avoid:** Complex `ClientOnly` wrappers with `fallback-tag` and templates
**Prefer:** Simple initial values that match on both server/client, then update after mount

### Lesson 2: Group Related Client-Only Elements
**Avoid:** Multiple separate `ClientOnly` wrappers creating many comment nodes
**Prefer:** Single `ClientOnly` wrapper around related conditional elements

### Lesson 3: Auth State is Always Client-Only
**Rule:** Any UI that depends on `loggedIn` or user state must be in `ClientOnly`
**Reason:** Auth state may differ or be unavailable during SSR

### Lesson 4: Don't Fight the Framework
**Avoid:** Trying to make everything SSR-compatible with complex workarounds
**Prefer:** Accept that some UI is client-only and embrace `ClientOnly` component

---

## Best Practices

### ✅ DO:
- Use `<ClientOnly>` for any dynamic timestamps or client-specific data
- Use `<ClientOnly>` for ALL auth-dependent UI elements
- Group multiple client-only elements under a single `ClientOnly` wrapper
- Keep SEO-critical content (title, description, body) in SSR
- Use `v-show` instead of `v-if` when toggling SSR'd content
- Provide sensible default values that match on server and client

### ❌ DON'T:
- Don't use `Date.now()` or relative time calculations in SSR
- Don't conditionally render entire structures with `v-if` based on client state
- Don't assume client-only plugins have run during SSR
- Don't make editable content client-only just because it's editable
- Don't use complex `ClientOnly` patterns with fallbacks unless absolutely necessary
- Don't create multiple `ClientOnly` wrappers when one will suffice

---

## Testing Hydration

To verify fixes:

1. **Check Browser Console**: Should see no hydration warnings
2. **View Source**: SSR'd content should be in initial HTML
3. **Disable JavaScript**: Static content should still display
4. **Throttle Network**: Check for layout shifts (CLS)

---

## Performance Considerations

### Client-Only Trade-offs:

**Pros:**
- No hydration mismatches
- Simpler logic

**Cons:**
- No SEO for that content
- Possible layout shift (CLS)
- Content not in initial HTML

### When to Accept CLS:

It's okay for:
- Buttons with dynamic tooltips (minor UX feature)
- Version badges (not SEO-critical)
- User-specific UI elements

It's NOT okay for:
- Page titles and descriptions
- Main content
- Navigation structure

---

## Related Files

- `app/components/AppHeader.vue` - Header with dynamic timestamps
- `app/pages/[...slug].vue` - Page with editor toggle
- `app/composables/useSyncState.ts` - Timestamp formatting logic
- `app/plugins/startup-sync.client.ts` - Client-only initialization
- `app/composables/useAppVersion.ts` - Version fetching

---

## Future Improvements

Consider:
1. **Server-Side Timestamp**: Pass server time to client for consistent calculations
2. **Static Build Time**: Bake version info at build time instead of runtime fetch
3. **Deferred Hydration**: Use `@nuxt/delayed-hydration` for below-fold content

