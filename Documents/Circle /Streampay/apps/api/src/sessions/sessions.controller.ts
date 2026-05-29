import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { WebsocketGateway } from '../websocket/websocket.gateway';

/**
 * REST endpoint so the frontend can re-fetch session state when
 * WebSocket reconnects (in case the WS server restarted and lost in-memory cache).
 * This is part of the WS disconnect recovery strategy.
 */
@Controller('sessions')
export class SessionsController {
  constructor(private readonly wsGateway: WebsocketGateway) {}

  @Get(':sessionId/state')
  getSessionState(@Param('sessionId') sessionId: string) {
    // Access the in-memory session state from the WS gateway
    const state = (this.wsGateway as any).sessionState?.get(sessionId);
    if (!state) {
      // Return a safe default instead of 404 — frontend gracefully handles this
      return {
        streamData: { runtime: 0, totalSpent: 0, balanceRemaining: 10.0 },
        status: 'IDLE',
      };
    }
    return state;
  }
}
