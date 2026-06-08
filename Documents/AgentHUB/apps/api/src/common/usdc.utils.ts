/**
 * USDC utility functions.
 * Arc Testnet USDC ERC20 = 6 decimals.
 * NEVER use floating point for USDC amounts.
 */

/**
 * Convert human-readable USDC (e.g. "0.01") to 6-decimal units ("10000")
 */
export function parseUsdc(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.')
  const paddedFraction = fraction.padEnd(6, '0').slice(0, 6)
  return BigInt(whole) * 1_000_000n + BigInt(paddedFraction)
}

/**
 * Convert 6-decimal units back to human-readable string (e.g. "10000" → "0.010000")
 */
export function formatUsdc(units: bigint | string): string {
  const n = BigInt(units)
  const whole = n / 1_000_000n
  const frac = (n % 1_000_000n).toString().padStart(6, '0')
  return `${whole}.${frac}`
}

/**
 * Apply platform fee (bps) to amount. Returns { sellerAmount, platformFee }.
 * Both in 6-decimal unit strings.
 */
export function splitFee(
  amountUnits: bigint,
  feeBps: number,
): { sellerAmount: bigint; platformFee: bigint } {
  const platformFee = (amountUnits * BigInt(feeBps)) / 10_000n
  const sellerAmount = amountUnits - platformFee
  return { sellerAmount, platformFee }
}
