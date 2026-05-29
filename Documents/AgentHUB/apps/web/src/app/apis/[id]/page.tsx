'use client'

import { useState, useEffect, use } from 'react'
import { apiClient } from '@/lib/api'
import { PaymentModal } from '@/components/payment-modal'
import type { ApiService, AnalyticsSummary } from '@agenthub/types'
import { cn, formatUsdc, shortenAddress } from '@/lib/utils'
import {
  ArrowLeft,
  Terminal,
  Activity,
  Cpu,
  Clock,
  ExternalLink,
  Code2,
  ListFilter,
  CheckCircle,
  AlertCircle,
  Layers,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAccount } from 'wagmi'

interface ApiDetailPageProps {
  params: Promise<{ id: string }>
}

export default function ApiDetailPage({ params }: ApiDetailPageProps) {
  const { id } = use(params)
  const { isConnected } = useAccount()
  
  const [service, setService] = useState<ApiService | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  
  const [activeTab, setActiveTab] = useState<'integrate' | 'logs'>('integrate')
  const [integrateLang, setIntegrateLang] = useState<'curl' | 'node' | 'python'>('curl')
  const [playgroundOpen, setPlaygroundOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    Promise.all([
      apiClient.getApi(id),
      apiClient.getApiAnalytics(id)
    ])
      .then(([serviceRes, analyticsRes]) => {
        setService(serviceRes)
        setAnalytics(analyticsRes)
      })
      .catch((err) => {
        console.error('Failed to load API details', err)
        toast.error('Failed to load API details')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [id])

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse">
        <div className="w-24 h-6 bg-white/5 rounded" />
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6">
            <div className="w-1/2 h-10 bg-white/5 rounded" />
            <div className="w-full h-32 bg-white/5 rounded" />
            <div className="w-full h-64 bg-white/5 rounded" />
          </div>
          <div className="w-full lg:w-80 h-96 bg-white/5 rounded" />
        </div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-xl font-bold text-white">API Service Not Found</h3>
        <p className="text-slate-400">The API you are looking for does not exist or has been removed.</p>
        <Link href="/" className="inline-flex items-center gap-2 text-sky-400 font-semibold hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Link>
      </div>
    )
  }

  const priceHuman = parseFloat(service.pricePerCall) / 1_000_000

  // ── Code Snippet Builders ──
  const getCurlCode = () => {
    return `curl -X POST "https://api.agenthub.ai/invoke/${service.id}" \\
  -H "x402-Payment-Reference: <your-voucher-reference>" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Hello world"}'`
  }

  const getNodeCode = () => {
    return `import { AgentHubClient } from '@agenthub/sdk'

const client = new AgentHubClient({
  privateKey: process.env.PRIVATE_KEY, // Agent Wallet Private Key
  baseUrl: 'https://api.agenthub.ai'
})

// Automatically handles x402 handshake, wallet payment and fetch retry
const response = await client.invoke('${service.id}', {
  method: 'POST',
  body: JSON.stringify({ query: 'hello' })
})

console.log(response.data)`
  }

  const getPythonCode = () => {
    return `import requests

# 1. Trigger micro-transaction signature using Circle SDK/CLI
# 2. Forward execution voucher reference
url = "https://api.agenthub.ai/invoke/${service.id}"
headers = {
    "x-payment-reference": "VOUCHER_TX_HASH",
    "Content-Type": "application/json"
}

res = requests.post(url, json={"query": "hello"}, headers=headers)
print(res.json())`
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Marketplace
      </Link>

      {/* ── Header details ── */}
      <div className="flex flex-col lg:flex-row gap-8 items-start justify-between border-b border-white/5 pb-8">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 bg-sky-500/10 text-sky-400 rounded-md border border-sky-500/10">
              {service.category}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/10 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Active
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{service.name}</h1>
          <p className="text-slate-400 text-sm max-w-3xl leading-relaxed">{service.description}</p>

          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span>Publisher Wallet:</span>
            <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-slate-300">
              {service.sellerAddress}
            </span>
          </div>
        </div>

        {/* Pricing CTA */}
        <div className="w-full lg:w-auto bg-[#111622]/40 border border-white/10 rounded-2xl p-6 flex flex-col items-center lg:items-end gap-4 min-w-[240px] backdrop-blur-lg">
          <div className="text-center lg:text-right w-full">
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-semibold">
              Cost Per Call
            </span>
            <div className="flex items-baseline justify-center lg:justify-end gap-1">
              <span className="text-3xl font-black text-white">{priceHuman}</span>
              <span className="text-xs font-semibold text-slate-400">USDC</span>
            </div>
          </div>

          <button
            onClick={() => setPlaygroundOpen(true)}
            className="w-full py-3 bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-sky-500/20 active:scale-95 transition-all duration-200"
          >
            Try API in Playground
          </button>
        </div>
      </div>

      {/* ── Key Statistics Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-[#111622]/20 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">Uptime (24h)</span>
          <div className="text-xl font-bold text-white mt-1 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-400" />
            {service.uptimePercent.toFixed(1)}%
          </div>
        </div>

        <div className="bg-[#111622]/20 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">Avg Latency</span>
          <div className="text-xl font-bold text-white mt-1 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-sky-400" />
            {analytics?.avgLatencyMs ? Math.round(analytics.avgLatencyMs) : 0}ms
          </div>
        </div>

        <div className="bg-[#111622]/20 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">Total Requests</span>
          <div className="text-xl font-bold text-white mt-1 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-violet-400" />
            {analytics?.totalRequests ?? 0}
          </div>
        </div>

        <div className="bg-[#111622]/20 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">Total Revenue</span>
          <div className="text-xl font-bold text-white mt-1 flex items-center gap-1.5">
            <span className="text-xs font-semibold text-emerald-400">$</span>
            {analytics?.totalRevenueUsdc ?? '0.00'}
          </div>
        </div>
      </div>

      {/* ── Tabbed integration & history ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Details Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111622]/30 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
            
            {/* Tabs header */}
            <div className="border-b border-white/5 bg-[#111622]/40 flex">
              <button
                onClick={() => setActiveTab('integrate')}
                className={cn(
                  'px-6 py-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors',
                  activeTab === 'integrate'
                    ? 'border-sky-500 text-sky-400 bg-sky-500/[0.02]'
                    : 'border-transparent text-slate-400 hover:text-white'
                )}
              >
                <Code2 className="w-4 h-4" />
                Integration Code
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={cn(
                  'px-6 py-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors',
                  activeTab === 'logs'
                    ? 'border-sky-500 text-sky-400 bg-sky-500/[0.02]'
                    : 'border-transparent text-slate-400 hover:text-white'
                )}
              >
                <Terminal className="w-4 h-4" />
                Execution History
              </button>
            </div>

            {/* Tab content */}
            <div className="p-6 bg-[#05070c]/50">
              
              {activeTab === 'integrate' ? (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Language switch */}
                  <div className="flex gap-2 bg-[#111622]/40 p-1.5 rounded-xl border border-white/5 max-w-xs">
                    {(['curl', 'node', 'python'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setIntegrateLang(lang)}
                        className={cn(
                          'flex-1 py-1.5 text-xs font-semibold rounded-lg uppercase tracking-wider transition-all',
                          integrateLang === lang
                            ? 'bg-[#1a1f2e] text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        )}
                      >
                        {lang === 'node' ? 'Node.js' : lang}
                      </button>
                    ))}
                  </div>

                  {/* Code Block */}
                  <div className="relative bg-[#05070c] border border-white/5 rounded-xl p-4 overflow-x-auto shadow-inner text-xs font-mono text-slate-300">
                    <pre>
                      {integrateLang === 'curl' && getCurlCode()}
                      {integrateLang === 'node' && getNodeCode()}
                      {integrateLang === 'python' && getPythonCode()}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* request list */}
                  {!analytics?.dailyBreakdown || analytics.dailyBreakdown.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 italic">
                      No invocation logs recorded yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-xs font-semibold uppercase text-slate-500 border-b border-white/5">
                            <th className="pb-3">Date</th>
                            <th className="pb-3 text-right">Calls</th>
                            <th className="pb-3 text-right">Avg Latency</th>
                            <th className="pb-3 text-right">USDC Volume</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs divide-y divide-white/5 font-medium text-slate-300">
                          {analytics.dailyBreakdown.slice().reverse().map((stat, i) => (
                            <tr key={i} className="hover:bg-white/[0.01]">
                              <td className="py-3 font-mono">{stat.date}</td>
                              <td className="py-3 text-right font-mono">{stat.requests}</td>
                              <td className="py-3 text-right font-mono">{Math.round(stat.avgLatencyMs)}ms</td>
                              <td className="py-3 text-right font-mono text-emerald-400">{stat.revenueUsdc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-[#111622]/30 border border-white/5 p-6 rounded-2xl space-y-4 backdrop-blur-md">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
              <ExternalLink className="w-4 h-4 text-sky-400" />
              API Details
            </h3>
            
            <div className="space-y-3.5 text-xs font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Service Category</span>
                <span className="text-slate-300 font-semibold">{service.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Created Date</span>
                <span className="text-slate-300 font-mono">
                  {new Date(service.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pricing Tier</span>
                <span className="text-sky-400 font-mono uppercase tracking-wider">USDC Nanopay</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active Requests</span>
                <span className="text-slate-300 font-mono">{service.totalRequests}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111622]/30 border border-white/5 p-6 rounded-2xl space-y-3 backdrop-blur-md">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
              <Layers className="w-4 h-4 text-violet-400" />
              Associated Tags
            </h3>
            {service.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {service.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-semibold text-slate-400 bg-white/5 px-2.5 py-1 rounded border border-white/5"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-500 italic">No tags associated.</span>
            )}
          </div>
        </div>

      </div>

      {/* Playground Modal */}
      <PaymentModal
        service={service}
        isOpen={playgroundOpen}
        onClose={() => setPlaygroundOpen(false)}
      />
    </div>
  )
}
