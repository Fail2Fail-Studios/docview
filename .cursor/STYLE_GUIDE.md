---
title: Cursor Content Style Guide
description: Deterministic rules for converting and authoring Markdown/MDC in F2F DocView.
---

Purpose
- This guide is for automated and semi-automated editing within Cursor. Follow these rules exactly to keep docs consistent and compatible with @nuxt/content and Nuxt UI Pro.
- Never change indentation style or width. This repo uses 2 spaces.

Project context
- Nuxt 4, Vue 3, TypeScript
- @nuxt/content (MDC), @nuxt/ui, @nuxt/ui-pro, nuxt-og-image, nuxt-llms
- Content collections (content.config.ts):
  - landing: single page at content/index.md
  - docs: all other pages (supports optional front matter field `links: [{ label, icon, to, target? }]`)

Directory and ordering rules
- Use numeric prefixes to order folders and files.
  - Folders: 1.getting-started/, 2.essentials/
  - Files: 1.index.md, 2.installation.md, 3.usage.md
- Routes omit numeric prefixes (e.g. /getting-started/installation).
- Each section folder includes .navigation.yml with at least a title; optional icon.

.navigation.yml examples
```yaml
# content/1.getting-started/.navigation.yml
title: Getting Started
icon: false
```
```yaml
# content/2.essentials/.navigation.yml
title: Essentials
```

Front matter rules
- Required per page: title, description
- Optional per page: navigation.icon, links (must match content.config.ts schema)
- Do not duplicate the title as H1 in the body.

Example
```yaml
---
title: Installation
description: Install and set up the project locally.
navigation:
  icon: i-lucide-cog
links:
  - label: Repository
    icon: i-simple-icons-github
    to: https://github.com/your/repo
    target: _blank
---
```

Heading policy
- Body must start at H2 (##). No H1 in body.
- Use H3 (###) and H4 (####) as needed; keep shallow. The site TOC search depth is 1.

Link policy
- Internal links: root-relative, no extensions.
  - Good: [Installation](/getting-started/installation)
  - Bad: [Installation](./installation.md)
- External links: full URLs, descriptive anchor text.

Code policy
- Inline code: wrap with backticks.
- Fenced blocks: always specify a language (ts, js, bash, vue, json, mdc, yaml, etc.).
- Optional filename labels and line highlighting are supported.

Examples
```ts
export default defineNuxtConfig({
  modules: ['@nuxt/ui-pro']
})
```
```ts [nuxt.config.ts]
export default defineNuxtConfig({
  modules: ['@nuxt/ui-pro']
})
```
```ts{2,4-5}
export default defineAppConfig({
  ui: { /* ... */ }
})
```

MDC components
- Use these for richer presentations. Follow syntax exactly.

code-group (tabs)
````mdc
:::code-group
```bash [pnpm]
pnpm add @nuxt/ui-pro
```
```bash [npm]
npm install @nuxt/ui-pro
```
:::
````

code-preview (preview + code)
````mdc
::code-preview
`inline code`

#code
```mdc
`inline code`
```
::
````

code-collapse (collapsible long snippet)
````mdc
:::code-collapse
```css [main.css]
@import "tailwindcss";
@import "@nuxt/ui-pro";
```
:::
````

code-tree (file tree with multiple files)
````mdc
:::code-tree{default-value="app/app.config.ts"}
```ts [nuxt.config.ts]
export default defineNuxtConfig({ modules: ['@nuxt/ui-pro'] })
```
```css [app/assets/css/main.css]
@import "tailwindcss";
@import "@nuxt/ui-pro";
```
:::
````

Callouts
- Prefer ::tip and ::note; keep content short.
````mdc
::tip
You can customize the copy icon in app.config.ts.
::

::note{to="https://ui.nuxt.com" target="_blank"}
Learn more in the Nuxt UI docs.
::
````

Images
- Place assets under public/ and reference with root-relative paths: /images/diagram.png
- Always include alt text.

Tables
- Keep narrow. For type annotations, you may tag literal backticked values with {lang="ts-type"}.

SEO
- Every page must have front matter title and description.
- Avoid H1 in body; headings start at H2.

nuxt-llms
- Sections are grouped by path prefixes: /getting-started% and /essentials%.
- Keep folder slugs aligned with these names (numeric prefixes are ignored in routes).

Migration process (from generic Markdown)
1) Move the file into the correct folder and add numeric prefixes for ordering.
2) Extract the first H1 as front matter title; remove the H1 from the body.
3) Write/trim a description (<= 160 chars) in front matter.
4) Convert relative links to root-relative internal links.
5) Add language to all code fences; add filenames where helpful.
6) Replace custom admonitions with ::tip or ::note.
7) Split very long pages into multiple ordered files.
8) Add or update .navigation.yml for the section.

Validation checklist
- Front matter title + description present.
- First body heading is ##.
- Internal links are root-relative; external links are absolute.
- Code blocks have languages (and filenames when useful).
- Images have alt text and live under public/.
- Numeric ordering is consistent; .navigation.yml exists.

Non-negotiables
- Do not change indentation style or width.
- Do not reformat unrelated lines.
- Prefer minimal, localized edits.
