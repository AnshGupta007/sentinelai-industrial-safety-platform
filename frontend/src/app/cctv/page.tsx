"use client";

import { useState, useEffect, useCallback } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { api } from "@/lib/api";
import type { PpeViolation, PpeCamera, PpeStats, PpeDetectionEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Layers, AlertTriangle, CheckCircle, RefreshCw, Users, Shield, XCircle } from "lucide-react";

const PPE_ITEM_LABELS: Record<string, string> = {
  helmet: "Helmet", vest: "Safety Vest", harness: "Harness", gloves: "Gloves", goggles: "Goggles",
};

const PPE_ITEM_COLORS: Record<string, string> = {
  helmet: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  vest: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  harness: "bg-red-500/15 text-red-400 border-red-500/20",
  gloves: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  goggles: "bg-purple-500/15 text-purple-400 border-purple-500/20",
};

const MOCK_CAMERAS: PpeCamera[] = [
  { cameraId: "CAM-A-01", zoneId: "ZONE_A", label: "Coke Oven — North Entry" },
  { cameraId: "CAM-A-02", zoneId: "ZONE_A", label: "Coke Oven — South Platform" },
  { cameraId: "CAM-B-01", zoneId: "ZONE_B", label: "Blast Furnace — Taphole" },
  { cameraId: "CAM-B-02", zoneId: "ZONE_B", label: "Blast Furnace — Cast House" },
  { cameraId: "CAM-C-01", zoneId: "ZONE_C", label: "Gas Processing — Valve Station" },
  { cameraId: "CAM-D-01", zoneId: "ZONE_D", label: "Control Room — Entry" },
  { cameraId: "CAM-E-01", zoneId: "ZONE_E", label: "Maintenance — Bay 1" },
  { cameraId: "CAM-F-01", zoneId: "ZONE_F", label: "Raw Material — Conveyor" },
];

