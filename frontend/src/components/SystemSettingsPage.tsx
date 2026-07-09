import React, { useState } from "react";
import { RuleConfig } from "../types";
import { Shield, Hammer, AlertCircle, Save, Plus, Trash2, Key, Info, CheckCircle2 } from "lucide-react";

interface SystemSettingsPageProps {
  onSaveSettings: (settings: any) => void;
}

export const SystemSettingsPage: React.FC<SystemSettingsPageProps> = ({ onSaveSettings }) => {
  const [sensitivity, setSensitivity] = useState("AI-Augmented");
  const [operatorName, setOperatorName] = useState("Security Operator 07");
  const [stationId, setStationId] = useState("N7-AERO-SOC-1");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initial whitelist filters rules
  const [whitelist, setWhitelist] = useState<RuleConfig[]>([
    { frameId: "0x1A0", mask: "0xFF", action: "ALLOW", description: "Standard Throttle Velocity Telemetry" },
    { frameId: "0x3B6", mask: "0xF0", action: "RATE_LIMIT", description: "Chassis Suspension Steer" },
    { frameId: "0x24C", mask: "0xFF", action: "ALLOW", description: "Mechanical Braking Pressure Vectors" },
    { frameId: "0x0B0", mask: "0xFF", action: "ALLOW", description: "Airbag deployment continuity keepalive" }
  ]);

  // Form states to add new whitelist
  const [newFrameId, setNewFrameId] = useState("");
  const [newMask, setNewMask] = useState("0xFF");
  const [newAction, setNewAction] = useState<"ALLOW" | "BLOCK" | "RATE_LIMIT">("ALLOW");
  const [newDesc, setNewDesc] = useState("");

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFrameId) return;

    const newRule: RuleConfig = {
      frameId: newFrameId.toUpperCase(),
      mask: newMask,
      action: newAction,
      description: newDesc || "Custom Operator Filter rule"
    };

    setWhitelist([...whitelist, newRule]);
    setNewFrameId("");
    setNewDesc("");
  };

  const handleDeleteRule = (frameId: string) => {
    setWhitelist(whitelist.filter(r => r.frameId !== frameId));
  };

  const handleSave = () => {
    setSaveSuccess(true);
    onSaveSettings({ sensitivity, operatorName, stationId, whitelist });
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-full overflow-y-auto pr-2 pb-6" id="system-settings-container">
      
      {/* 1. IDS CONFIGURATION PANEL (6 Cols) */}
      <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
        
        <div className="glass-panel p-6 rounded-lg flex flex-col gap-5 bg-gradient-to-br from-white/[0.01] to-transparent">
          <h3 className="font-display font-semibold text-xs text-white/70 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-3">
            <Shield size={14} className="text-cyan-400" /> ACTIVE DETECTOR TUNER CONSOLE
          </h3>

          <div className="flex flex-col gap-4">
            
            {/* Operator Identifier card */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-white/50 uppercase">Active Controller Name</label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="bg-brand-bg/60 border border-white/10 rounded p-2 text-xs text-white/90 font-sans focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-white/50 uppercase">SOC Station Host ID</label>
                <input
                  type="text"
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  className="bg-brand-bg/60 border border-white/10 rounded p-2 text-xs text-white/90 font-mono tracking-wider focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Sensitivity Levels tuning selection */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] text-white/50 uppercase font-bold">Intrusion Detection sensitivity weighting</label>
              
              <div className="grid grid-cols-4 gap-2">
                {["Low", "Standard", "High", "AI-Augmented"].map((lvl) => {
                  const isSelected = sensitivity === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSensitivity(lvl)}
                      className={`p-2.5 rounded font-mono text-[10px] transition-all border text-center ${
                        isSelected
                          ? lvl === "AI-Augmented"
                            ? "bg-brand-violet/25 border-brand-violet text-white font-bold glow-violet"
                            : "bg-cyan-400/25 border-cyan-400 text-white font-bold glow-cyan"
                          : "bg-black/20 border-white/5 text-white/60 hover:bg-white/[0.03]"
                      }`}
                    >
                      {lvl.toUpperCase()}
                    </button>
                  );
                })}
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/5 rounded text-xs text-white/60 leading-relaxed font-sans">
                {sensitivity === "AI-Augmented" ? (
                  <span className="text-brand-violet font-semibold">
                    *Neural Engine Activated: System will automatically intercept anomalies on both high-speed CAN and body LIN lines, cross-analyzing packet strings dynamically against active vulnerability CVE structures via deep learning pipelines.
                  </span>
                ) : sensitivity === "High" ? (
                  <span>
                    Strict verification threshold: Dropping all frame rate increases greater than 10%. Triggers active vehicle mechanical lock overlays in response to OBD spoof alerts.
                  </span>
                ) : (
                  <span>
                    Nominal thresholds: Suppresses infotainment frames checks to preserve computing enclaves. Fits highway testing and development runs.
                  </span>
                )}
              </div>
            </div>

            {/* API parameters warnings */}
            <div className="p-4 rounded border border-white/5 bg-brand-bg/85 flex items-start gap-2.5">
              <Key className="text-brand-violet shrink-0" size={16} />
              <div className="font-sans text-[11px] text-white/50 flex flex-col gap-0.5">
                <span className="font-bold text-white/85">AUTOMOTIVE CRYPTO SECURE SESSION</span>
                <p>
                  API requests pass through secure server proxy routing to filter credentials. All certificates and firmware hashing validations remain protected inside hardware security modules (HSMs).
                </p>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full mt-2 py-3 bg-brand-violet hover:bg-brand-violet-dim text-white font-mono text-xs font-bold rounded shadow-[0_0_15px_rgba(123,97,255,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Save size={13} /> COMMUTE SYSTEM CONFIGURATIONS
            </button>

            {saveSuccess && (
              <div className="p-3 rounded bg-brand-green/10 border border-brand-green/30 text-xs text-brand-green flex items-center justify-center gap-2 font-semibold">
                <CheckCircle2 size={14} /> SECURITY TUNNING APPLIED SUCCESSFULLY
              </div>
            )}

          </div>
        </div>

      </div>

      {/* 2. VEHICLE WHITELIST MANAGER (6 Cols) */}
      <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
        
        <div className="glass-panel p-6 rounded-lg flex flex-col gap-4 h-full bg-gradient-to-br from-white/[0.01] to-transparent">
          <h3 className="font-display font-semibold text-xs text-white/70 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-3">
            <Hammer size={14} className="text-cyan-400" /> GATEWAY AUTHORIZED CAN FRAMES WHITELIST
          </h3>

          {/* Table display */}
          <div className="flex-1 overflow-y-auto max-h-[300px] pr-1 flex flex-col gap-2">
            {whitelist.map((rule) => (
              <div
                key={rule.frameId}
                className="p-3 rounded bg-black/25 border border-white/5 flex items-center justify-between text-xs transition-colors hover:bg-white/[0.012]"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-white select-all">{rule.frameId}</span>
                    <span className="text-white/40 font-mono">MASK: {rule.mask}</span>
                    <span className={`px-1 rounded text-[8px] font-mono leading-none py-0.5 border ${
                      rule.action === "ALLOW"
                        ? "border-brand-green/30 text-brand-green bg-brand-green/10"
                        : rule.action === "RATE_LIMIT"
                        ? "border-amber-500/30 text-amber-500 bg-amber-500/10"
                        : "border-brand-red/30 text-brand-red bg-brand-red/10"
                    }`}>
                      {rule.action}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50">{rule.description}</p>
                </div>

                <button
                  onClick={() => handleDeleteRule(rule.frameId)}
                  className="p-2 text-white/40 hover:text-brand-red hover:bg-white/5 rounded transition-colors"
                  title="Remove Rule Filter"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Add Whitelist Filter Inline Form */}
          <form onSubmit={handleAddRule} className="border-t border-white/5 pt-4 flex flex-col gap-3">
            <h4 className="font-display font-bold text-xs text-white/80 uppercase tracking-wider">
              INJECT NEW SECURE ID FILTER
            </h4>
            
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Frame e.g. 0x099"
                value={newFrameId}
                onChange={(e) => setNewFrameId(e.target.value)}
                className="bg-brand-bg border border-white/10 rounded p-2 text-xs font-mono text-white tracking-widest uppercase focus:outline-none"
                required
              />
              <input
                type="text"
                placeholder="Mask e.g. 0xFF"
                value={newMask}
                onChange={(e) => setNewMask(e.target.value)}
                className="bg-brand-bg border border-white/10 rounded p-2 text-xs font-mono text-white tracking-widest focus:outline-none"
              />
              <select
                value={newAction}
                onChange={(e: any) => setNewAction(e.target.value)}
                className="bg-brand-bg border border-white/10 rounded p-2 text-xs text-white/80 focus:outline-none"
              >
                <option value="ALLOW">ALLOW</option>
                <option value="RATE_LIMIT">RATE LIMIT</option>
                <option value="BLOCK">BLOCK</option>
              </select>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Target description / Controller ECU module..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="flex-1 bg-brand-bg border border-white/10 rounded p-2 text-xs text-white/80 focus:outline-none"
              />
              <button
                type="submit"
                className="py-2 px-4 rounded bg-cyan-400 hover:bg-cyan-500 text-brand-bg font-mono font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus size={14} /> ADD RULE
              </button>
            </div>
          </form>

        </div>

      </div>

    </div>
  );
};
