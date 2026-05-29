import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";
import { useAgentLogs } from "../hooks/useRealtime";
import { Socket } from "socket.io-client";

export function AgentTerminal({ socket }: { socket: Socket | null }) {
  const { logs } = useAgentLogs(socket);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6 flex flex-col h-[300px]">
      <div className="flex items-center gap-2 text-neutral-400 mb-4 pb-4 border-b border-white/5">
        <Terminal className="w-4 h-4 text-green-400" />
        <span className="text-sm font-medium text-white">Agent Live Output</span>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-sm text-green-400 whitespace-pre-wrap">
        {logs || "Waiting for agent output..."}
        <div ref={endRef} />
      </div>
    </div>
  );
}
