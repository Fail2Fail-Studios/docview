/**
 * File Lock Manager
 *
 * In-memory file locking system to prevent concurrent edits.
 * Locks are per-file and include automatic expiration.
 */

export interface FileLock {
  filePath: string
  userId: string
  userName: string
  userAvatar?: string
  tabId: string
  lockedAt: Date
  expiresAt: Date
  lastExtendedAt?: Date
}

export interface LockAcquisitionResult {
  success: boolean
  lock?: FileLock
  error?: string
  lockedBy?: {
    userName: string
    lockedAt: Date
    expiresAt: Date
  }
}

class FileLockManager {
  private locks: Map<string, FileLock>
  private readonly lockTimeoutMs: number
  private cleanupInterval: NodeJS.Timeout | null

  constructor(lockTimeoutMs: number = 30 * 60 * 1000) { // 30 minutes default
    this.locks = new Map()
    this.lockTimeoutMs = lockTimeoutMs
    this.cleanupInterval = null
    this.startCleanupInterval()
  }

  /**
   * Start automatic cleanup of expired locks every minute
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredLocks()
    }, 60 * 1000) // Run every minute
  }

  /**
   * Stop the cleanup interval (for testing or shutdown)
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Attempt to acquire a lock on a file
   */
  acquireLock(
    filePath: string,
    userId: string,
    userName: string,
    tabId: string,
    userAvatar?: string
  ): LockAcquisitionResult {
    // Normalize file path
    const normalizedPath = this.normalizePath(filePath)

    // Check if file is already locked
    const existingLock = this.locks.get(normalizedPath)

    if (existingLock) {
      // Check if lock has expired
      if (new Date() > existingLock.expiresAt) {
        // Lock expired, remove it and allow acquisition
        this.locks.delete(normalizedPath)
      } else if (existingLock.userId === userId && existingLock.tabId === tabId) {
        // Same user AND same tab already owns this lock, extend it
        return this.extendLock(normalizedPath, userId, tabId)
      } else if (existingLock.userId === userId) {
        // Same user but different tab - deny access
        return {
          success: false,
          error: 'File is currently locked by you in another tab',
          lockedBy: {
            userName: existingLock.userName,
            lockedAt: existingLock.lockedAt,
            expiresAt: existingLock.expiresAt
          }
        }
      } else {
        // Lock is held by another user
        return {
          success: false,
          error: 'File is currently locked by another user',
          lockedBy: {
            userName: existingLock.userName,
            lockedAt: existingLock.lockedAt,
            expiresAt: existingLock.expiresAt
          }
        }
      }
    }

    // Create new lock
    const now = new Date()
    const lock: FileLock = {
      filePath: normalizedPath,
      userId,
      userName,
      userAvatar,
      tabId,
      lockedAt: now,
      expiresAt: new Date(now.getTime() + this.lockTimeoutMs)
    }

    this.locks.set(normalizedPath, lock)

    return {
      success: true,
      lock
    }
  }

  /**
   * Extend an existing lock (keep-alive)
   */
  extendLock(filePath: string, userId: string, tabId: string): LockAcquisitionResult {
    const normalizedPath = this.normalizePath(filePath)
    const lock = this.locks.get(normalizedPath)

    if (!lock) {
      return {
        success: false,
        error: 'No lock exists for this file'
      }
    }

    if (lock.userId !== userId || lock.tabId !== tabId) {
      return {
        success: false,
        error: 'Lock is owned by another user or tab',
        lockedBy: {
          userName: lock.userName,
          lockedAt: lock.lockedAt,
          expiresAt: lock.expiresAt
        }
      }
    }

    // Extend the lock
    const now = new Date()
    lock.expiresAt = new Date(now.getTime() + this.lockTimeoutMs)
    lock.lastExtendedAt = now

    return {
      success: true,
      lock
    }
  }

  /**
   * Release a lock
   */
  releaseLock(filePath: string, userId: string, tabId?: string, isAdmin: boolean = false): boolean {
    const normalizedPath = this.normalizePath(filePath)
    const lock = this.locks.get(normalizedPath)

    if (!lock) {
      return false // No lock to release
    }

    // Admins can release any lock
    if (isAdmin) {
      this.locks.delete(normalizedPath)
      return true
    }

    // Only the same user AND same tab (or admin) can release
    if (lock.userId !== userId || (tabId && lock.tabId !== tabId)) {
      return false
    }

    this.locks.delete(normalizedPath)
    return true
  }

  /**
   * Check if a file is locked
   */
  isLocked(filePath: string): boolean {
    const normalizedPath = this.normalizePath(filePath)
    const lock = this.locks.get(normalizedPath)

    if (!lock) {
      return false
    }

    // Check if expired
    if (new Date() > lock.expiresAt) {
      this.locks.delete(normalizedPath)
      return false
    }

    return true
  }

  /**
   * Get lock information for a file
   */
  getLockInfo(filePath: string): FileLock | null {
    const normalizedPath = this.normalizePath(filePath)
    const lock = this.locks.get(normalizedPath)

    if (!lock) {
      return null
    }

    // Check if expired
    if (new Date() > lock.expiresAt) {
      this.locks.delete(normalizedPath)
      return null
    }

    return lock
  }

  /**
   * Get all active locks (for admin)
   */
  getAllLocks(): FileLock[] {
    const now = new Date()
    const activeLocks: FileLock[] = []

    for (const [path, lock] of this.locks.entries()) {
      if (now <= lock.expiresAt) {
        activeLocks.push(lock)
      }
    }

    return activeLocks
  }

  /**
   * Clean up expired locks
   */
  cleanupExpiredLocks(): number {
    const now = new Date()
    let cleanedCount = 0

    for (const [path, lock] of this.locks.entries()) {
      if (now > lock.expiresAt) {
        this.locks.delete(path)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.log(`[FileLockManager] Cleaned up ${cleanedCount} expired lock(s)`)
    }

    return cleanedCount
  }

  /**
   * Force release all locks (for testing/emergency)
   */
  releaseAllLocks(): number {
    const count = this.locks.size
    this.locks.clear()
    return count
  }

  /**
   * Normalize file path for consistent comparison
   */
  private normalizePath(filePath: string): string {
    return filePath
      .replace(/\\/g, '/') // Convert backslashes to forward slashes
      .replace(/^\/+/, '') // Remove leading slashes
      .toLowerCase() // Case-insensitive
  }

  /**
   * Get lock statistics
   */
  getStats() {
    return {
      totalLocks: this.locks.size,
      activeLocks: this.getAllLocks().length,
      lockTimeoutMinutes: this.lockTimeoutMs / (60 * 1000)
    }
  }
}

// Singleton instance
let lockManagerInstance: FileLockManager | null = null

export function getFileLockManager(): FileLockManager {
  if (!lockManagerInstance) {
    // Get timeout from environment or use default (30 minutes)
    const timeoutMs = parseInt(process.env.FILE_LOCK_TIMEOUT_MS || '1800000')
    lockManagerInstance = new FileLockManager(timeoutMs)
    console.log(`[FileLockManager] Initialized with ${timeoutMs / 1000 / 60} minute timeout`)
  }
  return lockManagerInstance
}

// Export for testing
export function resetFileLockManager(): void {
  if (lockManagerInstance) {
    lockManagerInstance.stopCleanupInterval()
    lockManagerInstance = null
  }
}
