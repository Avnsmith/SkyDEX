import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SpaceComputerIntegrationModule } from '../../integrations/spacecomputer-integration.module';
import { AttestationsModule } from '../attestations/attestations.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';

@Module({
  imports: [
    ConfigModule,
    SpaceComputerIntegrationModule,
    AttestationsModule,
    AuditLogsModule,
  ],
  providers: [NotesService],
  controllers: [NotesController],
})
export class NotesModule {}
