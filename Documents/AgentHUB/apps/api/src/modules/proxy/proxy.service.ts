import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
  NotFoundException,
} from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { PrismaService } from '../../prisma/prisma.service'
import { validateSellerEndpoint } from '../../common/ssrf-guard'
import { splitFee } from '../../common/usdc.utils'
import { STATS_QUEUE, RECORD_REQUEST_JOB } from '../../queue/queue.constants'
import { ConfigService } from '@nestjs/config'

export interface InvokeResult {
  data: any
  status: number
  latencyMs: number
  requestId: string
}

export interface PaymentInfo {
  payer: string
  amount: string
  network: string
  txReference?: string
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name)
  private readonly platformFeeBps: number

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(STATS_QUEUE) private readonly statsQueue: Queue,
  ) {
    this.platformFeeBps = parseInt(this.config.get<string>('PLATFORM_FEE_BPS') ?? '200')
  }

  async invoke(
    serviceId: string,
    payment: PaymentInfo,
    requestHeaders: Record<string, string>,
  ): Promise<InvokeResult> {
    // Load service
    const service = await this.prisma.apiService.findUnique({ where: { id: serviceId } })
    if (!service) throw new NotFoundException('API service not found')
    if (!service.isActive) throw new BadRequestException('API service is not active')

    // SSRF guard on stored endpoint (belt-and-suspenders)
    validateSellerEndpoint(service.endpoint)

    const start = Date.now()
    let responseStatus = 0
    let responseData: any = null
    let proxyError: string | null = null

    try {
      // Forward request — only safe headers
      const safeHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-AgentHub-Request': '1',
        'User-Agent': 'AgentHub-Proxy/1.0',
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30_000)

      const upstream = await fetch(service.endpoint, {
        method: 'GET',
        headers: safeHeaders,
        signal: controller.signal,
      })
      clearTimeout(timeout)

      responseStatus = upstream.status
      const contentType = upstream.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        responseData = await upstream.json()
      } else {
        responseData = await upstream.text()
      }
    } catch (err: any) {
      if (err instanceof Error) {
        proxyError = err.message
        this.logger.error(`Proxy error for ${serviceId}: ${err.message}`)
        if (err.name === 'AbortError') throw new ServiceUnavailableException('Upstream API timed out')
      }
      responseStatus = 502
      responseData = { error: 'Upstream API unavailable' }
    }

    const latencyMs = Date.now() - start
    const amountUnits = BigInt(payment.amount || service.pricePerCall)
    const { platformFee, sellerAmount } = splitFee(amountUnits, this.platformFeeBps)

    // Record request async via queue
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`
    await this.statsQueue.add(RECORD_REQUEST_JOB, {
      requestId,
      serviceId,
      payerAddress: payment.payer,
      amountUsdc: amountUnits.toString(),
      platformFeeUsdc: platformFee.toString(),
      sellerAmountUsdc: sellerAmount.toString(),
      txReference: payment.txReference ?? requestId,
      responseStatus,
      latencyMs,
      error: proxyError,
    })

    return { data: responseData, status: responseStatus, latencyMs, requestId }
  }
}
