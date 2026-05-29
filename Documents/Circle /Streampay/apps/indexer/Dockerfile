FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm turbo

COPY . .
RUN turbo prune --scope=indexer --docker

FROM node:20-alpine AS installer
WORKDIR /app
RUN npm install -g pnpm

COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
RUN pnpm --filter indexer run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm

COPY --from=installer /app .
WORKDIR /app/apps/indexer

CMD ["pnpm", "run", "start"]
