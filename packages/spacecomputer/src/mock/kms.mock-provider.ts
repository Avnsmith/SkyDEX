import * as crypto from 'crypto';
import { IKmsProvider } from '../interfaces/kms-provider.interface';
import { AttestationEnvelope } from '../interfaces/attestation-envelope.interface';

export class MockKmsProvider implements IKmsProvider {
  private masterKey: Buffer;

  constructor() {
    const secret = process.env.MOCK_KMS_MASTER_SECRET || 'orbitnote-mock-master-secret-phrase';
    this.masterKey = crypto.scryptSync(secret, 'orbitnote-kms-salt', 32);
  }

  async wrapKey(dataKey: Buffer): Promise<{
    encryptedDataKey: string;
    attestationEnvelope?: AttestationEnvelope;
  }> {
    // Local AES-256-GCM wrapping of the data key
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    
    const encrypted = Buffer.concat([cipher.update(dataKey), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const payload = {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      ciphertext: encrypted.toString('hex')
    };

    const encryptedDataKey = Buffer.from(JSON.stringify(payload)).toString('base64');

    const attestationId = crypto.randomUUID();
    const attestationEnvelope: AttestationEnvelope = {
      attestationId,
      attestation_id: attestationId,
      provider: 'mock-spacecomputer-tee-enclave',
      measurement: '0x' + crypto.createHash('sha256').update(this.masterKey).digest('hex'),
      timestamp: new Date().toISOString(),
      signature: crypto.randomBytes(64).toString('hex'),
      status: 'VERIFIED'
    };

    return {
      encryptedDataKey,
      attestationEnvelope
    };
  }

  async unwrapKey(encryptedDataKey: string): Promise<Buffer> {
    try {
      const payloadStr = Buffer.from(encryptedDataKey, 'base64').toString('utf8');
      const payload = JSON.parse(payloadStr);

      const iv = Buffer.from(payload.iv, 'hex');
      const authTag = Buffer.from(payload.authTag, 'hex');
      const ciphertext = Buffer.from(payload.ciphertext, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return decrypted;
    } catch (error) {
      throw new Error(`Failed to unwrap data key: ${(error as Error).message}`);
    }
  }
}
