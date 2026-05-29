# AgentHub

> Self-hosted x402 API marketplace on Arc Network — powered by Circle Gateway nanopayments.

[![CI](https://github.com/your-org/agenthub/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/agenthub/actions)

## What is AgentHub?

AgentHub is a decentralized API marketplace where:

- **Sellers** publish APIs and price endpoints in USDC
- **Buyers & AI agents** pay per request via x402 Circle Gateway nanopayments
- **No Stripe, no API keys, no accounts** — just connect a wallet and pay

Think of it as a self-hosted `agents.circle.com/services` powered by Arc Testnet.

---

## Architecture

```
Buyer / AI Agent
  └── GatewayClient (x402)
        └── AgentHub Proxy (NestJS)
              └── x402 middleware (Circle Gateway)
                    └── Seller API endpoint (HTTPS)
```

**Stack:**
- **Frontend**: Next.js 15 + Tailwind + wagmi v2 + Circle App Kit
- **Backend**: NestJS + PostgreSQL + Prisma + Redis + BullMQ
- **Blockchain**: Arc Testnet (Chain ID 5042002, USDC as gas)
- **Payments**: Circle Gateway + x402 protocol
- **Monorepo**: Turborepo + pnpm workspaces

---

## Quick Start

### Prerequisites

- Node.js ≥ 20.18.2
- pnpm ≥ 10
- Docker + Docker Compose
- MetaMask wallet

### 1. Clone and install

```bash
git clone https://github.com/your-org/agenthub.git
cd agenthub
pnpm install
```

### 2. Configure environment

```bash
# Backend
cp apps/api/.env.example apps/api/.env

# Frontend
cp apps/web/.env.example apps/web/.env.local
```

**Required env vars:**

| Variable | Where to get |
|----------|-------------|
| `DATABASE_URL` | Local Postgres or [Neon](https://neon.tech) |
| `REDIS_URL` | Local Redis or [Upstash](https://upstash.com) |
| `JWT_SECRET` | Generate: `openssl rand -hex 32` |
| `SELLER_ADDRESS` | Your Arc Testnet wallet address |
| `NEXT_PUBLIC_CIRCLE_KIT_KEY` | [console.circle.com](https://console.circle.com) → API Keys → Create Kit Key |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | [cloud.walletconnect.com](https://cloud.walletconnect.com) |

### 3. Start local services

```bash
# Start Postgres + Redis
pnpm docker:up

# Run migrations
pnpm db:migrate
```

### 4. Run development servers

```bash
# Start both frontend and backend in parallel
pnpm dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- API Docs: http://localhost:4000/docs

---

## Get Testnet USDC

1. Visit **https://faucet.circle.com**
2. Select **Arc Testnet**
3. Choose **USDC** (required for gas + payments)
4. Paste your MetaMask address → click Request

---

## Network Config (MetaMask)

```
Network name:    Arc Testnet
RPC URL:         https://rpc.testnet.arc.network
Chain ID:        5042002
Currency symbol: USDC
Block explorer:  https://testnet.arcscan.app
```

---

## How x402 Payments Work

1. Buyer calls `POST /invoke/:serviceId`
2. Backend checks x402 payment header
3. If missing → returns `402 Payment Required` with payment options
4. Buyer's GatewayClient signs an EIP-3009 authorization (zero gas)
5. Backend submits to Circle Gateway for verification
6. Gateway verifies + locks funds → backend receives 200 OK
7. Backend proxies request to seller's endpoint
8. Seller's USDC is credited in next Gateway batch settlement

---

## AI Agent Integration

```bash
npm install @agenthub/sdk
```

```typescript
import { AgentHubClient } from '@agenthub/sdk'

const client = new AgentHubClient({
  privateKey: process.env.PRIVATE_KEY as `0x${string}`,
  baseUrl: 'https://api.agenthub.ai',
})

// Discover APIs
const apis = await client.listApis({ category: 'AI & ML' })

// Pay and call (x402 handled automatically)
const result = await client.invoke(apis.data[0].id)
console.log(result.data)
```

---

## Deployment

### Frontend (Vercel)

```bash
cd apps/web
vercel --prod
```

Set env vars in Vercel dashboard.

### Backend (Railway)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway up
```

Or use the provided `Dockerfile` with any container platform.

### Database

Use [Neon](https://neon.tech) for serverless Postgres (free tier available).

### Redis

Use [Upstash](https://upstash.com) for serverless Redis (free tier available).

---

## Project Structure

```
agenthub/
├── apps/
│   ├── web/              # Next.js 15 frontend
│   └── api/              # NestJS backend
├── packages/
│   ├── config/           # Arc chain config, contract addresses
│   ├── types/            # Shared TypeScript types
│   └── sdk/              # AgentHubClient for AI agents
├── docker-compose.yml    # Local dev services
└── turbo.json            # Turborepo pipeline
```

---

## Security

- **SSRF protection**: All seller endpoints are validated against private IP blocklist before proxying
- **HTTPS only**: Seller endpoints must use HTTPS
- **SIWE auth**: Wallet signature authentication for sellers (no passwords)
- **Zod validation**: All inputs validated server-side
- **Rate limiting**: Redis-backed rate limiter on `/invoke/*`
- **No key exposure**: `PRIVATE_KEY` and `SELLER_ADDRESS` are backend-only

---

## Revenue Model

| Feature | Fee |
|---------|-----|
| Per API call | 2% platform fee (tracked off-chain) |
| Featured APIs | Coming in V2 |
| Analytics Pro | Coming in V2 |

---

## Contributing

1. Fork the repo
2. Create a feature branch
3. Run `pnpm typecheck && pnpm build` before submitting PR
4. Tests: `pnpm --filter api test`

---

## License

MIT
