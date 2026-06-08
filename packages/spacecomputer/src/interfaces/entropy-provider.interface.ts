export interface IEntropyProvider {
  /**
   * Generates secure cryptographically strong bytes (cTRNG in live, Node crypto in mock)
   */
  generateSecureBytes(size: number): Promise<Buffer>;

  /**
   * Generates public identifiers or sharing tokens
   */
  generatePublicToken(): Promise<string>;
}
