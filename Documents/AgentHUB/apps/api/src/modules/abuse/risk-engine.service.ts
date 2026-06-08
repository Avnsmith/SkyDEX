import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import Redis from 'ioredis'

@Injectable()
export class RiskEngineService {
  private readonly logger = new Logger(RiskEngineService.name)
  private readonly redisClient: Redis

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const redisUrl = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379'
    this.redisClient = new Redis(redisUrl, { maxRetriesPerRequest: 3 })
  }

  /**
   * Evaluates the risk score of an incoming request and runs rate limit assertions.
   * Throws exceptions if any limit is breached or a threat is detected.
   */
  async evaluateRequest(
    serviceId: string,
    payerAddress: string,
    ipAddress: string,
    txReference: string,
    nonce: string,
    validBefore: number, // Epoch timestamp in seconds
  ): Promise<void> {
    const normalizedWallet = payerAddress.toLowerCase()

    // 1. Replay Attack Prevention
    // Check if nonce is cached in Redis (we cache nonces until their validBefore expires)
    const nonceKey = `nonce:${normalizedWallet}:${nonce}`
    const isReplay = await this.redisClient.get(nonceKey)
    if (isReplay) {
      await this.logFailedAuth(serviceId, normalizedWallet, txReference, 'REPLAY', '0')
      throw new BadRequestException('Security Guard: Replay attack detected! Nonce has already been consumed.')
    }

    // 2. validBefore Expiration Check
    const nowSeconds = Math.floor(Date.now() / 1000)
    if (validBefore < nowSeconds) {
      await this.logFailedAuth(serviceId, normalizedWallet, txReference, 'EXPIRED', '0')
      throw new BadRequestException('Security Guard: Request signature has expired.')
    }

    // Cache the nonce to prevent replay attacks (set expiration based on remaining validity + 5 minutes margin)
    const cacheTtlSeconds = Math.max((validBefore - nowSeconds) + 300, 300)
    await this.redisClient.set(nonceKey, '1', 'EX', cacheTtlSeconds)

    // 3. Sliding-Window Rate Limiting assertions
    // Global IP limits: max 60 requests per minute
    await this.assertSlidingWindow(`rate:ip:${ipAddress}`, 60, 60 * 1000, 'IP rate limit exceeded')

    // Global Wallet limits: max 120 requests per minute
    await this.assertSlidingWindow(`rate:wallet:${normalizedWallet}`, 120, 60 * 1000, 'Wallet rate limit exceeded')

    // 4. Anomaly and Suspicious Failed Validation Lockouts
    const lockoutKey = `lockout:wallet:${normalizedWallet}`
    const isLocked = await this.redisClient.get(lockoutKey)
    if (isLocked) {
      throw new ForbiddenException('Security Guard: Wallet temporarily locked out due to high volume validation failures.')
    }

    // Audit recent failures to detect spamming
    const failureCountKey = `failures:wallet:${normalizedWallet}`
    const failures = await this.redisClient.get(failureCountKey)
    if (failures && parseInt(failures, 10) >= 15) {
      // Lockout wallet for 1 hour
      await this.redisClient.set(lockoutKey, '1', 'EX', 3600)
      await this.redisClient.del(failureCountKey)
      this.logger.warn(`Wallet lock out triggered for wallet: ${normalizedWallet}`)
      throw new ForbiddenException('Security Guard: Wallet locked out due to anomalous validation patterns.')
    }
  }

  /**
   * Increments the failure count for a wallet to enforce spammers lockouts.
   */
  async incrementFailureCount(payerAddress: string): Promise<void> {
    const normalized = payerAddress.toLowerCase()
    const failureCountKey = `failures:wallet:${normalized}`
    
    await this.redisClient.multi()
      .incr(failureCountKey)
      .expire(failureCountKey, 600) // 10 minutes sliding evaluation windows
      .exec()
  }

  /**
   * Dynamic sliding window rate-limiting implementation inside Redis.
   */
  private async assertSlidingWindow(
    key: string,
    limit: number,
    windowMs: number,
    errorMessage: string,
  ): Promise<void> {
    const now = Date.now()
    const clearBefore = now - windowMs
    const randomMember = `${now}-${Math.random().toString(36).slice(2, 10)}`

    // Pipeline executing dynamic zremrangebyscore and zcard counts
    const results = await this.redisClient.multi()
      .zremrangebyscore(key, 0, clearBefore)
      .zcard(key)
      .zadd(key, now, randomMember)
      .expire(key, Math.ceil(windowMs / 1000) + 10)
      .exec()

    if (!results) {
      throw new Error('Redis transaction pipeline failed')
    }

    // zcard is the second operation in the multi transaction
    const count = results[1][1] as number
    if (count >= limit) {
      this.logger.warn(`Rate limit breached on key: ${key} (count: ${count}/${limit})`)
      throw new ForbiddenException(`Abuse Guard: ${errorMessage}`)
    }
  }

  /**
   * Logs a failed auth audit trace inside PostgreSQL for analysis dashboards.
   */
  private async logFailedAuth(
    serviceId: string,
    payerAddress: string,
    txReference: string,
    errorType: 'EXPIRED' | 'REPLAY' | 'INVALID_SIGNATURE' | 'SPAM',
    amountUsdc: string,
  ): Promise<void> {
    try {
      await this.prisma.failedAuthorization.create({
        data: {
          serviceId,
          payerAddress: payerAddress.toLowerCase(),
          txReference,
          errorType,
          amountUsdc,
        },
      })
    } catch (err) {
      this.logger.error(`Failed to audit authorization failure logs: ${err}`)
    }
  }
}
