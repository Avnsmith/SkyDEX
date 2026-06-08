"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Socket } from "socket.io-client";
import { useAgentLogs, AgentLogEvent } from "../hooks/useRealtime";

const EVENT_CONFIG: Record<
  AgentLogEvent["type"],
  { label: string; color: string; tagColor: string; dot: string }
> = {
  THOUGHT: {
    label: "THOUGHT",
    color: "text-blue-300",
    tagColor: "text-blue-400 bg-blue-950/60 border-blue-800/50",
    dot: "bg-blue-400",
  },
  TOOL_CALL: {
    label: "TOOL CALL",
    color: "text-yellow-200",
    tagColor: "text-yellow-400 bg-yellow-950/60 border-yellow-800/50",
    dot: "bg-yellow-400",
  },
  DEX_SWAP: {
    label: "DEX SWAP",
    color: "text-purple-300",
    tagColor: "text-purple-400 bg-purple-950/60 border-purple-800/50",
    dot: "bg-purple-400",
  },
  PAYMENT_SETTLED: {
    label: "SETTLED",
    color: "text-emerald-300",
    tagColor: "text-emerald-400 bg-emerald-950/60 border-emerald-800/50",
    dot: "bg-emerald-400",
  },
  RISK_ALERT: {
    label: "RISK ALERT",
    color: "text-red-300",
    tagColor: "text-red-400 bg-red-950/60 border-red-800/50",
    dot: "bg-red-400",
  },
  TEXT: {
    label: "OUTPUT",
    color: "text-neutral-300",
    tagColor: "text-neutral-400 bg-neutral-900 border-neutral-800",
    dot: "bg-neutral-400",
  },
};

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}.${d
    .getMilliseconds()
    .toString()
    .padStart(3, "0")}`;
}

export function AgentTerminal({
  socket,
  isLive,
}: {
  socket: Socket | null;
  isLive: boolean;
}) {
  const { events, activeTokenStream, clearLogs } = useAgentLogs(socket);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events, activeTokenStream]);

  return (
    <div className="flex flex-col h-full bg-black border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0a0a0a] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
          <span className="text-[11px] font-mono text-neutral-500 ml-1 uppercase tracking-widest">
            agent execution log
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isLive && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">
                live
              </span>
            </div>
          )}
          <button
            onClick={clearLogs}
            className="text-[10px] font-mono text-neutral-600 hover:text-neutral-400 transition-colors uppercase tracking-widest"
          >
            clear
          </button>
        </div>
      </div>

      {/* Log Output */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1 font-mono text-xs">
        <AnimatePresence initial={false}>
          {events.length === 0 && !activeTokenStream && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-32 text-neutral-700 space-y-2"
            >
              <div className="text-[11px] font-mono">
                <span className="text-neutral-600">$</span>{" "}
                <span className="text-neutral-500">awaiting agent execution...</span>
                <span className="animate-pulse">█</span>
              </div>
            </motion.div>
          )}

          {events.map((evt) => {
            const cfg = EVENT_CONFIG[evt.type] || EVENT_CONFIG.TEXT;
            return (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-start gap-3 py-1.5 border-b border-white/[0.03] last:border-0"
              >
                {/* Timestamp */}
                <span className="text-neutral-700 shrink-0 tabular-nums text-[10px] pt-0.5">
                  {formatTime(evt.timestamp)}
                </span>

                {/* Tag */}
                <span
                  className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest ${cfg.tagColor}`}
                >
                  {cfg.label}
                </span>

                {/* Content */}
                <span className={`${cfg.color} leading-relaxed break-all`}>
                  {evt.content}
                </span>
              </motion.div>
            );
          })}

          {activeTokenStream && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-3 py-1.5"
            >
              <span className="text-neutral-700 shrink-0 text-[10px]">
                {formatTime(Date.now())}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border text-neutral-400 bg-neutral-900 border-neutral-800 uppercase tracking-widest shrink-0">
                OUTPUT
              </span>
              <span className="text-neutral-300 leading-relaxed break-all">
                {activeTokenStream}
                <span className="inline-block w-1.5 h-3 ml-0.5 bg-neutral-400 animate-pulse align-middle" />
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>
    </div>
  );
}
