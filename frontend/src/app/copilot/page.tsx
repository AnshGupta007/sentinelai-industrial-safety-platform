"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { CopilotChat } from "@/components/copilot/CopilotChat";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/websocket";
import type { PlantState } from "@/lib/types";
import { cn } from "@/lib/utils";

const SUGGESTED = [
  "What is the current risk in Zone A?",
  "Why was the last alert triggered?",
  "What should I do about the CH4 reading?",
  "Generate a safety briefing for morning shift",
  "What OISD regulations apply to Zone B?",
  "Show incidents similar to current conditions",
  "What permits are flagged and why?",
  "What is the emergency response procedure?",
];

export default function CopilotPage() {
  const [plantState, setPlantState] = useState<PlantState | null>(null);
  const [loading, setLoading] = useState(true);
  const [externalQuery, setExternalQuery] = useState<string | null>(null);

  const fetchPlant = useCallback(async () => {
    try {
      const res = await api.getPlantState();
      if (res.data) setPlantState(res.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPlant(); }, [fetchPlant]);

  useEffect(() => {
    wsClient.connect();
    const handler = (data: { zone_id: string; score: number; level: string }) => {
      setPlantState(prev => {
        if (!prev) return prev;
        type RL = import("@/lib/types").RiskLevel;
        const zones = prev.zones.map(z => z.zoneId === data.zone_id ? { ...z, riskScore: data.score, riskLevel: data.level as RL } : z);
        const overall = Math.round(zones.reduce((s, z) => s + z.riskScore, 0) / zones.length);
        return { ...prev, zones, overallRiskScore: overall, overallRiskLevel: data.level as RL };
      });
    };
    wsClient.on("risk_update", handler);
    return () => wsClient.off("risk_update", handler);
  }, []);

  if (loading || !plantState) return <div className="min-h-screen bg-[#060B18] flex items-center justify-center"><div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const criticalZones = plantState.zones.filter(z => z.riskScore > 50);

  return (
    <PageWrapper title="AI Copilot" subtitle="Your intelligent safety assistant" riskLevel={plantState.overallRiskLevel} riskScore={plantState.overallRiskScore} alertCount={plantState.activeAlerts} onRefresh={fetchPlant}>
      <div className="flex gap-5" style={{ height: "calc(100vh - 160px)" }}>
        <CopilotChat plantState={plantState} externalQuery={externalQuery} onQueryHandled={() => setExternalQuery(null)} />

        <div className="w-[280px] flex-shrink-0 space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Plant Context</h3>
            <div className="space-y-3">
              {[
                { label: "Risk Score", value: plantState.overallRiskScore.toString(), color: plantState.overallRiskScore > 75 ? "#EF4444" : plantState.overallRiskScore > 50 ? "#F97316" : plantState.overallRiskScore > 25 ? "#F59E0B" : "#10B981", big: true },
                { label: "Risk Level", value: plantState.overallRiskLevel, color: plantState.overallRiskLevel === "CRITICAL" ? "#EF4444" : plantState.overallRiskLevel === "HIGH" ? "#F97316" : "#10B981" },
                { label: "Active Alerts", value: plantState.activeAlerts.toString(), color: "#EF4444" },
                { label: "Flagged Permits", value: plantState.flaggedPermits.toString(), color: "#F59E0B" },
                { label: "Workers at Risk", value: plantState.workersAtRisk.toString(), color: "#F97316" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">{s.label}</span>
                  <span className={cn("font-mono-data font-bold", s.big ? "text-lg" : "text-[12px]")} style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {criticalZones.length > 0 && (
            <div className="glass-card p-5 border-red-500/10">
              <h3 className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-3">⚠️ Zones at Risk</h3>
              <div className="space-y-1.5">{criticalZones.map(z => (
                <div key={z.zoneId} className="flex items-center justify-between p-2 rounded-lg bg-red-500/[0.04]">
                  <span className="text-[10px] text-gray-400">{z.name}</span>
                  <span className="text-[10px] font-mono-data font-bold" style={{ color: z.riskScore > 75 ? "#EF4444" : "#F97316" }}>{z.riskScore}</span>
                </div>
              ))}</div>
            </div>
          )}

            <div className="glass-card p-5">
              <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Queries</h3>
              <div className="space-y-1.5">{SUGGESTED.slice(0, 4).map((p, i) => (
                <button key={i} onClick={() => setExternalQuery(p)} className="w-full text-left text-[10px] px-3 py-2 bg-white/[0.03] rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.05] transition-all truncate">
                  {p}
                </button>
              ))}</div>
            </div>

          <div className="glass-card p-5">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Capabilities</h3>
            <ul className="text-[10px] text-gray-600 space-y-1.5">
              <li className="flex items-center gap-1.5"><span className="text-emerald-500 text-[8px]">●</span>Real-time sensor data</li>
              <li className="flex items-center gap-1.5"><span className="text-emerald-500 text-[8px]">●</span>Active permit analysis</li>
              <li className="flex items-center gap-1.5"><span className="text-emerald-500 text-[8px]">●</span>Worker location tracking</li>
              <li className="flex items-center gap-1.5"><span className="text-emerald-500 text-[8px]">●</span>Historical incident RAG</li>
              <li className="flex items-center gap-1.5"><span className="text-emerald-500 text-[8px]">●</span>OISD / Factory Act / DGMS</li>
              <li className="flex items-center gap-1.5"><span className="text-emerald-500 text-[8px]">●</span>Risk prediction</li>
            </ul>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
