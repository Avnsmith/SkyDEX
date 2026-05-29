'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/providers/auth-provider'
import { formatUsdc } from '@/lib/utils'
import {
  History,
  Coins,
  Cpu,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldCheck,
  ArrowUpRight,
  Info,
  Layers,
  HelpCircle,
  PiggyBank,
  ArrowDownLeft,
  Shuffle
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAccount, useReadContract } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@agenthub/config'

export default function BuyerHistoryPage() {
  const { isConnected, address } = useAccount()
  const { isAuthenticated } = useAuth()
  
  const [history, setHistory] = useState<any[]>([])
  const [totalSpent, setTotalSpent] = useState<number>(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Read wallet USDC balance on Arc Testnet
  const { data: usdcBalanceUnits, isLoading: isUsdcLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.USDC,
    abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] }],
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  })

  // Read deposited Gateway Wallet balance
  // (Represented as user's share in GatewayWallet contract 0x0077777d7EBA4688BDeF3E311b846F25870A19B9)
  const { data: gatewayBalanceUnits, isLoading: isGatewayLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.GATEWAY_WALLET,
    abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] }],
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  })

  const usdcBalance = usdcBalanceUnits ? (Number(usdcBalanceUnits as bigint) / 1_000_000).toFixed(4) : '0.00'
  const gatewayBalance = gatewayBalanceUnits ? (Number(gatewayBalanceUnits as bigint) / 1_000_000).toFixed(4) : '0.00'
  const pendingSettlement = (totalSpent * 0.03).toFixed(4) // 3% Platform splitting queue off-chain

  useEffect(() => {
    if (!isConnected || !address) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    apiClient.getPayerHistory(address, page)
      .then((res) => {
        setHistory(res.data)
        setHasMore(res.hasMore)
        setTotalCount(res.total)
        
        // Sum total spent (amount is already in human readable USDC)
        const spent = res.data.reduce((acc: number, curr: any) => acc + parseFloat(curr.amountUsdc), 0)
        setTotalSpent(spent)
      })
      .catch((err) => {
        console.error('Failed to load payer logs', err)
        toast.error('Failed to load payment history')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [isConnected, address, page])

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <History className="w-16 h-16 text-sky-500 mx-auto animate-pulse" />
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">Purchase History</h2>
          <p className="text-slate-400 text-sm">
            Connect your wallet to inspect payment histories, transaction ledgers, and micro-payment expenditures on the Arc Network.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse">
        <div className="w-48 h-10 bg-white/5 rounded" />
        <div className="h-28 bg-white/5 rounded-2xl" />
        <div className="h-64 bg-white/5 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white">Buyer Hub & Gateway Ledger</h1>
        <p className="text-sm text-slate-400">
          Manage your unified Circle Gateway balances, review EIP-3009 micro-payments, and fund your wallet on Arc Testnet.
        </p>
      </div>

      {/* Grid of Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: Unified Balance & Deposits Panel */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-[#111622]/40 border border-white/10 rounded-2xl p-6 space-y-6 backdrop-blur-md">
            
            <div className="border-b border-white/5 pb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                Unified Gateway Balance
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Unified balance usable across all Gateway-supported blockchains.</p>
            </div>

            {/* Balances Display */}
            <div className="space-y-4">
              <div className="p-4 bg-sky-500/[0.02] border border-sky-500/10 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Available Balance</span>
                  <span className="text-2xl font-black text-white font-mono">{gatewayBalance}</span>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded">USDC</span>
              </div>

              <div className="p-4 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Arc Wallet USDC</span>
                  <span className="text-2xl font-black text-white font-mono">{usdcBalance}</span>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded">USDC</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 bg-white/[0.01] border border-white/5 rounded-xl">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Total Expended</span>
                  <span className="text-sm font-bold text-slate-300 font-mono block mt-0.5">{totalSpent.toFixed(4)}</span>
                </div>
                <div className="p-3.5 bg-white/[0.01] border border-white/5 rounded-xl">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Pending Batch</span>
                  <span className="text-sm font-bold text-slate-300 font-mono block mt-0.5">{pendingSettlement}</span>
                </div>
              </div>
            </div>

            {/* Deposit / Bridge Instructions */}
            <div className="space-y-4 pt-2 border-t border-white/5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Fund Your Wallet</span>
              
              <div className="flex flex-col gap-2">
                {/* Faucet Link */}
                <a
                  href="https://faucet.circle.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all text-xs font-semibold text-white group"
                >
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-sky-400" />
                    <span>Get free USDC (Arc Testnet Faucet)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                </a>

                {/* Bridge Link */}
                <a
                  href="https://bridge.circle.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all text-xs font-semibold text-white group"
                >
                  <div className="flex items-center gap-2">
                    <Shuffle className="w-4 h-4 text-violet-400" />
                    <span>Bridge USDC to Arc Testnet via CCTP</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                </a>
              </div>

              {/* Deposit instructions alert box */}
              <div className="p-3.5 bg-sky-500/5 border border-sky-500/10 rounded-xl space-y-2 text-xs leading-relaxed text-slate-300">
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <Info className="w-3.5 h-3.5 text-sky-400" />
                  <span>Deposit Instructions</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  To fund your available Gateway balance, simply transfer USDC tokens on Arc Testnet directly to the Gateway Wallet address below:
                </p>
                <div className="bg-[#05070c] p-2 rounded text-[10px] font-mono text-sky-400 break-all select-all border border-white/5">
                  0x0077777d7EBA4688BDeF3E311b846F25870A19B9
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT: Invocations & Purchases Table Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111622]/30 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md flex flex-col h-full">
            
            <div className="p-6 border-b border-white/5 bg-[#111622]/40 flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <History className="w-4 h-4 text-sky-400" />
                Execution Voucher History
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                Total Invocations: {totalCount}
              </span>
            </div>

            {history.length === 0 ? (
              <div className="p-12 text-center space-y-4 flex-1 flex flex-col justify-center items-center">
                <History className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
                <h4 className="font-bold text-white text-base">No Invocations Logged</h4>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  Your wallet hasn't paid for any API queries on the network yet. Head over to the Marketplace to begin.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  <span>Browse APIs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-xs font-semibold uppercase text-slate-500 border-b border-white/5 bg-[#111622]/10">
                        <th className="p-6">API Name</th>
                        <th className="p-6">Voucher / Transaction Reference</th>
                        <th className="p-6">Date & Time</th>
                        <th className="p-6 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs sm:text-sm divide-y divide-white/5 font-medium text-slate-300">
                      {history.map((req) => (
                        <tr key={req.id} className="hover:bg-white/[0.01] transition-colors">
                          {/* API Link */}
                          <td className="p-6">
                            <Link href={`/apis/${req.serviceId}`} className="font-bold text-white hover:text-sky-400 transition-colors">
                              {req.service?.name || 'API Service'}
                            </Link>
                          </td>

                          {/* Transaction Hash */}
                          <td className="p-6">
                            {req.txReference ? (
                              <a
                                href={`https://testnet.arcscan.app/tx/${req.txReference}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 font-mono text-xs text-sky-400 hover:underline"
                              >
                                <span>{req.txReference.slice(0, 16)}...</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <span className="text-slate-500 italic">Voucher settled</span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="p-6 text-slate-400 font-mono text-xs">
                            {new Date(req.createdAt).toLocaleString()}
                          </td>

                          {/* Cost */}
                          <td className="p-6 text-right font-mono text-emerald-400 font-bold">
                            -{formatUsdc(req.amountUsdc, 4)} <span className="text-[10px] text-slate-500">USDC</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {(page > 1 || hasMore) && (
                  <div className="p-6 border-t border-white/5 bg-[#111622]/20 flex items-center justify-between mt-auto">
                    <button
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      disabled={page === 1}
                      className="flex items-center gap-1 px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 border border-white/10 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <span className="text-xs text-slate-400">Page {page}</span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasMore}
                      className="flex items-center gap-1 px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 border border-white/10 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
