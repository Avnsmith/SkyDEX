import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error: any) {
      this.logger.warn(`Failed to connect to database during onModuleInit: ${error.message || error}`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch (error: any) {
      this.logger.warn(`Failed to disconnect from database during onModuleDestroy: ${error.message || error}`);
    }
  }
}
