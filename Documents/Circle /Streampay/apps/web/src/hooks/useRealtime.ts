import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

let globalSocket: Socket | null = null;

export function useWebsocket(sessionId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!globalSocket) {
      globalSocket = io('http://localhost:3001', {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
      });
    }
    
    setSocket(globalSocket);

    const onConnect = () => {
      setIsConnected(true);
      globalSocket?.emit('session:join', { sessionId });
    };

    const onDisconnect = () => setIsConnected(false);

    if (globalSocket.connected) {
      onConnect();
    }

    globalSocket.on('connect', onConnect);
    globalSocket.on('disconnect', onDisconnect);

    return () => {
      globalSocket?.off('connect', onConnect);
      globalSocket?.off('disconnect', onDisconnect);
    };
  }, [sessionId]);

  return { socket, isConnected };
}

export function useStreamSession(socket: Socket | null) {
  const [streamData, setStreamData] = useState({
    runtime: 0,
    totalSpent: 0,
    balanceRemaining: 10.0,
  });
  const [status, setStatus] = useState<'IDLE' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('IDLE');

  useEffect(() => {
    if (!socket) return;
    
    socket.on('stream:update', (data) => {
      setStreamData(data);
    });

    socket.on('session:status', (data) => {
      setStatus(data.status);
    });

    return () => {
      socket.off('stream:update');
      socket.off('session:status');
    };
  }, [socket]);

  return { streamData, status, setStatus, setStreamData };
}

export function useAgentLogs(socket: Socket | null) {
  const [logs, setLogs] = useState<string>('');

  useEffect(() => {
    if (!socket) return;
    
    socket.on('agent:token', (data) => {
      setLogs((prev) => prev + data.token);
    });

    return () => {
      socket.off('agent:token');
    };
  }, [socket]);

  const clearLogs = useCallback(() => setLogs(''), []);

  return { logs, clearLogs };
}

export function useRealtimeSwaps(socket: Socket | null) {
  const [swaps, setSwaps] = useState<{message: string}[]>([]);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('agent:dex', (data) => {
      setSwaps((prev) => [...prev, data]);
    });

    return () => {
      socket.off('agent:dex');
    };
  }, [socket]);

  const clearSwaps = useCallback(() => setSwaps([]), []);

  return { swaps, clearSwaps };
}
