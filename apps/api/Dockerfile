FROM node:22-alpine AS base

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Install pnpm
RUN npm install -g pnpm@11.5.0

WORKDIR /app

# ── 1. Copy manifests and install dependencies ─────────────────────────────
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/spacecomputer/package.json ./packages/spacecomputer/

RUN pnpm install --frozen-lockfile --ignore-scripts

# ── 2. Copy source ──────────────────────────────────────────────────────────
COPY packages/shared ./packages/shared
COPY packages/spacecomputer ./packages/spacecomputer
COPY apps/api ./apps/api

# ── 3. Build shared packages first, then API ────────────────────────────────
RUN pnpm --filter @orbitnote/shared build
RUN pnpm --filter @orbitnote/spacecomputer build
RUN pnpm --filter api exec prisma generate --schema=prisma/schema.prisma
RUN pnpm --filter api run build

# ── 4. Prune dev dependencies ───────────────────────────────────────────────
RUN pnpm --filter api --prod deploy --legacy /prod

# Copy built dist into prod
RUN cp -r /app/apps/api/dist /prod/dist && \
    cp -r /app/apps/api/prisma /prod/prisma && \
    cp -r /app/packages /prod/packages

# ── 5. Runtime stage ────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

# Install openssl for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=base /prod .

# Generate Prisma client for production target
RUN ./node_modules/.bin/prisma generate --schema=prisma/schema.prisma

EXPOSE 3001

ENV NODE_ENV=production

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main"]
