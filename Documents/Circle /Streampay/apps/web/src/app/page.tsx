"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Square, Activity, Zap, Cpu, Settings2, ShieldAlert } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useWebsocket, useStreamSession } from "../hooks/useRealtime";
import { AgentTerminal } from "../components/AgentTerminal";

export default function Dashboard() {
  const [taskInput, setTaskInput] = useState("");
  const [streamRate, setStreamRate] = useState(0.0001);
  const sessionId = "live-demo-session";

  const { socket, isConnected: isWsConnected } = useWebsocket(sessionId);
  const { streamData, status } = useStreamSession(socket);

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const isAgentLive = status === 'ACTIVE';

  const handleStart = async () => {
    if (!taskInput.trim()) return;
    
    // Notify server to start stream via HTTP/API in real app
    // For now we trigger the websocket
    if (socket) {
      socket.emit('session:start', { sessionId, task: taskInput, rate: streamRate });
    }
  };

  const handleStop = () => {
    if (socket) {
      socket.emit('session:cancel', { sessionId });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 flex flex-col">
      {/* Top Navbar */}
      <header className="flex justify-between items-center px-8 py-5 border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <Zap className="text-white w-4 h-4" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">StreamPay</h1>
          
          <div className="ml-6 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
            <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">{isWsConnected ? 'Network Connected' : 'Reconnecting...'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {isConnected ? (
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-neutral-900 rounded-lg border border-white/10 font-mono text-sm text-neutral-300">
                {address?.slice(0,6)}...{address?.slice(-4)}
              </div>
              <button onClick={() => disconnect()} className="text-neutral-500 hover:text-white transition-colors text-sm font-medium">
                Disconnect
              </button>
            </div>
          ) : (
            <button 
              onClick={() => connect({ connector: connectors[0] })}
              className="px-6 py-2 bg-white text-black hover:bg-neutral-200 transition-colors rounded-lg font-semibold text-sm"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Task & Streaming Interface */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          
          {/* Task Setup Panel */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10">
               <Cpu className="w-32 h-32" />
            </div>
            
            <h2 className="text-2xl font-bold mb-6 relative z-10">Deploy Autonomous Agent</h2>
            
            <div className="space-y-6 relative z-10">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Agent Objective</label>
                <textarea 
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  disabled={isAgentLive}
                  placeholder="e.g., Scrape real-time market data for ETH and swap 10 USDC to EURC..."
                  className="w-full bg-black border border-white/10 rounded-xl p-4 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-32 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2 flex items-center justify-between">
                  <span>Compute Stream Rate</span>
                  <span className="font-mono text-blue-400">{streamRate} USDC/s</span>
                </label>
                <input 
                  type="range" 
                  min="0.0001" 
                  max="0.01" 
                  step="0.0001"
                  value={streamRate}
                  onChange={(e) => setStreamRate(parseFloat(e.target.value))}
                  disabled={isAgentLive}
                  className="w-full accent-blue-500 disabled:opacity-50"
                />
                <div className="flex justify-between text-xs text-neutral-600 font-mono mt-2">
                  <span>Economy (0.0001)</span>
                  <span>Turbo (0.01)</span>
                </div>
              </div>

              {!isAgentLive ? (
                <button 
                  onClick={handleStart}
                  disabled={!taskInput.trim() || !isConnected}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-500 transition-colors rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                >
                  Start Streaming Compute
                </button>
              ) : (
                <button 
                  onClick={handleStop}
                  className="w-full flex justify-center items-center gap-2 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-colors rounded-xl font-bold text-lg"
                >
                  <Square className="w-5 h-5 fill-current" />
                  Stop Execution
                </button>
              )}
            </div>
          </div>

          {/* Live Stream Meter */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
            {isAgentLive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                <div className="w-64 h-64 border-[4px] border-blue-500/20 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                <div className="w-48 h-48 border-[2px] border-purple-500/30 rounded-full animate-[spin_4s_linear_infinite] absolute" />
              </div>
            )}
            
            <div className="text-sm font-bold tracking-widest text-neutral-500 uppercase mb-2 relative z-10 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Live USDC Drain
            </div>
            
            <motion.div 
              key={streamData.totalSpent}
              initial={{ opacity: 0.8, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-6xl font-mono font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-500 relative z-10 py-2"
            >
              ${streamData.totalSpent.toFixed(4)}
            </motion.div>
            
            <div className="grid grid-cols-2 gap-8 mt-8 w-full relative z-10 text-center border-t border-white/10 pt-6">
               <div>
                 <div className="text-xs text-neutral-500 uppercase tracking-widest mb-1">Runtime</div>
                 <div className="font-mono text-xl">{streamData.runtime}s</div>
               </div>
               <div>
                 <div className="text-xs text-neutral-500 uppercase tracking-widest mb-1">Balance Remaining</div>
                 <div className="font-mono text-xl text-green-400">{streamData.balanceRemaining.toFixed(4)}</div>
               </div>
            </div>
            
            <div className="w-full h-2 bg-neutral-900 rounded-full mt-6 overflow-hidden relative z-10">
              <motion.div 
                className="h-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-600"
                initial={{ width: "100%" }}
                animate={{ width: `${Math.max(0, (streamData.balanceRemaining / 10) * 100)}%` }}
                transition={{ ease: "linear", duration: 1 }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Agent Telemetry */}
        <div className="lg:col-span-7 flex flex-col">
          <AgentTerminal socket={socket} isLive={isAgentLive} />
        </div>

      </main>
    </div>
  );
}
