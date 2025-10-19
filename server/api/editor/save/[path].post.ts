import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { execGitCommand } from '../../../utils/git-auth'
import { getFileLockManager } from '../../../utils/FileLockManager'
import { requireLockOwnership } from '../../../utils/editor-validation'
import { versionCache } from '../../../utils/version-cache'

interface SavePayload {
  title: string
  description: string
  body: string
  commitMessage?: string
}

export default defineEventHandler(async (event) => {
  // Get lock manager
  const lockManager = getFileLockManager()

  // Validate editor permissions, authentication, and lock ownership
  const { user, filePath: decodedPath } = await requireLockOwnership(event, lockManager, false)

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

  // Verify lock exists (ownership already validated by requireLockOwnership)
  const lockInfo = lockManager.getLockInfo(decodedPath)

  if (!lockInfo) {
    throw createError({
      statusCode: 409,
      statusMessage: 'No active lock for this file'
    })
  }

  try {
    // Read existing file to preserve other front matter fields
    const fullPath = join(gitRepoPath, 'content', decodedPath)
    let existingContent: string

    try {
      existingContent = await fs.readFile(fullPath, 'utf-8')
    } catch (error: any) {
      console.error('[editor/save] Failed to read file:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to read file',
        data: {
          error: 'File read error',
          details: `Could not read file at ${decodedPath}. The file may not exist or is inaccessible.`,
          filePath: decodedPath
        }
      })
    }

    // Parse existing front matter
    const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
    const match = existingContent.match(frontMatterRegex)

    const existingFrontMatter: Record<string, any> = {}

    if (match && match[1]) {
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
        try {
          await execGitCommand(gitRepoPath, ['stash', 'push', '-u', '-m', 'Editor auto-stash before pull'])
          stashCreated = true
        } catch (stashError: any) {
          console.error('[editor/save] Failed to stash changes:', stashError)
          throw createError({
            statusCode: 500,
            statusMessage: 'Failed to stash changes',
            data: {
              error: 'Git stash error',
              details: 'Could not stash uncommitted changes before pull. Please ensure git is configured correctly.',
              gitError: stashError.message
            }
          })
        }
      }
    } catch (error: any) {
      // Re-throw if it's already a createError
      if (error.statusCode) throw error
      console.warn('[editor/save] Failed to check git status, continuing anyway:', error)
    }

    // 2. Git pull --rebase
    try {
      await execGitCommand(gitRepoPath, ['pull', '--rebase'])
      console.log('[editor/save] Successfully pulled latest changes')
    } catch (error: any) {
      console.error('[editor/save] Pull failed:', error)

      // Check for specific git pull errors
      if (error.message?.includes('Authentication') || error.message?.includes('Permission denied')) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Git authentication failed',
          data: {
            error: 'Git pull authentication error',
            details: 'Failed to authenticate with the git repository. Please check git credentials configuration.',
            gitError: error.message
          }
        })
      }

      // For other pull errors, log but continue - lock system should prevent conflicts
      console.warn('[editor/save] Pull failed, continuing with local changes (lock system prevents conflicts)')
    }

    // 3. Pop stash if we created one
    if (stashCreated) {
      try {
        await execGitCommand(gitRepoPath, ['stash', 'pop'])
        console.log('[editor/save] Successfully restored stashed changes')
      } catch (error: any) {
        console.error('[editor/save] Failed to pop stash:', error)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to restore stashed changes',
          data: {
            error: 'Git stash pop error',
            details: 'Could not restore previously stashed changes. Manual intervention may be required.',
            gitError: error.message
          }
        })
      }
    }

    // 4. Write file
    try {
      await fs.writeFile(fullPath, newContent, 'utf-8')
      console.log('[editor/save] File written successfully')
    } catch (error: any) {
      console.error('[editor/save] Failed to write file:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to write file',
        data: {
          error: 'File write error',
          details: `Could not write content to ${decodedPath}. Check file permissions and disk space.`,
          filePath: decodedPath,
          systemError: error.message
        }
      })
    }

    // 5. Git add
    try {
      await execGitCommand(gitRepoPath, ['add', join('content', decodedPath)])
    } catch (error: any) {
      console.error('[editor/save] Failed to stage file:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to stage file',
        data: {
          error: 'Git add error',
          details: 'Could not stage file for commit. Git repository may be in an inconsistent state.',
          gitError: error.message
        }
      })
    }

    // 6. Git commit with author info
    const userName = user.name || user.username
    const commitMsg = body.commitMessage || `docs: update ${decodedPath} via editor by ${userName}`
    const authorEmail = 'docs@fail2.fail'

    // Set author environment variables instead of using --author flag
    // This avoids shell escaping issues with special characters
    try {
      await execGitCommand(gitRepoPath, [
        '-c',
        `user.name=${userName}`,
        '-c',
        `user.email=${authorEmail}`,
        'commit',
        '-m',
        commitMsg
      ])
    } catch (error: any) {
      console.error('[editor/save] Failed to commit:', error)

      // Check if it's a "nothing to commit" error (not actually an error)
      if (error.message?.includes('nothing to commit')) {
        // Handle below in the catch block
        throw error
      }

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to commit changes',
        data: {
          error: 'Git commit error',
          details: 'Could not commit changes to git repository. Your changes have been written but not committed.',
          gitError: error.message
        }
      })
    }

    // 7. Git push
    try {
      await execGitCommand(gitRepoPath, ['push'])
    } catch (error: any) {
      console.error('[editor/save] Failed to push:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to push changes',
        data: {
          error: 'Git push error',
          details: 'Changes were committed locally but could not be pushed to remote. Your changes are saved locally and will be pushed on next sync.',
          gitError: error.message
        }
      })
    }

    console.log('[editor/save] Git workflow completed successfully')

    // Refresh version cache after successful push
    await versionCache.refreshVersion()

    // Note: Content is immediately available via symlink - no sync needed

    // 8. Release the lock
    lockManager.releaseLock(decodedPath, user.id, undefined, user.isAdmin)

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
      lockManager.releaseLock(decodedPath, user.id, undefined, user.isAdmin)

      return {
        success: true,
        message: 'No changes to save',
        file: {
          path: decodedPath
        }
      }
    }

    // If error already has a statusCode (from createError), re-throw it
    if (error.statusCode) {
      throw error
    }

    // Generic error fallback
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save content',
      data: {
        error: 'Save operation failed',
        details: error.message || 'An unexpected error occurred during save. Please try again.',
        originalError: error.toString()
      }
    })
  }
})
