import { Module, Global } from '@nestjs/common';
import { SpaceComputerIntegrationModule } from '../../integrations/spacecomputer-integration.module';
import { EncryptionService } from './encryption.service';

@Global()
@Module({
  imports: [SpaceComputerIntegrationModule],
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class EncryptionModule {}
