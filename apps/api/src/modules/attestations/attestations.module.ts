import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SpaceComputerIntegrationModule } from '../../integrations/spacecomputer-integration.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AttestationsService } from './attestations.service';
import { AttestationsController } from './attestations.controller';

@Module({
  imports: [ConfigModule, SpaceComputerIntegrationModule, AuditLogsModule],
  providers: [AttestationsService],
  controllers: [AttestationsController],
  exports: [AttestationsService],
})
export class AttestationsModule {}
