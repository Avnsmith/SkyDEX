import * as crypto from 'crypto';
import { IAttestationProvider } from '../interfaces/attestation-provider.interface';
import { AttestationEnvelope, VerificationMetadata } from '../interfaces/attestation-envelope.interface';

export class MockAttestationProvider implements IAttestationProvider {
  async getAttestation(referenceId: string): Promise<AttestationEnvelope> {
    const signerId = '0x' + crypto.randomBytes(20).toString('hex');
    const verificationMetadata: VerificationMetadata = {
      enclaveMode: 'DEBUG',
      policyVerdict: 'APPROVED',
      signerId,
      enclave_mode: 'DEBUG',
      policy_verdict: 'APPROVED',
      signer_id: signerId
    };

    return {
      attestationId: referenceId,
      attestation_id: referenceId,
      measurement: '0x' + crypto.createHash('sha256').update(referenceId).digest('hex'),
      timestamp: new Date().toISOString(),
      signature: crypto.randomBytes(64).toString('hex'),
      provider: 'mock-spacecomputer-tee-enclave',
      status: 'VERIFIED',
      verificationMetadata,
      verification_metadata: verificationMetadata
    };
  }
}
