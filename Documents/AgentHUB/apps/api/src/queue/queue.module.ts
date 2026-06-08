import { Module, Global } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { StatsProcessor } from './stats.processor'
import { STATS_QUEUE } from './queue.constants'

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: STATS_QUEUE,
    }),
  ],
  providers: [StatsProcessor],
  exports: [BullModule],
})
export class QueueModule {}
