"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Square, Cpu, Activity, ShieldCheck, Zap } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useWebsocket, useStreamSession } from "../hooks/useRealtime";
import { AgentTerminal } from "../components/AgentTerminal";
import { ArcDexPanel } from "../components/ArcDexPanel";

export default function Dashboard() {
  const [isActive, setIsActive] = useState(false);
  const sessionId = "mock-session-id";

  const { socket, isConnected: isWsConnected } = useWebsocket(sessionId);
  const { streamData, status } = useStreamSession(socket);

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const handleStart = () => {
    setIsActive(true);
    // In a real app we'd make an HTTP request to start the agent task here
    // e.g., fetch('/api/sessions/start', ...)
  };

  const handleStop = () => {
    setIsActive(false);
    if (socket) {
      socket.emit('session:cancel', { sessionId });
    }
  };

  // We can use the status from websocket or local active state
  const isAgentLive = isActive && status !== 'COMPLETED' && status !== 'CANCELLED';

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8 font-sans selection:bg-blue-500/30">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <header className="flex justify-between items-center pb-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Zap className="text-white w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">StreamPay</h1>
            <div className={`ml-4 px-2 py-1 rounded text-xs font-mono ${isWsConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {isWsConnected ? 'WS: CONNECTED' : 'WS: DISCONNECTED'}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isConnected ? (
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10 font-mono text-sm">
                  {address?.slice(0,6)}...{address?.slice(-4)}
                </div>
                <button onClick={() => disconnect()} className="text-neutral-400 hover:text-white transition-colors text-sm">
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={() => connect({ connector: connectors[0] })}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 transition-colors rounded-lg font-medium text-sm shadow-[0_0_20px_rgba(37,99,235,0.3)]"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Agent Control & Terminals */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-neutral-900 border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <div className="flex justify-between items-start mb-12 relative z-10">
                <div>
                  <h2 className="text-3xl font-semibold mb-2">Data Scraping Agent</h2>
                  <p className="text-neutral-400">Autonomous web crawler fetching structured market data.</p>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isAgentLive ? 'bg-green-500/10 text-green-400' : 'bg-neutral-800 text-neutral-500'}`}>
                  {isAgentLive && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                  {isAgentLive ? 'Live' : 'Idle'}
                </div>
              </div>

              <div className="flex items-center gap-4 relative z-10">
                {!isAgentLive ? (
                  <button 
                    onClick={handleStart}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-white text-black hover:bg-neutral-200 transition-colors rounded-2xl font-semibold text-lg"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Start Agent
                  </button>
                ) : (
                  <button 
                    onClick={handleStop}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-500 hover:bg-red-400 transition-colors rounded-2xl font-semibold text-lg text-white"
                  >
                    <Square className="w-5 h-5 fill-current" />
                    Stop Agent
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <AgentTerminal socket={socket} />
              <ArcDexPanel socket={socket} />
            </div>
          </div>

          {/* Right Column: Streaming Billing Panel */}
          <div className="bg-neutral-900 border border-white/5 rounded-3xl p-8 flex flex-col h-[full]">
            <div className="flex items-center gap-2 text-neutral-400 mb-8">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <h3 className="font-medium">Streaming Payment</h3>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center text-center space-y-2 relative min-h-[250px]">
              {/* Animated Ring */}
              {isAgentLive && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <div className="w-48 h-48 border-2 border-blue-500/20 rounded-full animate-[spin_4s_linear_infinite]" />
                   <div className="w-56 h-56 border border-purple-500/10 rounded-full animate-[spin_7s_linear_infinite_reverse] absolute" />
                </div>
              )}
              
              <div className="text-sm text-neutral-500 font-medium tracking-wide uppercase relative z-10">Amount Spent</div>
              <motion.div 
                key={streamData.totalSpent}
                initial={{ opacity: 0.5, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-mono font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 relative z-10"
              >
                ${streamData.totalSpent.toFixed(4)}
              </motion.div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/5 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Compute</div>
                  <div className="font-mono text-lg">{streamData.runtime}s</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Rate</div>
                  <div className="font-mono text-lg">0.0001 <span className="text-sm text-neutral-500">USDC/s</span></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <div className="text-sm text-neutral-400">Budget Remaining</div>
                  <div className="text-lg font-mono font-medium text-green-400">
                    {streamData.balanceRemaining.toFixed(4)} USDC
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-green-400 to-blue-500"
                    initial={{ width: "100%" }}
                    animate={{ width: `${(streamData.balanceRemaining / 10) * 100}%` }}
                    transition={{ ease: "linear", duration: 1 }}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
