import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`[WebSocket] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[WebSocket] Client disconnected: ${client.id}`);
  }

  // --- Session Management ---
  @SubscribeMessage('session:join')
  handleJoinSession(@MessageBody() data: { sessionId: string }, @ConnectedSocket() client: Socket) {
    client.join(data.sessionId);
    console.log(`[WebSocket] Client ${client.id} joined session ${data.sessionId}`);
    this.server.to(data.sessionId).emit('session:joined', { message: 'Successfully joined session room' });
  }

  // --- Agent & Dex Internal APIs (For Demo/Agent Runtime to push to Gateway) ---
  @SubscribeMessage('internal:agent_log')
  handleInternalAgentLog(@MessageBody() data: { sessionId: string; token: string }) {
    this.server.to(data.sessionId).emit('agent:token', { token: data.token });
  }

  @SubscribeMessage('internal:dex_swap')
  handleInternalDexSwap(@MessageBody() data: { sessionId: string; message: string }) {
    this.server.to(data.sessionId).emit('agent:dex', { message: data.message });
  }

  @SubscribeMessage('internal:balance_update')
  handleInternalBalanceUpdate(@MessageBody() data: { sessionId: string; runtime: number; totalSpent: number; balanceRemaining: number }) {
    this.server.to(data.sessionId).emit('stream:update', data);
  }

  @SubscribeMessage('internal:task_completed')
  handleInternalTaskCompleted(@MessageBody() data: { sessionId: string }) {
    this.server.to(data.sessionId).emit('session:status', { status: 'COMPLETED' });
  }
}
