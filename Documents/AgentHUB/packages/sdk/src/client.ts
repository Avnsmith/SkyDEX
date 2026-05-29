import type { ApiListParams, ApiService, PaginatedResponse, ApiRequest } from '@agenthub/types'

interface AgentHubClientConfig {
  privateKey: `0x${string}`
  baseUrl?: string
  chain?: string
}

interface PayResult {
  data: unknown
  status: number
  txReference?: string
}

/**
 * AgentHubClient — wraps GatewayClient for easy AI agent integration.
 * Agents can discover, pay for, and call APIs in the marketplace.
 *
 * Usage:
 *   const client = new AgentHubClient({ privateKey: process.env.PRIVATE_KEY as `0x${string}` })
 *   const result = await client.invoke('SERVICE_ID', { body: { query: 'hello' } })
 */
export class AgentHubClient {
  private readonly baseUrl: string
  private readonly privateKey: `0x${string}`
  private readonly chain: string
  private gatewayClient: unknown = null

  constructor(config: AgentHubClientConfig) {
    this.privateKey = config.privateKey
    this.baseUrl = config.baseUrl ?? process.env.AGENTHUB_API_URL ?? 'https://api.agenthub.ai'
    this.chain = config.chain ?? 'arcTestnet'
  }

  private async getGatewayClient() {
    if (!this.gatewayClient) {
      const { GatewayClient } = await import('@circle-fin/x402-batching/client')
      this.gatewayClient = new GatewayClient({
        chain: this.chain as 'arcTestnet',
        privateKey: this.privateKey,
      })
    }
    return this.gatewayClient as { pay: (url: string, options?: RequestInit) => Promise<{ data: unknown; status: number }> }
  }

  /**
   * List available APIs in the marketplace.
   */
  async listApis(params: ApiListParams = {}): Promise<PaginatedResponse<ApiService>> {
    const qs = new URLSearchParams()
    if (params.search) qs.set('search', params.search)
    if (params.category) qs.set('category', params.category)
    if (params.sort) qs.set('sort', params.sort)
    if (params.page) qs.set('page', String(params.page))
    if (params.pageSize) qs.set('pageSize', String(params.pageSize))

    const res = await fetch(`${this.baseUrl}/apis?${qs.toString()}`)
    if (!res.ok) throw new Error(`Failed to list APIs: ${res.statusText}`)
    return res.json() as Promise<PaginatedResponse<ApiService>>
  }

  /**
   * Get details for a specific API.
   */
  async getApi(serviceId: string): Promise<ApiService> {
    const res = await fetch(`${this.baseUrl}/apis/${serviceId}`)
    if (!res.ok) throw new Error(`API not found: ${serviceId}`)
    return res.json() as Promise<ApiService>
  }

  /**
   * Call a paid API endpoint — automatically handles x402 payment.
   * Uses GatewayClient under the hood.
   */
  async invoke(serviceId: string, options?: RequestInit): Promise<PayResult> {
    const client = await this.getGatewayClient()
    const url = `${this.baseUrl}/invoke/${serviceId}`
    const result = await client.pay(url, options)
    return {
      data: result.data,
      status: result.status,
    }
  }

  /**
   * Get payment history for this agent's wallet address.
   */
  async getPaymentHistory(address: string): Promise<ApiRequest[]> {
    const res = await fetch(`${this.baseUrl}/analytics/payer/${address}`)
    if (!res.ok) throw new Error(`Failed to fetch payment history`)
    return res.json() as Promise<ApiRequest[]>
  }
}
