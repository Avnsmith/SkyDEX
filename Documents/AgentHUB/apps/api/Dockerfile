# ─── BUNDLE BUILD STAGE ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Install pnpm globally
RUN npm install -g pnpm

# Copy monorepo configurations
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/sdk/package.json ./packages/sdk/
COPY apps/api/package.json ./apps/api/

# Fetch dependencies (cached layer)
RUN pnpm install --frozen-lockfile

# Copy full source trees
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Generate prisma client inside backend
RUN pnpm --filter @agenthub/api prisma:generate

# Build shared packages first, then the NestJS API
RUN pnpm --filter @agenthub/config build || true
RUN pnpm --filter @agenthub/types build || true
RUN pnpm --filter @agenthub/sdk build || true
RUN pnpm --filter @agenthub/api build

# ─── RUNTIME STAGE ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /usr/src/app

RUN npm install -g pnpm

# Enforce secure node production environment
ENV NODE_ENV=production

# Copy configurations
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --from=builder /usr/src/app/packages/ ./packages/
COPY --from=builder /usr/src/app/apps/api/package.json ./apps/api/
COPY --from=builder /usr/src/app/apps/api/dist ./apps/api/dist
COPY --from=builder /usr/src/app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Run database migrations and bootstrap the runtime under unprivileged user
USER node

EXPOSE 4000

CMD ["node", "apps/api/dist/apps/api/src/main"]
