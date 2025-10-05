import type { DiscordUser } from '../../types/auth'

/**
 * Editor Permissions Utility
 *
 * Checks if a user has permission to edit content.
 * Users must either:
 * 1. Have the doc-edit role (from Discord)
 * 2. Be an admin (from environment config)
 */

export interface EditorPermissionResult {
  canEdit: boolean
  reason?: string
  isAdmin: boolean
  isDocEditor: boolean
}

/**
 * Check if user has permission to edit content
 */
export function checkEditorPermission(user: DiscordUser | null): EditorPermissionResult {
  if (!user) {
    return {
      canEdit: false,
      reason: 'User not authenticated',
      isAdmin: false,
      isDocEditor: false
    }
  }

  const isAdmin = user.isAdmin === true
  const isDocEditor = user.isDocEditor === true

  if (isAdmin) {
    return {
      canEdit: true,
      isAdmin: true,
      isDocEditor
    }
  }

  if (isDocEditor) {
    return {
      canEdit: true,
      isAdmin: false,
      isDocEditor: true
    }
  }

  return {
    canEdit: false,
    reason: 'User does not have doc-edit role',
    isAdmin: false,
    isDocEditor: false
  }
}

/**
 * Middleware-style helper to require editor permissions
 * Throws 403 error if user doesn't have permission
 */
export async function requireEditorPermission(event: any): Promise<EditorPermissionResult> {
  const session = await getUserSession(event)
  const user = session?.user as DiscordUser | null

  const permission = checkEditorPermission(user)

  if (!permission.canEdit) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      data: {
        reason: permission.reason,
        message: 'You do not have permission to edit content. The doc-edit role is required.'
      }
    })
  }

  return permission
}

