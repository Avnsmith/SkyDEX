import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/providers/providers'
import { Toaster } from 'sonner'
import { Navbar } from '@/components/navbar'

export const metadata: Metadata = {
  title: 'AgentHub — x402 API Marketplace on Arc Network',
  description:
    'Discover, publish, and pay for APIs with USDC nanopayments on Arc Testnet. The self-hosted marketplace for AI agents and developers.',
  keywords: 'x402, Arc Network, USDC, API marketplace, AI agents, nanopayments, Circle Gateway',
  openGraph: {
    title: 'AgentHub — x402 API Marketplace',
    description: 'Pay-per-request APIs on Arc Network with USDC nanopayments',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#080a0f] text-slate-100 font-sans antialiased">
        <Providers>
          <Navbar />
          <main>{children}</main>
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1a1f2e',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#f8fafc',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
