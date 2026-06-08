import { API_URL } from '@/config/constants'
import type {
  ApiService,
  ApiListParams,
  PaginatedResponse,
  AnalyticsSummary,
  SellerStats,
  MarketStats,
  CreateApiPayload,
  UpdateApiPayload,
  ApiCategory,
} from '@agenthub/types'

// ─── Internal fetch helper ─────────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (options?.token) {
    headers['Authorization'] = `Bearer ${options.token}`
  }
  const { token: _token, ...restOptions } = options ?? {}
  const res = await fetch(`${API_URL}${path}`, { ...restOptions, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
    throw new Error(body?.error ?? `API Error ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ─── API Client ────────────────────────────────────────────────────────────────
export const apiClient = {
  // ── Marketplace ────────────────────────────────────────────────────────────
  listApis: (params: ApiListParams = {}) => {
    const qs = new URLSearchParams()
    if (params.search) qs.set('search', params.search)
    if (params.category) qs.set('category', params.category)
    if (params.sort) qs.set('sort', params.sort)
    if (params.page) qs.set('page', String(params.page))
    if (params.pageSize) qs.set('pageSize', String(params.pageSize))
    const query = qs.toString()
    return apiFetch<PaginatedResponse<ApiService>>(`/apis${query ? `?${query}` : ''}`)
  },

  getApi: (id: string) => apiFetch<ApiService>(`/apis/${id}`),

  getMarketStats: () => apiFetch<MarketStats>('/analytics/market'),

  // ── Seller ────────────────────────────────────────────────────────────────
  getMyApis: (token: string) =>
    apiFetch<ApiService[]>('/apis/mine', { token }),

  createApi: (data: CreateApiPayload, token: string) =>
    apiFetch<ApiService>('/apis', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  updateApi: (id: string, data: UpdateApiPayload, token: string) =>
    apiFetch<ApiService>(`/apis/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),

  deleteApi: (id: string, token: string) =>
    apiFetch<void>(`/apis/${id}`, { method: 'DELETE', token }),

  // ── Analytics ─────────────────────────────────────────────────────────────
  getApiAnalytics: (id: string, days = 30) =>
    apiFetch<AnalyticsSummary>(`/analytics/api/${id}?days=${days}`),

  getSellerAnalytics: (address: string, days = 30) =>
    apiFetch<AnalyticsSummary>(`/analytics/seller/${address}?days=${days}`),

  getSellerStats: (address: string, token: string) =>
    apiFetch<SellerStats>(`/analytics/seller/${address}/stats`, { token }),

  getPayerHistory: (address: string, page = 1) =>
    apiFetch<PaginatedResponse<{ id: string; apiId: string; apiName: string; amountUsdc: string; txHash: string | null; createdAt: string }>>(
      `/analytics/payer/${address}?page=${page}`,
    ),

  importOpenApi: (
    data: { openApiSpec: string; pricePerCall: string; category: ApiCategory },
    token: string,
  ) =>
    apiFetch<ApiService>('/apis/import-openapi', {
      method: 'POST',
      body: JSON.stringify({
        spec: data.openApiSpec,
        pricePerCall: data.pricePerCall,
        category: data.category,
      }),
      token,
    }),
}
