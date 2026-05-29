import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { PrismaService } from '../../prisma/prisma.service'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly redisClient: Redis | null = null
  private readonly facilitatorUrl: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const redisUrl = this.config.get<string>('REDIS_URL')
    if (redisUrl) {
      this.redisClient = new Redis(redisUrl, { maxRetriesPerRequest: 1 })
    }
    this.facilitatorUrl =
      this.config.get<string>('FACILITATOR_URL') ?? 'https://gateway-api-testnet.circle.com'
  }

  @Get()
  @ApiOperation({ summary: 'Check health of backend services (DB, Redis, Circle Gateway)' })
  async check() {
    let dbStatus = false
    let redisStatus = false
    let gatewayStatus = false

    // 1. Check database
    try {
      await this.prisma.$queryRaw`SELECT 1`
      dbStatus = true
    } catch (err) {
      // Ignored error in health logging to return clean state object
    }

    // 2. Check Redis
    if (this.redisClient) {
      try {
        const ping = await this.redisClient.ping()
        redisStatus = ping === 'PONG'
      } catch (err) {
        // Ignored
      }
    } else {
      redisStatus = true // Assumed true if no local Redis url is provided (in sandbox/dev environments)
    }

    // 3. Check Circle Facilitator
    try {
      const res = await fetch(`${this.facilitatorUrl}/health`, { method: 'GET' })
      gatewayStatus = res.ok || res.status === 404 // 404 means host is active but endpoint not explicitly mapped
    } catch (err) {
      // Ignored
    }

    const overallOk = dbStatus && redisStatus && gatewayStatus

    return {
      status: overallOk ? 'ok' : 'degraded',
      database: dbStatus,
      redis: redisStatus,
      gateway: gatewayStatus,
      timestamp: new Date().toISOString(),
    }
  }
}
