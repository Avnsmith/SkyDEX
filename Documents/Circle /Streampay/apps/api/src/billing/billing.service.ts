import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GatewayService } from '../gateway/gateway.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SessionsService } from '../sessions/sessions.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly gatewayService: GatewayService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly sessionsService: SessionsService,
  ) {}

  @Cron(CronExpression.EVERY_SECOND)
  async handleStreamingBilling() {
    const activeSessions = await this.sessionsService.getActiveSessions();

    for (const session of activeSessions) {
      try {
        const cost = session.ratePerSecond; 
        
        // Accumulate spent amount
        const updatedSession = await this.sessionsService.incrementSpend(session.id, cost);
        
        // Offload nanopayment to Gateway service
        await this.gatewayService.charge({
          sessionId: session.id,
          amount: cost,
          userAddress: session.user.address
        });
        
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
        }
      } catch (error) {
        this.logger.error(`Failed to process billing for session ${session.id}`, error);
      }
    }
  }
}
