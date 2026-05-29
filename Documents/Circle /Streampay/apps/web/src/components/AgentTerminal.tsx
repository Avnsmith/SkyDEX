import { useEffect, useRef } from "react";
import { Terminal, Lightbulb, Wrench, ArrowRightLeft, CheckCircle2, AlertTriangle, PlayCircle } from "lucide-react";
import { useAgentLogs } from "../hooks/useRealtime";
import { Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";

export function AgentTerminal({ socket, isLive }: { socket: Socket | null; isLive: boolean }) {
  const { events, activeTokenStream } = useAgentLogs(socket);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events, activeTokenStream]);

  return (
    <div className="bg-[#0a0a0a] border border-white/10 shadow-2xl rounded-3xl p-6 flex flex-col h-[500px] overflow-hidden relative">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-2 text-neutral-400">
          <Terminal className="w-5 h-5 text-neutral-500" />
          <span className="text-sm font-semibold tracking-wide uppercase text-white">Agent Telemetry</span>
        </div>
        {isLive && (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Active Compute</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar relative z-10">
        <AnimatePresence>
          {events.length === 0 && !activeTokenStream && !isLive && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-neutral-600 space-y-3">
              <PlayCircle className="w-8 h-8 opacity-20" />
              <div className="text-sm font-mono text-center">System Idle.<br/>Awaiting task instruction.</div>
            </motion.div>
          )}

          {events.map((evt) => (
            <motion.div 
              key={evt.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`p-4 rounded-2xl border ${
                evt.type === 'THOUGHT' ? 'bg-blue-500/5 border-blue-500/10 text-blue-200' :
                evt.type === 'TOOL_CALL' ? 'bg-neutral-800/50 border-white/5 text-neutral-300' :
                evt.type === 'DEX_SWAP' ? 'bg-purple-500/5 border-purple-500/20 text-purple-200' :
                evt.type === 'PAYMENT_SETTLED' ? 'bg-green-500/5 border-green-500/20 text-green-200' :
                evt.type === 'RISK_ALERT' ? 'bg-red-500/5 border-red-500/20 text-red-300' :
                'bg-black/40 border-white/5 text-neutral-400'
              }`}
            >
              <div className="flex items-center gap-2 mb-2 opacity-60">
                {evt.type === 'THOUGHT' && <Lightbulb className="w-3.5 h-3.5" />}
                {evt.type === 'TOOL_CALL' && <Wrench className="w-3.5 h-3.5" />}
                {evt.type === 'DEX_SWAP' && <ArrowRightLeft className="w-3.5 h-3.5" />}
                {evt.type === 'PAYMENT_SETTLED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {evt.type === 'RISK_ALERT' && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                <span className="text-[10px] font-bold tracking-widest uppercase">{evt.type.replace('_', ' ')}</span>
              </div>
              <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">{evt.content}</div>
            </motion.div>
          ))}
          
          {activeTokenStream && (
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               className="p-4 rounded-2xl bg-black/40 border border-white/5 text-neutral-300 font-mono text-sm leading-relaxed"
             >
               {activeTokenStream}
               <span className="inline-block w-2 h-4 ml-1 bg-white/50 animate-pulse align-middle" />
             </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>
    </div>
  );
}
