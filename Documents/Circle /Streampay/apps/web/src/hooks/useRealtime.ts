import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let globalSocket: Socket | null = null;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

// ── Session state REST recovery ─────────────────────────────────────────────
// If WebSocket reconnects, we re-fetch session state from the API to ensure
// the UI is not stale (mirrors server-side in-memory cache via REST endpoint)
async function fetchSessionState(sessionId: string) {
  try {
    const res = await fetch(`${API_URL}/api/sessions/${sessionId}/state`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── WebSocket singleton with transport hardening ────────────────────────────
function getOrCreateSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(WS_URL, {
      // Force WebSocket-only: prevents Railway from closing long-poll connections
      transports: ['websocket'],
      // Reconnect forever with exponential backoff (1s → 2s → 4s → … capped at 30s)
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
      // Match server pingTimeout (25s) with slack
      timeout: 30000,
      // Upgrade disabled — we're already on WS
      upgrade: false,
    });
  }
  return globalSocket;
}

export function useWebsocket(sessionId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectCount = useRef(0);

  useEffect(() => {
    const sock = getOrCreateSocket();
    setSocket(sock);

    const onConnect = async () => {
      setIsConnected(true);
      sock.emit('session:join', { sessionId });

      if (reconnectCount.current > 0) {
        // Reconnect path: recover session state from server WS memory first
        sock.emit('session:recover', { sessionId });

        // Also re-fetch from REST in case WS server restarted and lost memory
        const freshState = await fetchSessionState(sessionId);
        if (freshState) {
          sock.emit('__client:state_restored', freshState); // internal signal
        }
      }

      reconnectCount.current++;
    };

    const onDisconnect = (reason: string) => {
      setIsConnected(false);
      console.warn(`[WS] Disconnected: ${reason}`);
    };

    const onConnectError = (err: Error) => {
      console.error(`[WS] Connection error: ${err.message}`);
    };

    if (sock.connected) {
      onConnect();
    }

    sock.on('connect', onConnect);
    sock.on('disconnect', onDisconnect);
    sock.on('connect_error', onConnectError);

    // Heartbeat: emit ping every 15s to keep Railway WS alive
    const pingInterval = setInterval(() => {
      if (sock.connected) sock.emit('ping');
    }, 15000);

    return () => {
      sock.off('connect', onConnect);
      sock.off('disconnect', onDisconnect);
      sock.off('connect_error', onConnectError);
      clearInterval(pingInterval);
    };
  }, [sessionId]);

  return { socket, isConnected };
}

// ── Stream session state ────────────────────────────────────────────────────

export type BalancePoint = { t: number; balance: number };

export function useStreamSession(socket: Socket | null) {
  const [streamData, setStreamData] = useState({
    runtime: 0,
    totalSpent: 0,
    balanceRemaining: 10.0,
    velocity: 0,
  });
  const [status, setStatus] = useState<'IDLE' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('IDLE');
  const [balanceHistory, setBalanceHistory] = useState<BalancePoint[]>([
    { t: 0, balance: 10.0 },
  ]);

  useEffect(() => {
    if (!socket) return;

    const onStreamUpdate = (data: any) => {
      setStreamData((prev) => ({
        ...data,
        velocity:
          data.totalSpent - prev.totalSpent > 0
            ? data.totalSpent - prev.totalSpent
            : prev.velocity,
      }));
      setBalanceHistory((prev) => {
        const next = [...prev, { t: data.runtime, balance: data.balanceRemaining }];
        if (next.length > 120) next.shift();
        return next;
      });
    };

    const onStatus = (data: { status: 'IDLE' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' }) => {
      setStatus(data.status);
      if (data.status === 'IDLE' || data.status === 'CANCELLED') {
        setBalanceHistory([{ t: 0, balance: 10.0 }]);
      }
    };

    const onRecoveredState = (data: any) => {
      if (data.streamData) setStreamData(data.streamData);
      if (data.status) setStatus(data.status);
      // Rebuild balance history from recovered state
      if (data.streamData?.balanceRemaining != null) {
        setBalanceHistory((prev) => [
          ...prev,
          { t: data.streamData.runtime, balance: data.streamData.balanceRemaining },
        ]);
      }
    };

    socket.on('stream:update', onStreamUpdate);
    socket.on('session:status', onStatus);
    socket.on('session:recovered_state', onRecoveredState);

    return () => {
      socket.off('stream:update', onStreamUpdate);
      socket.off('session:status', onStatus);
      socket.off('session:recovered_state', onRecoveredState);
    };
  }, [socket]);

  return { streamData, status, setStatus, setStreamData, balanceHistory };
}

// ── Agent log events ────────────────────────────────────────────────────────

export type AgentLogEvent = {
  id: string;
  type: 'TEXT' | 'THOUGHT' | 'TOOL_CALL' | 'DEX_SWAP' | 'PAYMENT_SETTLED' | 'RISK_ALERT';
  content: string;
  timestamp: number;
};

export function useAgentLogs(socket: Socket | null) {
  const [events, setEvents] = useState<AgentLogEvent[]>([]);
  const [activeTokenStream, setActiveTokenStream] = useState<string>('');
  const tokenBufferRef = useRef<string>('');

  useEffect(() => {
    if (!socket) return;

    const onEvent = (event: AgentLogEvent) => {
      setEvents((prev) => [...prev.slice(-499), event]); // cap at 500 events
    };

    const onToken = (data: { token: string }) => {
      tokenBufferRef.current += data.token;
      setActiveTokenStream(tokenBufferRef.current);
    };

    const onTokenDone = () => {
      const final = tokenBufferRef.current.trim();
      if (final) {
        setEvents((prev) => [
          ...prev.slice(-499),
          {
            id: Math.random().toString(36).slice(2),
            type: 'TEXT',
            content: final,
            timestamp: Date.now(),
          },
        ]);
      }
      tokenBufferRef.current = '';
      setActiveTokenStream('');
    };

    const onRecoveredLogs = (data: { events: AgentLogEvent[] }) => {
      setEvents(data.events.slice(-500));
    };

    socket.on('agent:event', onEvent);
    socket.on('agent:token', onToken);
    socket.on('agent:token_done', onTokenDone);
    socket.on('session:recovered_logs', onRecoveredLogs);

    return () => {
      socket.off('agent:event', onEvent);
      socket.off('agent:token', onToken);
      socket.off('agent:token_done', onTokenDone);
      socket.off('session:recovered_logs', onRecoveredLogs);
    };
  }, [socket]);

  const clearLogs = useCallback(() => {
    setEvents([]);
    setActiveTokenStream('');
    tokenBufferRef.current = '';
  }, []);

  return { events, activeTokenStream, clearLogs };
}
