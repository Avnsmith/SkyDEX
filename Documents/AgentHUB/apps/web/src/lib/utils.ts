import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format USDC micro-units (6 decimals) to a display string */
export function formatUsdc(units: string | bigint, decimals = 4): string {
  const n = BigInt(units)
  const whole = n / 1_000_000n
  const frac = (n % 1_000_000n).toString().padStart(6, '0').slice(0, decimals)
  return `${whole}.${frac}`
}

/** Parse a human-readable USDC string to micro-units bigint */
export function parseUsdc(human: string): bigint {
  const [whole = '0', frac = ''] = human.split('.')
  const fracPadded = frac.slice(0, 6).padEnd(6, '0')
  return BigInt(whole) * 1_000_000n + BigInt(fracPadded)
}

/** Format large numbers with K/M suffix */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Shorten an Ethereum address */
export function shortenAddress(addr: string, chars = 4): string {
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`
}

/** Get uptime color class */
export function uptimeColor(uptime: number): string {
  if (uptime >= 99) return 'text-green-400'
  if (uptime >= 95) return 'text-yellow-400'
  return 'text-red-400'
}

/** Get uptime status indicator class */
export function uptimeStatusClass(uptime: number): string {
  if (uptime >= 99) return 'status-online'
  if (uptime >= 95) return 'status-degraded'
  return 'status-offline'
}

/** Time ago formatter */
export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay > 0) return `${diffDay}d ago`
  if (diffHr > 0) return `${diffHr}h ago`
  if (diffMin > 0) return `${diffMin}m ago`
  return 'just now'
}

/** Format a date string as a human-readable date */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Truncate text to a maximum length */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen)}...`
}
