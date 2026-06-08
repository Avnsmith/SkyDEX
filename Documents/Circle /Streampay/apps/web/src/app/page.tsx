"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useWebsocket, useStreamSession } from "../hooks/useRealtime";
import { AgentTerminal } from "../components/AgentTerminal";

// ─── Mini SVG Balance Chart ──────────────────────────────────────────────────

function BalanceChart({
  history,
  isLive,
}: {
  history: { t: number; balance: number }[];
  isLive: boolean;
}) {
  const W = 400;
  const H = 80;
  const PAD = 8;

  const points = useMemo(() => {
    if (history.length < 2) return null;
    const maxBalance = Math.max(...history.map((p) => p.balance));
    const minBalance = Math.min(...history.map((p) => p.balance));
    const range = maxBalance - minBalance || 0.001;
    const xs = history.map(
      (_, i) => PAD + ((i / (history.length - 1)) * (W - PAD * 2))
    );
    const ys = history.map(
      (p) => H - PAD - ((p.balance - minBalance) / range) * (H - PAD * 2)
    );
    const polyline = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
    const area = [
      `${xs[0]},${H}`,
      ...xs.map((x, i) => `${x},${ys[i]}`),
      `${xs[xs.length - 1]},${H}`,
    ].join(" ");
    return { polyline, area };
  }, [history]);

  return (
    <div className="w-full h-20 relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        {points ? (
          <>
            <polygon
              points={points.area}
              fill="url(#chartGrad)"
            />
            <polyline
              points={points.polyline}
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {isLive && points && (() => {
              const lastX = points.polyline.split(" ").pop()?.split(",")[0];
              const lastY = points.polyline.split(" ").pop()?.split(",")[1];
              return (
                <circle cx={lastX} cy={lastY} r="3" fill="#10b981">
                  <animate
                    attributeName="r"
                    values="2;5;2"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="1;0.4;1"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              );
            })()}
          </>
        ) : (
          <line
            x1={PAD}
            y1={H / 2}
            x2={W - PAD}
            y2={H / 2}
            stroke="#1f2937"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        )}
      </svg>
    </div>
  );
}

// ─── Tick Ledger Entry ────────────────────────────────────────────────────────

type TickEntry = {
  id: string;
  ts: number;
  amount: number;
  hash: string;
  status: "authorized" | "pending" | "rejected";
};

