# syntax=docker/dockerfile:1.6

FROM node:20-bullseye

# Install build tools for native deps (sharp, better-sqlite3, etc.)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Enable corepack and set pnpm version
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.18.0 --activate

# Copy only package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
# For development, allow installing without a frozen lockfile to match package.json
RUN pnpm install --no-frozen-lockfile

# Copy the rest of the app
COPY . .

# Expose dev port
EXPOSE 3000

# Default command for development (override in compose if needed)
CMD ["pnpm", "dev", "--host", "0.0.0.0"]


