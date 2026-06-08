import { AttestationEnvelope } from './attestation-envelope.interface';

export interface IKmsProvider {
  /**
   * Wraps a local data key. Returns the encrypted data key and the optional TEE attestation.
   */
  wrapKey(dataKey: Buffer): Promise<{
    encryptedDataKey: string;
    attestationEnvelope?: AttestationEnvelope;
  }>;

  /**
   * Unwraps/decrypts the encrypted data key back to its plaintext buffer form.
   */
  unwrapKey(encryptedDataKey: string): Promise<Buffer>;
}
