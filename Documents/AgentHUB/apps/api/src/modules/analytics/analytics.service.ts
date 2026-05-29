import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { formatUsdc } from '../../common/usdc.utils'

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMarketStats() {
    const activeApisCount = await this.prisma.apiService.count({
      where: { isActive: true },
    })

    const apiSums = await this.prisma.apiService.aggregate({
      where: { isActive: true },
      _sum: {
        totalRequests: true,
      },
    })

    // Summing totalRevenue (stored as string)
    const apis = await this.prisma.apiService.findMany({
      where: { isActive: true },
      select: { totalRevenue: true },
    })

    const totalRevenueUsdc = apis
      .reduce((acc, curr) => acc + BigInt(curr.totalRevenue), 0n)
      .toString()

    return {
      totalApis: activeApisCount,
      totalRequests: apiSums._sum.totalRequests ?? 0,
      totalRevenueUsdc: formatUsdc(totalRevenueUsdc),
    }
  }

  async getApiAnalytics(serviceId: string, days = 30) {
    const service = await this.prisma.apiService.findUnique({
      where: { id: serviceId },
    })

    if (!service) throw new NotFoundException('Service not found')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const dailyStats = await this.prisma.dailyApiStat.findMany({
      where: {
        serviceId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    })

    // Fetch requests for p95 calculations
    const requests = await this.prisma.apiRequest.findMany({
      where: {
        serviceId,
        createdAt: { gte: startDate },
      },
      select: { latencyMs: true, responseStatus: true },
    })

    const totalRequests = requests.length
    const errorCount = requests.filter((r) => r.responseStatus >= 500).length
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0

    // p95 latency
    let p95LatencyMs = 0
    if (totalRequests > 0) {
      const latencies = requests.map((r) => r.latencyMs).sort((a, b) => a - b)
      const index = Math.floor(totalRequests * 0.95)
      p95LatencyMs = latencies[index] ?? 0
    }

    const totalRevenueUsdc = dailyStats
      .reduce((acc, curr) => acc + BigInt(curr.revenueUsdc), 0n)
      .toString()

    const dailyBreakdown = dailyStats.map((stat) => ({
      date: stat.date.toISOString().split('T')[0],
      requests: stat.requests,
      revenueUsdc: formatUsdc(stat.revenueUsdc),
      avgLatencyMs: stat.avgLatencyMs,
    }))

    return {
      totalRequests,
      totalRevenueUsdc: formatUsdc(totalRevenueUsdc),
      avgLatencyMs: service.avgLatencyMs,
      p95LatencyMs,
      errorRate,
      dailyBreakdown,
    }
  }

  async getSellerAnalytics(sellerAddress: string, days = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const normalizedAddress = sellerAddress.toLowerCase()

    const dailyStats = await this.prisma.dailyApiStat.findMany({
      where: {
        sellerAddress: normalizedAddress,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    })

    // Group and aggregate by date
    const dateMap = new Map<string, { requests: number; revenueUnits: bigint; totalLatency: number; count: number }>()

    for (const stat of dailyStats) {
      const dateStr = stat.date.toISOString().split('T')[0]
      const existing = dateMap.get(dateStr) ?? { requests: 0, revenueUnits: 0n, totalLatency: 0, count: 0 }

      dateMap.set(dateStr, {
        requests: existing.requests + stat.requests,
        revenueUnits: existing.revenueUnits + BigInt(stat.revenueUsdc),
        totalLatency: existing.totalLatency + (stat.avgLatencyMs * stat.requests),
        count: existing.count + stat.requests,
      })
    }

    const dailyBreakdown = Array.from(dateMap.entries()).map(([date, val]) => ({
      date,
      requests: val.requests,
      revenueUsdc: formatUsdc(val.revenueUnits),
      avgLatencyMs: val.count > 0 ? val.totalLatency / val.count : 0,
    })).sort((a, b) => a.date.localeCompare(b.date))

    const totalRequests = dailyBreakdown.reduce((acc, curr) => acc + curr.requests, 0)
    const totalRevenueUsdc = dailyBreakdown
      .reduce((acc, curr) => acc + BigInt(curr.revenueUsdc.replace('.', '')), 0n)
      .toString()

    return {
      totalRequests,
      totalRevenueUsdc: formatUsdc(totalRevenueUsdc),
      avgLatencyMs: dailyBreakdown.length > 0
        ? dailyBreakdown.reduce((acc, curr) => acc + curr.avgLatencyMs, 0) / dailyBreakdown.length
        : 0,
      p95LatencyMs: 0, // dynamic aggregate p95 omitted for global dashboard simplicity
      errorRate: 0,
      dailyBreakdown,
    }
  }

  async getSellerStats(sellerAddress: string) {
    const normalizedAddress = sellerAddress.toLowerCase()

    const apis = await this.prisma.apiService.findMany({
      where: { sellerAddress: normalizedAddress, isActive: true },
      select: { totalRequests: true, totalRevenue: true },
    })

    const totalRequests = apis.reduce((acc, curr) => acc + curr.totalRequests, 0)
    const totalRevenueUnits = apis.reduce((acc, curr) => acc + BigInt(curr.totalRevenue), 0n)

    return {
      sellerAddress: normalizedAddress,
      totalRequests,
      totalRevenueUsdc: formatUsdc(totalRevenueUnits),
      uniqueApis: apis.length,
    }
  }

  async getPayerHistory(payerAddress: string, page = 1) {
    const pageSize = 15
    const skip = (page - 1) * pageSize

    const normalizedAddress = payerAddress.toLowerCase()

    const [data, total] = await this.prisma.$transaction([
      this.prisma.apiRequest.findMany({
        where: { payerAddress: normalizedAddress },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          service: {
            select: { name: true },
          },
        },
      }),
      this.prisma.apiRequest.count({
        where: { payerAddress: normalizedAddress },
      }),
    ])

    const formattedData = data.map((req) => ({
      id: req.id,
      apiId: req.serviceId,
      apiName: req.service?.name ?? 'Unknown API',
      amountUsdc: formatUsdc(req.amountUsdc),
      txHash: req.txReference,
      createdAt: req.createdAt.toISOString(),
    }))

    return {
      data: formattedData,
      total,
      page,
      pageSize,
      hasMore: skip + formattedData.length < total,
    }
  }
}
