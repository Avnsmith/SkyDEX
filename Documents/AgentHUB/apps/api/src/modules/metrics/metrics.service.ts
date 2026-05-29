import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates standard Prometheus exposition formatted metrics text.
   */
  async getPrometheusMetrics(): Promise<string> {
    const activeApis = await this.prisma.apiService.count({ where: { isActive: true } })
    
    // Aggregated attempt metrics
    const totalAttempts = await this.prisma.paymentAttempt.count()
    const settledAttempts = await this.prisma.paymentAttempt.count({
      where: { status: 'SETTLED' },
    })
    const failedAttempts = await this.prisma.paymentAttempt.count({
      where: { status: 'FAILED' },
    })

    // Aggregated settlements metrics
    const confirmedSettlements = await this.prisma.paymentSettlement.count({
      where: { status: 'CONFIRMED' },
    })

    // Failed validation telemetry
    const totalFailedAuths = await this.prisma.failedAuthorization.count()
    const replayAttempts = await this.prisma.failedAuthorization.count({
      where: { errorType: 'REPLAY' },
    })
    const expiredSignatures = await this.prisma.failedAuthorization.count({
      where: { errorType: 'EXPIRED' },
    })

    // Uptime & Latency averages from ApiService aggregations
    const apiStats = await this.prisma.apiService.aggregate({
      where: { isActive: true },
      _sum: {
        totalRequests: true,
      },
      _avg: {
        uptimePercent: true,
        avgLatencyMs: true,
      },
    })

    const totalRequests = apiStats._sum.totalRequests ?? 0
    const avgUptime = apiStats._avg.uptimePercent ?? 100.0
    const avgLatency = apiStats._avg.avgLatencyMs ?? 0

    return [
      `# HELP agenthub_active_apis_count The number of active registered APIs in the registry`,
      `# TYPE agenthub_active_apis_count gauge`,
      `agenthub_active_apis_count ${activeApis}`,
      '',
      `# HELP agenthub_payment_attempts_total The total number of x402 payment verification attempts`,
      `# TYPE agenthub_payment_attempts_total counter`,
      `agenthub_payment_attempts_total ${totalAttempts}`,
      '',
      `# HELP agenthub_payment_attempts_settled_total The total settled x402 payment attempts`,
      `# TYPE agenthub_payment_attempts_settled_total counter`,
      `agenthub_payment_attempts_settled_total ${settledAttempts}`,
      '',
      `# HELP agenthub_payment_attempts_failed_total The total failed x402 payment attempts`,
      `# TYPE agenthub_payment_attempts_failed_total counter`,
      `agenthub_payment_attempts_failed_total ${failedAttempts}`,
      '',
      `# HELP agenthub_confirmed_settlements_total On-chain verified micropayment settlements confirmed`,
      `# TYPE agenthub_confirmed_settlements_total counter`,
      `agenthub_confirmed_settlements_total ${confirmedSettlements}`,
      '',
      `# HELP agenthub_failed_authorizations_total Security Guard blocked validations`,
      `# TYPE agenthub_failed_authorizations_total counter`,
      `agenthub_failed_authorizations_total ${totalFailedAuths}`,
      '',
      `# HELP agenthub_failed_authorizations_replays Replay attack signatures blocked`,
      `# TYPE agenthub_failed_authorizations_replays counter`,
      `agenthub_failed_authorizations_replays ${replayAttempts}`,
      '',
      `# HELP agenthub_failed_authorizations_expired Expired signature requests blocked`,
      `# TYPE agenthub_failed_authorizations_expired counter`,
      `agenthub_failed_authorizations_expired ${expiredSignatures}`,
      '',
      `# HELP agenthub_proxy_requests_served_total Total upstream proxied invocations`,
      `# TYPE agenthub_proxy_requests_served_total counter`,
      `agenthub_proxy_requests_served_total ${totalRequests}`,
      '',
      `# HELP agenthub_proxy_avg_uptime_percent Average registered APIs uptime ratio`,
      `# TYPE agenthub_proxy_avg_uptime_percent gauge`,
      `agenthub_proxy_avg_uptime_percent ${avgUptime}`,
      '',
      `# HELP agenthub_proxy_avg_latency_ms Average upstream invocation latency in milliseconds`,
      `# TYPE agenthub_proxy_avg_latency_ms gauge`,
      `agenthub_proxy_avg_latency_ms ${avgLatency}`,
    ].join('\n')
  }
}
