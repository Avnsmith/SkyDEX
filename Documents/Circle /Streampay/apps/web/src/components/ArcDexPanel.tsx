import { ArrowRightLeft } from "lucide-react";
import { useRealtimeSwaps } from "../hooks/useRealtime";
import { Socket } from "socket.io-client";

export function ArcDexPanel({ socket }: { socket: Socket | null }) {
  const { swaps } = useRealtimeSwaps(socket);

  return (
    <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6 flex flex-col h-[300px]">
      <div className="flex items-center gap-2 text-neutral-400 mb-4 pb-4 border-b border-white/5">
        <ArrowRightLeft className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-white">Arc DEX Activity</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {swaps.length === 0 ? (
          <div className="text-sm text-neutral-600 font-mono">No autonomous swaps yet...</div>
        ) : (
          swaps.map((s, i) => (
            <div key={i} className="text-xs font-mono text-neutral-300 p-3 bg-black/40 rounded-xl border border-white/5 shadow-inner">
              {s.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
