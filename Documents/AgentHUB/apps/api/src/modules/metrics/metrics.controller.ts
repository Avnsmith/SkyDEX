import { Controller, Get, Header, Res } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { MetricsService } from './metrics.service'
import { Response } from 'express'

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Scrape Prometheus metrics for Grafana' })
  async getMetrics(@Res() res: Response) {
    const metrics = await this.metricsService.getPrometheusMetrics()
    res.end(metrics)
  }
}
