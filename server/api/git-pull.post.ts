import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { DiscordUser } from '../../types/auth'
import { GitAuthManager } from '../utils/git-auth'

interface GitPullResponse {
  success: boolean
  message: string
  timestamp: number
  method?: string
  output?: string
  error?: string
  diagnostics?: Record<string, any>
}

export default defineEventHandler(async (event): Promise<GitPullResponse> => {
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
  const repoPath = config.gitRepoPath
  const repoUrl = config.gitRepoUrl
  const branch = config.gitBranch
  const timeout = config.gitTimeout || 60000
  const gitUsername = config.gitUsername
  const gitToken = config.gitToken

  // Validate configuration
  if (!repoPath) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Git repository path not configured. Please set NUXT_GIT_REPO_PATH environment variable.'
    })
  }

  // Check if the directory exists and is a git repository
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

  try {
    console.log(`Git pull initiated by user: ${discordUser.username} (${discordUser.id})`)
    console.log(`Repository path: ${repoPath}`)
    console.log(`Repository URL: ${repoUrl}`)
    console.log(`Branch: ${branch}`)

    const startTime = Date.now()

    // Create Git authentication manager
    const credentials = gitUsername && gitToken ? {
      username: gitUsername,
      token: gitToken,
      repoUrl
    } : undefined

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

    const duration = Date.now() - startTime
    const timestamp = Date.now()

    if (authResult.success) {
      console.log(`Git pull completed successfully in ${duration}ms using method: ${authResult.method}`)

      return {
        success: true,
        message: authResult.message,
        method: authResult.method,
        timestamp,
        diagnostics: process.env.NODE_ENV === 'development' ? diagnostics : undefined
      }
    } else {
      throw new Error(authResult.error || 'Git pull failed with unknown error')
    }

  } catch (error: any) {
    console.error('Git pull failed:', error)

    // Get additional diagnostic information for troubleshooting
    let diagnostics: Record<string, any> | undefined
    try {
      const credentials = gitUsername && gitToken ? {
        username: gitUsername,
        token: gitToken,
        repoUrl
      } : undefined

      const gitAuthManager = new GitAuthManager(repoPath, credentials)
      diagnostics = await gitAuthManager.getDiagnosticInfo()
      console.error('Git diagnostics on error:', diagnostics)
    } catch (diagError) {
      console.error('Failed to get diagnostics:', diagError)
    }

    // Enhanced error handling with better context
    let errorMessage = 'Git pull operation failed'
    let statusCode = 500

    if (error.message.includes('credential validation failed')) {
      errorMessage = 'Git credentials are invalid or expired. Please check your GitHub token.'
      statusCode = 401
    } else if (error.message.includes('All authentication methods failed')) {
      errorMessage = 'Git authentication failed with all available methods. Check credentials and repository access.'
      statusCode = 401
    } else if (error.code === 'ENOENT') {
      errorMessage = 'Git command not found. Please ensure Git is installed and available in PATH'
    } else if (error.code === 'EACCES') {
      errorMessage = 'Permission denied accessing git repository'
    } else if (error.signal === 'SIGTERM' || error.killed) {
      errorMessage = 'Git operation timed out'
    } else if (error.message) {
      errorMessage = `Git error: ${error.message}`
    }

    throw createError({
      statusCode,
      statusMessage: errorMessage,
      data: {
        success: false,
        message: errorMessage,
        timestamp: Date.now(),
        error: error.message,
        diagnostics: process.env.NODE_ENV === 'development' ? diagnostics : undefined
      }
    })
  }
})
