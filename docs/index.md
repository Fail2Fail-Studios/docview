# F2F DocView Documentation

Welcome to the F2F DocView project documentation. This is a modern Nuxt 4 documentation platform with Discord-based authentication and a rich content management system.

## Overview

F2F DocView is built as a secure documentation platform that requires Discord server membership for access. It leverages the latest Nuxt 4 features with a modern tech stack including Nuxt UI Pro, TypeScript, and Tailwind CSS v4.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run linting
pnpm lint

# Type checking
pnpm typecheck
```

## Project Structure

```
f2f-docview/
├── app/                    # Nuxt 4 app directory
│   ├── components/         # Vue components
│   ├── layouts/           # Page layouts
│   ├── middleware/        # Route middleware
│   ├── pages/            # Application pages
│   └── assets/           # Static assets
├── content/              # Nuxt Content files
├── server/               # Server-side code
│   └── api/             # API routes
├── docs/                # Project documentation
└── types/               # TypeScript definitions
```

## Documentation Sections

### [Tech Stack & Architecture](./tech-stack.md)
Learn about the technologies, modules, and architectural decisions that power this project.

### [Development Guidelines](./development.md)
Best practices, coding standards, and development workflow for contributors.

### [Authentication System](./authentication.md)
How Discord OAuth integration works and access control mechanisms.

### [UI/UX Patterns](./ui-components.md)
Design system, component usage, and styling conventions.

### [Content Management](./content-management.md)
Working with Nuxt Content, markdown files, and content collections.

## Key Features

- **Discord Authentication**: Secure access control through Discord OAuth with server membership validation
- **Modern UI**: Built with Nuxt UI Pro and Tailwind CSS v4 for a polished experience
- **Content Management**: Powered by Nuxt Content with MDC support
- **Type Safety**: Full TypeScript integration with strict typing
- **Performance**: SSR/SSG optimized with Nuxt 4 and Nitro
- **Search**: Built-in content search functionality
- **Responsive Design**: Mobile-first design with dark/light mode support

## Environment Setup

The project requires specific environment variables for Discord authentication:

```bash
NUXT_OAUTH_DISCORD_CLIENT_ID=your_discord_client_id
NUXT_OAUTH_DISCORD_CLIENT_SECRET=your_discord_client_secret
NUXT_REQUIRED_DISCORD_GUILD_ID=your_discord_server_id
NUXT_AUTH_BASE_URL=http://localhost:3000
```

## Contributing

1. Follow the [development guidelines](./development.md)
2. Ensure all code passes linting and type checking
3. Test authentication flows thoroughly
4. Update documentation for any new features

## Support

For questions or issues, refer to the specific documentation sections or check the project's Discord server for community support.
