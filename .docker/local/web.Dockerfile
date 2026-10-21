FROM node:22.23.4-alpine@sha256:ce8d97f7cfc7c5386421eb932df20a29df99b1a7f469f6157d5c9956702ffadc

RUN apk add --no-cache libc6-compat \
    && corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

ENV HOST=0.0.0.0 \
    PORT=3000

CMD ["pnpm", "run", "dev", "--host", "0.0.0.0"]
