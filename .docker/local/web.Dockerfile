FROM node:22-alpine

RUN apk add --no-cache libc6-compat \
    && corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

ENV HOST=0.0.0.0 \
    PORT=3000

CMD ["pnpm", "run", "dev", "--host", "0.0.0.0"]
