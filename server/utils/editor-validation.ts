/**
 * Editor Validation Utilities
 *
 * Reusable validation functions for editor API routes to reduce duplication.
 */

import type { H3Event } from 'h3'
import type { DiscordUser } from '../../types/auth'
import type { FileLockManager } from './FileLockManager'

/**
 * Validate and extract tabId from request body
 */
export function validateTabId(body: any): string {
  const tabId = body?.tabId

  if (!tabId || typeof tabId !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tab ID is required'
    })
  }

  return tabId
}

/**
 * Validate and extract file path from route params
 */
export function validateFilePath(event: H3Event): string {
  const path = getRouterParam(event, 'path')

  if (!path) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File path is required'
    })
  }

  // Decode the path (it will be URL-encoded)
  return decodeURIComponent(path)
}

/**
 * Validate that a lock exists and belongs to the user
 */
export function validateLockOwnership(
  lockManager: FileLockManager,
  filePath: string,
  userId: string,
  tabId: string,
  isAdmin: boolean = false
): void {
  const lockInfo = lockManager.getLockInfo(filePath)

  if (!lockInfo) {
    throw createError({
      statusCode: 409,
      statusMessage: 'No active lock for this file'
    })
  }

  if (lockInfo.userId !== userId && !isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not own the lock for this file'
    })
  }

  // Also validate tab ID matches (even for admins, to prevent accidents)
  if (lockInfo.tabId !== tabId && lockInfo.userId === userId && !isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Lock is owned by a different tab'
    })
  }
}

/**
 * Get authenticated user session and validate it exists
 */
export async function requireAuthenticatedUser(event: H3Event): Promise<DiscordUser> {
  const session = await getUserSession(event)

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  return session.user as DiscordUser
}

/**
 * Combined helper: get user, validate permissions, and return user + file path
 */
export async function requireLockOwnership(
  event: H3Event,
  lockManager: FileLockManager,
  validateTabIdRequired: boolean = true
): Promise<{ user: DiscordUser, filePath: string, tabId?: string }> {
  // Check editor permissions (throws 403 if not allowed)
  const { requireEditorPermission } = await import('./editor-permissions')
  await requireEditorPermission(event)

  // Get authenticated user
  const user = await requireAuthenticatedUser(event)

  // Get file path
  const filePath = validateFilePath(event)

  // Get and validate tabId if required
  let tabId: string | undefined
  if (validateTabIdRequired) {
    const body = await readBody(event)
    tabId = validateTabId(body)

    // Validate lock ownership
    validateLockOwnership(lockManager, filePath, user.id, tabId, user.isAdmin)
  }

  return { user, filePath, tabId }
}

