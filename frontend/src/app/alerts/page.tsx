"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import { AlertBarChart } from "@/components/charts/index";
import { wsClient } from "@/lib/websocket";
import type { PlantState, Alert } from "@/lib/types";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

type FilterType = "ALL" | "CRITICAL" | "HIGH" | "MEDIUM" | "RESOLVED" | "ACKNOWLEDGED";

const ackTimestamps = new Map<string, number>();

function computeMTTA(alerts: Alert[]): { avg: number; label: string; color: string } {
  const diffs: number[] = [];
  for (const a of alerts) {
    if (!a.acknowledged || !a.timestamp) continue;
    const created = new Date(a.timestamp).getTime();
    const ackTime = ackTimestamps.get(a.alertId);
    if (ackTime) diffs.push(Math.round((ackTime - created) / 1000));
  }
  if (diffs.length < 2) return { avg: 0, label: "Insufficient data", color: "text-gray-600" };
  const avg = Math.round(diffs.reduce((s, d) => s + d, 0) / diffs.length);
  const color = avg <= 15 ? "text-emerald-400" : avg <= 30 ? "text-blue-400" : avg <= 60 ? "text-amber-400" : "text-red-400";
  const label = avg < 60 ? `${avg}s` : `${Math.round(avg / 60)}m ${avg % 60}s`;
  return { avg, label, color };
}

function computeFrequency(alerts: Alert[]): Array<{ hour: string; count: number; color: string }> {
  const now = new Date();
  const buckets: { hour: string; count: number; color: string }[] = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now);
    start.setHours(now.getHours() - i, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    const count = alerts.filter(a => {
      const t = new Date(a.timestamp).getTime();
      return t >= start.getTime() && t < end.getTime();
    }).length;
    buckets.push({
      hour: start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }),
      count,
      color: count >= 5 ? "#EF4444" : count >= 3 ? "#F97316" : count >= 1 ? "#3B82F6" : "#374151",
    });
  }
  return buckets;
}

