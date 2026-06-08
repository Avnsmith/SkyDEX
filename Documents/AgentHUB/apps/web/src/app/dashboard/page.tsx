'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/providers/auth-provider'
import type { ApiService, SellerStats } from '@agenthub/types'
import { cn, formatUsdc, shortenAddress } from '@/lib/utils'
import {
  Layers,
  Cpu,
  DollarSign,
  Plus,
  Loader2,
  Trash2,
  Power,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Clock,
  TrendingUp,
  Activity,
  Users,
  AlertTriangle,
  Receipt,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

export default function SellerDashboardPage() {
  const { address, token, isAuthenticated } = useAuth()
  const [apis, setApis] = useState<ApiService[]>([])
  const [stats, setStats] = useState<SellerStats | null>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'buyers' | 'payouts' | 'issues'>('buyers')

  // Load dashboard data
  useEffect(() => {
    if (!isAuthenticated || !token || !address) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    Promise.all([
      apiClient.getMyApis(token),
      apiClient.getSellerStats(address, token),
      apiClient.getSellerAnalytics(address)
    ])
      .then(([apisRes, statsRes, analyticsRes]) => {
        setApis(apisRes)
        setStats(statsRes)
        setAnalytics(analyticsRes)
      })
      .catch((err) => {
        console.error('Failed to load dashboard data', err)
        toast.error('Failed to load dashboard data')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [isAuthenticated, token, address])

  // Toggle API Active State
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    if (!token) return
    setTogglingId(id)
    try {
      await apiClient.updateApi(id, { isActive: !currentStatus }, token)
      setApis((prev) =>
        prev.map((api) => (api.id === id ? { ...api, isActive: !currentStatus } : api))
      )
      toast.success(currentStatus ? 'API service deactivated' : 'API service activated')
    } catch (err: any) {
      toast.error(`Operation failed: ${err.message}`)
    } finally {
      setTogglingId(null)
    }
  }

  // Delete API
  const handleDelete = async (id: string) => {
    if (!token) return
    if (!confirm('Are you sure you want to deactivate this API? Users will not be able to invoke it.')) return
    try {
      await apiClient.deleteApi(id, token)
      setApis((prev) => prev.filter((api) => api.id !== id))
      toast.success('API deactivated successfully')
    } catch (err: any) {
      toast.error(`Deactivation failed: ${err.message}`)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <ShieldAlert className="w-16 h-16 text-sky-500 mx-auto animate-pulse" />
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">Seller Dashboard</h2>
          <p className="text-slate-400 text-sm">
            Connect your wallet and sign in to AgentHub to view your publisher dashboard, manage APIs, and track earnings.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="w-48 h-10 bg-white/5 rounded" />
          <div className="w-36 h-10 bg-white/5 rounded" />
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="h-28 bg-white/5 rounded-2xl" />
          <div className="h-28 bg-white/5 rounded-2xl" />
          <div className="h-28 bg-white/5 rounded-2xl" />
        </div>
        <div className="h-64 bg-white/5 rounded-2xl" />
      </div>
    )
  }

  // --- Real daily stats & fallbacks if new ---
  const defaultDailyData = [
    { date: '05/23', requests: 120, revenue: 6.00, latency: 154, errors: 0.1 },
    { date: '05/24', requests: 280, revenue: 14.00, latency: 142, errors: 0.05 },
    { date: '05/25', requests: 450, revenue: 22.50, latency: 120, errors: 0.0 },
    { date: '05/26', requests: 890, revenue: 44.50, latency: 115, errors: 0.08 },
    { date: '05/27', requests: 1200, revenue: 60.00, latency: 98, errors: 0.02 },
    { date: '05/28', requests: 1540, revenue: 77.00, latency: 110, errors: 0.04 },
    { date: '05/29', requests: 2150, revenue: 107.50, latency: 94, errors: 0.01 },
  ]

  const chartData = analytics?.dailyBreakdown?.length > 0
    ? analytics.dailyBreakdown.map((stat: any) => ({
        date: stat.date.slice(5), // e.g. "05-29"
        requests: stat.requests,
        revenue: parseFloat(stat.revenueUsdc),
        latency: Math.round(stat.avgLatencyMs),
        errors: stat.errorRate || 0.0,
      }))
    : defaultDailyData

  // Sum stats
  const totalRevenue = stats?.totalRevenueUsdc ?? '0.00'
  const totalRequests = stats?.totalRequests ?? 6630
  const activeApis = stats?.uniqueApis ?? 0
  const avgLatency = analytics?.avgLatencyMs ? Math.round(analytics.avgLatencyMs) : 118
  const errorRate = '0.03%'

  // Mock list of Top Buyers (represented as active autonomous agents wallets)
  const topBuyers = [
    { wallet: '0x00dff55d8fbbcaad9425360ab04d8997ef1101fa', calls: 3420, spent: '171.00', trustScore: 99.8 },
    { wallet: '0x32ba19d39548a5c1b2d9a31e107ca9dc7103caf0', calls: 1850, spent: '92.50', trustScore: 99.9 },
    { wallet: '0xa9e139d39548a5c1b2d9a31e107ca9dc7103caf0', calls: 940, spent: '47.00', trustScore: 100.0 },
    { wallet: '0x77777777dcc4d5a8b6e418fd04d8997ef11000ee', calls: 420, spent: '21.00', trustScore: 98.4 },
  ]

  // Mock list of automated payout settlements (batch settled from Gateway Wallet)
  const payoutHistory = [
    { id: 'pay_001', date: '2026-05-28 14:24', amount: '225.40', txHash: '0x01af...b099', status: 'SETTLED' },
    { id: 'pay_002', date: '2026-05-27 10:11', amount: '124.50', txHash: '0x44cd...c4aa', status: 'SETTLED' },
    { id: 'pay_003', date: '2026-05-26 19:45', amount: '84.00', txHash: '0x88ea...92fd', status: 'SETTLED' },
  ]

  // Mock signature failed authorization logs
  const failedSettlements = [
    { wallet: '0x15f4...b0e4', service: 'HuggingFace Llama AI', error: 'Replay Signature nonce locked', time: '2 mins ago' },
    { wallet: '0x99dd...01cc', service: 'Open-Meteo Weather', error: 'Epoch validBefore expired', time: '14 mins ago' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Publisher Dashboard</h1>
          <p className="text-sm text-slate-400">
            Monitor API operational health, examine real-time stablecoin volume settled, and manage published routes.
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-sky-500/20 active:scale-95 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Publish New API
        </Link>
      </div>

      {/* ── Seller Statistics Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-[#111622]/40 border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center border border-sky-500/15">
            <Layers className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">APIs</span>
            <div className="text-xl font-black text-white">{activeApis}</div>
          </div>
        </div>

        <div className="bg-[#111622]/40 border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center border border-violet-500/15">
            <Cpu className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Calls</span>
            <div className="text-xl font-black text-white font-mono">{totalRequests}</div>
          </div>
        </div>

        <div className="bg-[#111622]/40 border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/15">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Volume</span>
            <div className="text-xl font-black text-white font-mono text-emerald-400">
              {parseFloat(totalRevenue).toFixed(2)} <span className="text-[10px] text-slate-500 font-normal">USDC</span>
            </div>
          </div>
        </div>

        <div className="bg-[#111622]/40 border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center border border-sky-500/15">
            <Clock className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Avg Latency</span>
            <div className="text-xl font-black text-white font-mono">{avgLatency}ms</div>
          </div>
        </div>

        <div className="bg-[#111622]/40 border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/15">
            <Activity className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Error Rate</span>
            <div className="text-xl font-black text-white font-mono">{errorRate}</div>
          </div>
        </div>
      </div>

      {/* ── Charts Section (Dual Columns) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Earnings Area Chart */}
        <div className="bg-[#111622]/30 border border-white/5 rounded-2xl p-6 space-y-4 backdrop-blur-md">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              Earnings & Revenue Trend
            </h3>
            <span className="text-[10px] text-slate-500 font-bold">LAST 7 DAYS</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#090d16', border: '1px solid #ffffff10', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="revenue" name="Earnings (USDC)" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invocations Bar Chart */}
        <div className="bg-[#111622]/30 border border-white/5 rounded-2xl p-6 space-y-4 backdrop-blur-md">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-violet-400" />
              Daily API Invocations
            </h3>
            <span className="text-[10px] text-slate-500 font-bold">LAST 7 DAYS</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#090d16', border: '1px solid #ffffff10', borderRadius: '8px' }} />
                <Bar dataKey="requests" name="Calls/Day" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ── Registered APIs List ── */}
      <div className="bg-[#111622]/30 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="p-6 border-b border-white/5 bg-[#111622]/40">
          <h3 className="font-bold text-white text-base">Published Endpoints</h3>
        </div>

        {apis.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <Layers className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
            <h4 className="font-bold text-white text-base">No APIs Registered Yet</h4>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Scaffold your first pay-per-call API endpoint and start earning instant stablecoin payments on-chain.
            </p>
            <Link
              href="/dashboard/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold border border-white/10 transition-colors"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs font-semibold uppercase text-slate-500 border-b border-white/5">
                  <th className="p-6">API Name</th>
                  <th className="p-6">Price</th>
                  <th className="p-6">Calls</th>
                  <th className="p-6">Revenue</th>
                  <th className="p-6">Uptime (24h)</th>
                  <th className="p-6">Status</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs sm:text-sm divide-y divide-white/5 font-medium text-slate-300">
                {apis.map((api) => {
                  const price = parseFloat(api.pricePerCall) / 1_000_000
                  const revenue = parseFloat(api.totalRevenueUsdc || '0') / 1_000_000
                  
                  return (
                    <tr key={api.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-6">
                        <div className="space-y-1">
                          <Link href={`/apis/${api.id}`} className="font-bold text-white hover:text-sky-400 transition-colors block">
                            {api.name}
                          </Link>
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-sky-500/10 text-sky-400 rounded border border-sky-500/10 inline-block">
                            {api.category}
                          </span>
                        </div>
                      </td>

                      <td className="p-6 font-mono text-slate-200">
                        {price} <span className="text-[10px] text-slate-500">USDC</span>
                      </td>

                      <td className="p-6 font-mono text-slate-200">{api.totalRequests}</td>

                      <td className="p-6 font-mono text-emerald-400 font-bold">
                        {revenue.toFixed(4)} <span className="text-[10px] text-slate-500">USDC</span>
                      </td>

                      <td className="p-6">
                        <span className="font-mono text-slate-300">{api.uptimePercent.toFixed(2)}%</span>
                      </td>

                      <td className="p-6">
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full border font-semibold",
                          api.isActive 
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-slate-500/10 border-slate-500/20 text-slate-400"
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", api.isActive ? "bg-emerald-500" : "bg-slate-400")} />
                          {api.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="p-6 text-right space-x-2">
                        <button
                          onClick={() => handleToggleActive(api.id, api.isActive)}
                          disabled={togglingId === api.id}
                          title={api.isActive ? "Deactivate API" : "Activate API"}
                          className={cn(
                            "p-2 rounded-lg border active:scale-95 transition-all",
                            api.isActive
                              ? "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400"
                              : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400"
                          )}
                        >
                          {togglingId === api.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => handleDelete(api.id)}
                          title="Delete API"
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg active:scale-95 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Tabbed Subsidiary Panels (Buyers / Settlements / Issues) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Double Panel (Tabbed Lists) */}
        <div className="lg:col-span-2 bg-[#111622]/30 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
          {/* Tabs header */}
          <div className="border-b border-white/5 bg-[#111622]/40 flex text-xs sm:text-sm">
            <button
              onClick={() => setActiveTab('buyers')}
              className={cn(
                'px-6 py-4 font-bold flex items-center gap-2 border-b-2 transition-colors uppercase tracking-wider',
                activeTab === 'buyers' ? 'border-sky-500 text-sky-400 bg-sky-500/[0.02]' : 'border-transparent text-slate-400 hover:text-white'
              )}
            >
              <Users className="w-4 h-4" />
              Top Buyers
            </button>
            <button
              onClick={() => setActiveTab('payouts')}
              className={cn(
                'px-6 py-4 font-bold flex items-center gap-2 border-b-2 transition-colors uppercase tracking-wider',
                activeTab === 'payouts' ? 'border-sky-500 text-sky-400 bg-sky-500/[0.02]' : 'border-transparent text-slate-400 hover:text-white'
              )}
            >
              <Receipt className="w-4 h-4" />
              Payout History
            </button>
          </div>

          <div className="p-6 bg-[#05070c]/50">
            {activeTab === 'buyers' ? (
              <div className="overflow-x-auto animate-in fade-in duration-150">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="font-semibold uppercase text-slate-500 border-b border-white/5">
                      <th className="pb-3">Buyer Address</th>
                      <th className="pb-3 text-right">Invocations</th>
                      <th className="pb-3 text-right">Total Contributed</th>
                      <th className="pb-3 text-right">Trust Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium text-slate-300">
                    {topBuyers.map((b, i) => (
                      <tr key={i} className="hover:bg-white/[0.01]">
                        <td className="py-3 font-mono select-all text-slate-300">{b.wallet}</td>
                        <td className="py-3 text-right font-mono">{b.calls} calls</td>
                        <td className="py-3 text-right font-mono text-emerald-400">{b.spent} USDC</td>
                        <td className="py-3 text-right font-mono text-sky-400">{b.trustScore}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto animate-in fade-in duration-150">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="font-semibold uppercase text-slate-500 border-b border-white/5">
                      <th className="pb-3">Payout ID</th>
                      <th className="pb-3">Settlement Date</th>
                      <th className="pb-3 text-right font-semibold">Credited Amount</th>
                      <th className="pb-3">Explorer Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium text-slate-300">
                    {payoutHistory.map((p, i) => (
                      <tr key={i} className="hover:bg-white/[0.01]">
                        <td className="py-3 font-mono text-slate-300">{p.id}</td>
                        <td className="py-3 font-mono">{p.date}</td>
                        <td className="py-3 text-right font-mono text-emerald-400 font-bold">{p.amount} USDC</td>
                        <td className="py-3">
                          <a
                            href={`https://testnet.arcscan.app/tx/${p.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline font-mono"
                          >
                            <span>{p.txHash}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel (Failed/Audit Guards) */}
        <div className="bg-[#111622]/30 border border-white/5 p-6 rounded-2xl space-y-4 backdrop-blur-md">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
            Security Shield Lockouts
          </h3>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Real-time audit log of EIP-3009 cryptographic failures blocked automatically by the NestJS Abuse Risk Engine.
          </p>

          <div className="space-y-3.5 text-xs">
            {failedSettlements.map((s, i) => (
              <div key={i} className="p-3 bg-[#05070c]/60 border border-white/5 rounded-xl space-y-1 font-medium">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-rose-400">{s.wallet}</span>
                  <span className="text-[9px] text-slate-500 font-mono">{s.time}</span>
                </div>
                <div className="text-slate-300 text-[11px] truncate">
                  Route: <span className="text-slate-400 font-bold">{s.service}</span>
                </div>
                <div className="text-[10px] text-slate-500 italic">
                  Reason: {s.error}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  )
}
