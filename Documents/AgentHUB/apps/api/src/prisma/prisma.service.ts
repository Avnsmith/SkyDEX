import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name)

  constructor() {
    super({
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
    })
  }

  async onModuleInit() {
    await this.$connect()
    this.logger.log('Database connected')

    // Log slow queries in development
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(this as any).$on('warn', (e: { message: string }) => {
        this.logger.warn(`Prisma warn: ${e.message}`)
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(this as any).$on('error', (e: { message: string }) => {
        this.logger.error(`Prisma error: ${e.message}`)
      })
    }
  }

  async onModuleDestroy() {
    await this.$disconnect()
    this.logger.log('Database disconnected')
  }
}
