import React from "react";
import { StatsData } from "../types";
import { RefreshCw, AlertTriangle, Activity, Database, Clock } from "lucide-react";

interface IDSStatsPageProps {
  stats: StatsData | null;
  isLoading?: boolean;
  error?: string | null;
  onRefresh: () => void;
}

export const IDSStatsPage: React.FC<IDSStatsPageProps> = ({ stats, isLoading, error, onRefresh }) => {
  return (
    <div className="grid grid-cols-12 gap-6 h-full overflow-y-auto" id="ids-stats-page">
      <div className="col-span-12 flex flex-col gap-4">
        <div className="glass-panel p-6 rounded-lg border border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-white/95">Intrusion Detection Summary</h2>
            <p className="text-sm text-white/50 mt-1">Live IDS telemetry and alert state summary.</p>
          </div>
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded bg-cyan-400/10 border border-cyan-400/20 px-4 py-2 text-xs text-cyan-200 hover:bg-cyan-400/15 transition"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="glass-panel p-6 rounded-lg border border-white/10 animate-pulse">
            <div className="h-4 w-48 bg-white/10 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-20 rounded bg-white/5" />
              <div className="h-20 rounded bg-white/5" />
            </div>
          </div>
        ) : error ? (
          <div className="glass-panel p-6 rounded-lg border border-brand-red/20 bg-brand-red/10 text-brand-red">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} />
              <div>
                <p className="font-semibold">Unable to load IDS statistics.</p>
                <p className="text-sm text-white/70 mt-1">{error}</p>
              </div>
            </div>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-lg border border-white/10">
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="font-mono text-[10px] uppercase text-white/50 tracking-[0.25em]">Total Messages</span>
                <Activity size={18} className="text-cyan-400" />
              </div>
              <p className="text-4xl font-bold text-white/95">{stats.total_messages.toLocaleString()}</p>
              <p className="mt-2 text-sm text-white/50">Messages processed by the IDS engine.</p>
            </div>

            <div className="glass-panel p-6 rounded-lg border border-white/10">
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="font-mono text-[10px] uppercase text-white/50 tracking-[0.25em]">Total Alerts</span>
                <AlertTriangle size={18} className="text-brand-red" />
              </div>
              <p className="text-4xl font-bold text-white/95">{stats.total_alerts.toLocaleString()}</p>
              <p className="mt-2 text-sm text-white/50">Total alerts raised by the CAN IDS.</p>
            </div>

            <div className="glass-panel p-6 rounded-lg border border-white/10">
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="font-mono text-[10px] uppercase text-white/50 tracking-[0.25em]">Flood Count</span>
                <Database size={18} className="text-cyan-400" />
              </div>
              <p className="text-4xl font-bold text-white/95">{stats.flood_count.toLocaleString()}</p>
              <p className="mt-2 text-sm text-white/50">Flood attack events detected on the bus.</p>
            </div>

            <div className="glass-panel p-6 rounded-lg border border-white/10">
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="font-mono text-[10px] uppercase text-white/50 tracking-[0.25em]">Replay Count</span>
                <Clock size={18} className="text-brand-violet" />
              </div>
              <p className="text-4xl font-bold text-white/95">{stats.replay_count.toLocaleString()}</p>
              <p className="mt-2 text-sm text-white/50">Replay attack events observed.</p>
            </div>

            <div className="glass-panel p-6 rounded-lg border border-white/10">
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="font-mono text-[10px] uppercase text-white/50 tracking-[0.25em]">Spoof Count</span>
                <Database size={18} className="text-cyan-400" />
              </div>
              <p className="text-4xl font-bold text-white/95">{stats.spoof_count.toLocaleString()}</p>
              <p className="mt-2 text-sm text-white/50">Spoofing attack events captured by IDS.</p>
            </div>

            <div className="glass-panel p-6 rounded-lg border border-white/10">
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="font-mono text-[10px] uppercase text-white/50 tracking-[0.25em]">Alert Rate</span>
                <Clock size={18} className="text-white/70" />
              </div>
              <p className="text-4xl font-bold text-white/95">{stats.alert_rate.toFixed(1)} / min</p>
              <p className="mt-2 text-sm text-white/50">Average alerts generated per minute.</p>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-6 rounded-lg border border-white/10 text-white/70">
            No statistics are available.
          </div>
        )}
      </div>
    </div>
  );
};
