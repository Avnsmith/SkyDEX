import { Injectable, NotFoundException, BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { SupabaseStorageService } from '../../integrations/supabase-storage.service';
import { AttestationsService } from '../attestations/attestations.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AUDIT_ACTIONS, SUPPORTED_FILE_TYPES, MAX_UPLOAD_SIZE } from '@orbitnote/shared';
import * as crypto from 'crypto';

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private storageService: SupabaseStorageService,
    private attestationsService: AttestationsService,
    private auditLogsService: AuditLogsService,
  ) {}

  async uploadFile(ownerId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      throw new PayloadTooLargeException('File size exceeds 10MB limit');
    }

    if (!SUPPORTED_FILE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }

    // 1. Calculate plaintext SHA-256 Hash via EncryptionService
    const sha256Hash = this.encryptionService.calculateSha256(file.buffer);

    // 2. Encrypt file locally + wrap key using EncryptionService
    const result = await this.encryptionService.encryptPayload(file.buffer);

    // 3. Upload encrypted buffer to Supabase Storage
    const storagePath = `uploads/${ownerId}/${crypto.randomUUID()}.enc`;
    await this.storageService.upload(storagePath, result.ciphertext, file.mimetype);

    // 4. Capture attestation record
    const attestation = await this.attestationsService.createFromEnvelope(
      'encrypt_file',
      result.attestationEnvelope,
    );

    // 5. Save file metadata in database
    const dbFile = await this.prisma.file.create({
      data: {
        ownerId,
        filename: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        sha256Hash,
        encryptedStoragePath: storagePath,
        encryptedDataKey: result.encryptedDataKey,
        iv: result.iv,
        authTag: result.authTag,
        algorithm: result.algorithm,
        keyVersion: result.keyVersion,
        attestationId: attestation.id,
      },
    });

    // 6. Record Audit Log (action: upload_file)
    await this.auditLogsService.log(ownerId, AUDIT_ACTIONS.UPLOAD_FILE, 'file', dbFile.id);

    return {
      id: dbFile.id,
      filename: dbFile.filename,
      mimeType: dbFile.mimeType,
      fileSize: dbFile.fileSize,
      createdAt: dbFile.createdAt,
      attestationId: dbFile.attestationId,
    };
  }

  async findAll(ownerId: string) {
    return this.prisma.file.findMany({
      where: { ownerId, deletedAt: null },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        fileSize: true,
        createdAt: true,
        attestationId: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async downloadFile(ownerId: string, id: string) {
    const file = await this.prisma.file.findFirst({
      where: { id, ownerId, deletedAt: null },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    try {
      // 1. Download encrypted file buffer from Supabase Storage
      const encryptedBuffer = await this.storageService.download(file.encryptedStoragePath);

      // 2. Decrypt locally + unwrap key using EncryptionService
      const decryptedBuffer = await this.encryptionService.decryptPayload(
        encryptedBuffer,
        file.encryptedDataKey,
        file.iv,
        file.authTag,
        file.algorithm,
      );

      // 3. File Integrity Verification (SHA-256 match)
      const decryptedHash = this.encryptionService.calculateSha256(decryptedBuffer);

      if (decryptedHash !== file.sha256Hash) {
        throw new Error('Integrity check failed: decrypted file SHA-256 hash mismatch.');
      }

      // 4. Record Audit Log (action: download_file)
      await this.auditLogsService.log(ownerId, AUDIT_ACTIONS.DOWNLOAD_FILE, 'file', file.id);

      return {
        buffer: decryptedBuffer,
        filename: file.filename,
        mimeType: file.mimeType,
      };
    } catch (error) {
      throw new Error(`Failed to retrieve and decrypt file: ${(error as Error).message}`);
    }
  }

  async remove(ownerId: string, id: string) {
    const file = await this.prisma.file.findFirst({
      where: { id, ownerId, deletedAt: null },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Soft delete
    await this.prisma.file.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Record Audit Log (action: delete_file)
    await this.auditLogsService.log(ownerId, AUDIT_ACTIONS.DELETE_FILE, 'file', file.id);

    return { success: true };
  }
}
