import { IKmsProvider } from './interfaces/kms-provider.interface';
import { IAttestationProvider } from './interfaces/attestation-provider.interface';
import { IEntropyProvider } from './interfaces/entropy-provider.interface';

import { MockKmsProvider } from './mock/kms.mock-provider';
import { MockAttestationProvider } from './mock/attestation.mock-provider';
import { MockEntropyProvider } from './mock/entropy.mock-provider';

import { SpaceComputerKmsProvider } from './live/kms.provider';
import { SpaceComputerAttestationProvider } from './live/attestation.provider';
import { SpaceComputerEntropyProvider } from './live/entropy.provider';

export * from './interfaces/kms-provider.interface';
export * from './interfaces/attestation-provider.interface';
export * from './interfaces/entropy-provider.interface';
export * from './interfaces/attestation-envelope.interface';

export * from './mock/kms.mock-provider';
export * from './mock/attestation.mock-provider';
export * from './mock/entropy.mock-provider';

export * from './live/kms.provider';
export * from './live/attestation.provider';
export * from './live/entropy.provider';

export interface SpaceComputerProviders {
  kms: IKmsProvider;
  attestation: IAttestationProvider;
  entropy: IEntropyProvider;
}

/**
 * Factory to retrieve the active provider implementations based on runtime config.
 */
export function getSpaceComputerProviders(): SpaceComputerProviders {
  const mode = (process.env.SPACECOMPUTER_MODE || 'mock').toLowerCase();
  
  if (mode === 'live') {
    const clientId = process.env.ORBITPORT_CLIENT_ID || 'default-client-id';
    const clientSecret = process.env.ORBITPORT_CLIENT_SECRET || process.env.ORBITPORT_API_KEY || '';
    const endpoint = process.env.ORBITPORT_ENDPOINT || '';
    
    if (!clientSecret) {
      console.warn('SPACECOMPUTER_MODE is set to "live" but credentials are missing. Falling back to mock providers.');
      return getMockProviders();
    }

    return {
      kms: new SpaceComputerKmsProvider(clientId, clientSecret, endpoint),
      attestation: new SpaceComputerAttestationProvider(clientId, clientSecret, endpoint),
      entropy: new SpaceComputerEntropyProvider(clientId, clientSecret, endpoint)
    };
  }

  return getMockProviders();
}

function getMockProviders(): SpaceComputerProviders {
  return {
    kms: new MockKmsProvider(),
    attestation: new MockAttestationProvider(),
    entropy: new MockEntropyProvider()
  };
}
