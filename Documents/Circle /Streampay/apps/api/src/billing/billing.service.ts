import { Injectable, Logger } from '@nestjs/common';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SessionsService } from '../sessions/sessions.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly websocketGateway: WebsocketGateway,
    private readonly sessionsService: SessionsService,
  ) {}

  async processTick(sessionId: string) {
    try {
      const activeSessions = await this.sessionsService.getActiveSessions();
      const session = activeSessions.find(s => s.id === sessionId);
      
      if (!session) {
        throw new Error('Session not found or not active');
      }

      const cost = session.ratePerSecond; // typically 0.0001
      
      // Accumulate spent amount
      const updatedSession = await this.sessionsService.incrementSpend(session.id, cost);
      const balanceRemaining = updatedSession.budget - updatedSession.totalSpent;

      // Emit real-time update
      this.websocketGateway.server.to(session.id).emit('stream:update', {
        runtime: Math.floor((Date.now() - session.startedAt.getTime()) / 1000),
        totalSpent: updatedSession.totalSpent,
        balanceRemaining: balanceRemaining > 0 ? balanceRemaining : 0,
      });

      // Stop condition
      if (updatedSession.totalSpent >= updatedSession.budget) {
        await this.sessionsService.stopSession(session.id);
        this.logger.log(`Session ${session.id} stopped due to budget limit.`);
        this.websocketGateway.server.to(session.id).emit('session:stop');
      }

      return {
        totalSpent: updatedSession.totalSpent,
        balanceRemaining: balanceRemaining > 0 ? balanceRemaining : 0
      };
    } catch (error) {
      this.logger.error(`Failed to process billing for session ${sessionId}`, error);
      throw error;
    }
  }
}
