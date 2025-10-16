import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

interface VersionInfo {
  version: string
  commit: string
  timestamp: number
}

/**
 * Singleton in-memory cache for version information
 * Reads from git repository and caches the result
 * Invalidates on manual refresh or editor save
 */
class VersionCache {
  private cache: VersionInfo | null = null

  /**
   * Get cached version info, initializing if needed
   */
  async getVersion(): Promise<VersionInfo> {
    if (!this.cache) {
      await this.refreshVersion()
    }
    return this.cache!
  }

  /**
   * Refresh version info from git repository
   * Called on server startup (lazy), manual refresh, and editor save
   */
  async refreshVersion(): Promise<void> {
    try {
      const config = useRuntimeConfig()
      const repoPath = config.gitRepoPath || ''

      // Get commit hash from repository
      let commit = 'unknown'
      try {
        if (repoPath && existsSync(repoPath)) {
          const { stdout } = await execAsync('git rev-parse HEAD', { cwd: repoPath })
          commit = stdout.trim()
        } else {
          // Fallback to current app repo if content repo not available
          const { stdout } = await execAsync('git rev-parse HEAD')
          commit = stdout.trim()
        }
      } catch (gitError) {
        console.warn('[VersionCache] Failed to get git commit:', gitError)
      }

      // Try to get version from repository README.md line 3
      let version = 'v1.0.0' // fallback version

      try {
        if (repoPath && existsSync(repoPath)) {
          const readmePath = join(repoPath, 'README.md')

          if (existsSync(readmePath)) {
            console.log(`[VersionCache] Reading version from README.md: ${readmePath}`)
            const readmeContent = await readFile(readmePath, 'utf-8')
            const lines = readmeContent.split('\n')

            // Check line 3 (index 2) for version information
            if (lines.length >= 3 && lines[2]) {
              const line3 = lines[2].trim()
              console.log(`[VersionCache] README.md line 3: "${line3}"`)

              // Look for version patterns in line 3
              // Common patterns: v1.2.3, 1.2.3, Version 1.2.3, etc.
              const versionMatch = line3.match(/(?:v|version\s*)?(\d+\.\d+\.\d+(?:-[\w.-]+)?)/i)

              if (versionMatch) {
                version = versionMatch[1].startsWith('v') ? versionMatch[1] : `v${versionMatch[1]}`
                console.log(`[VersionCache] Extracted version from README.md: ${version}`)
              } else {
                console.warn(`[VersionCache] No version pattern found in README.md line 3: "${line3}"`)
                throw new Error('No version pattern found in README.md line 3')
              }
            } else {
              console.warn('[VersionCache] README.md does not have at least 3 lines')
              throw new Error('README.md does not have enough lines')
            }
          } else {
            console.warn(`[VersionCache] README.md not found at: ${readmePath}`)
            throw new Error('README.md not found in repository')
          }
        } else {
          console.warn(`[VersionCache] Repository path not configured or does not exist: ${repoPath}`)
          throw new Error('Repository path not available')
        }
      } catch (versionError) {
        console.warn('[VersionCache] Failed to read version from README.md:', versionError)

        // Fallback: try to get version from git tags
        try {
          if (repoPath && existsSync(repoPath)) {
            const { stdout: tagOutput } = await execAsync('git describe --tags --abbrev=0', { cwd: repoPath })
            if (tagOutput.trim()) {
              version = tagOutput.trim()
              console.log(`[VersionCache] Using git tag as fallback version: ${version}`)
            }
          }
        } catch (tagError) {
          // Final fallback: use commit-based version
          const shortCommit = commit.substring(0, 7)
          version = `v1.0.0-${shortCommit}`
          console.log(`[VersionCache] Using commit-based fallback version: ${version}`)
        }
      }

      // Update cache
      this.cache = {
        version,
        commit,
        timestamp: Date.now()
      }

      console.log(`[VersionCache] Cache updated: ${version} (${commit.substring(0, 7)})`)
    } catch (error: any) {
      console.error('[VersionCache] Failed to refresh version:', error)

      // Set fallback cache on error
      this.cache = {
        version: 'v1.0.0',
        commit: 'unknown',
        timestamp: Date.now()
      }
    }
  }

  /**
   * Clear the cache (for testing purposes)
   */
  clear(): void {
    this.cache = null
  }
}

// Export singleton instance
export const versionCache = new VersionCache()

