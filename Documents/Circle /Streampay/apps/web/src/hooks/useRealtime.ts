import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

let globalSocket: Socket | null = null;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

export function useWebsocket(sessionId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!globalSocket) {
      globalSocket = io(WS_URL, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        timeout: 20000,
      });
    }
    
    setSocket(globalSocket);

    const onConnect = () => {
      setIsConnected(true);
      globalSocket?.emit('session:join', { sessionId });
      // Recover session state on reconnect
      globalSocket?.emit('session:recover', { sessionId });
    };

    const onDisconnect = () => setIsConnected(false);

    if (globalSocket.connected) {
      onConnect();
    }

    globalSocket.on('connect', onConnect);
    globalSocket.on('disconnect', onDisconnect);

    // Heartbeat logic to ensure connection is alive
    const pingInterval = setInterval(() => {
      if (globalSocket?.connected) {
        globalSocket.emit('ping');
      }
    }, 10000);

    return () => {
      globalSocket?.off('connect', onConnect);
      globalSocket?.off('disconnect', onDisconnect);
      clearInterval(pingInterval);
    };
  }, [sessionId]);

  return { socket, isConnected };
}

export function useStreamSession(socket: Socket | null) {
  const [streamData, setStreamData] = useState({
    runtime: 0,
    totalSpent: 0,
    balanceRemaining: 10.0,
    velocity: 0,
  });
  const [status, setStatus] = useState<'IDLE' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('IDLE');

  useEffect(() => {
    if (!socket) return;
    
    socket.on('stream:update', (data) => {
      setStreamData((prev) => ({
        ...data,
        velocity: data.totalSpent - prev.totalSpent > 0 ? data.totalSpent - prev.totalSpent : prev.velocity,
      }));
    });

    socket.on('session:status', (data) => {
      setStatus(data.status);
    });
    
    socket.on('session:recovered_state', (data) => {
      if (data.streamData) setStreamData(data.streamData);
      if (data.status) setStatus(data.status);
    });

    return () => {
      socket.off('stream:update');
      socket.off('session:status');
      socket.off('session:recovered_state');
    };
  }, [socket]);

  return { streamData, status, setStatus, setStreamData };
}

export type AgentLogEvent = {
  id: string;
  type: 'TEXT' | 'THOUGHT' | 'TOOL_CALL' | 'DEX_SWAP' | 'PAYMENT_SETTLED' | 'RISK_ALERT';
  content: string;
  timestamp: number;
};

export function useAgentLogs(socket: Socket | null) {
  const [events, setEvents] = useState<AgentLogEvent[]>([]);
  // Legacy raw streaming text
  const [activeTokenStream, setActiveTokenStream] = useState<string>('');

  useEffect(() => {
    if (!socket) return;
    
    socket.on('agent:event', (event: AgentLogEvent) => {
      setEvents((prev) => [...prev, event]);
    });

    socket.on('agent:token', (data) => {
      setActiveTokenStream((prev) => prev + data.token);
    });
    
    socket.on('agent:token_done', () => {
      if (activeTokenStream.trim()) {
        setEvents((prev) => [...prev, {
          id: Math.random().toString(),
          type: 'TEXT',
          content: activeTokenStream,
          timestamp: Date.now(),
        }]);
      }
      setActiveTokenStream('');
    });

    socket.on('session:recovered_logs', (data: { events: AgentLogEvent[] }) => {
      setEvents(data.events);
    });

    return () => {
      socket.off('agent:event');
      socket.off('agent:token');
      socket.off('agent:token_done');
      socket.off('session:recovered_logs');
    };
  }, [socket, activeTokenStream]);

  const clearLogs = useCallback(() => {
    setEvents([]);
    setActiveTokenStream('');
  }, []);

  return { events, activeTokenStream, clearLogs };
}
