FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm turbo

COPY . .
# Prune to api + its workspace dependencies
RUN turbo prune api --docker

# ── Installer stage: install deps + build everything ──────────────────────────
FROM node:20-alpine AS installer
WORKDIR /app
RUN npm install -g pnpm

# Install dependencies from pruned lockfile
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# Copy full source into installer
COPY --from=builder /app/out/full/ .

# Generate Prisma client
RUN pnpm --filter @streampay/database run generate

# Build ALL workspace packages that api depends on (types, database, gateway-sdk, risk-engine, etc.)
RUN pnpm --filter "@streampay/*" run build --if-present

# Build the API itself
RUN pnpm --filter api run build

# ── Runner stage: lean production image ───────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm

# Copy the full built workspace (node_modules + dist) from installer
COPY --from=installer /app .

WORKDIR /app/apps/api

CMD ["pnpm", "run", "start:prod"]
