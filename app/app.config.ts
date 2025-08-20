export default defineAppConfig({
  ui: {
    colors: {
      primary: 'red',
      neutral: 'neutral',
      discord: 'indigo'
    }
  },
  uiPro: {
    footer: {
      slots: {
        root: 'border-t border-default',
        left: 'text-sm text-muted'
      }
    }
  },
  seo: {
    siteName: 'Project UNA Docs - F2F Studios'
  },
  header: {
    title: 'Fail 2 Fail Docs',
    to: '/',
    logo: {
      alt: 'Fail 2 Fail',
      light: '/img/logo.png',
      dark: '/img/logo-dark.png'
    },
    search: true,
    colorMode: true,
    links: [{
      'icon': 'i-simple-icons-github',
      'to': 'https://github.com/nuxt-ui-pro/docs',
      'target': '_blank',
      'aria-label': 'GitHub'
    }]
  },
  footer: {
    credits: `Copyright © ${new Date().getFullYear()}`,
    colorMode: false,
    links: [{
      'icon': 'i-simple-icons-github',
      'to': 'https://github.com/Fail2Fail-Studios/',
      'target': '_blank',
      'aria-label': 'Nuxt UI on GitHub'
    }]
  },
  toc: {
    title: 'Table of Contents'
    // bottom: {
    //   title: 'Community',
    //   edit: 'https://github.com/nuxt-ui-pro/docs/edit/main/content',
    //   links: [{
    //     icon: 'i-lucide-star',
    //     label: 'Star on GitHub',
    //     to: 'https://github.com/nuxt/ui',
    //     target: '_blank'
    //   }, {
    //     icon: 'i-lucide-book-open',
    //     label: 'Nuxt UI Pro docs',
    //     to: 'https://ui.nuxt.com/getting-started/installation/pro/nuxt',
    //     target: '_blank'
    //   }, {
    //     icon: 'i-simple-icons-nuxtdotjs',
    //     label: 'Purchase a license',
    //     to: 'https://ui.nuxt.com/pro/purchase',
    //     target: '_blank'
    //   }]
    // }
  }
})
