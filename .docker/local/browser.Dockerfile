FROM mcr.microsoft.com/playwright:v1.61.1-noble

RUN corepack enable \
    && corepack prepare pnpm@10.6.3 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

CMD ["pnpm", "exec", "playwright", "test", "--config", "playwright.local.config.ts"]
