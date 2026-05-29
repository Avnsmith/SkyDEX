'use client'

import Link from 'next/link'
import type { ApiService } from '@agenthub/types'
import { formatUsdc } from '@/lib/utils'
import { Terminal, Activity, DollarSign, ArrowRight } from 'lucide-react'

interface ApiCardProps {
  service: ApiService
}

export function ApiCard({ service }: ApiCardProps) {
  // Convert price from 6-decimal string (units) to human USDC e.g. "10000" -> "0.01"
  const priceHuman = parseFloat(service.pricePerCall) / 1_000_000

  return (
    <div className="relative group bg-[#111622]/50 hover:bg-[#151b2a]/70 border border-white/5 hover:border-sky-500/30 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between overflow-hidden backdrop-blur-lg">
      {/* Decorative gradient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div>
        {/* Header: Category & Uptime */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold px-2.5 py-1 bg-sky-500/10 text-sky-400 rounded-md border border-sky-500/10">
            {service.category}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>{service.uptimePercent.toFixed(1)}% uptime</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-sky-400 transition-colors">
          {service.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-400 line-clamp-3 mb-4 leading-relaxed">
          {service.description}
        </p>

        {/* Tags */}
        {service.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {service.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5"
              >
                #{tag}
              </span>
            ))}
            {service.tags.length > 3 && (
              <span className="text-[11px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                +{service.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer: Price & Invoke Link */}
      <div className="pt-4 border-t border-white/5 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">
            Price per call
          </span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-extrabold text-white">
              {priceHuman < 0.00001 ? priceHuman.toFixed(6) : priceHuman.toString()}
            </span>
            <span className="text-xs font-semibold text-slate-400">USDC</span>
          </div>
        </div>

        <Link
          href={`/apis/${service.id}`}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white hover:text-sky-400 text-xs font-semibold rounded-xl border border-white/10 hover:border-sky-500/20 active:scale-95 transition-all duration-200"
        >
          <span>Use API</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  )
}
