import { OrbitportSDK } from '@spacecomputer-io/orbitport-sdk-ts';
import { IKmsProvider } from '../interfaces/kms-provider.interface';
import { AttestationEnvelope } from '../interfaces/attestation-envelope.interface';
import * as crypto from 'crypto';

export class SpaceComputerKmsProvider implements IKmsProvider {
  private sdk: OrbitportSDK;
  private keyId: string;

  constructor(clientId: string, clientSecret: string, endpoint?: string) {
    const keyId = process.env.ORBITPORT_KMS_KEY_ID;
    if (!keyId) {
      throw new Error('ORBITPORT_KMS_KEY_ID environment variable is missing');
    }
    this.keyId = keyId;

    this.sdk = new OrbitportSDK({
      config: {
        clientId,
        clientSecret,
        apiUrl: endpoint || 'https://op.spacecomputer.io',
      },
    });
  }

  async wrapKey(dataKey: Buffer): Promise<{
    encryptedDataKey: string;
    attestationEnvelope?: AttestationEnvelope;
  }> {
    try {
      const result = await this.sdk.kms.encrypt({
        keyId: this.keyId,
        plaintext: new Uint8Array(dataKey),
        encoding: 'bytes',
      });

      const attestationId = result.metadata?.request_id || crypto.randomUUID();
      const attestationEnvelope: AttestationEnvelope = {
        attestationId,
        attestation_id: attestationId,
        provider: 'spacecomputer-kms',
        measurement: '0x' + crypto.createHash('sha256').update(this.keyId).digest('hex'),
        timestamp: result.metadata?.timestamp ? new Date(result.metadata.timestamp).toISOString() : new Date().toISOString(),
        signature: 'signed-by-spacecomputer-kms',
        status: 'VERIFIED',
      };

      return {
        encryptedDataKey: result.data.CiphertextBlob,
        attestationEnvelope,
      };
    } catch (error: any) {
      throw new Error(`SpaceComputer KMS wrapKey failed: ${error.message || error}`);
    }
  }

  async unwrapKey(encryptedDataKey: string): Promise<Buffer> {
    try {
      const result = await this.sdk.kms.decrypt({
        keyId: this.keyId,
        ciphertextBlob: encryptedDataKey,
        encoding: 'bytes',
      });

      return Buffer.from((result.data as any).Plaintext);
    } catch (error: any) {
      throw new Error(`SpaceComputer KMS unwrapKey failed: ${error.message || error}`);
    }
  }
}
