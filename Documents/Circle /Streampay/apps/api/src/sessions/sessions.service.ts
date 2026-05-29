import { Injectable } from '@nestjs/common';
import { prisma } from '@streampay/database';

@Injectable()
export class SessionsService {
  async getActiveSessions() {
    return prisma.session.findMany({
      where: { status: 'ACTIVE' },
      include: { user: true }
    });
  }

  async incrementSpend(sessionId: string, amount: number) {
    return prisma.session.update({
      where: { id: sessionId },
      data: { totalSpent: { increment: amount } }
    });
  }

  async stopSession(sessionId: string) {
    return prisma.session.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED', endedAt: new Date() }
    });
  }
}
