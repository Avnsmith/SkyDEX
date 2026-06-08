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
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import IORedis from 'ioredis';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map((o) => o.trim());

@WebSocketGateway({
  cors: {
    // Allow specific origins in production; wildcard in dev
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    credentials: true,
  },
  // Force WebSocket transport only — prevents long-polling fallback
  // which causes Railway idle-timeout disconnects
  transports: ['websocket'],
  // Keep-alive ping every 20s, timeout after 25s
  pingInterval: 20000,
  pingTimeout: 25000,
})
export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(@InjectQueue('agent-tasks') private agentQueue: Queue) {}

  // In-memory session cache for fast recovery on reconnect
  private sessionState = new Map<string, any>();
  private sessionEvents = new Map<string, any[]>();
  private redisSubscriber: IORedis;

  afterInit() {
    this.redisSubscriber = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      // Exponential backoff: 50ms, 100ms, 200ms … capped at 2s
      retryStrategy: (times) => Math.min(times * 50, 2000),
      // Don't give up on Redis — keep retrying
      maxRetriesPerRequest: null,
    });

    this.redisSubscriber.on('error', (err) => {
      this.logger.error(`[Redis Subscriber] Connection error: ${err.message}`);
    });

    this.redisSubscriber.on('connect', () => {
      this.logger.log('[Redis Subscriber] Connected');
    });

    this.redisSubscriber.psubscribe('session:*', (err, count) => {
      if (err) this.logger.error('[Redis] Failed to psubscribe', err);
      else this.logger.log(`[Redis] Subscribed to ${count} channel patterns`);
    });

    this.redisSubscriber.on('pmessage', (_pattern, channel, message) => {
      // channel format: session:<sessionId>:<eventType>
      const parts = channel.split(':');
      if (parts.length < 3) return;

      const sessionId = parts[1];
      const eventType = parts.slice(2).join(':'); // support colons in eventType

      try {
        const data = JSON.parse(message);

        switch (eventType) {
          case 'event':
            const events = this.sessionEvents.get(sessionId) || [];
            events.push(data);
            // Keep max 500 events per session in memory
            if (events.length > 500) events.shift();
            this.sessionEvents.set(sessionId, events);
            this.server.to(sessionId).emit('agent:event', data);
            break;

          case 'token':
            this.server.to(sessionId).emit('agent:token', data);
            break;

          case 'token_done':
            this.server.to(sessionId).emit('agent:token_done');
            break;

          case 'status':
            const currentState = this.sessionState.get(sessionId) || {};
            this.sessionState.set(sessionId, { ...currentState, status: data.status });
            this.server.to(sessionId).emit('session:status', data);
            break;

          case 'stream_update':
            const state = this.sessionState.get(sessionId) || {};
            this.sessionState.set(sessionId, { ...state, streamData: data });
            this.server.to(sessionId).emit('stream:update', data);
            break;

          default:
            this.logger.warn(`[Redis] Unknown event type: ${eventType}`);
        }
      } catch (e) {
        this.logger.error('[Redis] Error parsing message', e);
      }
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id} from ${client.handshake.address}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ── Session Management ──────────────────────────────────────────────────

  @SubscribeMessage('session:join')
  handleJoinSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.sessionId);
    this.logger.log(`Client ${client.id} joined session ${data.sessionId}`);

    if (!this.sessionState.has(data.sessionId)) {
      this.sessionState.set(data.sessionId, {
        streamData: { runtime: 0, totalSpent: 0, balanceRemaining: 10.0 },
        status: 'IDLE',
      });
      this.sessionEvents.set(data.sessionId, []);
    }
  }

  @SubscribeMessage('session:recover')
  handleRecoverSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.sessionId);

    if (this.sessionState.has(data.sessionId)) {
      const state = this.sessionState.get(data.sessionId);
      client.emit('session:recovered_state', state);

      const events = this.sessionEvents.get(data.sessionId) || [];
      client.emit('session:recovered_logs', { events });
      this.logger.log(
        `Session ${data.sessionId} recovered for client ${client.id} (${events.length} events)`,
      );
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong');
  }

  // ── Agent Control ───────────────────────────────────────────────────────

  @SubscribeMessage('session:start')
  async handleSessionStart(
    @MessageBody() data: { sessionId: string; task: string; rate: number },
  ) {
    // Guard: don't enqueue if already active
    const currentState = this.sessionState.get(data.sessionId);
    if (currentState?.status === 'ACTIVE') {
      this.logger.warn(`Session ${data.sessionId} is already ACTIVE — ignoring duplicate start`);
      return;
    }

    this.sessionState.set(data.sessionId, {
      ...this.sessionState.get(data.sessionId),
      status: 'ACTIVE',
    });
    this.server.to(data.sessionId).emit('session:status', { status: 'ACTIVE' });

    await this.agentQueue.add(
      'run-task',
      {
        sessionId: data.sessionId,
        task: data.task,
        rate: data.rate,
      },
      {
        attempts: 1,           // No retries — clean fail state for demos
        removeOnComplete: true,
        removeOnFail: true,
      },
    );

    this.logger.log(`Agent task queued for session ${data.sessionId}`);
  }

  @SubscribeMessage('session:cancel')
  handleSessionCancel(@MessageBody() data: { sessionId: string }) {
    const state = this.sessionState.get(data.sessionId) || {};
    this.sessionState.set(data.sessionId, { ...state, status: 'CANCELLED' });
    this.server.to(data.sessionId).emit('session:status', { status: 'CANCELLED' });
    this.logger.log(`Session ${data.sessionId} cancelled by client`);
  }
}
