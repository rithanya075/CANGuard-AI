import React, { useState, useEffect, useCallback } from "react";
import {
  StatsData, AlertRow, AlertsResponse,
  TrafficRow, TrafficResponse, HardwareBoardStatus,
} from "./types";
import { IDSStatsPage }       from "./components/IDSStatsPage.tsx";
import { ThreatIntelPage }    from "./components/ThreatIntelPage";
import { TrafficAnalysisPage } from "./components/TrafficAnalysisPage";
import { HardwareStatusPage } from "./components/HardwareStatusPage";
import { SystemSettingsPage } from "./components/SystemSettingsPage";
import {
  Shield, Radio, Activity, Cpu, Settings,
  ShieldAlert, Wifi, Clock, X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// ── Static hardware boards (Arduino nodes — not from API) ──

const INITIAL_BOARDS: HardwareBoardStatus[] = [
  {
    boardName:       "Node 1 — Legitimate ECU",
    status:          "Online",
    busErrorFrames:  0,
    cpuTemp:         38,
    cpuUtilization:  23,
    memUtilization:  46,
    voltage:         12.10,
  },
  {
    boardName:       "Node 2 — Attacker Node",
    status:          "Online",
    busErrorFrames:  0,
    cpuTemp:         41,
    cpuUtilization:  72,
    memUtilization:  58,
    voltage:         11.95,
  },
];

// ── Tab type ───────────────────────────────────────────────

type Tab = "ids" | "threat" | "traffic" | "hardware" | "settings";

// ── App ────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("ids");

  // ── API data state ─────────────────────────────────────

  const [stats,        setStats]        = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError,   setStatsError]   = useState<string | null>(null);

  const [alerts,          setAlerts]          = useState<AlertRow[]>([]);
  const [alertsTotal,     setAlertsTotal]     = useState(0);
  const [alertsLoading,   setAlertsLoading]   = useState(true);
  const [alertsError,     setAlertsError]     = useState<string | null>(null);

  const [traffic,         setTraffic]         = useState<TrafficRow[]>([]);
  const [trafficTotal,    setTrafficTotal]    = useState(0);
  const [trafficLoading,  setTrafficLoading]  = useState(true);
  const [trafficError,    setTrafficError]    = useState<string | null>(null);

  // Hardware boards — static, toggled by self-check
  const [boards,       setBoards]       = useState<HardwareBoardStatus[]>(INITIAL_BOARDS);

  // Global alert banner
  const [globalAlert, setGlobalAlert] = useState<string | null>(null);
  const handleTriggerGlobalAlert = (message: string) => {
    setGlobalAlert(message);
  };

  // Live uptime counter
  const [uptime, setUptime] = useState("00H 00M");

  // ── Fetchers ───────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await fetch("http://127.0.0.1:5000/api/stats");
      if (!res.ok) throw new Error(`/api/stats returned ${res.status}`);
      const data: StatsData = await res.json();
      setStats(data);
    } catch (err: any) {
      console.error("[IDS] fetchStats error:", err);
      setStatsError(err.message ?? "Failed to load IDS statistics.");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const res = await fetch("http://127.0.0.1:5000/api/alerts");
      if (!res.ok) throw new Error(`/api/alerts returned ${res.status}`);
      const data: AlertsResponse = await res.json();

      if (!Array.isArray(data.alerts)) {
        throw new Error("Unexpected response shape from /api/alerts");
      }
      setAlerts(data.alerts);
      setAlertsTotal(data.total_alerts ?? data.alerts.length);

      // If new HIGH-confidence alerts arrive, show the global banner
      const criticals = data.alerts.filter((a) => a.confidence === "HIGH");
      if (criticals.length > 0 && data.alerts.length > 0) {
        const latest = criticals[0];
        setGlobalAlert(
          `${latest.attack_type} ATTACK detected on ${latest.can_id} — ${latest.details}`
        );
      }
    } catch (err: any) {
      console.error("[IDS] fetchAlerts error:", err);
      setAlertsError(err.message ?? "Failed to load threat intelligence.");
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  const fetchTraffic = useCallback(async () => {
    setTrafficLoading(true);
    setTrafficError(null);
    try {
      const res = await fetch("http://127.0.0.1:5000/api/traffic");
      if (!res.ok) throw new Error(`/api/traffic returned ${res.status}`);
      const data: TrafficResponse = await res.json();

      if (!Array.isArray(data.traffic)) {
        throw new Error("Unexpected response shape from /api/traffic");
      }
      setTraffic(data.traffic);
      setTrafficTotal(data.total_records ?? data.traffic.length);
    } catch (err: any) {
      console.error("[IDS] fetchTraffic error:", err);
      setTrafficError(err.message ?? "Failed to load CAN traffic.");
    } finally {
      setTrafficLoading(false);
    }
  }, []);

  // ── Mount: load all three endpoints in parallel ────────

  useEffect(() => {
    fetchStats();
    fetchAlerts();
    fetchTraffic();
  }, [fetchStats, fetchAlerts, fetchTraffic]);

  // ── Uptime counter ─────────────────────────────────────

  useEffect(() => {
    let totalMinutes = 0;
    setUptime("00H 00M");
    const interval = setInterval(() => {
      totalMinutes++;
      const h = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
      const m = (totalMinutes % 60).toString().padStart(2, "0");
      setUptime(`${h}H ${m}M`);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // ── Hardware self-check ────────────────────────────────

  const handleTriggerSelfCheck = () => {
    setBoards((prev) =>
      prev.map((b) => ({ ...b, status: "Degraded" as const }))
    );
    setTimeout(() => {
      setBoards((prev) =>
        prev.map((b) => ({
          ...b,
          status: "Online" as const,
          busErrorFrames: 0,
          cpuTemp: 38,
          cpuUtilization: b.cpuUtilization,
          memUtilization: b.memUtilization,
          voltage: b.voltage,
        }))
      );
    }, 5_000);
  };

  const handleSaveSettings = (cfg: any) => {
    console.log("[IDS] Settings saved:", cfg);
  };

  // ── Navigation ─────────────────────────────────────────

  const navItems: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "ids",      label: "IDS Statistics",   icon: Shield   },
    { id: "threat",   label: "Threat Intel",     icon: Radio    },
    { id: "traffic",  label: "Traffic Analysis", icon: Activity },
    { id: "hardware", label: "Hardware Status",  icon: Cpu      },
    { id: "settings", label: "System Settings",  icon: Settings },
  ];

  const pageTitles: Record<Tab, string> = {
    ids:      "CAN-BUS IDS — STATISTICS",
    threat:   "THREAT INTELLIGENCE",
    traffic:  "TRAFFIC ANALYSIS",
    hardware: "HARDWARE STATUS",
    settings: "SYSTEM SETTINGS",
  };

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-brand-bg text-white font-sans select-none antialiased">

      {/* ── SIDEBAR ── */}
      <aside className="w-[300px] border-r border-white/10 flex flex-col justify-between shrink-0 bg-brand-gray-dark relative z-20">

        <div className="flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-white/5 flex items-center gap-3">
            <div className="relative">
              <Shield className="text-cyan-400 glow-cyan animate-pulse" size={24} />
              <div className="absolute inset-0 bg-cyan-400/20 blur filter rounded-full" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display font-black text-sm tracking-widest text-white">
                NEXUS-7 IDS
              </span>
              <span className="font-mono text-[9px] text-[#00E5FF] tracking-[0.25em] mt-1 font-semibold">
                CAN BUS MONITOR
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="p-4 flex flex-col gap-1.5 mt-4">
            {navItems.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full py-3.5 px-4 rounded text-left transition-all flex items-center gap-3 font-display font-medium text-[13px] relative ${
                    active
                      ? "text-cyan-400 font-semibold bg-cyan-400/[0.05]"
                      : "text-white/60 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="activeBar"
                      className="absolute left-0 top-0 bottom-0 w-[3px] bg-cyan-400 glow-cyan rounded-r-sm"
                      transition={{ type: "tween", ease: "easeInOut", duration: 0.25 }}
                    />
                  )}
                  <Icon size={16} className={active ? "text-cyan-400" : "text-white/50"} />
                  <span className="uppercase tracking-widest text-[11px]">{label}</span>

                  {/* Live alert badge on Threat Intel tab */}
                  {id === "threat" && alertsTotal > 0 && (
                    <span className="ml-auto font-mono text-[9px] font-bold bg-brand-red/20 text-brand-red border border-brand-red/30 px-1.5 py-0.5 rounded">
                      {alertsTotal}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/5 flex items-center justify-between gap-3 bg-[#0a0a0b]/40">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-full bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center font-mono font-bold text-xs text-cyan-400 select-none">
              SO
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-xs text-white/90">Security Operator</span>
              <span className="font-mono text-[10px] text-white/40 leading-none mt-1">V1.0.4 — Stable</span>
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-brand-green glow-green" />
        </div>

      </aside>

      {/* ── MAIN PANEL ── */}
      <main className="flex-1 flex flex-col h-full bg-[#07090F] relative overflow-hidden select-text">
        <div className="absolute inset-0 hud-grid-bg opacity-20 pointer-events-none" />

        {/* Header */}
        <header className="h-[70px] border-b border-white/10 px-8 flex items-center justify-between shrink-0 bg-[#131416]/80 backdrop-blur-md relative z-10 select-none">
          <div className="flex items-center gap-3">
            <span className="p-1 px-1.5 rounded-sm bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-xs">✦</span>
            <h1 className="font-display font-extrabold text-[15px] text-white/95 uppercase tracking-widest">
              {pageTitles[activeTab]}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Wifi size={13} className="text-brand-green glow-green" />
              <span className="font-mono text-[10px] font-bold text-brand-green uppercase tracking-widest">
                NETWORK LIVE
              </span>
            </div>
            <div className="h-4 w-px bg-white/15" />
            <div className="flex items-center gap-2 font-mono text-[10px] text-white/50">
              <Clock size={13} className="text-white/40" />
              <span>UPTIME: {uptime}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 lg:p-8 overflow-hidden relative z-10 bg-gradient-to-tr from-brand-bg to-transparent">

          {/* Global alert banner */}
          <AnimatePresence>
            {globalAlert && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 p-4 rounded bg-brand-red/15 border border-brand-red/35 flex items-start justify-between gap-3 shadow-[0_0_20px_rgba(255,77,109,0.1)] relative z-20 shrink-0"
              >
                <div className="flex items-start gap-3">
                  <ShieldAlert className="text-brand-red shrink-0 mt-0.5" size={16} />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono font-bold text-brand-red tracking-widest uppercase text-[10px]">
                      ATTACK DETECTED ON CAN BUS
                    </span>
                    <p className="font-mono text-[11px] text-white/80 leading-relaxed">{globalAlert}</p>
                  </div>
                </div>
                <button
                  onClick={() => setGlobalAlert(null)}
                  className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Page switcher */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="h-full w-full"
            >
              {activeTab === "ids" && (
                <IDSStatsPage
                  stats={stats}
                  isLoading={statsLoading}
                  error={statsError}
                  onRefresh={fetchStats}
                />
              )}

              {activeTab === "threat" && (
                <ThreatIntelPage
                  alerts={alerts}
                  total={alertsTotal}
                  isLoading={alertsLoading}
                  error={alertsError}
                  onRefresh={fetchAlerts}
                />
              )}

              {activeTab === "traffic" && (
                <TrafficAnalysisPage
                  traffic={traffic}
                  total={trafficTotal}
                  isLoading={trafficLoading}
                  error={trafficError}
                  onRefresh={fetchTraffic}
                  onTriggerGlobalAlert={handleTriggerGlobalAlert}
                />
              )}

              {activeTab === "hardware" && (
                <HardwareStatusPage
                  boards={boards}
                  onTriggerSelfCheck={handleTriggerSelfCheck}
                />
              )}

              {activeTab === "settings" && (
                <SystemSettingsPage
                  onSaveSettings={handleSaveSettings}
                />
              )}
            </motion.div>
          </AnimatePresence>

        </div>
      </main>

    </div>
  );
}
