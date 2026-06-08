import { Module, Global } from '@nestjs/common';
import { getSpaceComputerProviders } from '@orbitnote/spacecomputer';

@Global()
@Module({
  providers: [
    {
      provide: 'KMS_PROVIDER',
      useFactory: () => {
        const providers = getSpaceComputerProviders();
        return providers.kms;
      },
    },
    {
      provide: 'ATTESTATION_PROVIDER',
      useFactory: () => {
        const providers = getSpaceComputerProviders();
        return providers.attestation;
      },
    },
    {
      provide: 'ENTROPY_PROVIDER',
      useFactory: () => {
        const providers = getSpaceComputerProviders();
        return providers.entropy;
      },
    },
  ],
  exports: ['KMS_PROVIDER', 'ATTESTATION_PROVIDER', 'ENTROPY_PROVIDER'],
})
export class SpaceComputerIntegrationModule {}
