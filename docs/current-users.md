## Current users presence and editing tracking

### Goals
- **Track viewers per page**: which authenticated users are currently viewing a given page (route-based), supporting multiple tabs per user.
- **Track active editor per page**: which user is actively editing a page (aligned with the lock system).
- **Low-complexity initial implementation**: in-memory server registry with client heartbeats; no external infra.
- **Privacy and performance**: send only minimal user metadata to the client; keep payloads small and cache-aware.

### Non-goals (initial)
- Real-time push (WebSockets/SSE). We’ll start with simple polling/heartbeats; can evolve later.
- Persistence across deploys or restarts. Presence is ephemeral.
- Historical analytics.

### Definitions
- **Viewer**: an authenticated user with at least one open tab on a page.
- **Tab session**: unique id per browser tab, used to distinguish multiple tabs from the same user.
- **Editor**: the user currently editing a page (should match the file lock owner).
- **Page identifier**: route `path` (e.g., `/docs/features/foo`).

---

## Data model (server, ephemeral)

- Registry keyed by `pagePath`:
  - `tabId -> { userId, lastSeenAt, isEditing }`
  - Derived fields (computed on read): `viewers[]`, `editorUserId` (if any active tab marks `isEditing=true`).
- All entries expire if `now - lastSeenAt > PRESENCE_TTL_MS` (e.g., 45s). Cleanup occurs opportunistically on read/mutation.

Interfaces (conceptual):

```ts
interface PresenceTabEntry {
  userId: string
  lastSeenAt: number
  isEditing: boolean
}

interface PresenceSnapshotUser {
  id: string
  name: string
  avatar?: string
  tabCount: number
}

interface PresenceSnapshot {
  pagePath: string
  viewers: PresenceSnapshotUser[] // unique by userId
  editorUserId?: string
}
```

Notes:
- User metadata (`name`, `avatar`) is resolved server-side from the session/user store on list reads to avoid client spoofing.
- We intentionally do not store metadata in the registry; only `userId`.

---

## Server design

### Server composable (singleton)
Create a singleton registry accessible from server handlers, e.g., `server/utils/presence-registry.ts` exposing:

```ts
export function usePresenceRegistry() {
  return {
    join(pagePath: string, tabId: string, userId: string): void,
    heartbeat(pagePath: string, tabId: string, userId: string, isEditing: boolean): void,
    leave(pagePath: string, tabId: string): void,
    list(pagePath: string): PresenceSnapshot,
    cleanup(): void
  }
}
```

Implementation details:
- Backing store: `Map<string, Map<string, PresenceTabEntry>>`.
- TTL: `PRESENCE_TTL_MS = 45_000`. Cleanup lazily on all mutations/reads.
- `list(pagePath)`: collapse tabs into unique users (aggregate `tabCount`). Derive `editorUserId` if any tab has `isEditing`.
- Resolve user metadata during list via the auth/session utility (e.g., `nuxt-auth-utils`).

### API endpoints (Nitro)
- `POST /api/presence/join` → body: `{ pagePath, tabId }` → 200
- `POST /api/presence/heartbeat` → body: `{ pagePath, tabId, isEditing }` → 200
- `POST /api/presence/leave` → body: `{ pagePath, tabId }` → 200
- `GET /api/presence/list?pagePath=/foo` → returns `PresenceSnapshot`

All endpoints must derive `userId` from server session; ignore any client-provided `userId`.

Security:
- Require authentication via existing auth middleware/utilities; fail closed if unauthenticated.
- Validate `pagePath` as a normalized route path.

---

## Client design

### Tab identity
- Generate `tabId` once per tab using `crypto.randomUUID()` and store in `sessionStorage` (key e.g., `presence:tab-id`).
- Do not reuse across tabs; sessionStorage is tab-scoped by default.

### Composable: `usePagePresence(pagePath)`
Client-only composable that:
- On mounted: `join(pagePath, tabId)`.
- Heartbeat every 15s: `heartbeat(pagePath, tabId, isEditing)`.
- On `visibilitychange` (visible): send an immediate heartbeat.
- On `beforeunload`/`pagehide`: `leave(pagePath, tabId)` using `keepalive` request.
- Poll viewers list with `useFetch` every 15s (offset from heartbeat) or whenever `route.path` changes.

Suggested API:

```ts
interface UsePagePresence {
  viewers: Ref<PresenceSnapshotUser[]>
  editorUserId: Ref<string | undefined>
  isEditing: Ref<boolean>
  setIsEditing(next: boolean): void
}
```

Implementation notes:
- `isEditing` should mirror the existing editor lock state; when lock acquired, call `setIsEditing(true)`, when released, set to `false`.
- Use `{ server: false, lazy: true }` for client polling; keep intervals cleared on unmount.

### Component integration
- Replace the content-sourced viewers with presence data:
  - In `app/pages/[...slug].vue`, provide `const presence = usePagePresence(route.path)`.
  - Pass `presence.viewers` to `CurrentPageViewers`.
  - Determine the current editor object by matching `presence.editorUserId` in `presence.viewers` (or fetch minimal user info separately).

```ts
const route = useRoute()
const presence = usePagePresence(route.path)

// Example usage in template:
// <CurrentPageViewers :viewers="presence.viewers" :editor="currentEditor" />
```

---

## UX and accessibility
- Show unique users only (aggregate multiple tabs), optionally display a small badge with `tabCount` when > 1.
- Exclude the current user from the list or label as **You**.
- Announce editor with a concise alert (as added in `CurrentPageViewers.vue`).
- Provide `alt` text for avatars (already present).

---

## Cleanup and failure modes
- Missing heartbeats → entries expire after TTL (45s). Users disappear automatically.
- Network hiccups → next heartbeat restores presence; list polling keeps UI updated.
- Server restart → registry cleared; presence rebuilt on next heartbeats.

---

## Future enhancements (v2+)
- Replace polling with **SSE** for push updates per-page.
- External store (e.g., Redis) for multi-instance deployments.
- Richer states (typing indicators, per-section editing).
- Batch endpoints for fewer requests when multiple tabs/pages are open.

---

## Implementation checklist
- [x] Server composable `usePresenceRegistry` (singleton) with TTL cleanup.
- [x] Nitro endpoints: `join`, `heartbeat`, `leave`, `list` with auth.
- [x] Client composable `usePagePresence(pagePath)` with heartbeat + polling.
- [x] Wire into `app/pages/[...slug].vue` and `CurrentPageViewers.vue`.
- [x] Align `isEditing` with existing editor lock lifecycle.

## Implementation notes
- Types are defined inline in `app/composables/usePagePresence.ts` to avoid Nuxt 4 module resolution issues. Shared types also exist in `types/presence.ts` for server-side usage.
- Server handlers cast `session.user` to `any` since `nuxt-auth-utils` session types don't match the custom Discord user structure.
- The `CurrentPageViewers` component hides when no viewers are present (conditional rendering with `v-if`).
- Editor avatar is visually highlighted with a primary color ring (`ring-2 ring-primary`).
- Tab count badge is not yet implemented (optional future enhancement).


