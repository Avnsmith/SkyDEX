import * as crypto from 'crypto';
import { IEntropyProvider } from '../interfaces/entropy-provider.interface';

export class MockEntropyProvider implements IEntropyProvider {
  async generateSecureBytes(size: number): Promise<Buffer> {
    return crypto.randomBytes(size);
  }

  async generatePublicToken(): Promise<string> {
    // Generate an 8-character uppercase alphabetic token for sharing/public reference
    return crypto.randomBytes(8).toString('hex').toUpperCase();
  }
}
