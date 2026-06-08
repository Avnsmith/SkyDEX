import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { AttestationsService } from '../attestations/attestations.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AUDIT_ACTIONS } from '@orbitnote/shared';

@Injectable()
export class NotesService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private attestationsService: AttestationsService,
    private auditLogsService: AuditLogsService,
  ) {}

  async create(ownerId: string, title: string, content: string) {
    // 1. Run local AES-256-GCM + KMS key wrapping via centralized EncryptionService
    const result = await this.encryptionService.encryptPayload(content);

    // 2. Persist attestation metadata in database
    const attestation = await this.attestationsService.createFromEnvelope(
      'encrypt_note',
      result.attestationEnvelope,
    );

    // 3. Store ciphertext and envelope parameters in database
    const note = await this.prisma.note.create({
      data: {
        ownerId,
        title,
        ciphertext: result.ciphertext,
        encryptedDataKey: result.encryptedDataKey,
        iv: result.iv,
        authTag: result.authTag,
        algorithm: result.algorithm,
        keyVersion: result.keyVersion,
        attestationId: attestation.id,
      },
    });

    // 4. Record Audit Log actions: create_note, encrypt_note
    await this.auditLogsService.log(ownerId, AUDIT_ACTIONS.CREATE_NOTE, 'note', note.id);
    await this.auditLogsService.log(ownerId, AUDIT_ACTIONS.ENCRYPT_NOTE, 'note', note.id);

    return {
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      attestationId: note.attestationId,
    };
  }

  async findAll(ownerId: string) {
    // Returns Note list metadata, keeping ciphertext secure
    return this.prisma.note.findMany({
      where: { ownerId, deletedAt: null },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        attestationId: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(ownerId: string, id: string) {
    const note = await this.prisma.note.findFirst({
      where: { id, ownerId, deletedAt: null },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    try {
      // 1. Decrypt note payload via EncryptionService
      const decryptedBuffer = await this.encryptionService.decryptPayload(
        note.ciphertext,
        note.encryptedDataKey,
        note.iv,
        note.authTag,
        note.algorithm,
      );

      const content = decryptedBuffer.toString('utf8');

      // 2. Record Audit Log action: decrypt_note
      await this.auditLogsService.log(ownerId, AUDIT_ACTIONS.DECRYPT_NOTE, 'note', note.id);

      return {
        id: note.id,
        title: note.title,
        content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        attestationId: note.attestationId,
        keyVersion: note.keyVersion,
        algorithm: note.algorithm,
      };
    } catch (error) {
      throw new Error(`Failed to decrypt note: ${(error as Error).message}`);
    }
  }

  async update(ownerId: string, id: string, title?: string, content?: string) {
    const note = await this.prisma.note.findFirst({
      where: { id, ownerId, deletedAt: null },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    const updateData: any = {};
    if (title !== undefined) {
      updateData.title = title;
    }

    if (content !== undefined) {
      // Re-encrypt updated payload
      const result = await this.encryptionService.encryptPayload(content);

      const attestation = await this.attestationsService.createFromEnvelope(
        'encrypt_note',
        result.attestationEnvelope,
      );

      updateData.ciphertext = result.ciphertext;
      updateData.encryptedDataKey = result.encryptedDataKey;
      updateData.iv = result.iv;
      updateData.authTag = result.authTag;
      updateData.algorithm = result.algorithm;
      updateData.keyVersion = result.keyVersion;
      updateData.attestationId = attestation.id;
    }

    const updatedNote = await this.prisma.note.update({
      where: { id },
      data: updateData,
    });

    // Record Audit Logs
    await this.auditLogsService.log(ownerId, AUDIT_ACTIONS.UPDATE_NOTE, 'note', note.id);
    if (content !== undefined) {
      await this.auditLogsService.log(ownerId, AUDIT_ACTIONS.ENCRYPT_NOTE, 'note', note.id);
    }

    return {
      id: updatedNote.id,
      title: updatedNote.title,
      createdAt: updatedNote.createdAt,
      updatedAt: updatedNote.updatedAt,
      attestationId: updatedNote.attestationId,
    };
  }

  async remove(ownerId: string, id: string) {
    const note = await this.prisma.note.findFirst({
      where: { id, ownerId, deletedAt: null },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Soft delete
    await this.prisma.note.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Record Audit Log
    await this.auditLogsService.log(ownerId, AUDIT_ACTIONS.DELETE_NOTE, 'note', note.id);

    return { success: true };
  }
}
