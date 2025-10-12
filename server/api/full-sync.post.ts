import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { platform } from 'node:os'
import type { DiscordUser } from '../../types/auth'
import { GitAuthManager } from '../utils/git-auth'

const execAsync = promisify(exec)

interface FullSyncResponse {
  success: boolean
  message: string
  timestamp: number
  method?: string
  commitHash?: string
  gitOutput?: string
  syncOutput?: string
  error?: string
  diagnostics?: Record<string, any>
}

export default defineEventHandler(async (event): Promise<FullSyncResponse> => {
  // Authentication check
  const session = await getUserSession(event)

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  const discordUser = session.user as DiscordUser
  if (!discordUser.isDiscordMember) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Discord server membership required'
    })
  }

  // Get runtime configuration
  const config = useRuntimeConfig()

  // Git configuration
  const repoPath = config.gitRepoPath
  const repoUrl = config.gitRepoUrl
  const branch = config.gitBranch
  const gitTimeout = config.gitTimeout || 60000
  const gitUsername = config.gitUsername
  const gitToken = config.gitToken

  // Sync configuration
  const sourcePath = config.syncSourcePath
  const destinationPath = config.syncDestinationPath
  const syncTimeout = config.syncTimeout || 30000

  // Validate git configuration
  if (!repoPath) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Git repository path not configured. Please set NUXT_GIT_REPO_PATH environment variable.'
    })
  }

  // Validate sync configuration
  if (!sourcePath || !destinationPath) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Sync paths not configured. Please set NUXT_SYNC_SOURCE_PATH and NUXT_SYNC_DESTINATION_PATH environment variables.'
    })
  }

  // Validate paths exist
  if (!existsSync(repoPath)) {
    throw createError({
      statusCode: 500,
      statusMessage: `Git repository path does not exist: ${repoPath}`
    })
  }

  const gitDir = join(repoPath, '.git')
  if (!existsSync(gitDir)) {
    throw createError({
      statusCode: 500,
      statusMessage: `Directory is not a git repository: ${repoPath}`
    })
  }

  if (!existsSync(sourcePath)) {
    throw createError({
      statusCode: 500,
      statusMessage: `Source path does not exist: ${sourcePath}`
    })
  }

  if (!existsSync(destinationPath)) {
    throw createError({
      statusCode: 500,
      statusMessage: `Destination path does not exist: ${destinationPath}`
    })
  }

  const startTime = Date.now()
  let gitOutput = ''
  let syncOutput = ''

  try {
    console.log(`Full sync initiated by user: ${discordUser.username} (${discordUser.id})`)

    // STEP 1: Git Pull
    console.log('Step 1: Pulling from git repository...')
    console.log(`Repository path: ${repoPath}`)
    console.log(`Repository URL: ${repoUrl}`)
    console.log(`Branch: ${branch}`)

    // Create Git authentication manager
    const credentials = gitUsername && gitToken
      ? {
          username: gitUsername,
          token: gitToken,
          repoUrl
        }
      : undefined

    const gitAuthManager = new GitAuthManager(repoPath, credentials)

    // Get diagnostic information for troubleshooting
    const diagnostics = await gitAuthManager.getDiagnosticInfo()
    console.log('Git diagnostics:', diagnostics)

    // Validate credentials if provided
    if (credentials) {
      console.log('Validating Git credentials...')
      const validation = await gitAuthManager.validateCredentials()
      if (!validation.valid) {
        console.warn('Git credential validation failed:', validation.error)
        // Continue anyway - might work with other methods
      } else {
        console.log('Git credentials validated successfully')
      }
    }

    // Attempt authenticated pull using multiple methods
    console.log('Attempting Git pull with robust authentication...')
    const authResult = await gitAuthManager.performAuthenticatedPull(branch)

    if (!authResult.success) {
      throw new Error(authResult.error || 'Git pull failed with unknown error')
    }

    gitOutput = authResult.message
    console.log('Git pull completed using method:', authResult.method)
    console.log('Git output:', gitOutput)

    // STEP 2: Content Sync
    console.log('Step 2: Syncing content...')
    console.log(`Syncing from: ${sourcePath}`)
    console.log(`Syncing to: ${destinationPath}`)

    const isWindows = platform() === 'win32'
    let syncCommand: string
    let commandName: string

    if (isWindows) {
      // Use robocopy on Windows
      syncCommand = `robocopy "${sourcePath}" "${destinationPath}" /MIR /E /R:2 /W:1`
      commandName = 'robocopy'
    } else {
      // Use rsync on Linux/macOS
      syncCommand = `rsync -av --delete "${sourcePath}/" "${destinationPath}/"`
      commandName = 'rsync'
    }

    console.log(`Executing ${commandName} command:`, syncCommand)

    const syncResult = await execAsync(syncCommand, {
      timeout: syncTimeout
    })

    syncOutput = syncResult.stdout
    console.log('Content sync completed')
    console.log(`${commandName} output:`, syncOutput)

    if (syncResult.stderr && !isWindows) {
      console.warn(`${commandName} warnings:`, syncResult.stderr)
    }

    const duration = Date.now() - startTime
    const timestamp = Date.now()

    // Get the current commit hash after pull
    const commitResult = await execAsync('git rev-parse HEAD', {
      cwd: repoPath,
      timeout: 5000
    })
    const commitHash = commitResult.stdout.trim()

    console.log(`Full sync completed successfully in ${duration}ms`)
    console.log(`Current commit: ${commitHash}`)

    // Parse outputs to provide meaningful message
    let message = 'Documentation updated successfully'

    if (gitOutput.includes('Already up to date') || gitOutput.includes('Already up-to-date')) {
      if (syncOutput) {
        message = 'Repository was up to date, content re-synced'
      } else {
        message = 'Repository and content are up to date'
      }
    } else if (gitOutput.includes('files changed') || gitOutput.includes('insertions') || gitOutput.includes('deletions')) {
      message = 'Repository updated with new changes and content synced'
    }

    return {
      success: true,
      message,
      method: authResult.method,
      timestamp,
      commitHash,
      gitOutput,
      syncOutput,
      diagnostics: process.env.NODE_ENV === 'development' ? diagnostics : undefined
    }
  } catch (error: any) {
    console.error('Full sync failed:', error)

    // Handle different types of errors
    let errorMessage = 'Full sync operation failed'

    // Check if this is a git error or sync error
    if (error.code === 'ENOENT') {
      if (error.cmd?.includes('git')) {
        errorMessage = 'Git command not found. Please ensure Git is installed and available in PATH'
      } else {
        const commandName = platform() === 'win32' ? 'robocopy' : 'rsync'
        errorMessage = `${commandName} command not found or paths invalid`
      }
    } else if (error.code === 'EACCES') {
      errorMessage = 'Permission denied accessing directories'
    } else if (error.signal === 'SIGTERM' || error.killed) {
      errorMessage = 'Operation timed out'
    } else if (error.stdout || error.stderr) {
      // For robocopy, exit codes 0-3 are actually success, > 3 is error
      if (platform() === 'win32' && error.code <= 3 && error.cmd?.includes('robocopy')) {
        // This was actually a successful robocopy, continue with success
        console.log('Robocopy completed with informational exit code:', error.code)
        console.log('Robocopy output:', error.stdout)

        const timestamp = Date.now()

        // Get the current commit hash
        try {
          const commitResult = await execAsync('git rev-parse HEAD', {
            cwd: repoPath,
            timeout: 5000
          })
          const commitHash = commitResult.stdout.trim()

          return {
            success: true,
            message: 'Documentation updated successfully',
            timestamp,
            commitHash,
            gitOutput,
            syncOutput: error.stdout
          }
        } catch {
          return {
            success: true,
            message: 'Documentation updated successfully',
            timestamp,
            gitOutput,
            syncOutput: error.stdout
          }
        }
      }

      // Parse specific error messages
      const errorOutput = error.stderr || error.stdout
      if (errorOutput.includes('Authentication failed') || errorOutput.includes('Permission denied')) {
        errorMessage = 'Git authentication failed. Check repository access permissions'
      } else if (errorOutput.includes('Could not resolve host')) {
        errorMessage = 'Network error: Could not connect to git repository'
      } else if (errorOutput.includes('not a git repository')) {
        errorMessage = 'Directory is not a valid git repository'
      } else if (errorOutput.includes('Your local changes would be overwritten')) {
        errorMessage = 'Local changes conflict with remote updates. Manual intervention required'
      } else {
        errorMessage = `Error: ${errorOutput.trim()}`
      }
    }

    throw createError({
      statusCode: 500,
      statusMessage: errorMessage,
      data: {
        success: false,
        message: errorMessage,
        timestamp: Date.now(),
        error: error.message,
        gitOutput,
        syncOutput: error.stdout || error.stderr
      }
    })
  }
})
