import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const execAsync = promisify(exec)

interface VersionCheckResponse {
  success: boolean
  localCommit: string | null
  remoteCommit: string | null
  hasUpdates: boolean
  error?: string
}

export default defineEventHandler(async (event): Promise<VersionCheckResponse> => {
  // Authentication check
  const session = await getUserSession(event)

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  // Get runtime configuration
  const config = useRuntimeConfig()
  const repoPath = config.gitRepoPath
  const branch = config.gitBranch || 'main'

  // Validate configuration
  if (!repoPath) {
    return {
      success: false,
      localCommit: null,
      remoteCommit: null,
      hasUpdates: false,
      error: 'Git repository path not configured'
    }
  }

  // Check if the directory exists and is a git repository
  if (!existsSync(repoPath)) {
    return {
      success: false,
      localCommit: null,
      remoteCommit: null,
      hasUpdates: false,
      error: `Git repository path does not exist: ${repoPath}`
    }
  }

  const gitDir = join(repoPath, '.git')
  if (!existsSync(gitDir)) {
    return {
      success: false,
      localCommit: null,
      remoteCommit: null,
      hasUpdates: false,
      error: `Directory is not a git repository: ${repoPath}`
    }
  }

  try {
    console.log('Checking version differences...')
    console.log(`Repository path: ${repoPath}`)
    console.log(`Branch: ${branch}`)

    // Get local commit hash
    const localResult = await execAsync(`git rev-parse HEAD`, {
      cwd: repoPath,
      timeout: 10000
    })
    const localCommit = localResult.stdout.trim()

    // Fetch latest changes without merging
    await execAsync(`git fetch origin ${branch}`, {
      cwd: repoPath,
      timeout: 30000
    })

    // Get remote commit hash
    const remoteResult = await execAsync(`git rev-parse origin/${branch}`, {
      cwd: repoPath,
      timeout: 10000
    })
    const remoteCommit = remoteResult.stdout.trim()

    // Check if there are updates
    const hasUpdates = localCommit !== remoteCommit

    console.log(`Local commit: ${localCommit}`)
    console.log(`Remote commit: ${remoteCommit}`)
    console.log(`Has updates: ${hasUpdates}`)

    return {
      success: true,
      localCommit,
      remoteCommit,
      hasUpdates
    }

  } catch (error: any) {
    console.error('Version check failed:', error)

    let errorMessage = 'Failed to check version'

    if (error.code === 'ENOENT') {
      errorMessage = 'Git command not found'
    } else if (error.stderr) {
      if (error.stderr.includes('Could not resolve host')) {
        errorMessage = 'Network error: Could not connect to git repository'
      } else if (error.stderr.includes('not a git repository')) {
        errorMessage = 'Directory is not a valid git repository'
      } else {
        errorMessage = `Git error: ${error.stderr.trim()}`
      }
    }

    return {
      success: false,
      localCommit: null,
      remoteCommit: null,
      hasUpdates: false,
      error: errorMessage
    }
  }
})
