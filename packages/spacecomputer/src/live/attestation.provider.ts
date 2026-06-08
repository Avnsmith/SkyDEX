import { OrbitportSDK } from '@spacecomputer-io/orbitport-sdk-ts';
import { IAttestationProvider } from '../interfaces/attestation-provider.interface';
import { AttestationEnvelope } from '../interfaces/attestation-envelope.interface';

export class SpaceComputerAttestationProvider implements IAttestationProvider {
  private sdk: OrbitportSDK;

  constructor(clientId: string, clientSecret: string, endpoint?: string) {
    this.sdk = new OrbitportSDK({
      config: {
        clientId,
        clientSecret,
        apiUrl: endpoint || 'https://op.spacecomputer.io',
      },
    });
  }

  async getAttestation(referenceId: string): Promise<AttestationEnvelope> {
    try {
      const response = await (this.sdk as any).attestation.getAttestation(referenceId);
      return response as AttestationEnvelope;
    } catch (error: any) {
      throw new Error(`SpaceComputer Attestation retrieval failed: ${error.message || error}`);
    }
  }
}
