'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { FileText, Folder, Shield, Calendar, Terminal } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    notesCount: number;
    filesCount: number;
    recentLogs: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/dashboard')
      .then((data) => {
        setStats(data);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load dashboard metrics');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-32 bg-slate-800/40 rounded-xl border border-slate-800"></div>
          <div className="h-32 bg-slate-800/40 rounded-xl border border-slate-800"></div>
        </div>
        <div className="h-64 bg-slate-800/40 rounded-xl border border-slate-800"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
        <p className="font-semibold">Error Loading Dashboard</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  const recentLogs = stats?.recentLogs || [];

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
          Dashboard Summary
        </h1>
        <p className="text-slate-400 text-sm mt-1">Real-time cryptographic audit log and resource metric indices.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Notes Metric */}
        <div className="glass bg-[#0c1220]/75 p-6 rounded-xl border border-slate-800 flex items-center justify-between hover-scale">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Encrypted Notes</p>
            <h3 className="text-4xl font-extrabold text-blue-400 mt-2">{stats?.notesCount ?? 0}</h3>
            <p className="text-xs text-slate-500 mt-1">AES-GCM enclaved records</p>
          </div>
          <div className="w-14 h-14 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <FileText className="w-7 h-7 text-blue-400" />
          </div>
        </div>

        {/* Files Metric */}
        <div className="glass bg-[#0c1220]/75 p-6 rounded-xl border border-slate-800 flex items-center justify-between hover-scale">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Encrypted Files</p>
            <h3 className="text-4xl font-extrabold text-indigo-400 mt-2">{stats?.filesCount ?? 0}</h3>
            <p className="text-xs text-slate-500 mt-1">Suppressed blob assets</p>
          </div>
          <div className="w-14 h-14 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Folder className="w-7 h-7 text-indigo-400" />
          </div>
        </div>

      </div>

      {/* Audit Logs Trail */}
      <div className="glass bg-[#0c1220]/75 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-slate-200">Recent Cryptographic Operations</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">Real-time audit log</span>
        </div>

        {recentLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No secure operations recorded yet. Try creating a note or uploading a file!
          </div>
        ) : (
          <div className="space-y-4">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-4 rounded-lg bg-slate-900/50 border border-slate-800/70 hover:border-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                    log.action.includes('decrypt')
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : log.action.includes('delete')
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-300 font-mono">{log.action}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Resource: <span className="text-slate-400 font-mono">{log.resourceType} ({log.resourceId.slice(0,8)})</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
