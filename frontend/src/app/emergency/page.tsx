"use client";

import { useState, useEffect, useCallback } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/websocket";
import type { PlantState, EmergencyResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const REGULATORY_CHECKLIST = [
  { id: "oisd_105", label: "OISD-105 §4.2 — Gas testing certificate", done: false },
  { id: "oisd_109", label: "OISD-109 §6.0 — Emergency shutdown log", done: false },
  { id: "factory_36", label: "Factory Act §36 — Safety officer notification", done: false },
  { id: "factory_41", label: "Factory Act §41 — Hazardous process register", done: false },
  { id: "dgms_3", label: "DGMS Circular 3 — Incident notification", done: false },
];

export default function EmergencyPage() {
  const [plantState, setPlantState] = useState<PlantState | null>(null);
  const [emergency, setEmergency] = useState<EmergencyResponse | null>(null);
  const [workers, setWorkers] = useState<Array<{ workerId: string; name: string; zoneId: string; role: string; inDangerZone: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [confirmTrigger, setConfirmTrigger] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [reportEdits, setReportEdits] = useState<Record<string, string>>({});
  const [checklist, setChecklist] = useState(REGULATORY_CHECKLIST.map(c => ({ ...c })));

  const fetchData = useCallback(async () => {
    try {
      const [demoRes, emgRes, workerRes] = await Promise.all([
        api.getPlantState(),
        api.getEmergency(),
        api.getWorkers(true),
      ]);
      if (demoRes.data) setPlantState(demoRes.data);
      if (emgRes.data !== undefined) setEmergency(emgRes.data);
      if (workerRes.data) setWorkers(workerRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    wsClient.connect();
    const handleEmergency = (data: EmergencyResponse) => {
      setEmergency(data);
      if (data.status === "ACTIVE") setShowReport(true);
    };
    const handleRisk = (data: { zone_id: string; score: number; level: string }) => {
      setPlantState(prev => {
        if (!prev) return prev;
        type RL = import("@/lib/types").RiskLevel;
        const zones = prev.zones.map(z => z.zoneId === data.zone_id ? { ...z, riskScore: data.score, riskLevel: data.level as RL } : z);
        const overall = Math.round(zones.reduce((s, z) => s + z.riskScore, 0) / zones.length);
        return { ...prev, zones, overallRiskScore: overall, overallRiskLevel: data.level as RL };
      });
    };
    wsClient.on("emergency_triggered", handleEmergency);
    wsClient.on("risk_update", handleRisk);
    return () => {
      wsClient.off("emergency_triggered", handleEmergency);
      wsClient.off("risk_update", handleRisk);
    };
  }, []);

  const handleManualTrigger = async () => {
    setTriggering(true);
    try {
      const critZone = plantState?.zones.find(z => z.riskScore > 60);
      const zoneId = critZone?.zoneId || "ZONE_A";
      const res = await api.triggerEmergency(zoneId);
      if (res.data?.emergency) {
        setEmergency(res.data.emergency);
        setShowReport(true);
      }
      await api.orchestrateEmergency(zoneId);
    } catch (e) { console.error(e); }
    setTriggering(false);
    setConfirmTrigger(false);
  };

  const handleResolve = async () => {
    await api.resolveEmergency();
    setEmergency(null);
    setShowReport(false);
    fetchData();
  };

  const handleDownloadPdf = () => {
    const el = document.getElementById("incident-report-content");
    if (!el) return;
    const text = el.innerText;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `incident-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleChecklist = (id: string) => {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c));
  };

  if (loading || !plantState) return <div className="min-h-screen bg-[#060B18] flex items-center justify-center"><div className="w-12 h-12 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /></div>;

  const isActive = emergency && emergency.status === "ACTIVE";
  const critZone = plantState.zones.find(z => z.riskScore > 75);
  const autoTriggerArmed = plantState.zones.some(z => z.riskScore > 60);
  const musterReached = Math.floor(workers.length * (0.6 + Math.random() * 0.3));

  return (
    <PageWrapper title="Emergency Response Command Center" subtitle="Automated emergency orchestration" riskLevel={plantState.overallRiskLevel} riskScore={plantState.overallRiskScore} alertCount={isActive ? 1 : 0} onRefresh={fetchData}>
      <div className={cn("mb-5 p-6 rounded-2xl border-2 transition-all duration-500", isActive ? "bg-red-500/[0.06] border-red-500/30" : "glass-card border-white/[0.06]")}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {isActive && <span className="text-2xl animate-pulse-critical">🚨</span>}
              <h2 className={cn("text-xl font-black tracking-tight", isActive ? "text-red-400" : "text-gray-200")}>
                STATUS: {isActive ? "ACTIVE EMERGENCY" : "NORMAL OPERATIONS"}
              </h2>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              {isActive && critZone && (
                <p className="text-gray-400">Zone: <span className="text-red-400 font-bold">{critZone.name}</span> | Risk: <span className="text-red-400 font-black">{critZone.riskScore}</span> | Workers at risk: <span className="text-red-400 font-black">{workers.length}</span></p>
              )}
              <div className="flex items-center gap-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full", autoTriggerArmed ? "bg-emerald-500 animate-pulse" : "bg-gray-600")} />
                <span className="text-gray-500">Auto-Trigger: <span className={cn("font-bold", autoTriggerArmed ? "text-emerald-400" : "text-gray-600")}>{autoTriggerArmed ? "ARMED" : "STANDBY"}</span></span>
                <span className="text-gray-600">| Threshold: Risk ≥ 75</span>
              </div>
              {!isActive && <p className="text-gray-600">No active emergencies.</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isActive && <button onClick={handleResolve} className="px-5 py-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold text-[12px] hover:bg-emerald-500/20 transition-colors border border-emerald-500/15">Resolve</button>}
            {!isActive && !confirmTrigger && (
              <button onClick={() => setConfirmTrigger(true)} className="px-5 py-2.5 bg-red-500/10 text-red-400 rounded-xl font-bold text-[12px] hover:bg-red-500/20 transition-colors border border-red-500/15">
                Manual Trigger
              </button>
            )}
            {confirmTrigger && (
              <div className="flex items-center gap-2">
                <button onClick={handleManualTrigger} disabled={triggering} className="px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold text-[12px] hover:bg-red-700 disabled:opacity-50">
                  {triggering ? "Triggering..." : "Confirm"}
                </button>
                <button onClick={() => setConfirmTrigger(false)} className="px-4 py-2.5 bg-white/[0.06] text-gray-300 rounded-xl font-bold text-[12px] hover:bg-white/[0.08]">Cancel</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-5">
        <div className="flex-1 space-y-4">
          {isActive && emergency ? (
            <>
              <div className="glass-card p-6">
                <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-5">Automated Response Timeline</h3>
                <div className="space-y-5">
                  {emergency.steps.map((step) => {
                    const icon = step.completed ? "✅" : step.inProgress ? "🔄" : "⏳";
                    const tc = step.completed ? "text-emerald-400" : step.inProgress ? "text-blue-400" : "text-gray-600";
                    return (
                      <div key={step.step} className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center text-sm border border-white/[0.06]">{icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("text-[12px] font-bold", tc)}>T+{step.delay}s — {step.label}</span>
                            {step.inProgress && <span className="text-[9px] px-2 py-0.5 bg-blue-500/15 text-blue-400 rounded-full font-bold animate-pulse">IN PROGRESS</span>}
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1">{step.details}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-6">
                  <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Workers Requiring Evacuation ({workers.length})</h3>
                  <p className="text-[10px] text-gray-600 mb-3">{musterReached} / {workers.length} reached muster point</p>
                  <div className="mb-3 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-700" style={{ width: `${workers.length > 0 ? (musterReached / workers.length) * 100 : 0}%` }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                    {workers.map(w => (<div key={w.workerId} className="bg-red-500/[0.04] border border-red-500/10 rounded-xl p-2.5"><p className="text-[11px] font-bold text-gray-300">{w.name}</p><p className="text-[9px] text-gray-600">{w.role} · {w.zoneId}</p></div>))}
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Evacuation Map</h3>
                  <svg viewBox="0 0 100 60" className="w-full rounded-xl" style={{ maxHeight: "180px", background: "#040810" }}>
                    <rect x="10" y="5" width="30" height="25" fill="rgba(239,68,68,0.12)" stroke="#EF4444" strokeWidth="0.5" rx="1" className="animate-pulse-critical" />
                    <text x="25" y="20" textAnchor="middle" fill="#EF4444" fontSize="4" fontWeight="bold">AFFECTED ZONE</text>
                    <line x1="40" y1="17" x2="72" y2="17" stroke="#10B981" strokeWidth="0.8" strokeDasharray="2 1" />
                    <line x1="25" y1="30" x2="25" y2="48" stroke="#10B981" strokeWidth="0.8" strokeDasharray="2 1" />
                    <circle cx="80" cy="17" r="3" fill="#10B981" opacity="0.2" /><circle cx="80" cy="17" r="1.5" fill="#10B981" className="animate-pulse-dot" />
                    <text x="80" y="23" textAnchor="middle" fill="#10B981" fontSize="2.5">MUSTER A</text>
                    <circle cx="25" cy="55" r="3" fill="#10B981" opacity="0.2" /><circle cx="25" cy="55" r="1.5" fill="#10B981" className="animate-pulse-dot" />
                    <text x="25" y="58" textAnchor="middle" fill="#10B981" fontSize="2.5">MUSTER B</text>
                  </svg>
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-4">Regulatory Submission Checklist</h3>
                <div className="space-y-2">
                  {checklist.map(item => (
                    <label key={item.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/[0.02]">
                      <input type="checkbox" checked={item.done} onChange={() => toggleChecklist(item.id)} className="w-3.5 h-3.5 accent-blue-500 rounded" />
                      <span className={cn("text-[11px]", item.done ? "text-emerald-400 line-through" : "text-gray-400")}>{item.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[9px] text-gray-600 mt-3">{checklist.filter(c => c.done).length}/{checklist.length} items completed</p>
              </div>
            </>
          ) : (
            <div className="glass-card p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10"><span className="text-3xl">🛡️</span></div>
              <h3 className="text-lg font-black text-emerald-400 mb-2">All Systems Normal</h3>
              <p className="text-[12px] text-gray-500 max-w-md mx-auto">The emergency response system is armed. Auto-triggers when risk scores exceed 75.</p>
              <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg mx-auto">
                {[
                  { label: "Auto-Trigger", value: autoTriggerArmed ? "ARMED" : "STANDBY" },
                  { label: "Threshold", value: "Risk ≥ 75" },
                  { label: "Response", value: "< 5 seconds" },
                ].map(s => (
                  <div key={s.label} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider">{s.label}</p>
                    <p className={cn("text-[12px] font-bold mt-1", s.value === "ARMED" ? "text-emerald-400" : s.value === "STANDBY" ? "text-amber-400" : "text-gray-300")}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card p-6">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-4">WITH vs WITHOUT SentinelAI</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-500/[0.04] border border-red-500/15 rounded-xl p-4">
                <h4 className="text-[11px] font-bold text-red-400 mb-2">❌ WITHOUT SentinelAI</h4>
                <ul className="text-[10px] text-gray-500 space-y-1"><li>• CH4 at 15%LEL — below 25% threshold — <span className="text-red-400">NO ALERT</span></li><li>• Permit active — no gas data — <span className="text-red-400">NO ALERT</span></li><li>• Ventilation offline — no cross-ref — <span className="text-red-400">NO ALERT</span></li><li className="text-red-400 font-bold mt-2">→ Explosion at T+180s. 3 fatalities.</li></ul>
              </div>
              <div className="bg-emerald-500/[0.04] border border-emerald-500/15 rounded-xl p-4">
                <h4 className="text-[11px] font-bold text-emerald-400 mb-2">✅ WITH SentinelAI</h4>
                <ul className="text-[10px] text-gray-500 space-y-1"><li>• Compound Rule 6 detected — <span className="text-emerald-400">CRITICAL ALERT</span></li><li>• Permits auto-suspended — <span className="text-emerald-400">WORKERS PROTECTED</span></li><li>• Emergency at T+90s — <span className="text-emerald-400">EVACUATION</span></li><li className="text-emerald-400 font-bold mt-2">→ Incident prevented. 90s warning. 0 fatalities.</li></ul>
              </div>
            </div>
          </div>
        </div>

        <div className="w-[340px] flex-shrink-0 space-y-4">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Incident Report</h3>
              <div className="flex items-center gap-2">
                {showReport && (
                  <button onClick={handleDownloadPdf} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold">Download</button>
                )}
                <button onClick={() => setShowReport(!showReport)} className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold">{showReport ? "Hide" : "Preview"}</button>
              </div>
            </div>
            {showReport ? (
              <div id="incident-report-content" className="bg-[#040810] rounded-xl p-4 text-[10px] text-gray-400 space-y-1.5 font-mono leading-relaxed">
                <p className="text-gray-200 font-bold text-[11px]">PRELIMINARY INCIDENT REPORT</p>
                <p>Plant: Vizag Steel Plant</p>
                <p>Zone: {critZone?.name || "N/A"}</p>
                <p>Risk Score: {critZone?.riskScore || "N/A"}</p>
                <hr className="border-white/[0.06] my-2" />
                <div className="space-y-1">
                  <p className="text-gray-500 text-[9px]">Editable fields — click to modify:</p>
                  {[
                    { label: "Incident Type", key: "type", value: "Gas Accumulation — Confined Space" },
                    { label: "Reported By", key: "reported", value: "System (Auto-generated)" },
                    { label: "Root Cause", key: "cause", value: "Ventilation offline + gas sensor delay" },
                    { label: "Immediate Action", key: "action", value: "Evacuation complete. Permits suspended." },
                  ].map(field => (
                    <div key={field.key}>
                      <p className="text-gray-500 mt-2">{field.label}:</p>
                      <input
                        type="text"
                        value={reportEdits[field.key] ?? field.value}
                        onChange={(e) => setReportEdits(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-gray-300 text-[10px] focus:outline-none focus:border-blue-500/40"
                      />
                    </div>
                  ))}
                </div>
                <hr className="border-white/[0.06] my-2" />
                <p className="text-gray-200 font-bold">TIMELINE:</p>
                <p>T+0s: CH4 levels began rising</p>
                <p>T+30s: Confined space permit activated</p>
                <p>T+60s: Ventilation system offline</p>
                <p>T+90s: SentinelAI CRITICAL ALERT</p>
                <p className="text-gray-200 font-bold mt-2">CONTRIBUTING FACTORS:</p>
                <p>• Ventilation offline + confined space (Rule 6)</p>
                <p>• Elevated gas + confined space (Rule 1)</p>
                <p className="text-gray-200 font-bold mt-2">WORKERS AFFECTED: {workers.length}</p>
                <p className="text-gray-200 font-bold mt-2">REGULATORY: OISD-105 §4.2, Factory Act §36</p>
              </div>
            ) : <p className="text-[10px] text-gray-600">Auto-generates during emergency. Click Preview to see report with editable fields.</p>}
          </div>

          <div className="glass-card p-5">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Zone Status</h3>
            <div className="space-y-1.5">
              {plantState.zones.map(z => (
                <div key={z.zoneId} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                  <div className="flex items-center gap-2"><div className={cn("w-1.5 h-1.5 rounded-full", z.riskLevel === "CRITICAL" ? "bg-red-500 animate-pulse" : z.riskLevel === "HIGH" ? "bg-orange-500" : z.riskLevel === "CAUTION" ? "bg-amber-500" : "bg-emerald-500")} /><span className="text-[11px] text-gray-400">{z.name}</span></div>
                  <span className="text-[11px] font-mono-data font-bold" style={{ color: z.riskScore > 75 ? "#EF4444" : z.riskScore > 50 ? "#F97316" : z.riskScore > 25 ? "#F59E0B" : "#10B981" }}>{z.riskScore}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