function TickLedger({ ticks }: { ticks: TickEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticks]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
      {ticks.length === 0 ? (
        <div className="flex items-center justify-center h-20 text-neutral-700 font-mono text-[11px]">
          No transactions yet
        </div>
      ) : (
        <div className="space-y-0.5">
          <AnimatePresence initial={false}>
            {ticks.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-white/[0.02] transition-colors"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    t.status === "authorized"
                      ? "bg-emerald-400"
                      : t.status === "rejected"
                      ? "bg-red-400"
                      : "bg-yellow-400 animate-pulse"
                  }`}
                />
                <span className="text-[10px] font-mono text-neutral-600 tabular-nums shrink-0">
                  {new Date(t.ts).toISOString().slice(11, 23)}
                </span>
                <span className="text-[11px] font-mono text-neutral-500 shrink-0">
                  {t.hash}
                </span>
                <span className="ml-auto text-[11px] font-mono font-bold text-emerald-400 tabular-nums shrink-0">
                  +${t.amount.toFixed(4)}
                </span>
                <span
                  className={`text-[9px] font-mono uppercase tracking-wider shrink-0 ${
                    t.status === "authorized"
                      ? "text-emerald-600"
                      : t.status === "rejected"
                      ? "text-red-600"
                      : "text-yellow-600"
                  }`}
                >
                  {t.status}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

// ─── Stat Cell ────────────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  accent,
  flash,
}: {
  label: string;
  value: string;
  accent?: string;
  flash?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-600">
        {label}
      </span>
      <motion.span
        key={value}
        initial={flash ? { color: "#10b981" } : false}
        animate={{ color: accent ?? "#ffffff" }}
        transition={{ duration: 0.8 }}
        className="text-[13px] font-mono font-semibold tabular-nums"
      >
        {value}
      </motion.span>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [taskInput, setTaskInput] = useState("");
  const [streamRate, setStreamRate] = useState(0.0001);
  const sessionId = "live-demo-session";

  const { socket, isConnected: isWsConnected } = useWebsocket(sessionId);
  const { streamData, status, balanceHistory } = useStreamSession(socket);
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const isAgentLive = status === "ACTIVE";
  const [ticks, setTicks] = useState<TickEntry[]>([]);
  const [uptime, setUptime] = useState(0);
  const [latency, setLatency] = useState(42);

  // Simulate latency jitter for demo realism
  useEffect(() => {
    const i = setInterval(() => {
      setLatency(38 + Math.floor(Math.random() * 18));
    }, 3000);
    return () => clearInterval(i);
  }, []);

  // Track uptime when live
  useEffect(() => {
    if (!isAgentLive) return;
    const i = setInterval(() => setUptime((p) => p + 1), 1000);
    return () => clearInterval(i);
  }, [isAgentLive]);

  // Convert payment settled events to tick entries
  useEffect(() => {
    if (!socket) return;
    const handler = (event: { type: string; content: string; timestamp: number }) => {
      if (event.type === "PAYMENT_SETTLED") {
        setTicks((prev) => {
          const newTick: TickEntry = {
            id: Math.random().toString(36).slice(2),
            ts: event.timestamp,
            amount: streamRate,
            hash:
              "0x" +
              Math.random().toString(16).slice(2, 10) +
              "…" +
              Math.random().toString(16).slice(2, 6),
            status: "authorized",
          };
          const next = [newTick, ...prev];
          if (next.length > 50) next.pop();
          return next;
        });
      }
    };
    socket.on("agent:event", handler);
    return () => { socket.off("agent:event", handler); };
  }, [socket, streamRate]);

  const handleStart = () => {
    if (!taskInput.trim()) return;
    setTicks([]);
    setUptime(0);
    if (socket) {
      socket.emit("session:start", { sessionId, task: taskInput, rate: streamRate });
    }
  };

  const handleStop = () => {
    if (socket) socket.emit("session:cancel", { sessionId });
  };

  const formatUptime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col overflow-hidden">

      {/* ── Top Telemetry Strip ───────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/[0.07] bg-[#060608]">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-[0_0_14px_rgba(99,102,241,0.5)]">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-[15px] font-bold tracking-tight">StreamPay</span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* Live Telemetry Ticker */}
          <div className="flex items-center gap-5">
            <StatCell
              label="Arc Latency"
              value={`${latency}ms`}
              accent={latency < 50 ? "#10b981" : "#f59e0b"}
            />
            <StatCell
              label="Gateway"
              value={isWsConnected ? "Connected" : "Reconnecting"}
              accent={isWsConnected ? "#10b981" : "#ef4444"}
            />
            <StatCell
              label="Tick Rate"
              value={isAgentLive ? "1.00s" : "—"}
              accent={isAgentLive ? "#a78bfa" : "#4b5563"}
            />
            <StatCell
              label="Burn Rate"
              value={isAgentLive ? `$${streamRate.toFixed(4)}/s` : "—"}
              accent={isAgentLive ? "#f59e0b" : "#4b5563"}
            />
            <StatCell
              label="Active Sessions"
              value={isAgentLive ? "1" : "0"}
              accent={isAgentLive ? "#10b981" : "#4b5563"}
            />
            <StatCell
              label="Uptime"
              value={isAgentLive ? formatUptime(uptime) : "00:00"}
              accent={isAgentLive ? "#e5e7eb" : "#4b5563"}
            />
          </div>
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-mono ${
              isWsConnected
                ? "border-emerald-800/50 bg-emerald-950/30 text-emerald-400"
                : "border-red-800/50 bg-red-950/30 text-red-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isWsConnected ? "bg-emerald-400 shadow-[0_0_6px_#10b981]" : "bg-red-400"
              }`}
            />
            Arc Testnet
          </div>

          {isConnected ? (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-[#111] rounded-lg border border-white/[0.08] font-mono text-[11px] text-neutral-400">
                {address?.slice(0, 6)}…{address?.slice(-4)}
              </div>
              <button
                onClick={() => disconnect()}
                className="text-[11px] font-mono text-neutral-600 hover:text-neutral-300 transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="px-4 py-1.5 bg-white text-black hover:bg-neutral-200 transition-colors rounded-lg font-semibold text-[12px]"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* ── Main 3-Column Grid ──────────────────────────────────────────────── */}
      <main className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">

        {/* ── LEFT: Order Book / Agent Control ───────────── col 1-4 ────── */}
        <aside className="col-span-4 border-r border-white/[0.07] flex flex-col overflow-hidden">

          {/* Section Header */}
          <div className="px-5 py-3 border-b border-white/[0.07] bg-[#060608] shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-neutral-500">
              Execution Engine
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-5">

            {/* Objective Input */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">
                Agent Objective
              </label>
              <textarea
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                disabled={isAgentLive}
                placeholder="e.g., Scrape ETH/USDC price feed and swap 10 USDC to EURC via Arc DEX..."
                className="w-full bg-[#0d0d0f] border border-white/[0.08] rounded-xl p-3.5 text-[13px] font-mono text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500/40 resize-none h-28 disabled:opacity-40 leading-relaxed"
              />
            </div>

            {/* Burn Rate */}
            <div className="bg-[#0d0d0f] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-600">
                  Compute Burn Rate
                </span>
                <motion.span
                  key={streamRate}
                  initial={{ color: "#a78bfa" }}
                  animate={{ color: "#e5e7eb" }}
                  transition={{ duration: 0.5 }}
                  className="text-[13px] font-mono font-bold tabular-nums"
                >
                  ${streamRate.toFixed(4)}{" "}
                  <span className="text-neutral-600 text-[10px] font-normal">USDC/s</span>
                </motion.span>
              </div>
              <input
                type="range"
                min="0.0001"
                max="0.01"
                step="0.0001"
                value={streamRate}
                onChange={(e) => setStreamRate(parseFloat(e.target.value))}
                disabled={isAgentLive}
                className="w-full h-1 accent-violet-500 disabled:opacity-40 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-neutral-700 mt-2">
                <span>Economy · $0.0001</span>
                <span>Turbo · $0.01</span>
              </div>
            </div>

            {/* Execute Button */}
            {!isAgentLive ? (
              <button
                onClick={handleStart}
                disabled={!taskInput.trim() || !isConnected}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-600 transition-all rounded-xl font-bold text-[14px] tracking-wide shadow-[0_0_30px_rgba(99,102,241,0.2)] disabled:shadow-none"
              >
                ▶ Start Streaming Compute
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="w-full flex justify-center items-center gap-2 py-3.5 bg-red-950/30 hover:bg-red-950/50 text-red-400 border border-red-800/40 transition-all rounded-xl font-bold text-[14px] tracking-wide"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                Stop Execution
              </button>
            )}

            {/* Gateway Network Info */}
            <div className="bg-[#0d0d0f] border border-white/[0.06] rounded-xl p-4 space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-600">
                Gateway Config
              </span>
              <div className="space-y-2">
                {[
                  { label: "Protocol", value: "x402 / HTTP" },
                  { label: "Settlement", value: "Circle Gateway" },
                  { label: "Chain", value: "Arc Testnet (5042002)" },
                  { label: "Tick Endpoint", value: "POST /api/billing/tick" },
                  { label: "Session ID", value: sessionId },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-mono text-neutral-600 shrink-0">{row.label}</span>
                    <span className="text-[10px] font-mono text-neutral-400 truncate text-right">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* x402 Live Tick Ledger */}
          <div className="shrink-0 border-t border-white/[0.07]">
            <div className="px-5 py-3 border-b border-white/[0.07] bg-[#060608] flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-neutral-500">
                x402 Payment Feed
              </span>
              {isAgentLive && (
                <span className="text-[9px] font-mono text-violet-400 animate-pulse">
                  ● streaming
                </span>
              )}
            </div>
            <div className="h-44 flex flex-col overflow-hidden">
              <TickLedger ticks={ticks} />
            </div>
          </div>
        </aside>

        {/* ── CENTER: Balance / Telemetry ───────────────── col 5-8 ────── */}
        <section className="col-span-4 border-r border-white/[0.07] flex flex-col overflow-hidden">

          {/* Section Header */}
          <div className="px-5 py-3 border-b border-white/[0.07] bg-[#060608] flex items-center justify-between shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-neutral-500">
              USDC Stream Monitor
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-neutral-700">
                {status}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isAgentLive
                    ? "bg-emerald-400 shadow-[0_0_6px_#10b981]"
                    : "bg-neutral-700"
                }`}
              />
            </div>
          </div>

          {/* Big Balance Numbers */}
          <div className="p-6 border-b border-white/[0.07] shrink-0">
            <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">
              Balance Remaining
            </div>
            <div className="flex items-end gap-3">
              <motion.div
                key={streamData.balanceRemaining.toFixed(4)}
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 1 }}
                className="text-5xl font-mono font-bold tabular-nums text-white leading-none"
              >
                {streamData.balanceRemaining.toFixed(4)}
              </motion.div>
              <span className="text-xl font-mono text-neutral-600 mb-1">USDC</span>
            </div>

            <div className="flex items-center gap-6 mt-4">
              <div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-700 mb-1">
                  Total Spent
                </div>
                <motion.div
                  key={streamData.totalSpent.toFixed(6)}
                  initial={{ color: "#10b981" }}
                  animate={{ color: "#ef4444" }}
                  transition={{ duration: 1.2 }}
                  className="text-xl font-mono font-bold tabular-nums"
                >
                  -${streamData.totalSpent.toFixed(6)}
                </motion.div>
              </div>
              <div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-700 mb-1">
                  Runtime
                </div>
                <div className="text-xl font-mono font-bold tabular-nums text-neutral-300">
                  {streamData.runtime}s
                </div>
              </div>
              <div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-700 mb-1">
                  Tx Count
                </div>
                <div className="text-xl font-mono font-bold tabular-nums text-violet-400">
                  {ticks.length}
                </div>
              </div>
            </div>
          </div>

          {/* Balance Chart */}
          <div className="p-4 border-b border-white/[0.07] shrink-0">
            <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-700 mb-3">
              Balance History
            </div>
            <BalanceChart history={balanceHistory} isLive={isAgentLive} />
          </div>

          {/* Balance Bar */}
          <div className="p-4 border-b border-white/[0.07] shrink-0">
            <div className="flex justify-between text-[9px] font-mono text-neutral-700 mb-2">
              <span>0 USDC</span>
              <span className="text-neutral-500">
                {Math.max(0, (streamData.balanceRemaining / 10) * 100).toFixed(1)}% remaining
              </span>
              <span>10 USDC</span>
            </div>
            <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-violet-500"
                initial={{ width: "100%" }}
                animate={{
                  width: `${Math.max(0, (streamData.balanceRemaining / 10) * 100)}%`,
                }}
                transition={{ ease: "linear", duration: 0.9 }}
              />
            </div>
          </div>

          {/* Arc Settlement Queue */}
          <div className="flex-1 p-4 flex flex-col gap-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-700">
              Arc Batch Settlement Queue
            </div>
            <div className="flex-1 bg-[#0d0d0f] rounded-xl border border-white/[0.06] p-4 flex flex-col gap-2">
              {ticks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-[11px] font-mono text-neutral-700">
                  No pending settlements
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-[10px] font-mono text-neutral-700 pb-2 border-b border-white/[0.05]">
                    <span>Queued Ticks</span>
                    <span className="text-violet-500">{ticks.length} tx</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-neutral-600">Batch Total</span>
                    <span className="text-emerald-400 font-bold">
                      ${streamData.totalSpent.toFixed(6)} USDC
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-neutral-600">Settlement Chain</span>
                    <span className="text-cyan-400">Arc Testnet</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-neutral-600">Via</span>
                    <span className="text-neutral-400">Circle Gateway</span>
                  </div>

                  {status === "COMPLETED" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-2 flex items-center gap-2 px-3 py-2.5 bg-emerald-950/40 border border-emerald-800/30 rounded-lg"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-[11px] font-mono text-emerald-300">
                        Batch finalized · {ticks.length} txs settled on Arc
                      </span>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── RIGHT: Agent Telemetry Terminal ───────────── col 9-12 ─────── */}
        <section className="col-span-4 flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.07] bg-[#060608] shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-neutral-500">
              Agent Telemetry
            </span>
          </div>
          <div className="flex-1 p-4 overflow-hidden">
            <AgentTerminal socket={socket} isLive={isAgentLive} />
          </div>
        </section>
      </main>
    </div>
  );
}
