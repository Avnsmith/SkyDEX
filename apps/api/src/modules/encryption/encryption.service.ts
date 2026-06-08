import { Injectable, Inject } from '@nestjs/common';
import type { IKmsProvider, IEntropyProvider, AttestationEnvelope } from '@orbitnote/spacecomputer';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyVersion = '1';

  constructor(
    @Inject('KMS_PROVIDER')
    private kmsProvider: IKmsProvider,
    @Inject('ENTROPY_PROVIDER')
    private entropyProvider: IEntropyProvider,
  ) {}

  /**
   * Encrypts a payload locally with a unique data key and wraps the key via KMS.
   */
  async encryptPayload(plaintext: string | Buffer): Promise<{
    ciphertext: Buffer;
    encryptedDataKey: string;
    iv: string;
    authTag: string;
    algorithm: string;
    keyVersion: string;
    attestationEnvelope?: AttestationEnvelope;
  }> {
    const plaintextBuffer = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;

    // 1. Generate local 32-byte Data Key using Entropy Provider
    const dataKey = await this.entropyProvider.generateSecureBytes(32);

    // 2. Generate random 12-byte IV using Entropy Provider
    const iv = await this.entropyProvider.generateSecureBytes(12);

    // 3. Encrypt payload locally using AES-256-GCM
    const cipher = crypto.createCipheriv(this.algorithm, dataKey, iv) as crypto.CipherGCM;
    const ciphertext = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // 4. Wrap the Data Key via KMS Provider (returns wrapped key + TEE attestation)
    const { encryptedDataKey, attestationEnvelope } = await this.kmsProvider.wrapKey(dataKey);

    return {
      ciphertext,
      encryptedDataKey,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: this.algorithm,
      keyVersion: this.keyVersion,
      attestationEnvelope,
    };
  }

  /**
   * Decrypts a payload by unwrapping the data key via KMS and running local AES-256-GCM decipher.
   */
  async decryptPayload(
    ciphertext: Buffer,
    encryptedDataKey: string,
    ivHex: string,
    authTagHex: string,
    algorithm: string,
  ): Promise<Buffer> {
    // 1. Unwrap/decrypt the Data Key via KMS Provider
    const dataKey = await this.kmsProvider.unwrapKey(encryptedDataKey);

    // 2. Convert IV and AuthTag from hex to Buffers
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // 3. Decrypt payload locally using AES-256-GCM
    const decipher = crypto.createDecipheriv(algorithm, dataKey, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted;
  }

  /**
   * Calculates the SHA-256 hash of a buffer (for file integrity checks).
   */
  calculateSha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Securely generates a public identifier or token using Entropy Provider.
   */
  async generateToken(): Promise<string> {
    return this.entropyProvider.generatePublicToken();
  }
}
