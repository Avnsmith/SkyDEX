import {
  Controller,
  All,
  Param,
  Req,
  Res,
  Next,
  Logger,
} from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { Request, Response, NextFunction } from 'express'
import { ProxyService } from './proxy.service'
import { PrismaService } from '../../prisma/prisma.service'
import { ConfigService } from '@nestjs/config'
import { formatUsdc } from '../../common/usdc.utils'
import { createGatewayMiddleware } from '@circle-fin/x402-batching/server'

@ApiTags('proxy')
@Controller('invoke')
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name)
  private readonly middlewareCache = new Map<string, any>()
  private readonly sellerAddress: string
  private readonly facilitatorUrl: string

  constructor(
    private readonly proxyService: ProxyService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.sellerAddress = this.config.get<string>('SELLER_ADDRESS') ?? ''
    this.facilitatorUrl =
      this.config.get<string>('FACILITATOR_URL') ?? 'https://gateway-api-testnet.circle.com'
  }

  @All(':serviceId')
  @ApiOperation({ summary: 'Invoke a paid API (x402 payment required)' })
  async invoke(
    @Param('serviceId') serviceId: string,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    const service = await this.prisma.apiService.findUnique({ where: { id: serviceId } })
    if (!service) {
      return res.status(404).json({ error: 'API service not found' })
    }
    if (!service.isActive) {
      return res.status(410).json({ error: 'API service is no longer active' })
    }

    // Get or create cached x402 middleware for this price + seller
    const priceHuman = formatUsdc(BigInt(service.pricePerCall))
    const middlewareKey = `${serviceId}:${service.pricePerCall}`
    let gateway = this.middlewareCache.get(middlewareKey)

    if (!gateway) {
      gateway = createGatewayMiddleware({
        sellerAddress: this.sellerAddress,
        facilitatorUrl: this.facilitatorUrl,
        networks: ['eip155:5042002'],
      })
      this.middlewareCache.set(middlewareKey, gateway)
    }

    const priceString = `$${priceHuman}`
    const requirePayment = gateway.require(priceString)

    requirePayment(req as any, res as any, async () => {
      try {
        const payment = (req as any).payment as {
          payer?: string
          amount?: string
          network?: string
        } | undefined

        const result = await this.proxyService.invoke(
          serviceId,
          {
            payer: payment?.payer ?? 'unknown',
            amount: payment?.amount ?? service.pricePerCall,
            network: payment?.network ?? 'eip155:5042002',
            txReference: (req.headers['x-payment-reference'] as string | undefined),
          },
          {},
        )

        res.status(result.status).json({
          data: result.data,
          meta: {
            requestId: result.requestId,
            latencyMs: result.latencyMs,
            priceUsdc: priceHuman,
          },
        })
      } catch (err: any) {
        this.logger.error(`Proxy invoke error: ${err instanceof Error ? err.message : err}`)
        res.status(502).json({ error: 'Upstream API error' })
      }
    })
  }
}
