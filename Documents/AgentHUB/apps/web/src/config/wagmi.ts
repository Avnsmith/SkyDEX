import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { arcTestnet } from '@agenthub/config'
import { cookieStorage, createStorage } from 'wagmi'

export const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'e596700f135b91b975e5330a108b98eb'

export const networks = [
  {
    id: arcTestnet.id,
    name: arcTestnet.name,
    nativeCurrency: arcTestnet.nativeCurrency,
    rpcUrls: {
      default: { http: [arcTestnet.rpcUrls.default.http[0]] }
    },
    blockExplorers: {
      default: { name: arcTestnet.blockExplorers.default.name, url: arcTestnet.blockExplorers.default.url }
    },
    testnet: true,
  } as any
]

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
})

export const wagmiConfig = wagmiAdapter.wagmiConfig

