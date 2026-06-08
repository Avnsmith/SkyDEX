import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';
import { SpaceComputerIntegrationModule } from '../../integrations/spacecomputer-integration.module';
import { ConfigModule } from '@nestjs/config';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    // Set mock env mode to use mock providers
    process.env.SPACECOMP_MODE = 'mock';

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        SpaceComputerIntegrationModule,
      ],
      providers: [EncryptionService],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should encrypt and decrypt a string payload to identical content', async () => {
    const originalText = 'Secret Note Content 123!';
    
    // Encrypt
    const encrypted = await service.encryptPayload(originalText);
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.encryptedDataKey).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();

    // Decrypt
    const decryptedBuffer = await service.decryptPayload(
      encrypted.ciphertext,
      encrypted.encryptedDataKey,
      encrypted.iv,
      encrypted.authTag,
      encrypted.algorithm,
    );

    const decryptedText = decryptedBuffer.toString('utf8');
    expect(decryptedText).toBe(originalText);
  });

  it('should encrypt and decrypt a buffer payload to identical content', async () => {
    const originalBuffer = Buffer.from('Binary file storage data here...', 'utf8');

    // Encrypt
    const encrypted = await service.encryptPayload(originalBuffer);

    // Decrypt
    const decryptedBuffer = await service.decryptPayload(
      encrypted.ciphertext,
      encrypted.encryptedDataKey,
      encrypted.iv,
      encrypted.authTag,
      encrypted.algorithm,
    );

    expect(decryptedBuffer.equals(originalBuffer)).toBe(true);
  });

  it('should verify SHA-256 hashes correctly', () => {
    const data = Buffer.from('Orbitnote File Integrity Check', 'utf8');
    const hash = service.calculateSha256(data);
    
    expect(hash).toBe('70e349e3e2e4e2cccc24b39bc79f78e78a7503506d5e3a0101730ec3ad539f80');
  });
});
