import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { execGitCommand } from '../../../utils/git-auth'
import { getFileLockManager } from '../../../utils/FileLockManager'
import { requireEditorPermission } from '../../../utils/editor-permissions'
import type { DiscordUser } from '../../../../types/auth'

interface SavePayload {
  title: string
  description: string
  body: string
  commitMessage?: string
}

export default defineEventHandler(async (event) => {
  // Check editor permissions (throws 403 if not allowed)
  await requireEditorPermission(event)

  // Get user session
  const session = await getUserSession(event)

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  const user = session.user as DiscordUser

  // Get file path from route params
  const path = getRouterParam(event, 'path')

  if (!path) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File path is required'
    })
  }

  // Decode the path
  const decodedPath = decodeURIComponent(path)

  // Get runtime config
  const config = useRuntimeConfig()
  const gitRepoPath = config.gitRepoPath

  if (!gitRepoPath) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Git repository path not configured'
    })
  }

  // Parse request body
  const body = await readBody<SavePayload>(event)

  if (!body || typeof body.title !== 'string' || typeof body.description !== 'string' || typeof body.body !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body. Expected: { title, description, body }'
    })
  }

  // Verify user owns the lock
  const lockManager = getFileLockManager()
  const lockInfo = lockManager.getLockInfo(decodedPath)

  if (!lockInfo) {
    throw createError({
      statusCode: 409,
      statusMessage: 'No active lock for this file'
    })
  }

  if (lockInfo.userId !== user.id && !user.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not own the lock for this file'
    })
  }

  try {
    // Read existing file to preserve other front matter fields
    const fullPath = join(gitRepoPath, 'content', decodedPath)
    const existingContent = await fs.readFile(fullPath, 'utf-8')

    // Parse existing front matter
    const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
    const match = existingContent.match(frontMatterRegex)

    let existingFrontMatter: Record<string, any> = {}

    if (match) {
      const frontMatterText = match[1]
      // Simple YAML parsing - just preserve lines that aren't title or description
      const lines = frontMatterText.split('\n')
      for (const line of lines) {
        if (!line.startsWith('title:') && !line.startsWith('description:') && line.trim()) {
          const colonIndex = line.indexOf(':')
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim()
            const value = line.substring(colonIndex + 1).trim()
            existingFrontMatter[key] = value
          }
        }
      }
    }

    // Construct new front matter
    const frontMatterLines = [
      '---',
      `title: ${body.title}`,
      `description: ${body.description}`
    ]

    // Add other preserved front matter fields
    for (const [key, value] of Object.entries(existingFrontMatter)) {
      frontMatterLines.push(`${key}: ${value}`)
    }

    frontMatterLines.push('---')

    // Construct new file content
    const newContent = `${frontMatterLines.join('\n')}\n${body.body}`

    // Git workflow: check status -> stash if needed -> pull -> pop stash -> write -> add -> commit -> push
    console.log('[editor/save] Starting git workflow for:', decodedPath)

    // 1. Check if there are uncommitted changes
    let hasUncommittedChanges = false
    let stashCreated = false

    try {
      const { stdout: statusOutput } = await execGitCommand(gitRepoPath, ['status', '--porcelain'])
      hasUncommittedChanges = statusOutput.trim().length > 0

      if (hasUncommittedChanges) {
        console.log('[editor/save] Uncommitted changes detected, stashing...')
        await execGitCommand(gitRepoPath, ['stash', 'push', '-u', '-m', 'Editor auto-stash before pull'])
        stashCreated = true
      }
    } catch (error) {
      console.warn('[editor/save] Failed to check git status, continuing anyway:', error)
    }

    // 2. Git pull --rebase
    try {
      await execGitCommand(gitRepoPath, ['pull', '--rebase'])
      console.log('[editor/save] Successfully pulled latest changes')
    } catch (error) {
      console.warn('[editor/save] Pull failed, continuing with local changes:', error)
      // Continue anyway - the lock system should prevent conflicts
    }

    // 3. Pop stash if we created one
    if (stashCreated) {
      try {
        await execGitCommand(gitRepoPath, ['stash', 'pop'])
        console.log('[editor/save] Successfully restored stashed changes')
      } catch (error) {
        console.warn('[editor/save] Failed to pop stash, may need manual resolution:', error)
        // Continue anyway - we'll commit our changes
      }
    }

    // 4. Write file
    await fs.writeFile(fullPath, newContent, 'utf-8')
    console.log('[editor/save] File written successfully')

    // 5. Git add
    await execGitCommand(gitRepoPath, ['add', join('content', decodedPath)])

    // 6. Git commit with author info
    const userName = user.name || user.username
    const commitMsg = body.commitMessage || `docs: update ${decodedPath} via editor by ${userName}`
    const authorEmail = 'docs@fail2.fail'

    // Set author environment variables instead of using --author flag
    // This avoids shell escaping issues with special characters
    await execGitCommand(gitRepoPath, [
      '-c',
      `user.name=${userName}`,
      '-c',
      `user.email=${authorEmail}`,
      'commit',
      '-m',
      commitMsg
    ])

    // 7. Git push
    await execGitCommand(gitRepoPath, ['push'])

    console.log('[editor/save] Git workflow completed successfully')

    // 8. Trigger content sync
    try {
      // Call sync-content internally by forwarding the authenticated event
      await $fetch('/api/sync-content', {
        method: 'POST',
        headers: {
          cookie: getHeader(event, 'cookie') || ''
        }
      })
      console.log('[editor/save] Content sync triggered successfully')
    } catch (syncError) {
      console.error('[editor/save] Content sync failed:', syncError)
      // Don't fail the save if sync fails - just log it
    }

    // 9. Release the lock
    lockManager.releaseLock(decodedPath, user.id, user.isAdmin)

    return {
      success: true,
      message: 'Content saved and published successfully',
      file: {
        path: decodedPath,
        commitMessage: commitMsg
      }
    }
  } catch (error: any) {
    console.error('[editor/save] Error during save operation:', error)

    // Check for common git errors
    if (error.message?.includes('nothing to commit')) {
      // No changes detected - this is not an error
      lockManager.releaseLock(decodedPath, user.id, user.isAdmin)

      return {
        success: true,
        message: 'No changes to save',
        file: {
          path: decodedPath
        }
      }
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save content',
      data: {
        error: error.message,
        details: error.toString()
      }
    })
  }
})

