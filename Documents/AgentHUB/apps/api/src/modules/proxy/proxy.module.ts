import { Module } from '@nestjs/common'
import { ProxyController } from './proxy.controller'
import { ProxyService } from './proxy.service'
import { ApisModule } from '../apis/apis.module'

@Module({
  imports: [ApisModule],
  controllers: [ProxyController],
  providers: [ProxyService],
})
export class ProxyModule {}