export default function AlertsPage() {
  const router = useRouter();
  const [plantState, setPlantState] = useState<PlantState | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [plantRes, alertRes] = await Promise.all([
        api.getPlantState(),
        api.getAlerts(),
      ]);
      if (plantRes.data) setPlantState(plantRes.data);
      if (alertRes.data) setAlerts(alertRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    wsClient.connect();
    const handler = (data: Alert) => {
      setAlerts(prev => prev.some(a => a.alertId === data.alertId) ? prev : [data, ...prev].slice(0, 100));
    };
    wsClient.on("alert_new", handler);
    return () => wsClient.off("alert_new", handler);
  }, []);

  const getAlertZone = (alertId: string): string | undefined =>
    alerts.find(a => a.alertId === alertId)?.zoneId;

  const handleAck = async (id: string) => {
    ackTimestamps.set(id, Date.now());
    await api.acknowledgeAlert(id);
    fetchData();
  };

  const handleResolve = async (id: string) => {
    await api.resolveAlert(id);
    fetchData();
  };

  const handleSuspendPermits = async (id: string) => {
    const zoneId = getAlertZone(id);
    if (!zoneId) return;
    setActionLoading(id);
    await api.suspendZonePermits(zoneId);
    setActionLoading(null);
    fetchData();
  };

  const handleEvacuate = async (id: string) => {
    const zoneId = getAlertZone(id);
    if (!zoneId) return;
    setActionLoading(id);
    await api.triggerEvacuation(zoneId);
    setActionLoading(null);
    fetchData();
  };

  const mtta = useMemo(() => computeMTTA(alerts), [alerts]);
  const freqData = useMemo(() => computeFrequency(alerts), [alerts]);

  if (loading || !plantState) return <div className="min-h-screen bg-[#060B18] flex items-center justify-center"><div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const filtered = alerts.filter(a => {
    if (filter === "ALL") return !a.resolved;
    if (filter === "CRITICAL") return a.severity === "CRITICAL" && !a.resolved;
    if (filter === "HIGH") return a.severity === "HIGH" && !a.resolved;
    if (filter === "MEDIUM") return a.severity === "MEDIUM" && !a.resolved;
    if (filter === "RESOLVED") return a.resolved;
    if (filter === "ACKNOWLEDGED") return a.acknowledged && !a.resolved;
    return true;
  });

  const counts = {
    CRITICAL: alerts.filter(a => a.severity === "CRITICAL" && !a.resolved).length,
    HIGH: alerts.filter(a => a.severity === "HIGH" && !a.resolved).length,
    MEDIUM: alerts.filter(a => a.severity === "MEDIUM" && !a.resolved).length,
    LOW: alerts.filter(a => a.severity === "LOW" && !a.resolved).length,
  };

  const barData = [
    { name: "CRITICAL", count: counts.CRITICAL, color: "#EF4444" },
    { name: "HIGH", count: counts.HIGH, color: "#F97316" },
    { name: "MEDIUM", count: counts.MEDIUM, color: "#F59E0B" },
    { name: "LOW", count: counts.LOW, color: "#3B82F6" },
  ];

  const filters: { label: string; value: FilterType }[] = [
    { label: "All Active", value: "ALL" },
    { label: "Critical", value: "CRITICAL" },
    { label: "High", value: "HIGH" },
    { label: "Medium", value: "MEDIUM" },
    { label: "Acknowledged", value: "ACKNOWLEDGED" },
    { label: "Resolved", value: "RESOLVED" },
  ];

  const sevBorder: Record<string, string> = {
    CRITICAL: "border-l-red-500",
    HIGH: "border-l-orange-500",
    MEDIUM: "border-l-amber-500",
    LOW: "border-l-blue-500",
  };

  const sevBadge: Record<string, string> = {
    CRITICAL: "bg-red-500/15 text-red-400",
    HIGH: "bg-orange-500/15 text-orange-400",
    MEDIUM: "bg-amber-500/15 text-amber-400",
    LOW: "bg-blue-500/15 text-blue-400",
  };

  return (
    <PageWrapper
      title="Alert Center"
      subtitle="Real-time alert monitoring and management"
      riskLevel={plantState.overallRiskLevel}
      riskScore={plantState.overallRiskScore}
      alertCount={counts.CRITICAL + counts.HIGH}
      onRefresh={fetchData}
    >
      {/* Summary Cards — MTTA now real */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="glass-card p-5 border-red-500/15">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Critical</p>
          <p className="text-3xl font-black font-mono-data text-red-400 mt-1">{counts.CRITICAL}</p>
        </div>
        <div className="glass-card p-5 border-orange-500/15">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">High</p>
          <p className="text-3xl font-black font-mono-data text-orange-400 mt-1">{counts.HIGH}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">MTTA</p>
          <p className={cn("text-3xl font-black font-mono-data mt-1", mtta.color)}>{mtta.label}</p>
          <p className="text-[9px] text-gray-600 mt-0.5">Mean Time to Acknowledge</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">False Positive</p>
          <p className="text-3xl font-black font-mono-data text-emerald-400 mt-1">3.2%</p>
        </div>
      </div>

      <div className="flex gap-5">
        <div className="flex-1 min-w-0">
          {/* Filter */}
          <div className="flex items-center gap-1.5 mb-4 flex-wrap">
            {filters.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200",
                  filter === f.value
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/20"
                    : "bg-white/[0.03] text-gray-500 hover:text-gray-300 border border-white/[0.06]"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Alerts */}
          <div className="space-y-2.5 max-h-[calc(100vh-340px)] overflow-y-auto">
            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-600 text-sm">No alerts matching filter</div>
            )}
            {filtered.map(alert => (
              <div key={alert.alertId} className={cn("rounded-xl border-l-[3px] p-4 glass-card", sevBorder[alert.severity] || "border-l-gray-600")}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase", sevBadge[alert.severity] || "bg-gray-600/15 text-gray-400")}>
                      {alert.severity}
                    </span>
                    <span className="text-[11px] font-bold text-gray-300">{alert.zoneId}</span>
                    <span className="text-[10px] text-gray-600 font-mono-data">
                      {new Date(alert.timestamp).toLocaleTimeString("en-IN", { hour12: false })}
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-mono-data font-bold"
                    style={{ color: alert.riskScore > 75 ? "#EF4444" : alert.riskScore > 50 ? "#F97316" : alert.riskScore > 25 ? "#F59E0B" : "#3B82F6" }}
                  >
                    Risk: {alert.riskScore}
                  </span>
                </div>
                <h3 className="text-[12px] font-bold text-gray-200 mb-1">{alert.title}</h3>
                <p className="text-[11px] text-gray-500 mb-2 line-clamp-2">{alert.description}</p>
                {alert.triggeredRules.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {alert.triggeredRules.map((r, i) => (
                      <span key={i} className="text-[9px] px-2 py-0.5 bg-white/[0.03] rounded-md text-gray-500">→ {r.ruleId}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {!alert.acknowledged && (
                    <button onClick={() => handleAck(alert.alertId)} className="text-[10px] px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg font-semibold hover:bg-blue-500/20 transition-colors">
                      Acknowledge
                    </button>
                  )}
                  {!alert.resolved && (
                    <button onClick={() => handleResolve(alert.alertId)} className="text-[10px] px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg font-semibold hover:bg-emerald-500/20 transition-colors">
                      Resolve
                    </button>
                  )}
                  <button onClick={() => handleSuspendPermits(alert.alertId)} disabled={actionLoading === alert.alertId} className="text-[10px] px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50">
                    {actionLoading === alert.alertId ? "Suspending..." : "Suspend Permits"}
                  </button>
                  <button onClick={() => handleEvacuate(alert.alertId)} disabled={actionLoading === alert.alertId} className="text-[10px] px-3 py-1.5 bg-orange-500/10 text-orange-400 rounded-lg font-semibold hover:bg-orange-500/20 transition-colors disabled:opacity-50">
                    {actionLoading === alert.alertId ? "Evacuating..." : "Evacuate"}
                  </button>
                  <button onClick={() => router.push(`/heatmap?zone=${alert.zoneId}`)} className="text-[10px] px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg font-semibold hover:bg-indigo-500/20 transition-colors">
                    View on Heatmap
                  </button>
                  <button className="text-[10px] px-3 py-1.5 bg-white/[0.03] text-gray-500 rounded-lg font-semibold hover:bg-white/[0.06] transition-colors">
                    View Evidence
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Stats */}
        <div className="w-[320px] flex-shrink-0 space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Alerts by Severity</h3>
            <AlertBarChart data={barData} />
          </div>

          {/* 8-Hour Frequency Chart */}
          <div className="glass-card p-5">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">8-Hour Frequency</h3>
            <div className="space-y-1.5">
              {freqData.map(b => (
                <div key={b.hour} className="flex items-center gap-2.5 text-[10px]">
                  <span className="text-gray-500 w-12 text-right">{b.hour}</span>
                  <div className="flex-1 h-3 bg-white/[0.03] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (b.count / Math.max(...freqData.map(x => x.count), 1)) * 100)}%`, backgroundColor: b.color }}
                    />
                  </div>
                  <span className="text-gray-400 font-mono-data font-bold w-4 text-right">{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5 space-y-3">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Statistics</h3>
            {[
              { label: "Total (Shift)", value: alerts.length, color: "" },
              { label: "Acknowledged", value: alerts.filter(a => a.acknowledged).length, color: "text-blue-400" },
              { label: "Resolved", value: alerts.filter(a => a.resolved).length, color: "text-emerald-400" },
              { label: "Unacknowledged", value: alerts.filter(a => !a.acknowledged && !a.resolved).length, color: "text-red-400" },
            ].map(s => (
              <div key={s.label} className="flex justify-between text-[11px]">
                <span className="text-gray-500">{s.label}</span>
                <span className={cn("font-bold", s.color)}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
