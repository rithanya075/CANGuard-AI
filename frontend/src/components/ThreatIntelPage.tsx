import React, { useState } from "react";
import { AlertRow } from "../types";
import { AlertCircle, ShieldAlert, Sparkles, MapPin, Radio, BookOpen, Clock, Activity, FileText, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ThreatIntelPageProps {
  alerts: AlertRow[];
  total: number;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export const ThreatIntelPage: React.FC<ThreatIntelPageProps> = ({
  alerts,
  total,
  isLoading,
  error,
  onRefresh
}) => {
  const [selectedAlertId, setSelectedAlertId] = useState<string>("");
  const effectiveAlertId = selectedAlertId || alerts[0]?.id || "";
  const selectedAlert = alerts.find((t) => t.id === effectiveAlertId) || alerts[0] || {
    id: "N/A",
    attack_type: "UNKNOWN",
    can_id: "UNKNOWN",
    confidence: "LOW",
    details: "No alert details are available.",
    timestamp: "N/A",
    vector: "No vector provided",
    status: "Monitoring",
  };
  
  // Custom AI advisory desk
  const [selectedTopic, setSelectedTopic] = useState("Replay Attack Safeguards (CAN ID 0x3B6)");
  const [generatingAdvisory, setGeneratingAdvisory] = useState(false);
  const [advisoryContent, setAdvisoryContent] = useState<string>(`
### ACTIVE REGULATORY BRIEFING: CAN-BUS SPOOFING DECORATOR
**Compliance Framework:** UNECE R155 Section 5.1.2 / ISO/SAE 21434 Sec 15.

#### Risk Vector: High repetition steering rate spoofing
Unsecured chassis-bus controllers default to blind frame acceptance without cryptographic verification hashes, allowing an adversary to inject spoofed suspension torque frames (such as ID 0x3B6) directly to compromise cruise alignment.

#### Core Defensive Protocols:
1. **Dynamic Frequency Gating:** Execute packet threshold rate-limiting directly at the central gateway router. Drop frame bursts in excess of 120Hz on CAN CAN_0_HS.
2. **Cryptographic Signatures (SecOC):** Implement active AUTOSAR Secure Onboard Communication. Append 28-bit MAC validation bytes to all steer profiles.
  `);

  const handleFetchAdvisory = async (topic: string) => {
    setSelectedTopic(topic);
    setGeneratingAdvisory(true);
    setAdvisoryContent("");

    try {
      const response = await fetch("/api/gemini/advisory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await response.json();
      setAdvisoryContent(data.advisory || data.fallback);
    } catch (error) {
      console.error("Advisory retrieval failed:", error);
      setAdvisoryContent("### Fallback Cyber Security Advisory:\nAnomalous OTA payload ingestion and unauthenticated firmware flashes present direct risks to cybersecurity compliance under UNECE R155. Operators should strictly enforce active cryptographic signature verification algorithms on all electronic control units (ECUs).");
    } finally {
      setGeneratingAdvisory(false);
    }
  };

  const getCriticalityColor = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "text-purple-400 border-purple-400 bg-purple-950/20";
      case "HIGH":
        return "text-brand-red border-brand-red bg-brand-red/10";
      case "MEDIUM":
        return "text-yellow-400 border-yellow-400 bg-yellow-400/10";
      case "LOW":
        return "text-cyan-400 border-cyan-400 bg-cyan-400/10";
      default:
        return "text-white border-white";
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-full overflow-y-auto pr-2 pb-6" id="threat-intel-container">
      
      {/* LEFT PANEL: MAP & VULNERABILITIES (7 Cols) */}
      <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
        
        {/* Holographic vector map of threats */}
        <div className="glass-panel p-5 rounded-lg relative overflow-hidden h-[300px] flex flex-col bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="absolute inset-0 hud-grid-bg opacity-40 pointer-events-none" />
          
          <div className="flex items-center justify-between gap-4 mb-4 z-10">
            <h3 className="font-display font-semibold text-xs text-white/70 uppercase tracking-widest flex items-center gap-2">
              <Radio size={14} className="text-cyan-400 animate-pulse" /> SATELLITE VEHICLE VULNERABILITY MATRIX
            </h3>
            <span className="font-mono text-[10px] text-brand-green bg-brand-green/10 px-2 py-0.5 rounded leading-none border border-brand-green/20">
              SECURE GLOBAL HANDSHAKE
            </span>
          </div>

          {/* Styled schematic SVG vector map overlay */}
          <div className="flex-1 flex items-center justify-center relative bg-brand-bg/60 rounded border border-white/5 overflow-hidden">
            <svg viewBox="0 0 800 400" className="w-full h-full opacity-30 absolute pointer-events-none stroke-cyan-500/10" fill="none">
              <path d="M 100 100 Q 200 40 400 120 T 700 80" strokeWidth="1" />
              <path d="M 50 300 Q 250 320 450 180 T 750 300" strokeWidth="1" />
              <path d="M 200 50 L 200 350 M 600 50 L 600 350" strokeWidth="0.5" strokeDasharray="4 8" />
              <circle cx="400" cy="200" r="150" strokeWidth="0.5" strokeDasharray="2 4" />
              <circle cx="400" cy="200" r="80" strokeWidth="0.5" strokeDasharray="2 4" />
            </svg>

            {/* Glowing Map Coordinate Targets */}
            {!isLoading && alerts[0] && (
              <div className="absolute top-[35%] left-[25%] group cursor-pointer" onClick={() => setSelectedAlertId(alerts[0]?.id)}>
                <span className="absolute inline-flex h-6 w-6 rounded-full bg-brand-red/30 animate-ping" />
                <span className="relative flex rounded-full h-3 w-3 bg-brand-red glow-red" />
                <div className="absolute left-4 -top-3 bg-brand-bg/90 border border-brand-red/40 px-2 py-1 rounded font-mono text-[9px] text-white tracking-widest select-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                  CRITICAL TARGET: {alerts[0]?.affectedECU || "ECU_01"}
                </div>
              </div>
            )}

            {!isLoading && alerts[2] && (
              <div className="absolute top-[65%] left-[68%] group cursor-pointer" onClick={() => setSelectedAlertId(alerts[2]?.id)}>
                <span className="absolute inline-flex h-6 w-6 rounded-full bg-brand-red/30 animate-ping duration-1000" />
                <span className="relative flex rounded-full h-3 w-3 bg-orange-500 glow-red" />
                <div className="absolute left-4 -top-3 bg-brand-bg/90 border border-orange-500/40 px-2 py-1 rounded font-mono text-[9px] text-white tracking-widest select-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                  HIGH THREAT: {alerts[2]?.affectedECU || "ECU_09"}
                </div>
              </div>
            )}

            <div className="absolute top-[20%] left-[55%] group cursor-pointer">
              <span className="relative flex rounded-full h-3 w-3 bg-brand-green glow-green" />
              <div className="absolute left-4 -top-3 bg-brand-bg/90 border border-brand-green/40 px-2 py-1 rounded font-mono text-[9px] text-white tracking-widest select-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                RESOLVED: ECU_04_BODY
              </div>
            </div>

            {!isLoading && alerts[3] && (
              <div className="absolute top-[80%] left-[30%] group cursor-pointer" onClick={() => setSelectedAlertId(alerts[3]?.id)}>
                <span className="relative flex rounded-full h-3 w-3 bg-cyan-400 glow-cyan" />
                <div className="absolute left-4 -top-3 bg-brand-bg/90 border border-cyan-400/40 px-2 py-1 rounded font-mono text-[9px] text-white tracking-widest select-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  MONITORING: {alerts[3]?.affectedECU || "ECU_02"}
                </div>
              </div>
            )}

            {/* Map metadata readout in corner */}
            <div className="absolute bottom-3 left-3 font-mono text-[9px] text-white/40 uppercase tracking-widest flex flex-col gap-0.5">
              <span>LON: -122.4194 / LAT: 37.7749</span>
              <span>GRID ALIGN: N7-SOC-SYS-A</span>
            </div>
          </div>
        </div>

        {/* Threat registry database table */}
        <div className="glass-panel p-5 rounded-lg flex flex-col gap-4">
          <h3 className="font-display font-semibold text-xs text-white/70 uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert size={14} className="text-brand-violet" /> VEHICULAR ATTACK THREAT INTELLIGENCE REGISTER
          </h3>

          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-full p-4 rounded bg-black/15 border border-white/5 animate-pulse flex flex-col gap-2">
                  <div className="h-3.5 w-16 bg-white/5 rounded" />
                  <div className="h-4.5 w-48 bg-white/10 rounded" />
                  <div className="h-3 w-36 bg-white/5 rounded" />
                </div>
              ))
            ) : error ? (
              <div className="p-6 rounded bg-brand-red/10 border border-brand-red/20 text-center flex flex-col items-center gap-2">
                <AlertCircle className="text-brand-red animate-bounce" size={20} />
                <span className="font-mono text-[10px] text-brand-red uppercase font-bold">API COMPLIANCE DISRUPTED</span>
                <p className="text-[11px] text-white/40 leading-relaxed">{error}</p>
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    className="mt-1 px-3 py-1 rounded bg-brand-red/25 border border-brand-red/35 text-brand-red font-mono text-[9px] uppercase font-bold tracking-widest hover:bg-brand-red/35 transition-colors cursor-pointer"
                  >
                    Sync Registry
                  </button>
                )}
              </div>
            ) : (
              alerts.map((threat, index) => {
                const attackType = threat.attack_type || threat.name || "UNKNOWN";
                const canId = threat.can_id || "UNKNOWN";
                const confidence = threat.confidence || "UNKNOWN";
                const details = threat.details || "No details available.";
                const timestamp = threat.timestamp || "N/A";
                const key = threat.id || `${attackType}-${timestamp}-${index}`;
                const isActive = threat.id === effectiveAlertId;
                return (
                  <button
                    key={key}
                    id={`threat-row-${key}`}
                    onClick={() => setSelectedAlertId(threat.id || key)}
                    className={`w-full text-left p-3.5 rounded transition-all flex flex-col gap-3 border ${
                      isActive
                        ? "bg-white/[0.04] border-cyan-400/50 shadow-inner"
                        : "bg-black/15 border-white/5 hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-display font-bold text-sm text-white/95 truncate">{attackType}</p>
                        <p className="font-mono text-[11px] text-white/40 tracking-wider">CAN ID: {canId}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        confidence === "CRITICAL"
                          ? "bg-purple-950/20 text-purple-400 border border-purple-400"
                          : confidence === "HIGH"
                          ? "bg-brand-red/10 text-brand-red border border-brand-red/20"
                          : confidence === "MEDIUM"
                          ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400"
                          : "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"
                      }`}>{confidence}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-white/40 font-mono">
                      <span>Timestamp: {timestamp}</span>
                      <span>Status: {threat.status || "Unknown"}</span>
                    </div>

                    <p className="font-sans text-[11px] text-white/50 leading-relaxed line-clamp-3">
                      {details}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* RIGHT PANEL: AI UNECE R155 ADVISORY (5 Cols) */}
      <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
        
        {/* UNECE Regulatory desk */}
        <div className="glass-panel p-5 rounded-lg border-brand-violet/30 bg-gradient-to-br from-brand-violet/[0.02] to-transparent flex flex-col h-full min-h-[500px]">
          <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-brand-violet glow-violet shrink-0" size={18} />
              <div>
                <h4 className="font-display font-bold text-sm text-white/95 uppercase tracking-wider">
                  AI Compliance Regulator Desk
                </h4>
                <p className="text-[11px] text-white/50">
                  Automotive cyber compliance guides mapping UNECE R155 directives
                </p>
              </div>
            </div>
          </div>

          {/* Quick topic selectors */}
          <div className="flex flex-col gap-2 mb-4">
            <label className="font-mono text-[9px] text-white/40 uppercase tracking-widest block font-bold">
              Compliance Target Vectors
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                "Replay Attack Safeguards (CAN ID 0x3B6)",
                "OBD-II Brute Force Intrusion Policies",
                "Cellular OTA Secure Payload Decryption",
                "ECU Firmware Signature & Rollback Protection"
              ].map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleFetchAdvisory(topic)}
                  disabled={generatingAdvisory}
                  className={`w-full text-left py-2 px-3 rounded font-mono text-[11px] transition-colors flex items-center justify-between border ${
                    selectedTopic === topic
                      ? "bg-brand-violet/20 text-brand-violet border-brand-violet text-white font-bold"
                      : "bg-white/[0.02] text-white/70 border-transparent hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="truncate">{topic}</span>
                  <BookOpen size={12} className={selectedTopic === topic ? "text-brand-violet" : "text-white/30"} />
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Advisory Document Viewer */}
          <div className="flex-1 bg-brand-bg/85 border border-white/10 rounded overflow-hidden flex flex-col">
            <div className="bg-white/5 px-3 py-1.5 border-b border-white/10 flex items-center justify-between font-mono text-[10px] text-white/40">
              <span className="flex items-center gap-1">
                <FileText size={10} /> ADVISORY: {selectedTopic.substring(0, 24)}...
              </span>
              <span className="text-brand-violet animate-pulse font-bold tracking-widest">
                {generatingAdvisory ? "SYNAPSES ACTIVE" : "SECURE DIRECTIVE"}
              </span>
            </div>

            <div className="p-4 overflow-y-auto text-xs text-white/80 leading-relaxed font-sans max-h-[350px] scrollbar-thin">
              {generatingAdvisory ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-white/40 font-mono text-[11px]">
                  <Activity className="animate-pulse text-brand-violet animate-spin duration-3000" size={32} />
                  <span className="animate-pulse tracking-widest uppercase">Consulting ISO/SAE 21434 registers...</span>
                </div>
              ) : (
                <div className="markdown-body text-xs flex flex-col gap-3 font-sans">
                  <ReactMarkdown>{advisoryContent}</ReactMarkdown>
                </div>
              )}
            </div>
            
            <div className="bg-white/5 p-3 border-t border-white/5 font-mono text-[9px] text-white/30 flex items-center justify-between select-none">
              <span>UNECE REGISTERED: CLASSIFIED R-155-LEVEL_SOC</span>
              <span className="flex items-center gap-1 text-brand-green opacity-90">
                <CheckCircle2 size={10} /> COMPLIANCE CLEAR
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
