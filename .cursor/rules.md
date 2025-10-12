---
title: Project Rules
description: Project scope and outline 
---

F2F DocView - Project Rules

Project overview
- Stack: Nuxt 4, Vue 3, TypeScript, @nuxt/content (MDC), @nuxt/ui, @nuxt/ui-pro 3, nuxt-og-image.
- Purpose: Content-driven documentation site with searchable, well-structured docs and a polished UI. Docs will be updated in a seperate repo and synced into the content folder using a standardized format.

Considerations
- Please use all MCP tools available. Context 7 for documents, and Nuxt-MCP for working inside the nuxt project.
- Always use Nuxt 4 and Vue 3 native functions and best practices for simplicity, and clean execution.
- Ask follow up questions when you are confused, or if you need clarification. 
- We are not worried about testing, do not write tests or spend extensive time fixing type/lint errors unless they are code breaking or told directly to work on them.

How to run
- Install: pnpm install
- Dev: pnpm dev
- Build: pnpm build
- Generate (SSG): pnpm generate
- Preview: pnpm preview
- Lint: pnpm lint
- Typecheck: pnpm typecheck

Repository layout (high level)
- app/: Nuxt app source (SFCs, layouts, CSS, components)
- content/: Documentation content in Markdown/MDC
- public/: Static assets served at site root
- content.config.ts: Content collections and schema
- nuxt.config.ts: Nuxt modules and project config

Coding standards (code and config)
- Indentation: 2 spaces. Never mix tabs/spaces. Preserve existing indentation and width in all edits.
- TypeScript preferred; avoid any unless necessary.
- ESLint: Respect configured stylistic rules (braceStyle 1tbs, no trailing commas).
- Control flow: favor early returns, avoid deep nesting; meaningful error handling.
- Naming: descriptive, avoid 1-2 character identifiers; functions are verbs; variables are nouns.
- Comments: explain intent, not obvious mechanics. Avoid TODO; implement instead.
- Formatting: do not reformat unrelated code; keep diffs minimal and scoped.

Vue and Nuxt conventions
- Use script setup with TypeScript for SFCs when possible.
- Keep components cohesive and small; prefer composition over large monoliths.
- Follow existing patterns in app/layouts/docs.vue for navigation and page layout.

Content authoring (Markdown/MDC)
- Collections: "landing" (single index.md) and "docs" (everything else). "docs" supports optional "links" front-matter array with keys: label, icon, to, target? (see content.config.ts schema).
- File naming and ordering:
  - Use numeric prefixes for ordering, e.g. 1.getting-started/, 2.essentials/, and inside: 1.index.md, 2.installation.md.
  - Routes omit numeric prefixes (e.g. /getting-started/installation).
- Section navigation metadata:
  - Add .navigation.yml in a section folder with at least "title:" and optional "icon:".
- Front matter per page:
  - Required: title, description.
  - Optional: navigation.icon, links (array matching schema in content.config.ts).
- Headings:
  - Do not include an H1 in the body; front matter title is used as page title.
  - Start content headings at H2 (##) and nest with H3 (###), etc.
  - TOC depth is configured to 1; keep sections shallow and purposeful.
- Links:
  - Internal: root-relative (/getting-started/installation).
  - External: full URL; prefer descriptive anchor text.
- Code:
  - Inline code with backticks.
  - Fenced blocks must specify language (e.g. ts, bash, vue, json, mdc).
  - Optional filename label and line highlighting are supported by the theme.
  - Group variants with code-group; previews with code-preview; collapsible with code-collapse; file trees with code-tree.
- Callouts:
  - Use MDC shortcodes like ::tip and ::note. Keep messages concise.
- Images:
  - Prefer assets under public/ and reference with root-relative paths (e.g. /images/diagram.png). Always provide alt text.
- Tables and lists: use standard Markdown; keep narrow for readability.
- Whitespace: .editorconfig preserves trailing spaces in .md. Avoid relying on two-space line breaks; use explicit paragraphs.

Content directory structure (example)
- content/
  - 1.getting-started/
    - .navigation.yml
    - 1.index.md
    - 2.installation.md
    - 3.usage.md
  - 2.essentials/
    - .navigation.yml
    - 1.markdown-syntax.md
    - 2.code-blocks.md
  - index.md (landing page only)

Nuxt LLMS sections
- nuxt-llms groups content by path prefixes "/getting-started%" and "/essentials%". Keep section folder names aligned with those slugs (numeric prefixes OK; slugs without numbers).

PRs and commits
- Use clear, Conventional Commit-style messages when possible (feat:, fix:, docs:, refactor:, chore:, perf:, ci:, test:).
- Keep edits focused. Include a brief rationale in the PR description.
- Ensure pnpm typecheck and pnpm lint pass before merging. For content-only PRs, verify local build and navigation integrity.

Non-negotiables
- Do not change indentation style or width in any file.
- Do not silently reformat large files.
- Keep navigation and ordering consistent with numeric prefixes and .navigation.yml.

Notes for tool-assisted edits (Cursor)
- Prefer minimal diffs and localized edits.
- When adding examples, mirror existing MDC patterns used in content/ (code blocks with languages, filenames, callouts).
