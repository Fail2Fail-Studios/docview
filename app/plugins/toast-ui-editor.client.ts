export default defineNuxtPlugin(() => {
  // Inject Toast UI Editor CSS from public folder to avoid build-time import resolution issues
  useHead({
    link: [
      {
        rel: 'stylesheet',
        href: '/toast-ui/toastui-editor.css'
      },
      {
        rel: 'stylesheet',
        href: '/toast-ui/toastui-editor-dark.css'
      }
    ]
  })
})

