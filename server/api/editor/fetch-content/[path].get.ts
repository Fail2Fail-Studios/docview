import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { requireEditorPermission } from '../../../utils/editor-permissions'

export default defineEventHandler(async (event) => {
  // Check editor permissions (throws 403 if not allowed)
  await requireEditorPermission(event)

  // Get user session
  const session = await getUserSession(event)

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  // Get file path from route params
  const path = getRouterParam(event, 'path')

  if (!path) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File path is required'
    })
  }

  // Decode the path
  const decodedPath = decodeURIComponent(path)

  // Get runtime config
  const config = useRuntimeConfig()
  const gitRepoPath = config.gitRepoPath

  if (!gitRepoPath) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Git repository path not configured'
    })
  }

  try {
    // Read file from git repo
    const fullPath = join(gitRepoPath, 'content', decodedPath)
    
    console.log('[editor/content] Reading file:', fullPath)
    
    const rawMarkdown = await fs.readFile(fullPath, 'utf-8')

    // Parse front matter and body
    const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
    const match = rawMarkdown.match(frontMatterRegex)

    if (!match) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid markdown format - front matter not found'
      })
    }

    const frontMatterText = match[1]
    const body = match[2]

    // Parse title and description from front matter
    let title = ''
    let description = ''

    const lines = frontMatterText.split('\n')
    for (const line of lines) {
      if (line.startsWith('title:')) {
        title = line.substring(6).trim()
      } else if (line.startsWith('description:')) {
        description = line.substring(12).trim()
      }
    }

    console.log('[editor/content] Successfully parsed content:', {
      path: decodedPath,
      title,
      descriptionLength: description.length,
      bodyLength: body.length
    })

    return {
      success: true,
      content: {
        title,
        description,
        body,
        rawMarkdown
      }
    }
  } catch (error: any) {
    console.error('[editor/content] Error reading file:', error)

    // Check if file doesn't exist
    if (error.code === 'ENOENT') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Content file not found',
        data: {
          path: decodedPath,
          error: 'File does not exist in the git repository'
        }
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to read content',
      data: {
        error: error.message,
        details: error.toString()
      }
    })
  }
})

