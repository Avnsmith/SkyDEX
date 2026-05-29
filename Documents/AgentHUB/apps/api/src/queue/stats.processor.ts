import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { STATS_QUEUE, RECORD_REQUEST_JOB } from './queue.constants'

interface RecordRequestJobData {
  requestId: string
  serviceId: string
  payerAddress: string
  amountUsdc: string
  platformFeeUsdc: string
  sellerAmountUsdc: string
  txReference: string
  responseStatus: number
  latencyMs: number
  error?: string
}

@Processor(STATS_QUEUE)
export class StatsProcessor extends WorkerHost {
  private readonly logger = new Logger(StatsProcessor.name)

  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async process(job: Job<any, any, string>): Promise<void> {
    if (job.name === RECORD_REQUEST_JOB) {
      await this.handleRecordRequest(job.data as RecordRequestJobData)
    }
  }

  private async handleRecordRequest(data: RecordRequestJobData): Promise<void> {
    try {
      this.logger.debug(`Processing request stats for service: ${data.serviceId}`)

      // 1. Fetch service details
      const service = await this.prisma.apiService.findUnique({
        where: { id: data.serviceId },
      })

      if (!service) {
        this.logger.error(`Service not found for id: ${data.serviceId}`)
        return
      }

      // 2. Perform all updates in a database transaction
      await this.prisma.$transaction(async (tx) => {
        // Create request log
        await tx.apiRequest.create({
          data: {
            id: data.requestId,
            serviceId: data.serviceId,
            payerAddress: data.payerAddress.toLowerCase(),
            amountUsdc: data.amountUsdc,
            platformFeeUsdc: data.platformFeeUsdc,
            sellerAmountUsdc: data.sellerAmountUsdc,
            txReference: data.txReference,
            responseStatus: data.responseStatus,
            latencyMs: data.latencyMs,
            error: data.error,
          },
        })

        // Increment cumulative totals
        const newTotalRequests = service.totalRequests + 1
        const newTotalRevenue = (BigInt(service.totalRevenue) + BigInt(data.amountUsdc)).toString()

        // Calculate running latency and uptime
        // For simple running average: (current_avg * current_count + new_val) / new_count
        const newAvgLatency = (service.avgLatencyMs * service.totalRequests + data.latencyMs) / newTotalRequests

        // Calculate running uptime (successful status < 500 / total requests)
        const isSuccess = data.responseStatus < 500 && !data.error
        const currentSuccessCount = Math.round((service.uptimePercent / 100) * service.totalRequests)
        const newSuccessCount = currentSuccessCount + (isSuccess ? 1 : 0)
        const newUptimePercent = (newSuccessCount / newTotalRequests) * 100

        await tx.apiService.update({
          where: { id: data.serviceId },
          data: {
            totalRequests: newTotalRequests,
            totalRevenue: newTotalRevenue,
            avgLatencyMs: newAvgLatency,
            uptimePercent: newUptimePercent,
          },
        })

        // Daily statistics aggregation
        const today = new Date()
        today.setUTCHours(0, 0, 0, 0)

        const dailyStat = await tx.dailyApiStat.findUnique({
          where: {
            serviceId_date: {
              serviceId: data.serviceId,
              date: today,
            },
          },
        })

        if (!dailyStat) {
          await tx.dailyApiStat.create({
            data: {
              serviceId: data.serviceId,
              sellerAddress: service.sellerAddress.toLowerCase(),
              date: today,
              requests: 1,
              revenueUsdc: data.amountUsdc,
              platformFeeUsdc: data.platformFeeUsdc,
              avgLatencyMs: data.latencyMs,
              errorCount: isSuccess ? 0 : 1,
            },
          })
        } else {
          const dailyRequests = dailyStat.requests + 1
          const dailyRevenue = (BigInt(dailyStat.revenueUsdc) + BigInt(data.amountUsdc)).toString()
          const dailyPlatformFee = (BigInt(dailyStat.platformFeeUsdc) + BigInt(data.platformFeeUsdc)).toString()
          const dailyAvgLatency = (dailyStat.avgLatencyMs * dailyStat.requests + data.latencyMs) / dailyRequests
          const dailyErrors = dailyStat.errorCount + (isSuccess ? 0 : 1)

          await tx.dailyApiStat.update({
            where: { id: dailyStat.id },
            data: {
              requests: dailyRequests,
              revenueUsdc: dailyRevenue,
              platformFeeUsdc: dailyPlatformFee,
              avgLatencyMs: dailyAvgLatency,
              errorCount: dailyErrors,
            },
          })
        }
      })

      this.logger.debug(`Stats logged successfully for request: ${data.requestId}`)
    } catch (err) {
      this.logger.error(`Failed to process stats job: ${err instanceof Error ? err.message : err}`)
      throw err
    }
  }
}
