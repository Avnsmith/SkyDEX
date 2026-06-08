import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async log(ownerId: string, action: string, resourceType: string, resourceId: string) {
    return this.prisma.auditLog.create({
      data: {
        ownerId,
        action,
        resourceType,
        resourceId,
      },
    });
  }

  async getLogsForUser(ownerId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { ownerId },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({
        where: { ownerId },
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
}
