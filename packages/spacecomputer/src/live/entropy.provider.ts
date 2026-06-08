import { OrbitportSDK } from '@spacecomputer-io/orbitport-sdk-ts';
import { IEntropyProvider } from '../interfaces/entropy-provider.interface';

export class SpaceComputerEntropyProvider implements IEntropyProvider {
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

  async generateSecureBytes(size: number): Promise<Buffer> {
    try {
      const response = await this.sdk.ctrng.random();
      return Buffer.from(response.data.data, 'hex');
    } catch (error: any) {
      throw new Error(`SpaceComputer Cosmic Randomness failed: ${error.message || error}`);
    }
  }

  async generatePublicToken(): Promise<string> {
    try {
      const response = await this.sdk.ctrng.random();
      return response.data.data.slice(0, 16).toUpperCase();
    } catch (error: any) {
      throw new Error(`SpaceComputer Cosmic Randomness token generation failed: ${error.message || error}`);
    }
  }
}
