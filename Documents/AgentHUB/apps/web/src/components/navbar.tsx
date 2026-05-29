'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccount } from 'wagmi'
import { ConnectWalletButton } from './connect-wallet-button'
import { useAuth } from '@/providers/auth-provider'
import { cn, shortenAddress } from '@/lib/utils'
import { Zap, LayoutDashboard, ShoppingBag, History } from 'lucide-react'

const NAV_LINKS = [
  { href: '/', label: 'Marketplace', icon: ShoppingBag },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/buyer', label: 'My Purchases', icon: History },
]

export function Navbar() {
  const pathname = usePathname()
  const { address } = useAccount()
  const { isAuthenticated } = useAuth()

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#080a0f]/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              Agent<span className="gradient-text">Hub</span>
            </span>
          </Link>

          {/* Navigation links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  pathname === href
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5',
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthenticated && address && (
              <span className="hidden sm:block text-xs text-slate-400 font-mono bg-white/5 px-2 py-1 rounded-md border border-white/5">
                {shortenAddress(address)}
              </span>
            )}
            <ConnectWalletButton />
          </div>
        </div>
      </div>
    </nav>
  )
}
