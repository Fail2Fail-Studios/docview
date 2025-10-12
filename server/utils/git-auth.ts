import { exec, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const execAsync = promisify(exec)
const execFileAsync = promisify(execFile)

/**
 * Execute a git command in a specific repository directory
 * Uses execFile to avoid shell parsing issues with arguments containing spaces
 */
export async function execGitCommand(
  repoPath: string,
  args: string[],
  options?: { timeout?: number }
): Promise<{ stdout: string, stderr: string }> {
  const timeout = options?.timeout || 60000

  try {
    const result = await execFileAsync('git', args, {
      cwd: repoPath,
      timeout
    })
    return result
  } catch (error: any) {
    console.error(`[execGitCommand] Failed to execute: git ${args.join(' ')}`, error)
    throw new Error(`Git command failed: ${error.message}`)
  }
}

export interface GitCredentials {
  username: string
  token: string
  repoUrl: string
}

export interface GitAuthResult {
  success: boolean
  method: 'credential-helper' | 'url-auth' | 'local-config' | 'ssh'
  message: string
  error?: string
}

/**
 * More robust Git authentication utility that tries multiple methods
 * and provides better error handling for production environments
 */
export class GitAuthManager {
  private repoPath: string
  private credentials?: GitCredentials

  constructor(repoPath: string, credentials?: GitCredentials) {
    this.repoPath = repoPath
    this.credentials = credentials
  }

  /**
   * Validate that Git credentials work by testing repository access
   */
  async validateCredentials(): Promise<{ valid: boolean, error?: string }> {
    if (!this.credentials) {
      return { valid: false, error: 'No credentials provided' }
    }

    try {
      const { username, token, repoUrl } = this.credentials
      const testUrl = repoUrl.replace('https://', `https://${username}:${token}@`)

      // Test with git ls-remote (lightweight operation)
      await execAsync(`git ls-remote ${testUrl}`, { timeout: 15000 })

      return { valid: true }
    } catch (error: any) {
      let errorMessage = 'Credential validation failed'

      if (error.stderr) {
        if (error.stderr.includes('Authentication failed') || error.stderr.includes('Permission denied')) {
          errorMessage = 'Invalid username or token'
        } else if (error.stderr.includes('Could not resolve host')) {
          errorMessage = 'Network connectivity issue'
        } else if (error.stderr.includes('Repository not found')) {
          errorMessage = 'Repository not found or access denied'
        } else {
          errorMessage = error.stderr.trim()
        }
      }

      return { valid: false, error: errorMessage }
    }
  }

  /**
   * Setup Git credential helper for more secure authentication
   */
  async setupCredentialHelper(): Promise<GitAuthResult> {
    if (!this.credentials) {
      return {
        success: false,
        method: 'credential-helper',
        message: 'No credentials available for credential helper setup'
      }
    }

    try {
      const { username, token, repoUrl } = this.credentials
      const hostname = new URL(repoUrl).hostname

      // Configure git credential helper to use our token
      await execAsync(`git config --local credential.${repoUrl}.username "${username}"`, {
        cwd: this.repoPath,
        timeout: 5000
      })

      // Set up credential helper that provides the token
      const credentialScript = this.createCredentialHelperScript(hostname, username, token)

      await execAsync(`git config --local credential.helper "${credentialScript}"`, {
        cwd: this.repoPath,
        timeout: 5000
      })

      return {
        success: true,
        method: 'credential-helper',
        message: 'Git credential helper configured successfully'
      }
    } catch (error: any) {
      return {
        success: false,
        method: 'credential-helper',
        message: 'Failed to setup credential helper',
        error: error.message
      }
    }
  }

  /**
   * Create a temporary credential helper script
   */
  private createCredentialHelperScript(hostname: string, username: string, token: string): string {
    const isWindows = process.platform === 'win32'
    const scriptExt = isWindows ? '.bat' : '.sh'
    const scriptPath = join(tmpdir(), `git-credential-helper-${Date.now()}${scriptExt}`)

    let scriptContent: string
    if (isWindows) {
      scriptContent = `@echo off
if "%1"=="get" (
  echo protocol=https
  echo host=${hostname}
  echo username=${username}
  echo password=${token}
)`
    } else {
      scriptContent = `#!/bin/bash
if [ "$1" = "get" ]; then
  echo "protocol=https"
  echo "host=${hostname}"
  echo "username=${username}"
  echo "password=${token}"
fi`
    }

    writeFileSync(scriptPath, scriptContent, { mode: 0o755 })
    return scriptPath
  }

  /**
   * Attempt Git pull using multiple authentication methods
   */
  async performAuthenticatedPull(branch: string = 'main'): Promise<GitAuthResult> {
    // Method 1: Try credential helper if credentials are available
    if (this.credentials) {
      console.log('Attempting Git pull with credential helper...')
      const credentialSetup = await this.setupCredentialHelper()

      if (credentialSetup.success) {
        try {
          const { stdout, stderr } = await execAsync(`git pull origin ${branch}`, {
            cwd: this.repoPath,
            timeout: 60000
          })

          return {
            success: true,
            method: 'credential-helper',
            message: this.parseGitOutput(stdout)
          }
        } catch (error: any) {
          console.warn('Credential helper method failed:', error.message)
          // Continue to next method
        }
      }

      // Method 2: Try URL authentication as fallback
      console.log('Attempting Git pull with URL authentication...')
      try {
        const { username, token, repoUrl } = this.credentials
        const authenticatedUrl = repoUrl.replace('https://', `https://${username}:${token}@`)

        const { stdout, stderr } = await execAsync(`git pull ${authenticatedUrl} ${branch}`, {
          cwd: this.repoPath,
          timeout: 60000
        })

        return {
          success: true,
          method: 'url-auth',
          message: this.parseGitOutput(stdout)
        }
      } catch (error: any) {
        console.warn('URL authentication method failed:', error.message)
        // Continue to next method
      }
    }

    // Method 3: Try local Git configuration
    console.log('Attempting Git pull with local configuration...')
    try {
      const { stdout, stderr } = await execAsync(`git pull origin ${branch}`, {
        cwd: this.repoPath,
        timeout: 60000
      })

      return {
        success: true,
        method: 'local-config',
        message: this.parseGitOutput(stdout)
      }
    } catch (error: any) {
      console.warn('Local configuration method failed:', error.message)
    }

    // Method 4: Try SSH if available
    console.log('Attempting Git pull with SSH...')
    try {
      // First check if we have SSH remote configured
      const { stdout: remoteInfo } = await execAsync('git remote -v', {
        cwd: this.repoPath,
        timeout: 5000
      })

      if (remoteInfo.includes('git@github.com')) {
        const { stdout, stderr } = await execAsync(`git pull origin ${branch}`, {
          cwd: this.repoPath,
          timeout: 60000
        })

        return {
          success: true,
          method: 'ssh',
          message: this.parseGitOutput(stdout)
        }
      }
    } catch (error: any) {
      console.warn('SSH method failed:', error.message)
    }

    // All methods failed
    return {
      success: false,
      method: 'local-config',
      message: 'All authentication methods failed',
      error: 'Unable to authenticate with Git repository using any available method'
    }
  }

  /**
   * Parse Git output to provide meaningful messages
   */
  private parseGitOutput(stdout: string): string {
    if (stdout.includes('Already up to date') || stdout.includes('Already up-to-date')) {
      return 'Repository is already up to date'
    } else if (stdout.includes('files changed') || stdout.includes('insertions') || stdout.includes('deletions')) {
      return 'Repository updated with new changes'
    } else if (stdout.trim()) {
      return 'Repository updated successfully'
    }
    return 'Git operation completed'
  }

  /**
   * Get diagnostic information about current Git configuration
   */
  async getDiagnosticInfo(): Promise<Record<string, any>> {
    const diagnostics: Record<string, any> = {
      repoPath: this.repoPath,
      repoExists: existsSync(this.repoPath),
      isGitRepo: existsSync(join(this.repoPath, '.git')),
      hasCredentials: !!this.credentials,
      timestamp: new Date().toISOString()
    }

    try {
      // Check git version
      const { stdout: gitVersion } = await execAsync('git --version', { timeout: 5000 })
      diagnostics.gitVersion = gitVersion.trim()
    } catch {
      diagnostics.gitVersion = 'Git not found'
    }

    try {
      // Check current branch
      const { stdout: branch } = await execAsync('git branch --show-current', {
        cwd: this.repoPath,
        timeout: 5000
      })
      diagnostics.currentBranch = branch.trim()
    } catch {
      diagnostics.currentBranch = 'Unknown'
    }

    try {
      // Check remote URLs
      const { stdout: remotes } = await execAsync('git remote -v', {
        cwd: this.repoPath,
        timeout: 5000
      })
      diagnostics.remotes = remotes.trim()
    } catch {
      diagnostics.remotes = 'No remotes configured'
    }

    try {
      // Check git config
      const { stdout: userConfig } = await execAsync('git config --list', {
        cwd: this.repoPath,
        timeout: 5000
      })

      // Extract relevant config (without exposing sensitive data)
      const relevantConfig = userConfig
        .split('\n')
        .filter(line =>
          line.includes('user.name')
          || line.includes('user.email')
          || line.includes('credential.')
          || line.includes('remote.')
        )
        .filter(line => !line.includes('password') && !line.includes('token'))

      diagnostics.gitConfig = relevantConfig
    } catch {
      diagnostics.gitConfig = 'Unable to read git config'
    }

    // Test credential validation if available
    if (this.credentials) {
      const credentialTest = await this.validateCredentials()
      diagnostics.credentialValidation = credentialTest
    }

    return diagnostics
  }

  /**
   * Cleanup any temporary files created by credential helper
   */
  cleanup(): void {
    // This would clean up any temporary credential helper scripts
    // Implementation depends on how we track created temporary files
  }
}
