import { defineNitroPlugin } from '#nitro'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error: any, context: any = {}) => {
    const url = context?.event?.path || context?.event?.req?.url || 'unknown'

    console.error('[Nitro Error]', {
      url,
      message: error?.message,
      stack: error?.stack
    })
  })
})
