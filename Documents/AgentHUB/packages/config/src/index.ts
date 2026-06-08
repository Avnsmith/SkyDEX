import { defineChain } from 'viem'

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
    public: {
      http: ['https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
})

export const CONTRACT_ADDRESSES = {
  USDC: '0x3600000000000000000000000000000000000000' as `0x${string}`,
  EURC: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' as `0x${string}`,
  GATEWAY_WALLET: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9' as `0x${string}`,
  GATEWAY_MINTER: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B' as `0x${string}`,
  MULTICALL3: '0xcA11bde05977b3631167028862bE2a173976CA11' as `0x${string}`,
  PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3' as `0x${string}`,
} as const

export const GATEWAY_CONFIG = {
  FACILITATOR_URL: 'https://gateway-api-testnet.circle.com',
  NETWORK_CAIP2: 'eip155:5042002',
  DOMAIN_ID: 26,
  PLATFORM_FEE_BPS: 200, // 2%
} as const

// SSRF blocklist: private IP ranges
export const PRIVATE_IP_RANGES = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./, // link-local
  /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./, // CGNAT
  /^::1$/, // IPv6 loopback
  /^fc00:/i,
  /^fd/i,
  /^fe80:/i,
]

export const API_CATEGORIES = [
  'AI & ML',
  'Data & Analytics',
  'Finance & DeFi',
  'Search',
  'Identity',
  'Communication',
  'Infrastructure',
  'Other',
] as const

export type ApiCategory = (typeof API_CATEGORIES)[number]
