import React, { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { TrafficRow } from "../types";
import { Activity, Radio, BarChart3, ShieldAlert, Cpu, Network, Zap, Play, Send } from "lucide-react";

interface TrafficAnalysisPageProps {
  traffic: TrafficRow[];
  total: number;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onTriggerGlobalAlert: (message: string) => void;
}

interface HistoricalTrafficData {
  time: string;
  counter: number;
}

export const TrafficAnalysisPage: React.FC<TrafficAnalysisPageProps> = ({ traffic, total, isLoading, error, onRefresh, onTriggerGlobalAlert }) => {
  const [injectFrameId, setInjectFrameId] = useState("0x244");
  const [injectPayload, setInjectPayload] = useState("FF FF FF FF FF FF FF FF");
  const [injectVector, setInjectVector] = useState("Spoofing DDoS flood");
  const [injectBus, setInjectBus] = useState<"CAN_0_HS" | "CAN_1_MS" | "LIN_BODY">("CAN_0_HS");
  const [injectionLogs, setInjectionLogs] = useState<string[]>([
    "System: Active deep-scanning listeners attached to CAN Gwy v2.",
    "Gate: Dynamic rate thresholds active on Node 2 (Steering Controller)."
  ]);

  // Live historical chart coordinates built from the backend traffic API
  const [historyData, setHistoryData] = useState<HistoricalTrafficData[]>([]);
  const [apiError, setApiError] = useState<string | null>(error || null);

  // Message IDs Frequency Count Table state
  const [idCounts, setIdCounts] = useState([
    { id: "0x1A0", count: 8420, rate: "40 Hz", bus: "CAN_0_HS", secure: true },
    { id: "0x3B6", count: 5210, rate: "20 Hz", bus: "CAN_0_HS", secure: true },
    { id: "0x24C", count: 3102, rate: "10 Hz", bus: "CAN_0_HS", secure: true },
    { id: "0x0B0", count: 1540, rate: "5 Hz", bus: "CAN_1_MS", secure: true },
    { id: "0x04F", count: 882, rate: "2 Hz", bus: "LIN_BODY", secure: true },
    { id: "0x244", count: 120, rate: "Aperiodic", bus: "CAN_0_HS", secure: false },
    { id: "0x099", count: 320, rate: "Aperiodic", bus: "CAN_1_MS", secure: false }
  ]);

  const [spikeActive, setSpikeActive] = useState(false);

  useEffect(() => {
    setApiError(error || null);
  }, [error]);

  useEffect(() => {
    const mapped = traffic && Array.isArray(traffic)
      ? traffic.map((item) => ({
          time: item.timestamp || "Unknown",
          counter: typeof item.counter === "number" ? item.counter : Number(item.counter) || 0,
        }))
      : [];

    if (mapped.length > 0) {
      setHistoryData(mapped);
    } else {
      setHistoryData([{ time: "No data", counter: 0 }]);
    }
  }, [traffic]);

  const isLoadingState = Boolean(isLoading);
  const handleRefresh = onRefresh || (() => undefined);

  // Handle Inject Execution
  const handleInject = () => {
    onTriggerGlobalAlert(`CRITICAL GATEWAY INTRUSION: Injection code sequence emitted on ${injectBus} with ID ${injectFrameId}!`);
    setSpikeActive(true);

    const logStamp = `[${new Date().toLocaleTimeString()}] INJECTED TARGET -> [Bus: ${injectBus} | Id: ${injectFrameId} | Payload: ${injectPayload} | Vector: ${injectVector}]`;
    const gatewayWarn = `[${new Date().toLocaleTimeString()}] COMPROMISE ALERT -> Gateway IDS detected spike violation. Applying hardware rate limit to 0x244 immediately.`;

    setInjectionLogs((prev) => [logStamp, gatewayWarn, ...prev]);

    // Update frequencies table
    setIdCounts((prev) => {
      return prev.map((item) => {
        if (item.id === injectFrameId) {
          return { ...item, count: item.count + (injectVector === "Spoofing DDoS flood" ? 450 : 1), secure: false };
        }
        return item;
      });
    });
  };

  const handlePredefinedInject = (type: string) => {
    if (type === "fuzzing") {
      setInjectFrameId("0x244");
      setInjectPayload("FE FE FF FF FE FE FF FF");
      setInjectVector("Silent Fuzzing probe");
      setInjectBus("CAN_0_HS");
    } else if (type === "doors") {
      setInjectFrameId("0x04F");
      setInjectPayload("FF CC AA BB");
      setInjectVector("LIN Unauthenticated Command Hijacking");
      setInjectBus("LIN_BODY");
    } else {
      setInjectFrameId("0x3B6");
      setInjectPayload("01 10 B2 C2 00 00 A1 FF");
      setInjectVector("Active Chassis Replay Drive Spoof");
      setInjectBus("CAN_0_HS");
    }
  };

  const histogramData = idCounts.map((item) => ({
    name: item.id,
    count: item.count,
    critical: !item.secure
  }));

  return (
    <div className="grid grid-cols-12 gap-6 h-full overflow-y-auto pr-2 pb-6" id="traffic-analysis-container">
      
      {/* 1. HI-FIDELITY LIVE AREA CHART (8 Cols) */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
        
        {/* Recharts Area Container */}
        <div className="glass-panel p-5 rounded-lg flex flex-col h-[380px] relative overflow-hidden bg-gradient-to-b from-[#0b0f1a]/80 to-[#131314]/80 select-none">
          <div className="absolute inset-0 hud-grid-bg opacity-3 pointer-events-none" />
          
          <div className="flex items-center justify-between gap-4 mb-4 z-10">
            <h3 className="font-display font-semibold text-xs text-white/70 uppercase tracking-widest flex items-center gap-2">
              <Activity className="text-cyan-400 animate-pulse" size={15} /> VEHICULAR GATEWAY TRAFFIC VOLUME (BPS) INDEX
            </h3>
            <div className="flex items-center gap-3 font-mono text-[10px] text-white/50">
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-cyan-400" /> CAN_0_HS (Chassis)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-brand-violet" /> CAN_1_MS (Infotainment)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-amber-500" /> LIN_BODY (Cabin)
              </span>
            </div>
          </div>

          <div className="flex-1 w-full z-10 relative flex items-center justify-center">
            {isLoadingState ? (
              <div className="absolute inset-0 bg-[#07090F]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
                <Activity className="animate-spin text-cyan-400" size={32} />
                <span className="font-mono text-xs text-white/50 animate-pulse uppercase tracking-widest">
                  STREAMING TELEMETRY STREAMS SECURELY...
                </span>
              </div>
            ) : apiError ? (
              <div className="absolute top-0 left-0 right-0 p-2.5 bg-brand-red/15 border border-brand-red/30 rounded font-mono text-[10px] text-brand-red flex items-center justify-between gap-3 z-20">
                <span className="flex items-center gap-1.5 uppercase font-bold tracking-wide">⚠️ CONNECTION ERROR: {apiError}</span>
                <button onClick={handleRefresh} className="px-2 py-0.5 rounded bg-brand-red/20 font-bold hover:bg-brand-red/30 transition-colors uppercase">RETRY</button>
              </div>
            ) : null}

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCounter" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={9} fontStyle="italic" />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0B0F1A",
                    borderColor: "rgba(0, 229, 255, 0.2)",
                    borderRadius: "4px",
                    fontFamily: "Space Mono",
                    fontSize: "10px",
                  }}
                  itemStyle={{ color: "#E0E0E0" }}
                />
                <Area type="monotone" dataKey="counter" stroke="#00E5FF" strokeWidth={1.5} fillOpacity={1} fill="url(#colorCounter)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Message ID Histogram & ID frequencies Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="glass-panel p-5 rounded-lg flex flex-col gap-4">
            <h4 className="font-display font-medium text-xs text-white/70 uppercase tracking-wider flex items-center gap-1.5Flat border-b border-white/5 pb-2">
              <BarChart3 size={14} className="text-brand-violet" /> MESSAGE ACCUMULATOR COUNTS
            </h4>
            
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" fontSize={9} stroke="rgba(255,255,255,0.15)" />
                  <YAxis fontSize={9} stroke="rgba(255,255,255,0.15)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0B0F1A",
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      fontSize: "10px",
                    }}
                  />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                    {histogramData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.critical ? "#FF4D6D" : "rgba(0, 229, 255, 0.45)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-lg flex flex-col gap-3">
            <h4 className="font-display font-medium text-xs text-white/70 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Network size={14} className="text-cyan-400" /> INTEGRATED ID BUS ALLOCATIONS
            </h4>

            <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1">
              {idCounts.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white/85">{item.id}</span>
                    <span className={`px-1 rounded text-[8px] font-mono leading-none py-0.5 border ${
                      item.bus === "LIN_BODY" ? "border-amber-500/30 text-amber-500 bg-amber-500/10" : "border-cyan-400/30 text-cyan-400 bg-cyan-400/10"
                    }`}>
                      {item.bus}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-right font-mono">
                    <span className="text-white/40 text-[10px]">FREQ: {item.rate}</span>
                    <span className={`text-[10px] font-semibold ${item.secure ? "text-brand-green" : "text-brand-red animate-pulse"}`}>
                      {item.secure ? "SECURE" : "EXPLOITED"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* 2. CHASSIS CODES INCIDENT INJECTOR CONSOLE (4 Cols) */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
        
        <div className="glass-panel p-6 rounded-lg border-brand-red/30 bg-gradient-to-br from-[#73081d]/10 to-transparent flex flex-col gap-5 h-full">
          <div className="border-b border-white/5 pb-3">
            <h3 className="font-display font-semibold text-xs text-white/70 uppercase tracking-widest flex items-center gap-2">
              <Zap size={14} className="text-brand-red glow-red shrink-0" /> CAN-BUS MALICIOUS CODE INJECT MODULE
            </h3>
            <p className="text-[10px] text-white/50 font-sans mt-1">
              IDS Sandbox testing device. Emulates unauthorized physical frame injection over isolated vehicle gateways.
            </p>
          </div>

          {/* Quick Payload Preset selectors */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[9px] text-white/40 uppercase tracking-widest block font-bold">Inject Vector Presets</label>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => handlePredefinedInject("fuzzing")}
                className="py-1 px-1.5 rounded bg-white/5 border border-white/10 text-white/80 font-mono text-[9px] hover:bg-white/15 text-center truncate"
              >
                FUZZING DS
              </button>
              <button
                onClick={() => handlePredefinedInject("doors")}
                className="py-1 px-1.5 rounded bg-white/5 border border-white/10 text-white/80 font-mono text-[9px] hover:bg-white/15 text-center truncate"
              >
                LIN HIJACK
              </button>
              <button
                onClick={() => handlePredefinedInject("steering")}
                className="py-1 px-1.5 rounded bg-white/5 border border-white/10 text-white/80 font-mono text-[9px] hover:bg-white/15 text-center truncate"
              >
                STEER SPOOF
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            
            {/* Bus Select */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] text-white/50 uppercase">Gateway Bus Interface</label>
              <select
                value={injectBus}
                onChange={(e: any) => setInjectBus(e.target.value)}
                className="w-full bg-brand-bg border border-white/10 rounded p-2 text-xs font-mono text-cyan-400 tracking-wider focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
              >
                <option value="CAN_0_HS">CAN_0_HS (Chassis High Speed)</option>
                <option value="CAN_1_MS">CAN_1_MS (Infotainment Mid Speed)</option>
                <option value="LIN_BODY">LIN_BODY (Bodyshell Serial Network)</option>
              </select>
            </div>

            {/* Target ID Input */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] text-white/50 uppercase">Target CAN Node ID (HEX)</label>
              <input
                type="text"
                value={injectFrameId}
                onChange={(e) => setInjectFrameId(e.target.value)}
                placeholder="e.g. 0x244"
                className="w-full bg-brand-bg border border-white/10 rounded p-2 text-xs font-mono text-white tracking-widest uppercase focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
              />
            </div>

            {/* Hexadecimal payload input */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] text-white/50 uppercase">Injection Packet Hexadecimal codes (8 octets)</label>
              <input
                type="text"
                value={injectPayload}
                onChange={(e) => setInjectPayload(e.target.value)}
                placeholder="00 FF AA BB CC DD EE 00"
                className="w-full bg-brand-bg border border-white/10 rounded p-2 text-xs font-mono text-white tracking-widest focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
              />
            </div>

            {/* Attack style selection */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] text-white/50 uppercase">Simulation threat Category</label>
              <select
                value={injectVector}
                onChange={(e) => setInjectVector(e.target.value)}
                className="w-full bg-brand-bg border border-white/10 rounded p-2 text-xs text-white/80 focus:outline-none focus:border-brand-red"
              >
                <option value="Spoofing DDoS flood">High Repetition Rate DDoS Flood</option>
                <option value="Replay Injection Scan">Single Sequence Payload Spoofing</option>
                <option value="Fuzzing Injection Probe">Silent Random Offset Fuzzing</option>
              </select>
            </div>

            {/* Execute Inject and trigger spikes */}
            <button
              onClick={handleInject}
              className="w-full py-3 bg-brand-red hover:bg-[#aa112e] text-white font-mono text-xs font-bold rounded shadow-[0_0_15px_rgba(255,77,109,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Send size={13} /> EXECUTE MALICIOUS CODE INJECTION
            </button>

          </div>

          {/* Miniature console log for injection */}
          <div className="flex-1 min-h-[140px] bg-brand-bg/95 border border-white/5 rounded p-3 font-mono text-[10px] flex flex-col gap-1 overflow-y-auto">
            <span className="text-[#999] tracking-wider text-[9px] uppercase border-b border-white/5 pb-1 mb-1 block">SANDBOX GATE TERMINAL FEED</span>
            {injectionLogs.map((log, index) => (
              <span
                key={index}
                className={
                  log.includes("COMPROMISE")
                    ? "text-[#FF4D6D] font-bold"
                    : log.includes("INJECTED")
                    ? "text-[#00E5FF]"
                    : "text-white/40"
                }
              >
                {log}
              </span>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
};
