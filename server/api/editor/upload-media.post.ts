import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { requireEditorPermission } from '../../utils/editor-permissions'

const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  // Video
  'video/mp4',
  'video/webm',
  'video/ogg'
]

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500 MB

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

  // Parse multipart form data
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No file uploaded'
    })
  }

  const file = formData[0]

  if (!file.filename || !file.data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid file data'
    })
  }

  // Validate file type
  const mimeType = file.type || 'application/octet-stream'
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw createError({
      statusCode: 400,
      statusMessage: `File type not allowed: ${mimeType}. Allowed types: images, audio, video`,
      data: {
        allowedTypes: ALLOWED_MIME_TYPES
      }
    })
  }

  // Validate file size
  if (file.data.length > MAX_FILE_SIZE) {
    throw createError({
      statusCode: 400,
      statusMessage: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024} MB`
    })
  }

  try {
    // Create media directory structure: public/media/{yyyy}/{mm}/
    const now = new Date()
    const year = now.getFullYear().toString()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')

    const mediaDir = join(process.cwd(), 'public', 'media', year, month)

    // Ensure directory exists
    await fs.mkdir(mediaDir, { recursive: true })

    // Sanitize filename - remove special characters and spaces
    const sanitizedFilename = file.filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase()

    // Add timestamp prefix to avoid conflicts
    const timestamp = Date.now()
    const finalFilename = `${timestamp}_${sanitizedFilename}`

    const filePath = join(mediaDir, finalFilename)

    // Write file
    await fs.writeFile(filePath, file.data)

    // Construct public URL
    const publicUrl = `/media/${year}/${month}/${finalFilename}`

    console.log(`[editor/upload-media] Uploaded file: ${publicUrl}`)

    return {
      success: true,
      file: {
        filename: finalFilename,
        originalFilename: file.filename,
        url: publicUrl,
        size: file.data.length,
        type: mimeType,
        uploadedAt: now.toISOString()
      }
    }
  } catch (error: any) {
    console.error('[editor/upload-media] Error uploading file:', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to upload file',
      data: {
        error: error.message
      }
    })
  }
})
