import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { DiscordUser } from '../../types/auth'
import { GitAuthManager } from '../utils/git-auth'

interface GitDiagnosticsResponse {
  timestamp: number
  environment: string
  configuration: {
    repoPath: string | undefined
    repoUrl: string
    branch: string
    hasCredentials: boolean
    credentialsValid?: boolean
    credentialError?: string
  }
  systemInfo: Record<string, any>
  recommendations: string[]
}

export default defineEventHandler(async (event): Promise<GitDiagnosticsResponse> => {
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
  const gitUsername = config.gitUsername
  const gitToken = config.gitToken

  const hasCredentials = !!(gitUsername && gitToken)
  const recommendations: string[] = []

  // Basic configuration validation
  if (!repoPath) {
    recommendations.push('Set NUXT_GIT_REPO_PATH environment variable')
  }

  if (!hasCredentials) {
    recommendations.push('Configure Git credentials (NUXT_GIT_USERNAME and NUXT_GIT_TOKEN)')
  }

  // Test credentials if available
  let credentialsValid: boolean | undefined
  let credentialError: string | undefined

  if (hasCredentials && repoPath && existsSync(repoPath)) {
    try {
      const credentials = {
        username: gitUsername!,
        token: gitToken!,
        repoUrl
      }

      const gitAuthManager = new GitAuthManager(repoPath, credentials)
      const validation = await gitAuthManager.validateCredentials()

      credentialsValid = validation.valid
      if (!validation.valid) {
        credentialError = validation.error

        if (validation.error?.includes('Authentication failed')) {
          recommendations.push('Check if GitHub token is valid and has not expired')
          recommendations.push('Verify token has "repo" scope permissions')
          recommendations.push('Ensure username matches the token owner')
        }
      }
    } catch (error: any) {
      credentialsValid = false
      credentialError = error.message
      recommendations.push('Unable to validate credentials - check network connectivity')
    }
  }

  // Get system diagnostics
  let systemInfo: Record<string, any> = {}

  if (repoPath && existsSync(repoPath)) {
    try {
      const gitAuthManager = new GitAuthManager(repoPath)
      systemInfo = await gitAuthManager.getDiagnosticInfo()
    } catch (error: any) {
      systemInfo = { error: error.message }
      recommendations.push('Git repository may have issues - check repository path and Git installation')
    }
  } else {
    systemInfo = { error: 'Repository path does not exist or is not configured' }
    if (!repoPath) {
      recommendations.push('Configure NUXT_GIT_REPO_PATH environment variable')
    } else {
      recommendations.push(`Create or verify repository at: ${repoPath}`)
    }
  }

  // Environment-specific recommendations
  if (process.env.NODE_ENV === 'production') {
    recommendations.push('For production: Use environment variables or secure secret management')
    recommendations.push('For production: Regularly rotate GitHub tokens')
    recommendations.push('For production: Monitor authentication failures and set up alerts')
  }

  // Check for common misconfigurations
  if (hasCredentials && repoUrl.includes('git@github.com')) {
    recommendations.push('Repository URL uses SSH format but credentials are for HTTPS - consider switching to HTTPS URL')
  }

  if (systemInfo.remotes && systemInfo.remotes.includes('git@github.com') && hasCredentials) {
    recommendations.push('Git remote is configured for SSH but using token authentication - this may cause conflicts')
  }

  console.log(`Git diagnostics requested by user: ${discordUser.username} (${discordUser.id})`)

  return {
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    configuration: {
      repoPath,
      repoUrl,
      branch,
      hasCredentials,
      credentialsValid,
      credentialError
    },
    systemInfo,
    recommendations: recommendations.length > 0 ? recommendations : ['Configuration appears to be correct']
  }
})
