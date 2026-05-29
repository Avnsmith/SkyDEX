'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { useState, useEffect } from 'react'
import { wagmiConfig, wagmiAdapter, projectId, networks } from '@/config/wagmi'
import { AuthProvider } from './auth-provider'
import { createAppKit } from '@reown/appkit/react'

// Initialize Reown AppKit modal on client-side
createAppKit({
  adapters: [wagmiAdapter],
  networks: networks as [any, ...any[]],
  projectId,
  metadata: {
    name: 'AgentHub',
    description: 'Self-Hosted x402 API Marketplace on Arc Network',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://agenthub.ai',
    icons: ['https://avatars.githubusercontent.com/u/179229659'],
  },
  features: {
    analytics: true,
    email: false,
    socials: false,
  },
  allWallets: 'SHOW',
  themeMode: 'dark',
})


export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    )
  }


  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
