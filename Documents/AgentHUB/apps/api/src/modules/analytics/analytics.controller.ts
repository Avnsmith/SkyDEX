import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { AnalyticsService } from './analytics.service'
import { Transform } from 'class-transformer'
import { IsOptional } from 'class-validator'

class AnalyticsQueryDto {
  @Transform(({ value }) => parseInt(value) || 30)
  @IsOptional()
  days?: number = 30

  @Transform(({ value }) => parseInt(value) || 1)
  @IsOptional()
  page?: number = 1
}

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('market')
  @ApiOperation({ summary: 'Get marketplace global stats' })
  async getMarketStats() {
    return this.analyticsService.getMarketStats()
  }

  @Get('api/:id')
  @ApiOperation({ summary: 'Get usage analytics for a specific API' })
  async getApiAnalytics(
    @Param('id') id: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getApiAnalytics(id, query.days)
  }

  @Get('seller/:address')
  @ApiOperation({ summary: 'Get total dashboard analytics for a seller' })
  async getSellerAnalytics(
    @Param('address') address: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getSellerAnalytics(address, query.days)
  }

  @Get('seller/:address/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cumulative stats for seller (authorized only)' })
  async getSellerStats(
    @Param('address') address: string,
    @Request() req: { user: { address: string } },
  ) {
    return this.analyticsService.getSellerStats(req.user.address)
  }

  @Get('payer/:address')
  @ApiOperation({ summary: 'Get request/payment logs for an agent/payer' })
  async getPayerHistory(
    @Param('address') address: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getPayerHistory(address, query.page)
  }
}
