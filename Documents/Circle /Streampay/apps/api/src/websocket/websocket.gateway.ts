import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import IORedis from 'ioredis';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@WebSocketGateway({ cors: { origin: '*' } })
export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(@InjectQueue('agent-tasks') private agentQueue: Queue) {}

  // In-memory cache for session state (for recovery)
  private sessionState = new Map<string, any>();
  private sessionEvents = new Map<string, any[]>();
  private redisSubscriber: IORedis;

  afterInit() {
    this.redisSubscriber = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    this.redisSubscriber.psubscribe('session:*', (err, count) => {
      if (err) console.error('[WebSocket] Failed to psubscribe to Redis:', err);
      else console.log(`[WebSocket] Subscribed to ${count} Redis channels.`);
    });

    this.redisSubscriber.on('pmessage', (pattern, channel, message) => {
      // channel format: session:<sessionId>:<eventType>
      const parts = channel.split(':');
      if (parts.length >= 3) {
        const sessionId = parts[1];
        const eventType = parts[2]; // e.g. 'event', 'status', 'token', 'token_done', 'stream_update'
        
        try {
          const data = JSON.parse(message);
          
          if (eventType === 'event') {
            const events = this.sessionEvents.get(sessionId) || [];
            events.push(data);
            this.sessionEvents.set(sessionId, events);
            this.server.to(sessionId).emit('agent:event', data);
          } else if (eventType === 'token') {
            this.server.to(sessionId).emit('agent:token', data);
          } else if (eventType === 'token_done') {
            this.server.to(sessionId).emit('agent:token_done');
          } else if (eventType === 'status') {
             const state = this.sessionState.get(sessionId);
             if (state) {
               state.status = data.status;
               this.sessionState.set(sessionId, state);
             }
             this.server.to(sessionId).emit('session:status', data);
          } else if (eventType === 'stream_update') {
             const state = this.sessionState.get(sessionId);
             if (state) {
               state.streamData = data;
               this.sessionState.set(sessionId, state);
             }
             this.server.to(sessionId).emit('stream:update', data);
          }
        } catch (e) {
          console.error('[WebSocket] Error parsing Redis message:', e);
        }
      }
    });
  }

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
    
    // Initialize state if new
    if (!this.sessionState.has(data.sessionId)) {
      this.sessionState.set(data.sessionId, {
        streamData: { runtime: 0, totalSpent: 0, balanceRemaining: 10.0 },
        status: 'IDLE'
      });
      this.sessionEvents.set(data.sessionId, []);
    }
  }

  @SubscribeMessage('session:recover')
  handleRecoverSession(@MessageBody() data: { sessionId: string }, @ConnectedSocket() client: Socket) {
    client.join(data.sessionId);
    if (this.sessionState.has(data.sessionId)) {
      const state = this.sessionState.get(data.sessionId);
      client.emit('session:recovered_state', state);
      
      const events = this.sessionEvents.get(data.sessionId) || [];
      client.emit('session:recovered_logs', { events });
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong');
  }

  // --- Start & Cancel (From Client) ---
  @SubscribeMessage('session:start')
  async handleSessionStart(@MessageBody() data: { sessionId: string, task: string, rate: number }) {
    this.sessionState.set(data.sessionId, { ...this.sessionState.get(data.sessionId), status: 'ACTIVE' });
    this.server.to(data.sessionId).emit('session:status', { status: 'ACTIVE' });
    
    await this.agentQueue.add('run-task', {
      sessionId: data.sessionId,
      task: data.task,
      rate: data.rate
    });
  }

  @SubscribeMessage('session:cancel')
  handleSessionCancel(@MessageBody() data: { sessionId: string }) {
    this.sessionState.set(data.sessionId, { ...this.sessionState.get(data.sessionId), status: 'CANCELLED' });
    this.server.to(data.sessionId).emit('session:status', { status: 'CANCELLED' });
  }
}
