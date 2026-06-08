export interface VerificationMetadata {
  enclaveMode: string;
  policyVerdict: string;
  signerId: string;
  enclave_mode?: string;
  policy_verdict?: string;
  signer_id?: string;
}

export interface AttestationEnvelope {
  attestationId: string;
  provider: string;
  measurement: string;
  timestamp: string;
  signature: string;
  status: string;
  verificationMetadata?: VerificationMetadata;
  attestation_id?: string;
  verification_metadata?: VerificationMetadata;
}
