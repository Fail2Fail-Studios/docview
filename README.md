# Nuxt Docs Template

[![Nuxt UI Pro](https://img.shields.io/badge/Made%20with-Nuxt%20UI%20Pro-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com/pro)
[![Deploy to NuxtHub](https://img.shields.io/badge/Deploy%20to-NuxtHub-00DC82?logo=nuxt&labelColor=020420)](https://hub.nuxt.com/new?repo=nuxt-ui-pro/docs)

This template lets you build a documentation with [Nuxt UI Pro](https://ui.nuxt.com/pro) quickly.

- [Live demo](https://docs-template.nuxt.dev/)
- [Documentation](https://ui.nuxt.com/getting-started/installation/pro/nuxt)

<a href="https://docs-template.nuxt.dev/" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://assets.hub.nuxt.com/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJodHRwczovL2RvY3MtdGVtcGxhdGUubnV4dC5kZXYiLCJpYXQiOjE3Mzk0NjM0MTd9.ltVAqPgKG38O01X1zl6MXfrJc55nf9OewXNFjpZ_2JY.jpg?theme=dark">
    <source media="(prefers-color-scheme: light)" srcset="https://assets.hub.nuxt.com/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJodHRwczovL2RvY3MtdGVtcGxhdGUubnV4dC5kZXYiLCJpYXQiOjE3Mzk0NjM0MTd9.ltVAqPgKG38O01X1zl6MXfrJc55nf9OewXNFjpZ_2JY.jpg?theme=light">
    <img alt="Nuxt Docs Template" src="https://assets.hub.nuxt.com/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJodHRwczovL2RvY3MtdGVtcGxhdGUubnV4dC5kZXYiLCJpYXQiOjE3Mzk0NjM0MTd9.ltVAqPgKG38O01X1zl6MXfrJc55nf9OewXNFjpZ_2JY.jpg">
  </picture>
</a>

## Quick Start

```bash [Terminal]
npx nuxi init -t github:nuxt-ui-pro/docs
```

## Setup

Make sure to install the dependencies:

```bash
pnpm install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

## Production

Build the application for production:

```bash
pnpm build
```

Locally preview production build:

```bash
pnpm preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Docker (all-in-one)

This container clones/updates the external docs repository into `/usr/src/una` at startup.

1. Copy `.env.example` to `.env` and fill in variables.
2. Start: `docker compose up -d --build`
3. App runs at `http://localhost:3000`

Important envs:
- `NUXT_GIT_REPO_URL` - HTTPS URL of docs repo
- `NUXT_GIT_USERNAME` / `NUXT_GIT_TOKEN` - bot credentials (optional but required for private repos and pushes)
- `NUXT_GIT_BRANCH` - branch to track (default `main`)
- `NUXT_GIT_REPO_PATH` - should be `/usr/src/una`
- `NUXT_SYNC_SOURCE_PATH` - should be `/usr/src/una/content`
- `NUXT_SYNC_DESTINATION_PATH` - should be `/usr/src/app/content`

## Nuxt Studio integration

Studio is an intuitive CMS interface to edit your Nuxt Content websites.

It take advantage of the Preview API included in Nuxt Content to propose the best editing experience for your content files. Editors can benefit from a user-friendly interface to edit their Markdown, YAML or JSON files.

You can import your project on the platform without any extra setup.

However to enable the live preview on the platform, you just need to activate studio in the content configuration of your `nuxt.config.ts` file.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  content: {
    preview: {
      api: 'https://api.nuxt.studio'
    }
  }
})
```

Read more on [Nuxt Studio docs](https://content.nuxt.com/studio/setup).

## Renovate integration

Install [Renovate GitHub app](https://github.com/apps/renovate/installations/select_target) on your repository and you are good to go.
