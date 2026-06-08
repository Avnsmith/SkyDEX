FROM node:22-alpine AS base

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
RUN pnpm --filter api run build

# ── 4. Prune dev dependencies ───────────────────────────────────────────────
RUN pnpm --filter api --prod deploy /prod

# Copy built dist into prod
COPY --from=base /app/apps/api/dist /prod/dist
COPY --from=base /app/apps/api/prisma /prod/prisma
COPY --from=base /app/packages /prod/packages

# ── 5. Runtime stage ────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

COPY --from=base /prod .

# Generate Prisma client for production target
RUN npx prisma generate --schema=prisma/schema.prisma

EXPOSE 3001

ENV NODE_ENV=production

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
