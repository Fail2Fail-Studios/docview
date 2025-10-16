import { versionCache } from '../utils/version-cache'

interface VersionResponse {
  success: boolean
  version: string
  commit: string
  timestamp: number
  error?: string
}

export default defineEventHandler(async (event): Promise<VersionResponse> => {
  try {
    // Get version from in-memory cache
    const versionInfo = await versionCache.getVersion()

    return {
      success: true,
      version: versionInfo.version,
      commit: versionInfo.commit,
      timestamp: versionInfo.timestamp
    }
  } catch (error: any) {
    console.error('Failed to get app version from cache:', error)

    return {
      success: false,
      version: 'v1.0.0',
      commit: 'unknown',
      timestamp: Date.now(),
      error: error.message || 'Failed to get version info'
    }
  }
})
