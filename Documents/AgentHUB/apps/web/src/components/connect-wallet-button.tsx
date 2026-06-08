'use client'

import { useState } from 'react'
import { useAccount, useDisconnect, useReadContract } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { useAuth } from '@/providers/auth-provider'
import { arcTestnet } from '@agenthub/config'
import { USDC_ADDRESS, USDC_ABI } from '@/config/constants'
import { cn, formatUsdc, shortenAddress } from '@/lib/utils'
import { Wallet, LogOut, Loader2, ShieldCheck, ChevronDown, Coins } from 'lucide-react'

export function ConnectWalletButton() {
  const { isConnected, address, chainId } = useAccount()
  const { open } = useAppKit()
  const { disconnect } = useDisconnect()
  const { token, isAuthenticated, isLoading: isAuthLoading, signIn, signOut } = useAuth()
  
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // USDC balance read from contract
  const { data: usdcBalanceUnits, isLoading: isBalanceLoading } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI as any,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10_000,
    }
  })

  const isLoading = isAuthLoading

  // Check if wrong chain
  const isWrongChain = isConnected && chainId !== arcTestnet.id

  const handleConnect = () => {
    open()
  }

  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-sky-500/20 active:scale-95 transition-all duration-200"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Wallet className="w-4 h-4" />
        )}
        Connect Wallet
      </button>
    )
  }

  if (isWrongChain) {
    return (
      <button
        onClick={() => open({ view: 'Networks' })}
        className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-sm font-semibold rounded-xl transition-all duration-200"
      >
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        Switch to Arc Testnet
      </button>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => open()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/5 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all"
        >
          {shortenAddress(address!)}
        </button>
        <button
          onClick={signIn}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-sm font-bold rounded-xl active:scale-95 transition-all duration-200"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}
          Sign In to AgentHub
        </button>
      </div>
    )
  }

  const usdcBalance = usdcBalanceUnits ? formatUsdc(usdcBalanceUnits as bigint, 2) : '0.00'

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Balance Display */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-[#111622]/40 border border-white/5 rounded-xl text-xs text-slate-300">
          <Coins className="w-3.5 h-3.5 text-emerald-400" />
          <span>{usdcBalance} USDC</span>
        </div>

        {/* Address and dropdown button */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1f2e] border border-white/10 hover:border-white/20 text-slate-200 hover:text-white text-sm font-semibold rounded-xl transition-all duration-200"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{shortenAddress(address!)}</span>
          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", dropdownOpen && "rotate-180")} />
        </button>
      </div>

      {dropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-[#111622] border border-white/10 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-100">
            <div className="px-3 py-2 border-b border-white/5 mb-1 text-left">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Wallet Address</span>
              <span className="text-xs text-white font-medium block truncate select-all">{address}</span>
            </div>
            
            <button
              onClick={() => {
                setDropdownOpen(false)
                open()
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-slate-300 hover:bg-white/5 rounded-lg text-sm font-medium text-left transition-colors"
            >
              <Wallet className="w-4 h-4 text-slate-400" />
              Manage Wallet
            </button>

            <button
              onClick={() => {
                setDropdownOpen(false)
                disconnect()
                signOut()
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-lg text-sm font-medium text-left transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  )
}
