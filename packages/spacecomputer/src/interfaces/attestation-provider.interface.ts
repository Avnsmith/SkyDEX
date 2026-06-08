import { AttestationEnvelope } from './attestation-envelope.interface';

export interface IAttestationProvider {
  /**
   * Resolves the full cryptographic attestation details by reference or operation ID.
   * Returns the raw attestation envelope containing measurements, keys, and signatures.
   */
  getAttestation(referenceId: string): Promise<AttestationEnvelope>;
}
