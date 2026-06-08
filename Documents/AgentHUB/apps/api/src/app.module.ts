import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { BullModule } from '@nestjs/bullmq'
import { TerminusModule } from '@nestjs/terminus'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { ApisModule } from './modules/apis/apis.module'
import { ProxyModule } from './modules/proxy/proxy.module'
import { AnalyticsModule } from './modules/analytics/analytics.module'
import { HealthModule } from './modules/health/health.module'
import { QueueModule } from './queue/queue.module'
import { PaymentsModule } from './modules/payments/payments.module'
import { AbuseModule } from './modules/abuse/abuse.module'
import { MetricsModule } from './modules/metrics/metrics.module'

@Module({
  imports: [
    // Config — global so all modules can inject ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting — two tiers to protect both burst and sustained load
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1_000,
        limit: 20,
      },
      {
        name: 'medium',
        ttl: 60_000,
        limit: 200,
      },
    ]),

    // BullMQ — async job queues backed by Redis
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1_000 },
          removeOnComplete: { count: 500 },
          removeOnFail: { count: 100 },
        },
      }),
    }),

    TerminusModule,
    PrismaModule,
    AuthModule,
    ApisModule,
    ProxyModule,
    AnalyticsModule,
    HealthModule,
    QueueModule,
    PaymentsModule,
    AbuseModule,
    MetricsModule,
  ],
})
export class AppModule {}
