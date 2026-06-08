import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { IAttestationProvider } from '@orbitnote/spacecomputer';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AUDIT_ACTIONS } from '@orbitnote/shared';

@Injectable()
export class AttestationsService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
    @Inject('ATTESTATION_PROVIDER')
    private attestationProvider: IAttestationProvider,
  ) {}

  /**
   * Persists an attestation record using the envelope resolved from provider.
   */
  async createFromEnvelope(operationType: string, attestationEnvelope: any) {
    const measurement = attestationEnvelope?.measurement || 'unknown-measurement';
    const timestamp = attestationEnvelope?.timestamp ? new Date(attestationEnvelope.timestamp) : new Date();
    const provider = attestationEnvelope?.provider || 'mock';

    return this.prisma.attestation.create({
      data: {
        operationType,
        measurement,
        timestamp,
        provider,
        metadataJson: attestationEnvelope,
      },
    });
  }

  async findAll(ownerId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    // Retrieve attestations linked to notes or files owned by this user
    // Since we don't have direct ownerId in Attestation table, we check linked note/file ownership
    const [items, total] = await Promise.all([
      this.prisma.attestation.findMany({
        where: {
          OR: [
            { note: { ownerId, deletedAt: null } },
            { file: { ownerId, deletedAt: null } },
          ],
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.attestation.count({
        where: {
          OR: [
            { note: { ownerId, deletedAt: null } },
            { file: { ownerId, deletedAt: null } },
          ],
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(ownerId: string, id: string) {
    const attestation = await this.prisma.attestation.findUnique({
      where: { id },
      include: {
        note: true,
        file: true,
      },
    });

    if (!attestation) {
      throw new NotFoundException('Attestation record not found');
    }

    // Verify ownership and soft-delete status
    const isOwner = 
      (attestation.note && attestation.note.ownerId === ownerId && attestation.note.deletedAt === null) ||
      (attestation.file && attestation.file.ownerId === ownerId && attestation.file.deletedAt === null);

    if (!isOwner) {
      throw new NotFoundException('Attestation record not found');
    }

    // Log the action: view_attestation
    await this.auditLogsService.log(ownerId, AUDIT_ACTIONS.VIEW_ATTESTATION, 'attestation', id);

    return attestation;
  }
}
