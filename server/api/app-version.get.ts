import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

interface VersionResponse {
  success: boolean
  version: string
  commit: string
  timestamp: number
  error?: string
}

export default defineEventHandler(async (event): Promise<VersionResponse> => {
  try {
    // Get UNA repository configuration
    const config = useRuntimeConfig()
    const repoPath = config.gitRepoPath || ''
    
    // Get commit hash from UNA repository
    let commit = ''
    try {
      if (repoPath && existsSync(repoPath)) {
        const { stdout } = await execAsync('git rev-parse HEAD', { cwd: repoPath })
        commit = stdout.trim()
      } else {
        // Fallback to current app repo if UNA repo not available
        const { stdout } = await execAsync('git rev-parse HEAD')
        commit = stdout.trim()
      }
    } catch (gitError) {
      console.warn('Failed to get git commit:', gitError)
      commit = 'unknown'
    }

    // Try to get version from UNA repository README.md line 3
    let version = 'v1.0.0' // fallback version

    try {
      if (repoPath && existsSync(repoPath)) {
        const readmePath = join(repoPath, 'README.md')
        
        if (existsSync(readmePath)) {
          console.log(`Reading version from UNA README.md: ${readmePath}`)
          const readmeContent = await readFile(readmePath, 'utf-8')
          const lines = readmeContent.split('\n')
          
          // Check line 3 (index 2) for version information
          if (lines.length >= 3 && lines[2]) {
            const line3 = lines[2].trim()
            console.log(`README.md line 3: "${line3}"`)
            
            // Look for version patterns in line 3
            // Common patterns: v1.2.3, 1.2.3, Version 1.2.3, etc.
            const versionMatch = line3.match(/(?:v|version\s*)?(\d+\.\d+\.\d+(?:-[\w.-]+)?)/i)
            
            if (versionMatch) {
              version = versionMatch[1].startsWith('v') ? versionMatch[1] : `v${versionMatch[1]}`
              console.log(`Extracted version from README.md: ${version}`)
            } else {
              console.warn(`No version pattern found in README.md line 3: "${line3}"`)
              throw new Error('No version pattern found in README.md line 3')
            }
          } else {
            console.warn('README.md does not have at least 3 lines')
            throw new Error('README.md does not have enough lines')
          }
        } else {
          console.warn(`README.md not found at: ${readmePath}`)
          throw new Error('README.md not found in UNA repository')
        }
      } else {
        console.warn(`UNA repository path not configured or does not exist: ${repoPath}`)
        throw new Error('UNA repository path not available')
      }
    } catch (versionError) {
      console.warn('Failed to read version from UNA README.md:', versionError)
      
      // Fallback: try to get version from git tags in UNA repo
      try {
        if (repoPath && existsSync(repoPath)) {
          const { stdout: tagOutput } = await execAsync('git describe --tags --abbrev=0', { cwd: repoPath })
          if (tagOutput.trim()) {
            version = tagOutput.trim()
            console.log(`Using git tag as fallback version: ${version}`)
          }
        }
      } catch (tagError) {
        // Final fallback: use commit-based version
        const shortCommit = commit.substring(0, 7)
        version = `v1.0.0-${shortCommit}`
        console.log(`Using commit-based fallback version: ${version}`)
      }
    }

    return {
      success: true,
      version,
      commit,
      timestamp: Date.now()
    }

  } catch (error: any) {
    console.error('Failed to get app version:', error)
    
    return {
      success: false,
      version: 'v1.0.0',
      commit: 'unknown',
      timestamp: Date.now(),
      error: error.message || 'Failed to get version info'
    }
  }
})
