import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { platform } from 'node:os'
import type { DiscordUser } from '../../types/auth'
import type { SyncResponse } from '../../types/sync'

const execAsync = promisify(exec)

export default defineEventHandler(async (event): Promise<SyncResponse> => {
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
  const sourcePath = config.syncSourcePath
  const destinationPath = config.syncDestinationPath
  const timeout = config.syncTimeout || 30000

  // Validate configuration
  if (!sourcePath || !destinationPath) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Sync paths not configured. Please set NUXT_SYNC_SOURCE_PATH and NUXT_SYNC_DESTINATION_PATH environment variables.'
    })
  }

  // Validate paths exist
  if (!existsSync(sourcePath)) {
    throw createError({
      statusCode: 500,
      statusMessage: `Source path does not exist: ${sourcePath}`
    })
  }

  if (!existsSync(destinationPath)) {
    throw createError({
      statusCode: 500,
      statusMessage: `Destination path does not exist: ${destinationPath}`
    })
  }

  try {
    console.log(`Document sync initiated by user: ${discordUser.username} (${discordUser.id})`)
    console.log(`Syncing from: ${sourcePath}`)
    console.log(`Syncing to: ${destinationPath}`)

    const startTime = Date.now()
    const isWindows = platform() === 'win32'

    let command: string
    let commandName: string

    if (isWindows) {
      // Use robocopy on Windows (built-in, no external dependencies)
      // /MIR = mirror directory (equivalent to rsync --delete)
      // /E = copy subdirectories including empty ones
      // /R:2 = retry 2 times on failed copies
      // /W:1 = wait 1 second between retries
      command = `robocopy "${sourcePath}" "${destinationPath}" /MIR /E /R:2 /W:1`
      commandName = 'robocopy'
    } else {
      // Use rsync on Linux/macOS
      command = `rsync -av --delete "${sourcePath}/" "${destinationPath}/"`
      commandName = 'rsync'
    }

    console.log(`Executing ${commandName} command:`, command)

    const { stdout, stderr } = await execAsync(command, {
      timeout
    })

    const duration = Date.now() - startTime
    const timestamp = Date.now()

    // Log successful sync
    console.log(`Document sync completed successfully in ${duration}ms`)
    console.log(`${commandName} output:`, stdout)

    if (stderr && !isWindows) {
      // On Linux, stderr might contain warnings
      console.warn(`${commandName} warnings:`, stderr)
    }

    return {
      success: true,
      message: 'Documents synced successfully',
      timestamp
    }
  } catch (error: any) {
    console.error('Document sync failed:', error)

    // Handle different types of errors
    let errorMessage = 'Sync operation failed'

    if (error.code === 'ENOENT') {
      const commandName = platform() === 'win32' ? 'robocopy' : 'rsync'
      errorMessage = `${commandName} command not found or paths invalid`
    } else if (error.code === 'EACCES') {
      errorMessage = 'Permission denied accessing sync directories'
    } else if (error.signal === 'SIGTERM' || error.killed) {
      errorMessage = 'Sync operation timed out'
    } else if (error.stdout || error.stderr) {
      // For robocopy, exit codes 0-3 are actually success, > 3 is error
      if (platform() === 'win32' && error.code <= 3) {
        const duration = Date.now() - Date.now()
        console.log('Robocopy completed with informational exit code:', error.code)
        console.log('Robocopy output:', error.stdout)

        return {
          success: true,
          message: 'Documents synced successfully',
          timestamp: Date.now()
        }
      }

      errorMessage = `Sync error: ${error.stderr || error.stdout || error.message}`
    }

    throw createError({
      statusCode: 500,
      statusMessage: errorMessage,
      data: {
        success: false,
        message: errorMessage,
        timestamp: Date.now(),
        error: error.message
      }
    })
  }
})
