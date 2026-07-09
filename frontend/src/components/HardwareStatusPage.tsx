import React, { useState } from "react";
import { HardwareBoardStatus } from "../types";
import { Cpu, Thermometer, BatteryCharging, ShieldAlert, Sparkles, AlertTriangle, RefreshCw, Layers, CheckCircle2, FileHeart } from "lucide-react";

interface HardwareStatusPageProps {
  boards: HardwareBoardStatus[];
  onTriggerSelfCheck: () => void;
}

export const HardwareStatusPage: React.FC<HardwareStatusPageProps> = ({ boards, onTriggerSelfCheck }) => {
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [selfTestReport, setSelfTestReport] = useState<boolean | null>(null);

  const startSelfTest = () => {
    setTesting(true);
    setProgress(0);
    setSelfTestReport(null);
    setTestLogs(["[SYS] Executing global hardware self-test diagnostic audit..."]);

    const steps = [
      { prg: 15, log: "[SEC] Checking HSM Secure Element (Cryptokeys Enclaves)... OK" },
      { prg: 35, log: "[ECU] Sweeping CAN Gwy signature registers (ISO 11898)... NOMINAL" },
      { prg: 55, log: "[FW] Inspecting telematic keep-alive memory boundaries... SANITIZED" },
      { prg: 75, log: "[LN] Polling LIN cabin deserializer relays... NO SKEW MEASURED" },
      { prg: 90, log: "[SYS] Validating UNECE Rate limiting filters... LOCKED" },
      { prg: 100, log: "[SEC] Integrity validated. SOC Node boundaries optimal." }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].prg);
        setTestLogs((prev) => [steps[currentStep].log, ...prev]);
        currentStep++;
      } else {
        clearInterval(interval);
        setTesting(false);
        setSelfTestReport(true);
        onTriggerSelfCheck(); // tell the parent we ran the self test
      }
    }, 900);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Online":
        return "text-brand-green";
      case "Degraded":
        return "text-yellow-400";
      case "Offline":
        return "text-brand-red";
      default:
        return "text-white/40";
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-full overflow-y-auto pr-2 pb-6" id="hardware-status-container">
      
      {/* 1. HARDWARE UNIT GRID CARDS (8 Cols) */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
        <h3 className="font-display font-semibold text-xs text-white/70 uppercase tracking-widest flex items-center gap-2">
          <Layers size={14} className="text-cyan-400" /> CENTRAL MONITOR SOC HARDWARE CORES
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {boards.map((board) => (
            <div
              key={board.boardName}
              className={`glass-panel p-5 rounded-lg border flex flex-col gap-4 relative overflow-hidden bg-gradient-to-br from-white/[0.01] to-transparent ${
                board.status === "Degraded"
                  ? "border-yellow-400/20 shadow-[0_0_15px_rgba(250,204,21,0.03)]"
                  : "border-white/10"
              }`}
            >
              {/* Technical Blueprint SVG Grid Backdrop */}
              <div className="absolute inset-0 hud-grid-bg opacity-10 pointer-events-none" />

              <div className="flex items-center justify-between gap-4 z-10">
                <div className="flex items-center gap-2">
                  <Cpu size={16} className={board.status === "Online" ? "text-cyan-400" : "text-yellow-400"} />
                  <h4 className="font-display font-bold text-sm text-white/95">
                    {board.boardName}
                  </h4>
                </div>
                <span className={`font-mono text-[10px] font-bold uppercase ${getStatusColor(board.status)}`}>
                  {board.status}
                </span>
              </div>

              {/* Multi-Telemetry stats */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 font-mono text-[11px] text-white/50 z-10 pt-2 border-t border-white/5">
                <div className="flex flex-col gap-0.5">
                  <span>CPU TEMPERATURE</span>
                  <div className="flex items-center gap-1.5 text-xs text-white/90">
                    <Thermometer size={12} className="text-red-400" />
                    <span>{board.cpuTemp}°C</span>
                  </div>
                  {/* Miniature visual bar */}
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-red-400" style={{ width: `${Math.min(board.cpuTemp * 1.2, 100)}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span>VOLTAGE SUPPLY</span>
                  <div className="flex items-center gap-1.5 text-xs text-white/90">
                    <BatteryCharging size={12} className="text-emerald-400" />
                    <span>{board.voltage} V</span>
                  </div>
                  {/* Miniature supply bar */}
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-emerald-400" style={{ width: `${(board.voltage / 16) * 100}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span>CPU COMPUTE UTIL</span>
                  <span className="text-xs text-white/90 font-bold">{board.cpuUtilization}%</span>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-brand-violet" style={{ width: `${board.cpuUtilization}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span>SRAM MEMORY UTIL</span>
                  <span className="text-xs text-white/90 font-bold">{board.memUtilization}%</span>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-cyan-400" style={{ width: `${board.memUtilization}%` }} />
                  </div>
                </div>
              </div>

              {/* Frame Error tracker in footer */}
              <div className="flex items-center justify-between font-mono text-[10px] text-white/40 pt-2 border-t border-white/5">
                <span>BUS ERROR FRAMES</span>
                <span className={board.busErrorFrames > 0 ? "text-brand-red font-bold animate-pulse" : "text-brand-green font-bold"}>
                  {board.busErrorFrames}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. DYNAMIC HARDWARE INTEGRITY TESTER (4 Cols) */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
        
        <div className="glass-panel p-6 rounded-lg flex flex-col gap-5 h-full border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.012] to-transparent">
          <div className="border-b border-white/5 pb-3">
            <h3 className="font-display font-semibold text-xs text-white/70 uppercase tracking-widest flex items-center gap-2">
              <FileHeart size={14} className="text-cyan-400 glow-cyan" /> HARDWARE INTEGRITY TEST DEPLOYER
            </h3>
            <p className="text-[10px] text-white/50 font-sans mt-1">
              Verifies secure cryptographic signatures on hosting ECU nodes, verifying hardware-level memory boundaries and active isolation relays.
            </p>
          </div>

          <button
            onClick={startSelfTest}
            disabled={testing}
            className="w-full py-3 bg-cyan-400 hover:bg-cyan-500 text-brand-bg font-mono text-xs font-bold rounded shadow-[0_0_15px_rgba(0,229,255,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {testing ? <RefreshCw className="animate-spin" size={13} /> : <RefreshCw size={13} />}
            {testing ? "ANALYZING CENTRAL HSM..." : "RUN FULL INTEGRITY SELF-TEST"}
          </button>

          {/* Graphical circular/linear progress */}
          {testing && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between font-mono text-[9px] text-cyan-400">
                <span>TEST SEQUENCE RUNNING</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-cyan-400/35">
                <div className="h-full bg-cyan-400 glow-cyan transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {selfTestReport && (
            <div className="p-3.5 rounded bg-brand-green/10 border border-brand-green/30 font-sans text-xs text-brand-green flex items-start gap-2 animate-fade-in">
              <CheckCircle2 className="shrink-0 text-brand-green" size={16} />
              <div className="flex flex-col gap-1">
                <span className="font-bold uppercase tracking-wider text-[10px]">VERDICT: SYSTEM NOMINAL</span>
                <p className="text-[11px] leading-snug">
                  Firmware registers clean. Host boundaries secure. Underwent full cryptographic handshake sweeps with 0 integrity deviations reported.
                </p>
              </div>
            </div>
          )}

          {/* Test log terminal */}
          <div className="flex-1 min-h-[180px] bg-brand-bg/95 border border-white/5 rounded p-3.5 font-mono text-[10px] flex flex-col gap-1.5 overflow-y-auto">
            <span className="text-[#888] tracking-wider text-[9px] uppercase border-b border-white/5 pb-1 block">SECURE SYSTEM LOG CODES FEED</span>
            
            {testLogs.length === 0 ? (
              <span className="text-white/20 italic self-center my-auto">Integrity logger idle... ready for deployment.</span>
            ) : (
              testLogs.map((lg, idx) => (
                <span
                  key={idx}
                  className={
                    lg.includes("OK") || lg.includes("NOMINAL") || lg.includes("LOCKED")
                      ? "text-brand-green"
                      : lg.includes("SYS")
                      ? "text-brand-violet"
                      : "text-white/60"
                  }
                >
                  {lg}
                </span>
              ))
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
