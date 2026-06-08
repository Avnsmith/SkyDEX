'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/providers/auth-provider'
import { API_CATEGORIES } from '@agenthub/config'
import type { ApiCategory } from '@agenthub/types'
import { ArrowLeft, Cpu, Globe, DollarSign, Tag, Loader2, Save, FileJson, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function RegisterApiPage() {
  const router = useRouter()
  const { token, isAuthenticated } = useAuth()
  
  const [activeTab, setActiveTab] = useState<'manual' | 'openapi'>('manual')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Manual Form States
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [pricePerCall, setPricePerCall] = useState('')
  const [category, setCategory] = useState<ApiCategory>('AI & ML')
  const [tagsString, setTagsString] = useState('')

  // OpenAPI Specs States
  const [openApiSpec, setOpenApiSpec] = useState('{\n  "openapi": "3.0.0",\n  "info": {\n    "title": "Custom Llama Translation Endpoint",\n    "description": "Premium translation pipeline optimized for AI agents.",\n    "version": "1.0.0"\n  },\n  "servers": [\n    {\n      "url": "https://api.yourdomain.com/v1"\n    }\n  ]\n}')
  const [specPrice, setSpecPrice] = useState('')
  const [specCategory, setSpecCategory] = useState<ApiCategory>('AI & ML')

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAuthenticated || !token) {
      toast.error('Please connect your wallet and sign in first')
      return
    }

    if (!name || name.length < 3 || name.length > 80) {
      toast.error('API name must be between 3 and 80 characters')
      return
    }

    if (!description || description.length < 10 || description.length > 500) {
      toast.error('Description must be between 10 and 500 characters')
      return
    }

    if (!endpoint.startsWith('https://')) {
      toast.error('SSRF Protection Guard: Endpoint must use secure HTTPS protocol!')
      return
    }

    const parsedPrice = parseFloat(pricePerCall)
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error('Price must be a valid positive number of USDC')
      return
    }

    setIsSubmitting(true)
    try {
      const tags = tagsString
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)

      await apiClient.createApi(
        {
          name,
          description,
          endpoint,
          pricePerCall,
          category,
          tags,
        },
        token
      )

      toast.success('API registered successfully!')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(`Registration failed: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenApiSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAuthenticated || !token) {
      toast.error('Please connect your wallet and sign in first')
      return
    }

    const parsedPrice = parseFloat(specPrice)
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error('Price must be a valid positive number of USDC')
      return
    }

    setIsSubmitting(true)
    try {
      // Validate OpenAPI JSON format locally first
      try {
        JSON.parse(openApiSpec)
      } catch {
        throw new Error('Invalid JSON format inside OpenAPI Spec editor')
      }

      await apiClient.importOpenApi(
        {
          openApiSpec,
          pricePerCall: specPrice,
          category: specCategory,
        },
        token
      )

      toast.success('OpenAPI specifications parsed and registered successfully!')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="text-slate-400 text-sm">Please connect your wallet and sign in to register API services.</p>
        <Link href="/" className="inline-block text-sky-400 font-semibold hover:underline">
          Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-white">Publish New API Endpoint</h1>
        <p className="text-sm text-slate-400">
          Register endpoints manually or upload an OpenAPI schema spec to auto-configure routes.
        </p>
      </div>

      {/* Tabs Switch */}
      <div className="flex gap-2 p-1.5 bg-[#111622]/60 border border-white/5 rounded-2xl max-w-sm">
        <button
          onClick={() => setActiveTab('manual')}
          className={cn(
            'flex-1 py-2 text-xs font-semibold rounded-xl transition-all',
            activeTab === 'manual' ? 'bg-[#1a1f2e] text-white shadow-sm' : 'text-slate-400 hover:text-white'
          )}
        >
          Manual Registration
        </button>
        <button
          onClick={() => setActiveTab('openapi')}
          className={cn(
            'flex-1 py-2 text-xs font-semibold rounded-xl transition-all',
            activeTab === 'openapi' ? 'bg-[#1a1f2e] text-white shadow-sm' : 'text-slate-400 hover:text-white'
          )}
        >
          OpenAPI Import
        </button>
      </div>

      {activeTab === 'manual' ? (
        <form onSubmit={handleManualSubmit} className="bg-[#111622]/30 border border-white/5 p-8 rounded-2xl space-y-6 backdrop-blur-md animate-in fade-in duration-150">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              API Service Name
            </label>
            <div className="relative">
              <Cpu className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                placeholder="e.g. Llama-3 Generative Text, CoinGecko Crypto Oracle"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#0b0f19] border border-white/5 focus:border-sky-500/30 text-white rounded-xl placeholder-slate-600 outline-none text-sm transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Short Description
            </label>
            <textarea
              required
              rows={3}
              maxLength={500}
              placeholder="Explain what the API does, parameters it accepts, and format of results (max 500 characters)."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-[#0b0f19] border border-white/5 focus:border-sky-500/30 text-white rounded-xl placeholder-slate-600 outline-none text-sm transition-colors resize-none"
            />
          </div>

          {/* Endpoint (Private) */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Upstream Endpoint URL
              </label>
              <span className="text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/10 uppercase tracking-wider font-semibold">
                ssrf isolated
              </span>
            </div>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="url"
                required
                placeholder="https://api.yourdomain.com/v1/translate"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#0b0f19] border border-white/5 focus:border-sky-500/30 text-white rounded-xl placeholder-slate-600 outline-none text-sm transition-colors"
              />
            </div>
          </div>

          {/* Category & Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Marketplace Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ApiCategory)}
                className="w-full px-4 py-3 bg-[#0b0f19] border border-white/5 focus:border-sky-500/30 text-slate-200 text-sm font-semibold rounded-xl outline-none transition-colors"
              >
                {API_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Price Per Call (USDC)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 0.05, 0.001"
                  value={pricePerCall}
                  onChange={(e) => setPricePerCall(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#0b0f19] border border-white/5 focus:border-sky-500/30 text-white rounded-xl placeholder-slate-600 outline-none text-sm transition-colors font-mono"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Associated Tags
            </label>
            <div className="relative">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="comma separated tags, e.g. sentiment, nlp, weather"
                value={tagsString}
                onChange={(e) => setTagsString(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#0b0f19] border border-white/5 focus:border-sky-500/30 text-white rounded-xl placeholder-slate-600 outline-none text-sm transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-sky-500/20 active:scale-95 transition-all duration-200"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Publish API Route
          </button>
        </form>
      ) : (
        <form onSubmit={handleOpenApiSubmit} className="bg-[#111622]/30 border border-white/5 p-8 rounded-2xl space-y-6 backdrop-blur-md animate-in fade-in duration-150">
          
          {/* OpenAPI JSON Spec Editor */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block flex items-center gap-2">
              <FileJson className="w-4 h-4 text-sky-400" />
              OpenAPI JSON Specification
            </label>
            <textarea
              required
              rows={8}
              value={openApiSpec}
              onChange={(e) => setOpenApiSpec(e.target.value)}
              className="w-full px-4 py-3 bg-[#0b0f19] border border-white/5 focus:border-sky-500/30 text-emerald-400 font-mono rounded-xl outline-none text-xs transition-colors resize-none"
              spellCheck="false"
            />
            <p className="text-[10px] text-slate-500">
              The spec will be parsed at registration. Upstream server will be automatically configured from the first servers block address.
            </p>
          </div>

          {/* Pricing & Category for OpenAPI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Category
              </label>
              <select
                value={specCategory}
                onChange={(e) => setSpecCategory(e.target.value as ApiCategory)}
                className="w-full px-4 py-3 bg-[#0b0f19] border border-white/5 focus:border-sky-500/30 text-slate-200 text-sm font-semibold rounded-xl outline-none transition-colors"
              >
                {API_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Price Per Request (USDC)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 0.02, 0.005"
                  value={specPrice}
                  onChange={(e) => setSpecPrice(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#0b0f19] border border-white/5 focus:border-sky-500/30 text-white rounded-xl placeholder-slate-600 outline-none text-sm transition-colors font-mono"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-sky-500/20 active:scale-95 transition-all duration-200"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            Parse & Publish OpenAPI Spec
          </button>

        </form>
      )}

    </div>
  )
}
