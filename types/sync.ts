export interface SyncResponse {
  success: boolean
  message: string
  timestamp: number
  error?: string
}

export interface SyncStatus {
  isLoading: boolean
  error: string | null
  lastSyncTime: number | null
}
