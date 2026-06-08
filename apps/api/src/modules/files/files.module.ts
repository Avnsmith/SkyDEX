import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SpaceComputerIntegrationModule } from '../../integrations/spacecomputer-integration.module';
import { SupabaseStorageService } from '../../integrations/supabase-storage.service';
import { AttestationsModule } from '../attestations/attestations.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';

@Module({
  imports: [
    ConfigModule,
    SpaceComputerIntegrationModule,
    AttestationsModule,
    AuditLogsModule,
  ],
  providers: [FilesService, SupabaseStorageService],
  controllers: [FilesController],
})
export class FilesModule {}
