import { AgentHubClient } from './client'
export function formatUsdc(units: string | bigint, decimals = 4): string {
  const n = BigInt(units)
  const whole = n / 1_000_000n
  const frac = (n % 1_000_000n).toString().padStart(6, '0').slice(0, decimals)
  return `${whole}.${frac}`
}

export interface AgentRuntimeConfig {
  privateKey: `0x${string}`
  baseUrl?: string
  chain?: string
  budgetLimitUsdc: string // e.g. "5.00" USDC limit
  budgetWindow: 'hourly' | 'daily'
}

export class BudgetExceededError extends Error {
  constructor(message: string) {
    super(`Budget Guard: ${message}`)
    this.name = 'BudgetExceededError'
  }
}

export class AgentRuntime {
  private readonly client: AgentHubClient
  private readonly budgetLimit: bigint
  private readonly budgetWindow: 'hourly' | 'daily'
  
  private spentThisWindow: bigint = 0n
  private windowStart: number = Date.now()

  constructor(config: AgentRuntimeConfig) {
    this.client = new AgentHubClient({
      privateKey: config.privateKey,
      baseUrl: config.baseUrl,
      chain: config.chain,
    })

    // Parse budget to 6 decimal units
    const [whole, fraction = ''] = config.budgetLimitUsdc.split('.')
    const paddedFraction = fraction.padEnd(6, '0').slice(0, 6)
    this.budgetLimit = BigInt(whole) * 1_000_000n + BigInt(paddedFraction)
    this.budgetWindow = config.budgetWindow
  }

  /**
   * Reset spending window cache if the budget duration has elapsed
   */
  private checkAndResetWindow() {
    const now = Date.now()
    const elapsed = now - this.windowStart
    const limitMs = this.budgetWindow === 'hourly' ? 3600 * 1000 : 24 * 3600 * 1000

    if (elapsed >= limitMs) {
      this.spentThisWindow = 0n
      this.windowStart = now
    }
  }

  /**
   * Safe autonomous invocation wrapper.
   * Asserts budget controls, handles transient RPC retries, and records usage.
   */
  async invokeWithGuard(
    serviceId: string,
    options?: RequestInit,
    maxRetries = 3,
  ): Promise<{ data: any; status: number }> {
    this.checkAndResetWindow()

    // 1. Fetch API price details to check budget beforehand
    let serviceDetail
    try {
      serviceDetail = await this.client.getApi(serviceId)
    } catch (err: any) {
      throw new Error(`Failed to fetch API details: ${err.message}`)
    }

    const costUnits = BigInt(serviceDetail.pricePerCall)

    // Check budget limit
    if (this.spentThisWindow + costUnits > this.budgetLimit) {
      const budgetLeft = formatUsdc(this.budgetLimit - this.spentThisWindow)
      const cost = formatUsdc(costUnits)
      throw new BudgetExceededError(
        `Action denied! Invocation cost is ${cost} USDC, but remaining window budget is only ${budgetLeft} USDC (Limit: ${formatUsdc(this.budgetLimit)})`,
      )
    }

    // 2. Trigger auto top-up warning if balance is getting low
    try {
      // In real-world, the agent can check its wallet balance via the public client
      const limitWarning = this.budgetLimit / 5n // 20% budget warning threshold
      if (this.budgetLimit - this.spentThisWindow <= limitWarning) {
        console.warn(`[AgentRuntime] Warning: Remaining wallet budget is low! Top up your agent wallet soon.`)
      }
    } catch (err) {
      // Passive logging fallback
    }

    // 3. Execution Retry loop with exponential backoff
    let attempts = 0
    let delay = 1000 // 1s base delay

    while (true) {
      try {
        attempts++
        const result = await this.client.invoke(serviceId, options)
        
        // Success! Track usage
        this.spentThisWindow += costUnits
        return result
      } catch (err: any) {
        const isTransient = err.message.includes('timeout') || err.message.includes('502') || err.message.includes('503')
        
        if (attempts >= maxRetries || !isTransient) {
          throw err
        }

        console.warn(
          `[AgentRuntime] Transient connection error detected. Attempt ${attempts}/${maxRetries} failed. Retrying in ${delay}ms...`,
        )
        
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay *= 2 // Exponential backoff scaling
      }
    }
  }

  /**
   * Get current budget status in human-readable USDC strings
   */
  getBudgetStatus(): { limit: string; spent: string; remaining: string; window: string } {
    this.checkAndResetWindow()
    return {
      limit: formatUsdc(this.budgetLimit),
      spent: formatUsdc(this.spentThisWindow),
      remaining: formatUsdc(this.budgetLimit - this.spentThisWindow),
      window: this.budgetWindow,
    }
  }
}
