import { Module, Global } from '@nestjs/common'
import { RiskEngineService } from './risk-engine.service'

@Global()
@Module({
  providers: [RiskEngineService],
  exports: [RiskEngineService],
})
export class AbuseModule {}
