'use client'

import { useState, useEffect, useTransition } from 'react'
import { apiClient } from '@/lib/api'
import { ApiCard } from '@/components/api-card'
import type { ApiService, MarketStats, ApiCategory } from '@agenthub/types'
import { API_CATEGORIES } from '@agenthub/config'
import { cn } from '@/lib/utils'
import { Search, SlidersHorizontal, Layers, Play, DollarSign, Activity } from 'lucide-react'

export default function MarketplacePage() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ApiCategory | 'All'>('All')
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'popular' | 'newest'>('newest')
  
  const [apis, setApis] = useState<ApiService[]>([])
  const [marketStats, setMarketStats] = useState<MarketStats>({
    totalApis: 0,
    totalRequests: 0,
    totalRevenueUsdc: '0.00',
  })
  
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)

  // 1. Load Market Stats
  useEffect(() => {
    apiClient.getMarketStats()
      .then(setMarketStats)
      .catch((err) => console.error('Failed to load market stats', err))
  }, [])

  // 2. Load and filter APIs
  useEffect(() => {
    setIsLoading(true)
    apiClient.listApis({
      search: search || undefined,
      category: selectedCategory === 'All' ? undefined : selectedCategory,
      sort: sortBy,
      page: 1,
      pageSize: 50,
    })
      .then((res) => {
        setApis(res.data)
      })
      .catch((err) => {
        console.error('Failed to fetch APIs', err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [search, selectedCategory, sortBy])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* ── Hero Section ── */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          Self-Hosted API Marketplace for <span className="gradient-text">AI Agents</span>
        </h1>
        <p className="text-lg text-slate-400">
          Discover, deploy, and execute paid APIs per request with instant USDC nanopayments on Arc Testnet. 
          Powered by Circle x402 gateway batching.
        </p>
      </div>

      {/* ── Global Market Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-[#111622]/40 border border-white/5 p-6 rounded-2xl flex items-center gap-4 backdrop-blur-md">
          <div className="w-12 h-12 bg-sky-500/10 rounded-xl flex items-center justify-center border border-sky-500/15">
            <Layers className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Active Services</span>
            <div className="text-2xl font-black text-white">{marketStats.totalApis}</div>
          </div>
        </div>

        <div className="bg-[#111622]/40 border border-white/5 p-6 rounded-2xl flex items-center gap-4 backdrop-blur-md">
          <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center border border-violet-500/15">
            <Play className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total API Invocations</span>
            <div className="text-2xl font-black text-white">{marketStats.totalRequests}</div>
          </div>
        </div>

        <div className="bg-[#111622]/40 border border-white/5 p-6 rounded-2xl flex items-center gap-4 backdrop-blur-md">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/15">
            <DollarSign className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Volume Settled</span>
            <div className="text-2xl font-black text-white">{marketStats.totalRevenueUsdc} <span className="text-xs text-slate-400">USDC</span></div>
          </div>
        </div>
      </div>

      {/* ── Filters and Search ── */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between border-t border-white/5 pt-8">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search API names, descriptions, or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[#111622]/60 hover:bg-[#151b2a]/80 focus:bg-[#151b2a] border border-white/5 focus:border-sky-500/30 text-white rounded-xl placeholder-slate-500 outline-none text-sm transition-all shadow-inner"
          />
        </div>

        {/* Sort drop down */}
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-3 bg-[#111622]/60 border border-white/5 text-slate-300 text-sm font-semibold rounded-xl outline-none hover:border-white/10 transition-colors"
          >
            <option value="newest">Newest APIs</option>
            <option value="popular">Most Popular</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('All')}
          className={cn(
            'px-4 py-2 text-xs font-semibold rounded-lg border transition-all active:scale-95',
            selectedCategory === 'All'
              ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 shadow-md shadow-sky-500/5'
              : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          )}
        >
          All Categories
        </button>
        {API_CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn(
              'px-4 py-2 text-xs font-semibold rounded-lg border transition-all active:scale-95',
              selectedCategory === category
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 shadow-md shadow-sky-500/5'
                : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            )}
          >
            {category}
          </button>
        ))}
      </div>

      {/* ── API Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#111622]/40 border border-white/5 h-[230px] rounded-2xl animate-pulse flex flex-col p-6 justify-between">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="w-16 h-5 bg-white/5 rounded" />
                  <div className="w-24 h-5 bg-white/5 rounded" />
                </div>
                <div className="w-3/4 h-6 bg-white/5 rounded" />
                <div className="w-full h-12 bg-white/5 rounded" />
              </div>
              <div className="w-full h-8 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : apis.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl space-y-3">
          <Layers className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No APIs Found</h3>
          <p className="text-sm text-slate-500">Try adjusting your search criteria or selecting a different category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apis.map((api) => (
            <ApiCard key={api.id} service={api} />
          ))}
        </div>
      )}
    </div>
  )
}
