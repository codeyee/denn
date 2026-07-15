FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# https://github.com/nodejs/docker-node/tree/main#nodealpine — libc6-compat
# is required by the platform-specific rollup binaries pulled in by Vite.
RUN apk add --no-cache libc6-compat
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Build the TanStack Start app. Vite produces `.output/` (Nitro server +
# static client assets).
FROM base AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN pnpm run build

# Runtime image — only the Nitro `.output/` and the static `public/` are
# needed at runtime.
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 denn

COPY --from=builder --chown=denn:nodejs /app/public ./public
COPY --from=builder --chown=denn:nodejs /app/.output ./.output

USER denn

EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0

CMD ["node", ".output/server/index.mjs"]
