export interface PresenceTabEntry {
  userId: string
  lastSeenAt: number
  isEditing: boolean
}

export interface PresenceSnapshotUser {
  id: string
  name: string
  avatar?: string
  tabCount: number
}

export interface PresenceSnapshot {
  pagePath: string
  viewers: PresenceSnapshotUser[]
  editorUserId?: string
}
