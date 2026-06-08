export type ApiCategory =
  | 'AI & ML'
  | 'Data & Analytics'
  | 'Finance & DeFi'
  | 'Search'
  | 'Identity'
  | 'Communication'
  | 'Infrastructure'
  | 'Other'

export interface ApiService {
  id: string
  name: string
  description: string
  endpoint: string
  pricePerCall: string // USDC with 6 decimals, stored as string to avoid float issues
  sellerAddress: string
  category: ApiCategory
  tags: string[]
  isActive: boolean
  totalRequests: number
  totalRevenueUsdc: string
  uptimePercent: number
  createdAt: string
  updatedAt: string
}

export interface ApiRequest {
  id: string
  serviceId: string
  service?: Pick<ApiService, 'id' | 'name' | 'category'>
  payerAddress: string
  amountUsdc: string
  platformFeeUsdc: string
  sellerAmountUsdc: string
  txReference: string
  responseStatus: number
  latencyMs: number
  createdAt: string
}

export interface SellerStats {
  sellerAddress: string
  date: string
  totalRequests: number
  totalRevenueUsdc: string
  platformFeeUsdc: string
  uniqueApis: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ApiListParams {
  search?: string
  category?: ApiCategory
  sort?: 'price_asc' | 'price_desc' | 'popular' | 'newest'
  page?: number
  pageSize?: number
}

export interface RegisterApiDto {
  name: string
  description: string
  endpoint: string
  pricePerCall: string // e.g. "0.01"
  category: ApiCategory
  tags: string[]
}

export interface UpdateApiDto extends Partial<RegisterApiDto> {
  isActive?: boolean
}

export interface SiweMessage {
  domain: string
  address: string
  statement: string
  uri: string
  version: string
  chainId: number
  nonce: string
  issuedAt: string
  expirationTime?: string
}

export interface AuthToken {
  address: string
  token: string
  expiresAt: string
}

export interface AnalyticsSummary {
  totalRequests: number
  totalRevenueUsdc: string
  avgLatencyMs: number
  p95LatencyMs: number
  errorRate: number
  dailyBreakdown: DailyBreakdown[]
}

export interface DailyBreakdown {
  date: string
  requests: number
  revenueUsdc: string
  avgLatencyMs: number
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down'
  database: boolean
  redis: boolean
  gateway: boolean
  timestamp: string
}

export type CreateApiPayload = RegisterApiDto
export type UpdateApiPayload = UpdateApiDto

export interface MarketStats {
  totalApis: number
  totalRequests: number
  totalRevenueUsdc: string
}

