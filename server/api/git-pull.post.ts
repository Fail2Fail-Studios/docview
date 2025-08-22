import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { DiscordUser } from '../../types/auth'

const execAsync = promisify(exec)

interface GitPullResponse {
  success: boolean
  message: string
  timestamp: number
  output?: string
  error?: string
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

    // Prepare git command with authentication if available
    let gitCommand: string
    const execOptions: any = {
      cwd: repoPath,
      timeout
    }

    if (gitUsername && gitToken) {
      // Use authenticated URL with Personal Access Token
      const authenticatedUrl = repoUrl.replace('https://', `https://${gitUsername}:${gitToken}@`)
      gitCommand = `git pull ${authenticatedUrl} ${branch}`
      console.log(`Executing authenticated git command: git pull [authenticated-url] ${branch}`)
    } else {
      // Fall back to default git pull (relies on local git config)
      gitCommand = `git pull origin ${branch}`
      console.log(`Executing git command: ${gitCommand}`)
      console.warn('Warning: No Git credentials provided. Relying on local git configuration.')
    }

    const { stdout, stderr } = await execAsync(gitCommand, execOptions)

    const duration = Date.now() - startTime
    const timestamp = Date.now()

    // Log successful pull
    console.log(`Git pull completed successfully in ${duration}ms`)
    console.log('Git output:', stdout)

    if (stderr) {
      console.warn('Git warnings:', stderr)
    }

    // Parse git output to provide meaningful message
    let message = 'Repository updated successfully'
    if (stdout.includes('Already up to date') || stdout.includes('Already up-to-date')) {
      message = 'Repository is already up to date'
    } else if (stdout.includes('files changed') || stdout.includes('insertions') || stdout.includes('deletions')) {
      message = 'Repository updated with new changes'
    }

    return {
      success: true,
      message,
      timestamp,
      output: stdout
    }

  } catch (error: any) {
    console.error('Git pull failed:', error)

    // Handle different types of git errors
    let errorMessage = 'Git pull operation failed'

    if (error.code === 'ENOENT') {
      errorMessage = 'Git command not found. Please ensure Git is installed and available in PATH'
    } else if (error.code === 'EACCES') {
      errorMessage = 'Permission denied accessing git repository'
    } else if (error.signal === 'SIGTERM' || error.killed) {
      errorMessage = 'Git operation timed out'
    } else if (error.stdout || error.stderr) {
      // Parse common git error messages
      const gitError = error.stderr || error.stdout
      if (gitError.includes('Authentication failed') || gitError.includes('Permission denied')) {
        errorMessage = 'Git authentication failed. Check repository access permissions'
      } else if (gitError.includes('Could not resolve host')) {
        errorMessage = 'Network error: Could not connect to git repository'
      } else if (gitError.includes('not a git repository')) {
        errorMessage = 'Directory is not a valid git repository'
      } else if (gitError.includes('Your local changes would be overwritten')) {
        errorMessage = 'Local changes conflict with remote updates. Manual intervention required'
      } else {
        errorMessage = `Git error: ${gitError.trim()}`
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
        output: error.stdout || error.stderr
      }
    })
  }
})
