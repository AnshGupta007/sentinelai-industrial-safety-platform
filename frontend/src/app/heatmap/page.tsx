"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import PageWrapper from "@/components/layout/PageWrapper";
import { ZoneDetailDrawer } from "@/components/heatmap/ZoneDetailDrawer";
import { Slider } from "@/components/ui/slider";
import { wsClient } from "@/lib/websocket";
import { ZONE_CONFIG, PERMIT_CONFIG } from "@/lib/constants";
import type { PlantState, WorkerLocation, PermitType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const LeafletHeatmap = dynamic(
  () => import("@/components/heatmap/LeafletHeatmap").then(m => m.LeafletHeatmap),
  { ssr: false }
);

const PERMIT_TYPES = Object.keys(PERMIT_CONFIG) as PermitType[];

function HeatmapContent() {
  const [plantState, setPlantState] = useState<PlantState | null>(null);
  const [workers, setWorkers] = useState<WorkerLocation[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showWorkers, setShowWorkers] = useState(true);
  const [showPermits, setShowPermits] = useState(true);
  const [threshold, setThreshold] = useState(0);
  const [timeSlider, setTimeSlider] = useState(0);
  const [loading, setLoading] = useState(true);
  const [zoneFilters, setZoneFilters] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ZONE_CONFIG.map(z => [z.zoneId, true]))
  );
  const [permitTypeFilters, setPermitTypeFilters] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PERMIT_TYPES.map(t => [t, true]))
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const zoneParam = params.get("zone");
    if (zoneParam) setSelectedZone(zoneParam);
  }, []);
  const fetchData = useCallback(async () => {
    try {
      const [demoData, workerData] = await Promise.all([
        api.getPlantState(),
        api.getWorkers(),
      ]);
      if (demoData.data) {
        setPlantState(demoData.data);
        setTimeSlider((demoData.data as PlantState & { demoElapsed?: number }).demoElapsed ?? 0);
      }
      if (workerData.data) setWorkers(workerData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    wsClient.connect();
    const handleRisk = (data: { zone_id: string; score: number; level: string }) => {
      setPlantState(prev => {
        if (!prev) return prev;
        type RL = import("@/lib/types").RiskLevel;
        const zones = prev.zones.map(z => z.zoneId === data.zone_id ? { ...z, riskScore: data.score, riskLevel: data.level as RL } : z);
        const overall = Math.round(zones.reduce((s, z) => s + z.riskScore, 0) / zones.length);
        return { ...prev, zones, overallRiskScore: overall, overallRiskLevel: data.level as RL };
      });
    };
    wsClient.on("risk_update", handleRisk);
    return () => wsClient.off("risk_update", handleRisk);
  }, []);

  const toggleZoneFilter = (zoneId: string) => {
    setZoneFilters(prev => ({ ...prev, [zoneId]: !prev[zoneId] }));
  };

  const togglePermitTypeFilter = (type: string) => {
    setPermitTypeFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  if (loading || !plantState) {
    return <div className="min-h-screen bg-[#060B18] flex items-center justify-center"><div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const selectedZoneData = selectedZone ? plantState.zones.find(z => z.zoneId === selectedZone) : null;
  const selectedWorkers = selectedZone ? workers.filter(w => w.zoneId === selectedZone) : [];

  const filteredZones = plantState.zones.filter(z => z.riskScore >= threshold && zoneFilters[z.zoneId]);
  const filteredWorkers = workers.filter(w => {
    const zone = plantState.zones.find(z => z.zoneId === w.zoneId);
    return zone && zone.riskScore >= threshold && zoneFilters[w.zoneId];
  });

  const extState = plantState as PlantState & { demoElapsed?: number };

  return (
    <PageWrapper
      title="Plant Heatmap"
      subtitle="Geospatial safety visualization"
      riskLevel={plantState.overallRiskLevel}
      riskScore={plantState.overallRiskScore}
      alertCount={plantState.activeAlerts}
      onRefresh={fetchData}
    >
      {/* Controls Bar */}
      <div className="flex items-start gap-4 mb-4 glass-card p-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Time Slider Replay */}
          <div className="flex items-center gap-2.5 min-w-[180px]">
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Timeline</span>
            <Slider value={timeSlider} onChange={setTimeSlider} min={0} max={120} step={1} className="w-28" />
            <span className="text-[10px] text-blue-400 font-mono-data font-bold w-8">T+{timeSlider}s</span>
          </div>

          {/* Risk Threshold Slider */}
          <div className="flex items-center gap-2.5 min-w-[160px]">
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Min Risk</span>
            <Slider value={threshold} onChange={setThreshold} min={0} max={100} step={5} className="w-28" />
            <span className="text-[10px] font-mono-data font-bold w-8" style={{ color: threshold > 75 ? "#EF4444" : threshold > 50 ? "#F97316" : threshold > 25 ? "#F59E0B" : "#10B981" }}>
              &gt;{threshold}
            </span>
          </div>

          {/* Layer Toggles */}
          {[
            { label: "Workers", key: showWorkers, set: () => setShowWorkers(!showWorkers), color: "bg-white" },
            { label: "Permits", key: showPermits, set: () => setShowPermits(!showPermits), color: "bg-amber-400" },
          ].map(t => (
            <label key={t.label} className="flex items-center gap-1.5 text-[10px] text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">
              <input type="checkbox" checked={t.key} onChange={t.set} className="rounded bg-white/[0.04] border-white/[0.08]" />
              <span className={cn("w-2 h-2 rounded-full", t.color)} />
              {t.label}
            </label>
          ))}
        </div>

        {/* Zone Filters */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">Zones</span>
          {ZONE_CONFIG.map(z => (
            <label key={z.zoneId} className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">
              <input type="checkbox" checked={zoneFilters[z.zoneId]} onChange={() => toggleZoneFilter(z.zoneId)} className="rounded bg-white/[0.04] border-white/[0.08]" />
              {z.name.split(" ")[0]}
            </label>
          ))}
        </div>

        {/* Permit Type Filters */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">Permits</span>
          {PERMIT_TYPES.map(t => (
            <label key={t} className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">
              <input type="checkbox" checked={permitTypeFilters[t]} onChange={() => togglePermitTypeFilter(t)} className="rounded bg-white/[0.04] border-white/[0.08]" />
              {PERMIT_CONFIG[t].label.split(" ")[0]}
            </label>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 ml-auto">
          {[
            { color: "bg-emerald-500", label: "Safe (0–25)" },
            { color: "bg-amber-500", label: "Caution (26–50)" },
            { color: "bg-orange-500", label: "High (51–75)" },
            { color: "bg-red-500", label: "Critical (76–100)" },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1 text-[9px] text-gray-600">
              <span className={cn("w-1.5 h-1.5 rounded-full", l.color)} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-5">
        {/* Main Heatmap */}
        <div className="flex-1 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Plant Layout — Risk Overlay
              {threshold > 0 && <span className="text-amber-400 ml-2">(≥{threshold} threshold)</span>}
            </h3>
            <span className="text-[10px] text-gray-600 font-mono-data">
              {filteredZones.length}/{plantState.zones.length} zones · {filteredWorkers.length} workers
            </span>
          </div>

          <LeafletHeatmap
            plantState={{ ...plantState, zones: filteredZones }}
            workers={filteredWorkers}
            showWorkers={showWorkers}
            selectedZone={selectedZone}
            onZoneClick={setSelectedZone}
          />

          {/* Permit overlay badges */}
          {showPermits && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {filteredZones.filter(z => z.activePermits > 0).map(z => (
                <span key={z.zoneId} className="text-[9px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/15">
                  {z.name}: {z.activePermits} permit{z.activePermits > 1 ? "s" : ""}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="w-[300px] flex-shrink-0 space-y-4">
          {/* Zone Detail Drawer */}
          {selectedZone && selectedZoneData ? (
            <ZoneDetailDrawer
              zone={selectedZoneData}
              workers={selectedWorkers}
              onClose={() => setSelectedZone(null)}
            />
          ) : (
            <div className="glass-card p-5">
              <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Zone Summary</h3>
              <div className="space-y-1.5">
                {plantState.zones.map(z => (
                  <button
                    key={z.zoneId}
                    onClick={() => setSelectedZone(z.zoneId)}
                    className={cn(
                      "w-full flex items-center justify-between text-[11px] p-2.5 rounded-lg transition-all duration-200",
                      selectedZone === z.zoneId ? "bg-blue-500/10 border border-blue-500/15" : "hover:bg-white/[0.03]"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("w-1.5 h-1.5 rounded-full", z.riskLevel === "CRITICAL" ? "bg-red-500" : z.riskLevel === "HIGH" ? "bg-orange-500" : z.riskLevel === "CAUTION" ? "bg-amber-500" : "bg-emerald-500")} />
                      <span className="text-gray-300">{z.name}</span>
                    </div>
                    <span className="font-mono-data font-bold text-xs" style={{ color: z.riskScore > 75 ? "#EF4444" : z.riskScore > 50 ? "#F97316" : z.riskScore > 25 ? "#F59E0B" : "#10B981" }}>
                      {z.riskScore}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="glass-card p-5">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Live Stats</h3>
            <div className="space-y-2.5">
              {[
                { label: "Demo Elapsed", value: `T+${extState.demoElapsed || 0}s`, color: "text-blue-400" },
                { label: "Workers On-Shift", value: workers.length, color: "" },
                { label: "Active Permits", value: plantState.zones.reduce((s, z) => s + z.activePermits, 0), color: "text-amber-400" },
                { label: "Flagged Permits", value: plantState.flaggedPermits, color: "text-red-400" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">{s.label}</span>
                  <span className={cn("font-bold font-mono-data", s.color)}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

export default function HeatmapPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060B18]" />}>
      <HeatmapContent />
    </Suspense>
  );
}
