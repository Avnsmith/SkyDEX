import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from './common/guards/auth.guard';
import { CurrentUser } from './common/decorators/current-user.decorator';
import { PrismaService } from './prisma/prisma.service';

@Controller('api/dashboard')
@UseGuards(AuthGuard)
export class AppController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getDashboardStats(@CurrentUser() user: any) {
    const [notesCount, filesCount, recentLogs] = await Promise.all([
      this.prisma.note.count({
        where: { ownerId: user.id, deletedAt: null },
      }),
      this.prisma.file.count({
        where: { ownerId: user.id, deletedAt: null },
      }),
      this.prisma.auditLog.findMany({
        where: { ownerId: user.id },
        orderBy: { timestamp: 'desc' },
        take: 5,
      }),
    ]);

    return {
      notesCount,
      filesCount,
      recentLogs: recentLogs.map(log => ({
        id: log.id,
        ownerId: log.ownerId,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        timestamp: log.timestamp.toISOString(),
      })),
    };
  }
}
