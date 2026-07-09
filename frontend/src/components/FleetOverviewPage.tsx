import React, { useState, useEffect, useRef } from "react";
import { Vehicle, CANFrame } from "../types";
import { INITIAL_CAN_LOGS } from "../mockData";
import { Shield, AlertTriangle, Cpu, Terminal, Eye, Play, Pause, RefreshCw, Send, Sparkles, Radio } from "lucide-react";

interface FleetOverviewPageProps {
  vehicles: Vehicle[];
  onUpdateVehicleStatus: (vin: string, status: any) => void;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

// Inline SVG vehicle outline silhouettes for the high-end dashboard feel
export const VehicleSilhouette: React.FC<{ type: string; active?: boolean }> = ({ type, active }) => {
  const colorClass = active ? "stroke-cyan-400 fill-cyan-400/10" : "stroke-white/30 fill-transparent";
  
  if (type === "sedan") {
    return (
      <svg className="w-20 h-10 transition-colors duration-300" viewBox="0 0 110 40" fill="none">
        <path
          d="M10 28h12m68 0h12M15 28C10 28 5 24 5 18s8-6 15-7l22-7h25l24 7c7 1 14 1 14 7s-5 10-10 10M25 28c0-4 4-7 8-7s8 3 8 7"
          className={colorClass}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="33" cy="28" r="5" className={active ? "stroke-cyan-400 fill-cyan-950" : "stroke-white/30"} strokeWidth="1.5" />
        <circle cx="81" cy="28" r="5" className={active ? "stroke-cyan-400 fill-cyan-950" : "stroke-white/30"} strokeWidth="1.5" />
      </svg>
    );
  }
  
  if (type === "suv") {
    return (
      <svg className="w-20 h-10 transition-colors duration-300" viewBox="0 0 110 40" fill="none">
        <path
          d="M10 28h14m56 0h15M12 28C8 28 4 25 4 20c0-6 3-8 10-9l15-5h38l18 6c8 2 13 4 13 8s-3 8-8 8M22 28c0-4 4-7 8-7s8 3 8 7M70 28c0-4 4-7 8-7s8 3 8 7"
          className={colorClass}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="30" cy="28" r="5" className={active ? "stroke-cyan-400 fill-cyan-950" : "stroke-white/30"} strokeWidth="1.5" />
        <circle cx="78" cy="28" r="5" className={active ? "stroke-cyan-400 fill-cyan-950" : "stroke-white/30"} strokeWidth="1.5" />
      </svg>
    );
  }
  
  if (type === "truck") {
    return (
      <svg className="w-20 h-10 transition-colors duration-300" viewBox="0 0 110 40" fill="none">
        <path
          d="M8 28h17m53 0h22M5 28C5 28 5 18 5 16l32-11h48l20 11v12l-10 0M21 28c0-4 4-7 8-7s8 3 8 7M69 28c0-4 4-7 8-7s8 3 8 7"
          className={colorClass}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="29" cy="28" r="5" className={active ? "stroke-cyan-400 fill-cyan-950" : "stroke-white/30"} strokeWidth="1.5" />
        <circle cx="77" cy="28" r="5" className={active ? "stroke-cyan-400 fill-cyan-950" : "stroke-white/30"} strokeWidth="1.5" />
      </svg>
    );
  }

  // default to sport car
  return (
    <svg className="w-20 h-10 transition-colors duration-300" viewBox="0 0 110 40" fill="none">
      <path
        d="M5 28h12m68 0h18M12 28C6 28 3 24 3 19s8-8 15-8l30-6h15l32 8c8 1 10 2 10 5s-2 10-6 10M17 28c0-4 4-7 8-7s8 3 8 7M77 28c0-4 4-7 8-7s8 3 8 7"
        className={colorClass}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="25" cy="28" r="5" className={active ? "stroke-cyan-400 fill-cyan-950" : "stroke-white/30"} strokeWidth="1.5" />
      <circle cx="85" cy="28" r="5" className={active ? "stroke-cyan-400 fill-cyan-950" : "stroke-white/30"} strokeWidth="1.5" />
    </svg>
  );
};

export const FleetOverviewPage: React.FC<FleetOverviewPageProps> = ({
  vehicles,
  onUpdateVehicleStatus,
  isLoading,
  error,
  onRefresh
}) => {
  const [selectedVin, setSelectedVin] = useState<string>("");
  
  // Guard select reference to prevent dereferencing failures before fetch streams complete
  const effectiveVin = selectedVin || vehicles[1]?.vin || vehicles[0]?.vin || "";
  const selectedVehicle = vehicles.find((v) => v.vin === effectiveVin) || vehicles[0] || {
    vin: "N/A",
    model: "Loading Engine...",
    status: "Secure",
    busLoad: 0,
    alertsCount: 0,
    silhType: "sedan",
    ipAddress: "0.0.0.0",
    firmwareVersion: "v1.0.0",
    hardwareRev: "H-1.0"
  };
  
  const [playingLogs, setPlayingLogs] = useState(true);
  const [canLogs, setCanLogs] = useState<CANFrame[]>(INITIAL_CAN_LOGS);
  
  // AI Diagnostics terminal states
  const [analysisNotes, setAnalysisNotes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<any | null>(null);
  
  const logEndRef = useRef<HTMLDivElement>(null);
  const logCountRef = useRef(canLogs.length);

  // Dynamic CAN logs streamer to simulate a live packet analyzer!
  useEffect(() => {
    if (!playingLogs) return;

    const interval = setInterval(() => {
      const isCritical = selectedVehicle.status === "Under Attack";
      const isAlert = selectedVehicle.status === "Alert";
      
      const randHexPart = () => Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, "0");
      const IDs = ["0x1A0", "0x3B6", "0x24C", "0x0B0", "0x04F", "0x099", "0x244"];
      const FrameID = isCritical && Math.random() > 0.4 ? "0x244" : IDs[Math.floor(Math.random() * IDs.length)];
      
      const payloadArr = Array.from({ length: 8 }, () => randHexPart());
      // spoof inject a dangerous diagnostic sequence if under attack
      if (FrameID === "0x244" && isCritical) {
        payloadArr[0] = "FF";
        payloadArr[1] = "FF";
        payloadArr[2] = "FF";
        payloadArr[3] = "FF";
      }

      const isSuspicious = FrameID === "0x244" || (FrameID === "0x099" && Math.random() > 0.7);
      const interpretations: Record<string, string> = {
        "0x1A0": "Motor Throttle Speed Velocity Control",
        "0x3B6": "Cabin Electronic Active Stability Steering Offset",
        "0x24C": "Automatic Front Corner Braking Force Distribution",
        "0x0B0": "Auxiliary Safety Airbag Continuous Keep-Alive Telemetry",
        "0x04F": "Smart Interior Thermal Climate controller",
        "0x099": "Telematics Cellular Module OTA Synchronizer Packet",
        "0x244": "OBD-II High Frequency Service Request flooding"
      };

      const newFrame: CANFrame = {
        id: `f-${Date.now()}-${Math.random()}`,
        timestamp: (parseFloat(canLogs[canLogs.length - 1]?.timestamp || "0") + 0.015).toFixed(4),
        busId: FrameID === "0x04F" ? "LIN_BODY" : FrameID === "0x0B0" ? "CAN_1_MS" : "CAN_0_HS",
        frameId: FrameID,
        dlc: 8,
        payload: payloadArr.join(" "),
        interpretation: interpretations[FrameID] || "Generic Frame Node Controller",
        suspicious: isSuspicious,
        alertReason: isSuspicious ? "Diagnostic node anomaly sequence trigger limit exceeded" : undefined
      };

      setCanLogs((prev) => {
        const keeps = prev.slice(-35); // Keep the last 35 logs for UI memory constraints
        return [...keeps, newFrame];
      });
    }, 450);

    return () => clearInterval(interval);
  }, [playingLogs, selectedVehicle.status, canLogs.length]);

  // Handle auto-scroll to the bottom of logs
  useEffect(() => {
    if (logEndRef.current && playingLogs) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [canLogs, playingLogs]);

  // Call server-side Gemini threat analysis route
  const handleAIAnalysis = async () => {
    setAnalyzing(true);
    setAiReport(null);

    // Filter down to the last 12 frames to analyze as a cluster
    const recentLogs = canLogs.slice(-12).map(f => ({
      frameId: f.frameId,
      payload: f.payload,
      interpretation: f.interpretation,
      suspicious: f.suspicious
    }));

    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vin: selectedVehicle.vin,
          vehicleModel: selectedVehicle.model,
          logs: recentLogs,
          context: analysisNotes
        }),
      });

      const data = await response.json();
      setAiReport(data);
    } catch (error) {
      console.error("Analysis connection failed:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Secure":
        return "text-brand-green";
      case "Active Scan":
        return "text-cyan-400";
      case "Alert":
        return "text-yellow-400";
      case "Under Attack":
        return "text-brand-red";
      default:
        return "text-white/30";
    }
  };

  const getStatusGlowColor = (status: string) => {
    switch (status) {
      case "Secure":
        return "glow-green bg-brand-green";
      case "Active Scan":
        return "glow-cyan bg-cyan-400";
      case "Alert":
        return "glow-red bg-yellow-400";
      case "Under Attack":
        return "glow-red bg-brand-red";
      default:
        return "bg-white/20";
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-full overflow-y-auto pr-2 pb-6" id="fleet-overview-container">
      {/* 1. VEHICLE SELECTION LIST (4 Cols) */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
        <h3 className="font-display font-semibold text-lg text-white/90 uppercase tracking-widest flex items-center gap-2">
          <Eye size={18} className="text-cyan-400" /> ACTIVE FLEET COMMAND
        </h3>
        
        <div className="flex flex-col gap-3 max-h-[500px] lg:max-h-full overflow-y-auto scrollbar-thin">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-full p-4 rounded-lg glass-panel animate-pulse flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-24 bg-white/10 rounded" />
                  <div className="h-3 w-12 bg-white/10 rounded" />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex flex-col gap-1.5">
                    <div className="h-4 w-32 bg-white/15 rounded" />
                    <div className="h-3 w-40 bg-white/10 rounded" />
                  </div>
                  <div className="h-8 w-16 bg-white/5 rounded" />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1 pt-2 border-t border-white/5">
                  <div className="h-3 w-20 bg-white/5 rounded" />
                  <div className="h-3 w-20 bg-white/5 rounded" />
                </div>
              </div>
            ))
          ) : error ? (
            <div className="p-6 rounded-lg bg-brand-red/10 border border-brand-red/30 text-center flex flex-col items-center gap-3">
              <span className="p-2 rounded bg-brand-red/20 text-brand-red">⚠️</span>
              <p className="font-mono text-xs uppercase text-brand-red font-bold">COULD NOT SYNC WITH FLASK API</p>
              <p className="text-[11px] text-white/50 leading-relaxed">{error}</p>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="px-4 py-2 rounded bg-brand-red/25 text-brand-red text-xs font-mono font-bold tracking-widest hover:bg-brand-red/35 transition-colors uppercase cursor-pointer"
                >
                  RECONNECT AGENT
                </button>
              )}
            </div>
          ) : (
            vehicles.map((v) => {
              const isSelected = v.vin === effectiveVin;
              return (
                <button
                  key={v.vin}
                  id={`vehicle-btn-${v.vin.substring(0, 5)}`}
                  onClick={() => {
                    setSelectedVin(v.vin);
                    setAiReport(null);
                  }}
                  className={`w-full text-left p-4 rounded-lg transition-all duration-300 flex items-center justify-between ${
                    isSelected
                      ? "glass-panel-accent-cyan border-cyan-400/50 shadow-[0_0_20px_rgba(0,229,255,0.1)]"
                      : "glass-panel hover:bg-white/[0.08]"
                  }`}
                >
                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono text-xs text-white/40 tracking-wider">
                        {v.ipAddress} [HWR: {v.hardwareRev}]
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getStatusGlowColor(v.status)}`} />
                        <span className={`font-mono text-[10px] font-semibold uppercase ${getStatusColor(v.status)}`}>
                          {v.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex flex-col">
                        <h4 className="font-display font-bold text-sm text-white/90 truncate max-w-[180px]">
                          {v.model}
                        </h4>
                        <p className="font-mono text-[11px] text-cyan-400/70 tracking-tight select-all">
                          VIN: {v.vin}
                        </p>
                      </div>
                      <div className="flex flex-col justify-end items-end shrink-0 pl-2">
                        <VehicleSilhouette type={v.silhType} active={isSelected} />
                      </div>
                    </div>

                    {/* Tiny telemetry grid */}
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5 font-mono text-[10px] text-white/50">
                      <div>
                        BUS LOAD: <span className="text-white font-medium">{v.busLoad}%</span>
                      </div>
                      <div className="text-right">
                        ACTIVE INCIDENTS: <span className={`font-medium ${v.alertsCount > 0 ? "text-brand-red" : "text-brand-green"}`}>{v.alertsCount}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
        
        {/* Rapid Actions console card */}
        <div className="glass-panel p-4 rounded-lg flex flex-col gap-3">
          <h4 className="font-display font-medium text-xs text-white/70 uppercase tracking-wider flex items-center gap-1">
            <Radio size={14} className="text-cyan-400" /> Manual Override Inject
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpdateVehicleStatus(selectedVin, "Secure")}
              className="px-3 py-1.5 rounded bg-brand-green/20 hover:bg-brand-green/30 border border-brand-green/35 text-brand-green font-mono text-[11px] transition-all"
            >
              SECURE LINK
            </button>
            <button
              onClick={() => onUpdateVehicleStatus(selectedVin, "Under Attack")}
              className="px-3 py-1.5 rounded bg-brand-red/20 hover:bg-brand-red/30 border border-brand-red/35 text-brand-red font-mono text-[11px] transition-all"
            >
              TRIGGER INJECT
            </button>
          </div>
        </div>
      </div>

      {/* 2. REAL-TIME CAN-BUS PACKET ANALYZER (8 Cols top section) */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
        
        {/* Selected Vehicle Header telemetry */}
        <div className="glass-panel p-5 rounded-lg hud-grid-bg border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full ${getStatusGlowColor(selectedVehicle.status)}`} />
              <h2 className="font-display font-extrabold text-xl text-white tracking-tight">
                {selectedVehicle.model}
              </h2>
            </div>
            <p className="font-mono text-xs text-white/60">
              PHYSICAL GATEWAY INTERFACE: <span className="text-cyan-400 select-all">{selectedVehicle.vin}</span> | SW VERSION: <span className="text-brand-violet">{selectedVehicle.firmwareVersion}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="text-right">
              <div className="font-mono text-[10px] text-white/40 uppercase">Gate rate limit</div>
              <div className="font-display font-bold text-lg text-emerald-400">ACTIVE</div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-right">
              <div className="font-mono text-[10px] text-white/40 uppercase">ANOMALY WEIGHT</div>
              <div className={`font-display font-bold text-lg ${selectedVehicle.alertsCount > 0 ? "text-brand-red" : "text-brand-green"}`}>
                {selectedVehicle.alertsCount > 0 ? "CRITICAL (9.48)" : "NOMINAL"}
              </div>
            </div>
          </div>
        </div>

        {/* Live scrolling logger */}
        <div className="glass-panel rounded-lg flex flex-col overflow-hidden h-[330px]">
          <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan glow-cyan animate-pulse" />
              <span className="font-mono text-xs font-semibold text-white/80">CAN-BUS TELEMETRY PACKET CODES STREAM</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlayingLogs(!playingLogs)}
                className="p-1 rounded hover:bg-white/10 text-white/70 transition-colors"
                title={playingLogs ? "Pause log capture" : "Resume log capture"}
              >
                {playingLogs ? <Pause size={14} /> : <Play size={14} className="text-emerald-400" />}
              </button>
              <button
                onClick={() => setCanLogs([])}
                className="p-1 rounded hover:bg-white/10 text-white/70 transition-colors text-xs font-mono px-2"
                title="Clear Logs"
              >
                CLR
              </button>
            </div>
          </div>

          <div className="p-3 font-mono text-xs flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-1 select-text bg-brand-bg/90">
            <div className="grid grid-cols-12 gap-2 text-cyan-400/60 font-semibold border-b border-white/5 pb-1 mb-1 font-mono text-[11px] uppercase">
              <span className="col-span-2">TIMESTAMP</span>
              <span className="col-span-2">BUS MODULE</span>
              <span className="col-span-2">FRAME ID</span>
              <span className="col-span-1 text-center">DLC</span>
              <span className="col-span-5">PAYLOAD HEXADECIMAL CODES</span>
            </div>
            
            {canLogs.map((log) => (
              <div
                key={log.id}
                className={`grid grid-cols-12 gap-2 py-0.5 px-1.5 rounded transition-colors ${
                  log.suspicious
                    ? "bg-brand-red/10 text-brand-red hover:bg-brand-red/20 border-l-2 border-brand-red pl-1"
                    : "text-white/60 hover:bg-white/5"
                }`}
              >
                <span className="col-span-2 select-all text-white/40 text-[11px]">
                  {log.timestamp}s
                </span>
                <span className={`col-span-2 font-semibold text-[11px] ${log.busId === 'LIN_BODY' ? 'text-amber-500' : 'text-cyan-400'}`}>
                  {log.busId}
                </span>
                <span className="col-span-2 font-bold select-all text-white/85 text-[11px]">
                  {log.frameId}
                </span>
                <span className="col-span-1 text-center font-mono text-white/40 text-[11px]">
                  {log.dlc}
                </span>
                <span className="col-span-5 select-all font-mono font-medium tracking-wide text-white/90 flex flex-wrap gap-x-1 items-center justify-between text-[11px]">
                  <span>{log.payload}</span>
                  {log.suspicious && (
                    <span className="bg-brand-red/10 text-brand-red text-[8px] px-1 font-sans rounded uppercase font-bold animate-pulse tracking-widest leading-none py-0.5 border border-brand-red/25">
                      ALERT INJECTED
                    </span>
                  )}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* 3. COGNITIVE AI DIAGNOSTICS BLOCK (GEMINI DRIVEN) */}
        <div className="glass-panel p-5 rounded-lg border-brand-violet/30 bg-gradient-to-br from-brand-violet/[0.03] to-transparent relative overflow-hidden">
          {/* Subtle cosmic glow overlay */}
          <div className="absolute right-0 top-0 -mr-16 -mt-16 w-32 h-32 bg-brand-violet/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-brand-violet glow-violet shrink-0" size={20} />
              <div>
                <h4 className="font-display font-bold text-sm text-white/90 uppercase tracking-wider">
                  Intelligent Neural Threat Diagnostics
                </h4>
                <p className="text-xs text-white/50">
                  Real-time cognitive parsing of vehicle gateway hexadecimal payloads powered by Gemini
                </p>
              </div>
            </div>
            
            <button
              onClick={handleAIAnalysis}
              disabled={analyzing}
              id="ai-diagnosis-btn"
              className="flex items-center gap-2 px-4 py-2 rounded bg-brand-violet hover:bg-brand-violet-dim text-white font-mono text-xs font-semibold glow-violet transition-all shrink-0 cursor-pointer disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="animate-spin text-white" size={14} /> ANALYZING NODE SECTORS...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> DEPLOY COGNITIVE DIAGNOSIS
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Context/Notes compiler */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] text-white/50 uppercase">Diagnostic Operator Command / Incident Notes</label>
              <textarea
                value={analysisNotes}
                onChange={(e) => setAnalysisNotes(e.target.value)}
                placeholder="e.g. Undergoing sudden OBD rate flooding simulation. Trace vehicle steering lock sensors. Restrict CAN_0_HS traffic flow."
                className="w-full bg-brand-bg/50 border border-white/10 rounded p-3 text-xs text-white/80 placeholder-white/20 font-sans focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 h-[100px] resize-none"
              />
              <span className="font-mono text-[10px] text-brand-violet/80 tracking-tight">
                *Sends the past 12 live packet frames directly to our secure AI analyzer endpoint.
              </span>
            </div>

            {/* AI Report Card Output */}
            <div className="bg-brand-bg/80 border border-white/5 rounded p-4 flex flex-col justify-center min-h-[140px]">
              {analyzing ? (
                <div className="flex flex-col items-center justify-center gap-3 text-white/50">
                  <RefreshCw className="animate-spin text-brand-violet" size={28} />
                  <span className="font-mono text-xs tracking-wider animate-pulse uppercase">Parsing packet headers against vector rules...</span>
                </div>
              ) : aiReport ? (
                <div className="flex flex-col gap-3 font-sans">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-extrabold text-sm text-cyan-400 uppercase tracking-wide">
                      {aiReport.classification || "Anomalous Vector Detected"}
                    </span>
                    <span className={`font-mono text-[10px] px-2 py-0.5 rounded uppercase font-bold border ${
                      aiReport.severity === "CRITICAL" || aiReport.severity === "HIGH"
                        ? "bg-brand-red/10 border-brand-red/30 text-brand-red"
                        : "bg-yellow-500/10 border-yellow-500/30 text-yellow-500"
                    }`}>
                      {aiReport.severity || "HIGH"} Danger
                    </span>
                  </div>
                  
                  <p className="text-xs text-white/80 leading-relaxed font-sans">
                    {aiReport.explanation}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5 font-mono text-[11px] text-white/50">
                    <div>
                      Gateway Mitigation Rule payload:<br />
                      <span className="text-orange-400 select-all font-mono tracking-tight font-bold">{aiReport.mitigationHex || "0x000: NULL"}</span>
                    </div>
                    <div>
                      Action Recommendation:<br />
                      <span className="text-emerald-400 text-[10px] font-sans block leading-tight">{aiReport.recommendation}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-white/30 text-center py-6">
                  <Terminal size={24} className="text-brand-violet/40" />
                  <p className="font-mono text-xs uppercase tracking-wider">Diagnostic report empty</p>
                  <p className="text-[11px] text-white/40 max-w-xs">
                    Execute the Cog Diagnosis engine above to analyze active payload trace strings and trigger dynamic whitelists.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