export default function CctvPage() {
  const [cameras, setCameras] = useState<PpeCamera[]>(MOCK_CAMERAS);
  const [violations, setViolations] = useState<PpeViolation[]>([]);
  const [stats, setStats] = useState<PpeStats | null>(null);
  const [detectionLog, setDetectionLog] = useState<PpeDetectionEvent[]>([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoScan, setAutoScan] = useState(false);
  const [activeTab, setActiveTab] = useState<"live" | "violations" | "stats">("live");

  const fetchData = useCallback(async () => {
    try {
      const [vioRes, statRes, logRes, camRes] = await Promise.all([
        api.getPpeViolations().catch(() => null),
        api.getPpeStats().catch(() => null),
        api.getPpeDetectionLog(20).catch(() => null),
        api.getPpeCameras().catch(() => null),
      ]);
      if (vioRes?.data) setViolations(vioRes.data);
      if (statRes?.data) setStats(statRes.data);
      if (logRes?.data) setDetectionLog(logRes.data);
      if (camRes?.data) setCameras(camRes.data);
    } catch { /* fallback to mock */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await api.runPpeDetection();
      if (res.data?.violations) {
        setViolations(prev => [...res.data.violations, ...prev].slice(0, 100));
      }
      const [statRes, logRes] = await Promise.all([
        api.getPpeStats().catch(() => null),
        api.getPpeDetectionLog(20).catch(() => null),
      ]);
      if (statRes?.data) setStats(statRes.data);
      if (logRes?.data) setDetectionLog(logRes.data);
    } catch { /* fallback */ }
    setScanning(false);
  }, []);

  useEffect(() => {
    if (!autoScan) return;
    const interval = setInterval(runScan, 8000);
    return () => clearInterval(interval);
  }, [autoScan, runScan]);

  const handleAcknowledge = async (violationId: string) => {
    try {
      await api.acknowledgePpeViolation(violationId);
      setViolations(prev => prev.map(v => v.violationId === violationId ? { ...v, acknowledged: true } : v));
    } catch { /* fallback */ }
  };

  const activeViolations = violations.filter(v => !v.acknowledged);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060B18] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PageWrapper title="CCTV Analytics" subtitle="AI-powered PPE compliance monitoring">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Live Cameras</h3>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-2xl font-black font-mono-data text-cyan-400">{cameras.length}</span>
          <p className="text-[10px] text-gray-600 mt-1">All operational</p>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Active Violations</h3>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <span className="text-2xl font-black font-mono-data text-red-400">{activeViolations.length}</span>
          <p className="text-[10px] text-gray-600 mt-1">{stats?.totalViolations || 0} total detected</p>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Workers Scanned</h3>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-2xl font-black font-mono-data text-blue-400">{detectionLog.length}</span>
          <p className="text-[10px] text-gray-600 mt-1">Last detection cycle</p>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Scan Status</h3>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <span className={cn("text-lg font-black font-mono-data", autoScan ? "text-emerald-400" : "text-gray-500")}>
            {autoScan ? "AUTO" : "MANUAL"}
          </span>
          <button
            onClick={() => setAutoScan(!autoScan)}
            className={cn(
              "text-[10px] mt-1 px-2 py-0.5 rounded-full font-bold transition-colors",
              autoScan ? "bg-emerald-500/15 text-emerald-400" : "bg-white/[0.04] text-gray-500"
            )}
          >
            {autoScan ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("live")}
            className={cn("text-[11px] px-4 py-2 rounded-lg font-semibold transition-all", activeTab === "live" ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20" : "text-gray-500 hover:text-gray-300")}
          >
            Live Feed
          </button>
          <button
            onClick={() => setActiveTab("violations")}
            className={cn("text-[11px] px-4 py-2 rounded-lg font-semibold transition-all", activeTab === "violations" ? "bg-red-500/15 text-red-400 border border-red-500/20" : "text-gray-500 hover:text-gray-300")}
          >
            Violations {activeViolations.length > 0 && `(${activeViolations.length})`}
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={cn("text-[11px] px-4 py-2 rounded-lg font-semibold transition-all", activeTab === "stats" ? "bg-blue-500/15 text-blue-400 border border-blue-500/20" : "text-gray-500 hover:text-gray-300")}
          >
            Analytics
          </button>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold text-[12px] hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", scanning && "animate-spin")} />
          {scanning ? "Scanning..." : "Run Detection"}
        </button>
      </div>

      {activeTab === "live" && (
        <div className="grid grid-cols-4 gap-4">
          {cameras.map((cam) => {
            const latestEvent = detectionLog.find(e => e.cameraId === cam.cameraId);
            const hasViolation = activeViolations.some(v => v.zoneId === cam.zoneId);
            const allPresent = latestEvent ? Object.values(latestEvent.detected).every(Boolean) : true;
            return (
              <div
                key={cam.cameraId}
                className={cn(
                  "rounded-2xl border p-4 backdrop-blur-sm transition-all duration-200",
                  hasViolation ? "bg-red-500/[0.04] border-red-500/20" : "bg-white/[0.02] border-white/[0.06]"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={cn(
                    "text-[9px] px-2 py-0.5 rounded-full font-bold",
                    allPresent ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                  )}>
                    {allPresent ? "COMPLIANT" : "VIOLATION"}
                  </span>
                  <span className="text-[9px] text-gray-600">{cam.cameraId}</span>
                </div>
                <div className="relative mb-3">
                  <div className="aspect-video rounded-xl bg-[#040810] border border-white/[0.06] flex items-center justify-center overflow-hidden">
                    <svg className="w-8 h-8 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                    <div className={cn(
                      "absolute top-2 right-2 w-2 h-2 rounded-full",
                      hasViolation ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                    )} />
                  </div>
                </div>
                <p className="text-[11px] font-semibold text-gray-300 truncate">{cam.label}</p>
                <p className="text-[9px] text-gray-600 mt-0.5">{cam.zoneId}</p>
                {latestEvent && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(latestEvent.detected).map(([item, present]) => (
                      <span key={item} className={cn(
                        "text-[8px] px-1.5 py-0.5 rounded border",
                        present ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15" : "bg-red-500/10 text-red-400 border-red-500/15"
                      )}>
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "violations" && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">PPE Violations</h3>
          {activeViolations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm text-gray-500">No active PPE violations</p>
              <p className="text-[10px] text-gray-600 mt-1">All workers compliant with required safety gear</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeViolations.map((v) => (
                <div key={v.violationId} className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4 transition-all hover:bg-red-500/[0.06]">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="text-[12px] font-bold text-gray-200">{v.workerName}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-gray-500 font-mono">{v.workerId}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span>{v.zoneId}</span>
                        <span>·</span>
                        <span>{v.permitType}</span>
                        <span>·</span>
                        <span className="text-gray-600">{v.permitId}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAcknowledge(v.violationId)}
                      className="text-[10px] px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 font-semibold hover:bg-blue-500/20 transition-colors"
                    >
                      Acknowledge
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {v.missingItems.map((item) => (
                      <span key={item} className={cn("text-[10px] px-2 py-1 rounded-lg border font-medium", PPE_ITEM_COLORS[item] || "bg-gray-500/15 text-gray-400 border-gray-500/20")}>
                        {PPE_ITEM_LABELS[item] || item}
                      </span>
                    ))}
                  </div>
                  <p className="text-[9px] text-gray-600 mt-2">
                    {new Date(v.detectedAt).toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "stats" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Violations by Zone</h3>
            {stats && Object.keys(stats.byZone).length > 0 ? (
              <div className="space-y-2.5">
                {Object.entries(stats.byZone).map(([zone, count]) => (
                  <div key={zone} className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-400">{zone}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${Math.min(100, (count / Math.max(...Object.values(stats.byZone))) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[12px] font-mono-data font-bold text-red-400 w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600 text-sm">No zone data</div>
            )}
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Missing Equipment</h3>
            {stats && Object.keys(stats.byMissingItem).length > 0 ? (
              <div className="space-y-2.5">
                {Object.entries(stats.byMissingItem).map(([item, count]) => (
                  <div key={item} className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-400">{PPE_ITEM_LABELS[item] || item}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", item === "harness" ? "bg-red-500" : item === "helmet" ? "bg-blue-500" : item === "vest" ? "bg-amber-500" : "bg-purple-500")}
                          style={{ width: `${Math.min(100, (count / Math.max(...Object.values(stats.byMissingItem))) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[12px] font-mono-data font-bold text-gray-300 w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600 text-sm">No equipment data</div>
            )}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
