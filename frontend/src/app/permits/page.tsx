"use client";

import { useState, useEffect, useCallback } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/websocket";
import { PermitTable } from "@/components/permits/PermitTable";
import { PermitConflictAlert } from "@/components/permits/PermitConflictAlert";
import type { PlantState, Permit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PERMIT_CONFIG } from "@/lib/constants";

export default function PermitsPage() {
  const [plantState, setPlantState] = useState<PlantState | null>(null);
  const [permits, setPermits] = useState<Permit[]>([]);
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [simopsData, setSimopsData] = useState<{ permits: Permit[]; matrix: Record<string, Record<string, { status: string; reason: string }>> } | null>(null);
  const [simopsCell, setSimopsCell] = useState<{ p1: string; p2: string; status: string; reason: string } | null>(null);
  const [view, setView] = useState<"table" | "simops">("table");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [demoRes, permitRes] = await Promise.all([
        api.getPlantState(),
        api.getPermits(true),
      ]);
      if (demoRes.data) setPlantState(demoRes.data);
      if (permitRes.data) setPermits(permitRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const fetchSimops = useCallback(async () => {
    try {
      const res = await api.getSimopsMatrix();
      if (res.data) setSimopsData(res.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    wsClient.connect();
    const handlePermit = (data: Permit) => {
      setPermits(prev => {
        const existing = prev.findIndex(p => p.permitId === data.permitId);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = { ...next[existing], ...data };
          return next;
        }
        return prev;
      });
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
    wsClient.on("permit_flagged", handlePermit);
    wsClient.on("risk_update", handleRisk);
    return () => {
      wsClient.off("permit_flagged", handlePermit);
      wsClient.off("risk_update", handleRisk);
    };
  }, []);
  useEffect(() => { if (view === "simops") fetchSimops(); }, [view, fetchSimops]);

  const handleSuspend = async (permitId: string) => {
    await api.suspendPermit(permitId);
    fetchData();
  };

  if (loading || !plantState) {
    return <div className="min-h-screen bg-[#060B18] flex items-center justify-center"><div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const activeCount = permits.filter(p => p.status === "ACTIVE").length;
  const flaggedCount = permits.filter(p => p.status === "FLAGGED").length;
  const suspendedCount = permits.filter(p => p.status === "SUSPENDED").length;
  const allConflicts = permits.flatMap(p => p.conflicts);
  const now = Date.now();
  const expiringSoon = permits.filter(p => p.status === "ACTIVE" && new Date(p.endTime).getTime() - now < 2 * 60 * 60 * 1000 && new Date(p.endTime).getTime() > now).length;

  return (
    <PageWrapper title="Permit Intelligence" subtitle="Digital permit-to-work with SIMOPS detection" riskLevel={plantState.overallRiskLevel} riskScore={plantState.overallRiskScore} alertCount={allConflicts.filter(c => c.urgency === "CRITICAL").length} onRefresh={fetchData}>
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: "Active Permits", value: activeCount, color: "text-blue-400" },
          { label: "Flagged", value: flaggedCount, color: "text-red-400" },
          { label: "Suspended", value: suspendedCount, color: "text-amber-400" },
          { label: "Expiring Soon", value: expiringSoon, color: "text-orange-400" },
        ].map(card => (
          <div key={card.label} className="glass-card p-5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{card.label}</p>
            <p className={cn("text-3xl font-black font-mono-data mt-1", card.color)}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            {(["table", "simops"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className={cn("px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200", view === v ? "bg-blue-600/20 text-blue-400 border border-blue-500/20" : "bg-white/[0.03] text-gray-500 hover:text-gray-300 border border-white/[0.06]")}>
                {v === "table" ? "Permit Table" : "SIMOPS Matrix"}
              </button>
            ))}
          </div>

          {view === "table" ? (
            <div className="glass-card overflow-hidden">
              <PermitTable permits={permits} onSelect={setSelectedPermit} onSuspend={handleSuspend} />
            </div>
          ) : (
            <div className="glass-card p-6 overflow-auto">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">SIMOPS Interaction Matrix</h3>
              <p className="text-[10px] text-gray-600 mb-4">Click a cell for details on permit interaction</p>
              {simopsData ? (
                <div className="overflow-auto">
                  <table className="text-[10px]">
                    <thead><tr><th className="p-2" />{simopsData.permits.map(p => <th key={p.permitId} className="p-2 text-gray-400 font-mono-data whitespace-nowrap">{p.permitId.slice(-4)}</th>)}</tr></thead>
                    <tbody>
                      {simopsData.permits.map(p1 => (
                        <tr key={p1.permitId}>
                          <td className="p-2 text-gray-400 font-mono-data whitespace-nowrap">{p1.permitId.slice(-4)}</td>
                          {simopsData.permits.map(p2 => {
                            const cell = simopsData.matrix?.[p1.permitId]?.[p2.permitId];
                            return (
                              <td
                                key={p2.permitId}
                                onClick={() => cell?.status !== "SELF" && setSimopsCell({ p1: p1.permitId, p2: p2.permitId, status: cell?.status || "", reason: cell?.reason || "" })}
                                className={cn(
                                  "p-2 text-center rounded-md cursor-pointer transition-all hover:scale-110",
                                  cell?.status === "DANGER" ? "bg-red-500/25 hover:bg-red-500/40" :
                                  cell?.status === "CAUTION" ? "bg-amber-500/20 hover:bg-amber-500/30" :
                                  cell?.status === "SELF" ? "bg-white/[0.02] cursor-default hover:scale-100" :
                                  "bg-emerald-500/10 hover:bg-emerald-500/20"
                                )}
                              >
                                <span className={cn(
                                  "inline-block w-3 h-3 rounded-full",
                                  cell?.status === "DANGER" ? "bg-red-500" :
                                  cell?.status === "CAUTION" ? "bg-amber-500" :
                                  cell?.status === "SELF" ? "bg-transparent" :
                                  "bg-emerald-500"
                                )} />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {simopsCell && (
                    <div className="mt-4 p-4 bg-white/[0.03] rounded-xl border border-white/[0.08] animate-fade-in">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-gray-300 font-mono-data">{simopsCell.p1.slice(-4)} ⟷ {simopsCell.p2.slice(-4)}</span>
                        <button onClick={() => setSimopsCell(null)} className="text-gray-600 hover:text-gray-300 text-xs">✕</button>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "inline-block w-2 h-2 rounded-full",
                          simopsCell.status === "DANGER" ? "bg-red-500" :
                          simopsCell.status === "CAUTION" ? "bg-amber-500" :
                          "bg-emerald-500"
                        )} />
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          simopsCell.status === "DANGER" ? "text-red-400" :
                          simopsCell.status === "CAUTION" ? "text-amber-400" :
                          "text-emerald-400"
                        )}>{simopsCell.status}</span>
                      </div>
                      <p className="text-[11px] text-gray-400">{simopsCell.reason || "No conflict"}</p>
                    </div>
                  )}
                </div>
              ) : <p className="text-gray-500 text-center py-8 text-sm">Loading SIMOPS data...</p>}
            </div>
          )}
        </div>

        <div className="w-[340px] flex-shrink-0 space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Conflict Detection Feed</h3>
            <PermitConflictAlert permits={permits} onSuspend={handleSuspend} />
          </div>

          {selectedPermit && (
            <div className="glass-card p-5 animate-slide-in border-blue-500/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white font-mono-data">{selectedPermit.permitId}</h3>
                <button onClick={() => setSelectedPermit(null)} className="text-gray-600 hover:text-gray-300 text-xs transition-colors">✕</button>
              </div>
              <div className="space-y-2.5 text-[11px]">
                {[
                  { label: "Type", value: `${PERMIT_CONFIG[selectedPermit.type]?.icon} ${PERMIT_CONFIG[selectedPermit.type]?.label}` },
                  { label: "Zone", value: selectedPermit.zoneId },
                  { label: "Workers", value: selectedPermit.workersInvolved.join(", ") },
                  { label: "Authorized By", value: selectedPermit.authorizedBy },
                ].map(row => (
                  <div key={row.label} className="flex justify-between"><span className="text-gray-500">{row.label}</span><span className="text-gray-300">{row.value}</span></div>
                ))}
                <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={cn("font-bold", selectedPermit.status === "FLAGGED" ? "text-red-400" : "text-emerald-400")}>{selectedPermit.status}</span></div>
              </div>
              {selectedPermit.conflicts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <h4 className="text-[10px] font-bold text-red-400 mb-2 uppercase tracking-wider">Conflicts</h4>
                  {selectedPermit.conflicts.map((c, i) => <p key={i} className="text-[10px] text-gray-400 mb-1">• {c.description}</p>)}
                  <button onClick={() => handleSuspend(selectedPermit.permitId)} className="mt-3 w-full px-3 py-2.5 bg-red-500/10 text-red-400 rounded-xl text-[11px] font-bold hover:bg-red-500/20 transition-colors border border-red-500/15">
                    Suspend Permit
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
