"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { RiskScoreGauge, SensorCard, AlertFeed, ZoneStatusGrid, CompoundRiskPanel } from "@/components/dashboard/index";
import WithWithoutComparison from "@/components/dashboard/WithWithoutComparison";
import { SensorTimeSeriesChart, RiskTrendChart } from "@/components/charts/index";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/websocket";
import type { PlantState, Alert as AlertType, ZonePredictions, RiskPredictionPoint } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  const [plantState, setPlantState] = useState<PlantState | null>(null);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [sensorHistory, setSensorHistory] = useState<Record<string, { timestamp: string; value: number }[]>>({});
  const [riskTrend, setRiskTrend] = useState<Array<{ time: string; score: number }>>([]);
  const [selectedZone, setSelectedZone] = useState<string>("ZONE_A");
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<ZonePredictions | null>(null);
  const [predictionPoints, setPredictionPoints] = useState<RiskPredictionPoint[]>([]);
  const [predictionWarning, setPredictionWarning] = useState<string | null>(null);
  const plantRef = useRef<PlantState | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [demoRes, alertRes, historyRes, riskHistRes, predRes] = await Promise.all([
        api.getPlantState(),
        api.getAlerts(true),
        api.getSensorHistory(selectedZone),
        api.getRiskHistory(),
        api.getRiskPredictions(selectedZone).catch(() => null),
      ]);
      if (demoRes.data) {
        setPlantState(demoRes.data);
        plantRef.current = demoRes.data;
      }
      if (alertRes.data) setAlerts(alertRes.data);
      if (historyRes.data) setSensorHistory(historyRes.data);
      if (riskHistRes.data) {
        setRiskTrend(riskHistRes.data.map(r => ({ time: r.timestamp, score: r.riskScore })));
      }
      if (predRes?.data) {
        setPredictions(predRes.data);
        const p = predRes.data;
        const now = new Date();
        const pts: RiskPredictionPoint[] = [
          { time: new Date(now.getTime() + 30 * 60000).toISOString(), score: p.forecastedRisk30, predicted: true },
          { time: new Date(now.getTime() + 60 * 60000).toISOString(), score: p.forecastedRisk60, predicted: true },
          { time: new Date(now.getTime() + 90 * 60000).toISOString(), score: p.forecastedRisk90, predicted: true },
        ];
        setPredictionPoints(pts);
        if (p.forecastedRisk30 > 75) {
          setPredictionWarning(`ML predicts risk reaching ${p.forecastedRisk30}/100 in 30 minutes — preemptive alert triggered`);
        } else if (p.forecastedRisk60 > 75) {
          setPredictionWarning(`ML predicts risk reaching ${p.forecastedRisk60}/100 in 60 minutes`);
        } else if (p.forecastedRisk90 > 75) {
          setPredictionWarning(`ML predicts risk reaching ${p.forecastedRisk90}/100 in 90 minutes`);
        } else {
          setPredictionWarning(null);
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedZone]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    wsClient.connect();
    const handleAlert = (data: AlertType) => {
      setAlerts(prev => prev.some(a => a.alertId === data.alertId) ? prev : [data, ...prev].slice(0, 50));
    };
    const handleRisk = (data: { zone_id: string; score: number; level: string }) => {
      setPlantState(prev => {
        if (!prev) return prev;
        type RL = import("@/lib/types").RiskLevel;
        const zones = prev.zones.map(z => z.zoneId === data.zone_id ? { ...z, riskScore: data.score, riskLevel: data.level as RL } : z);
        const overall = Math.round(zones.reduce((s, z) => s + z.riskScore, 0) / zones.length);
        return { ...prev, zones, overallRiskScore: overall, overallRiskLevel: data.level as RL };
      });
      setRiskTrend(prev => [...prev, { time: new Date().toISOString(), score: data.score }].slice(-240));
    };
    const handleSensor = (data: { zone_id: string; sensor_id: string; value: number; timestamp: string }) => {
      setSensorHistory(prev => {
        const sid = data.sensor_id;
        return { ...prev, [sid]: [...(prev[sid] || []), { timestamp: data.timestamp, value: data.value }].slice(-900) };
      });
    };
    wsClient.on("alert_new", handleAlert);
    wsClient.on("risk_update", handleRisk);
    wsClient.on("sensor_update", handleSensor);
    return () => {
      wsClient.off("alert_new", handleAlert);
      wsClient.off("risk_update", handleRisk);
      wsClient.off("sensor_update", handleSensor);
    };
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    await api.acknowledgeAlert(alertId);
    fetchData();
  };

  const extState = plantState as PlantState & { demoElapsed?: number; demoPhase?: number };

  if (loading || !plantState) {
    return (
      <div className="min-h-screen bg-[#060B18] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Initializing SentinelAI...</p>
        </div>
      </div>
    );
  }

  const selectedZoneData = plantState.zones.find(z => z.zoneId === selectedZone);
  const zoneSensors = selectedZoneData?.sensors || [];
  const criticalAlerts = alerts.filter(a => a.severity === "CRITICAL");
  const highAlerts = alerts.filter(a => a.severity === "HIGH");
  const mediumAlerts = alerts.filter(a => a.severity === "MEDIUM");

  return (
    <PageWrapper
      title="Dashboard"
      subtitle="Real-time plant monitoring and risk intelligence"
      riskLevel={plantState.overallRiskLevel}
      riskScore={plantState.overallRiskScore}
      alertCount={criticalAlerts.length + highAlerts.length}
      onRefresh={fetchData}
    >
      <div className={cn(
        "mb-5 px-5 py-3 rounded-xl border flex items-center justify-between transition-all duration-500",
        plantState.overallRiskLevel === "CRITICAL" ? "bg-red-500/[0.08] border-red-500/20" :
        plantState.overallRiskLevel === "HIGH" ? "bg-orange-500/[0.08] border-orange-500/20" :
        plantState.overallRiskLevel === "CAUTION" ? "bg-amber-500/[0.08] border-amber-500/20" :
        "bg-emerald-500/[0.06] border-emerald-500/20"
      )}>
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full",
            plantState.overallRiskLevel === "CRITICAL" ? "bg-red-500 animate-pulse" :
            plantState.overallRiskLevel === "HIGH" ? "bg-orange-500" :
            plantState.overallRiskLevel === "CAUTION" ? "bg-amber-500" : "bg-emerald-500"
          )} />
          <span className="text-sm font-bold text-gray-200">PLANT STATUS: {plantState.overallRiskLevel}</span>
          <span className="text-gray-700">|</span>
          <span className="text-sm text-gray-400">{plantState.zones.filter(z => z.riskScore > 25).length} Zones Elevated</span>
          <span className="text-gray-700">|</span>
          <span className="text-sm text-gray-400">{plantState.flaggedPermits} Permits Flagged</span>
        </div>
        <span className="text-[11px] text-gray-600 font-mono-data">
          T+{extState.demoElapsed || 0}s · Phase {extState.demoPhase || 0}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-4">Overall Plant Risk</h3>
          <RiskScoreGauge score={plantState.overallRiskScore} size={140} />
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-4">Active Alerts</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-xs text-gray-400">Critical</span></div>
              <span className="text-2xl font-black font-mono-data text-red-400">{criticalAlerts.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500" /><span className="text-xs text-gray-400">High</span></div>
              <span className="text-2xl font-black font-mono-data text-orange-400">{highAlerts.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-xs text-gray-400">Medium</span></div>
              <span className="text-xl font-bold font-mono-data text-amber-400">{mediumAlerts.length}</span>
            </div>
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-4">Permit Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-xs text-gray-400">Active</span></div>
              <span className="text-2xl font-black font-mono-data text-blue-400">{plantState.zones.reduce((s, z) => s + z.activePermits, 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-xs text-gray-400">Flagged</span></div>
              <span className="text-2xl font-black font-mono-data text-red-400">{plantState.flaggedPermits}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-xs text-gray-400">Suspended</span></div>
              <span className="text-xl font-bold font-mono-data text-amber-400">0</span>
            </div>
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-4">Worker Safety</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-xs text-gray-400">Critical Zones</span></div>
              <span className="text-2xl font-black font-mono-data text-red-400">{plantState.workersAtRisk}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500" /><span className="text-xs text-gray-400">Elevated Zones</span></div>
              <span className="text-2xl font-black font-mono-data text-orange-400">{plantState.zones.filter(z => z.riskScore > 50).reduce((s, z) => s + z.workerCount, 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-500" /><span className="text-xs text-gray-400">Total On-Shift</span></div>
              <span className="text-xl font-bold font-mono-data text-gray-300">{plantState.zones.reduce((s, z) => s + z.workerCount, 0)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-5">
        <div className="col-span-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sensor Readings — Live</h3>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="text-[11px] bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-gray-300 focus:outline-none focus:border-blue-500/50"
            >
              {plantState.zones.map(z => (
                <option key={z.zoneId} value={z.zoneId}>{z.name}</option>
              ))}
            </select>
          </div>
          <SensorTimeSeriesChart
            data={sensorHistory}
            thresholds={{ CH4: { warning: 10, critical: 25 }, CO: { warning: 25, critical: 50 }, H2S: { warning: 5, critical: 10 } }}
          />
          <div className="grid grid-cols-3 gap-2.5 mt-4">
            {zoneSensors.slice(0, 6).map(s => (
              <SensorCard key={s.sensorId} label={s.type} value={s.value} unit={s.unit} status={s.status} />
            ))}
          </div>
        </div>
        <div className="col-span-2 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Live Alert Feed</h3>
          <AlertFeed alerts={alerts} onAcknowledge={handleAcknowledge} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Compound Risk Detection</h3>
          <CompoundRiskPanel rules={
            plantState.zones[0]?.riskScore > 25 ? [
              ...(plantState.zones[0]?.riskScore > 50 ? [{ ruleId: "RULE_6", description: "Ventilation offline + confined space — CRITICAL", contribution: 35, severity: "CRITICAL" as const }] : []),
              ...(plantState.zones[0]?.riskScore > 40 ? [{ ruleId: "RULE_1", description: "Confined space + elevated gas detected", contribution: 25, severity: "CRITICAL" as const }] : []),
              ...(plantState.zones[0]?.riskScore > 45 ? [{ ruleId: "RULE_5", description: "Multiple permits active in same zone", contribution: 15, severity: "MEDIUM" as const }] : []),
            ] : []
          } />
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Zone Status</h3>
          <ZoneStatusGrid zones={plantState.zones} />
        </div>
      </div>

      <WithWithoutComparison />

      {predictionWarning && (
        <div className="mb-4 px-5 py-3 rounded-xl border bg-purple-500/[0.08] border-purple-500/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-purple-400 shrink-0" />
          <span className="text-sm text-purple-200">{predictionWarning}</span>
        </div>
      )}

      <div className="grid grid-cols-5 gap-4 mb-5">
        <div className="col-span-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Plant Risk Trend</h3>
          <RiskTrendChart data={riskTrend} predictions={predictionPoints} />
        </div>
        <div className="col-span-2 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">ML Risk Forecast</h3>
          {predictions ? (
            <div className="space-y-3">
              {[
                { label: "30 min", risk: predictions.forecastedRisk30, time: "30" },
                { label: "60 min", risk: predictions.forecastedRisk60, time: "60" },
                { label: "90 min", risk: predictions.forecastedRisk90, time: "90" },
              ].map((item) => {
                const color = item.risk > 75 ? "text-red-400" : item.risk > 50 ? "text-orange-400" : item.risk > 25 ? "text-amber-400" : "text-emerald-400";
                const Icon = item.risk > (predictions.currentRisk || 0) ? TrendingUp : TrendingDown;
                return (
                  <div key={item.time} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <Icon className={cn("w-4 h-4", color)} />
                      <span className="text-sm text-gray-400">t+{item.label}</span>
                    </div>
                    <span className={cn("text-lg font-bold font-mono-data", color)}>{item.risk}</span>
                  </div>
                );
              })}
              <div className="text-[10px] text-gray-600 text-center pt-1">
                Confidence: {(predictions as any).predictions?.CH4?.["t30"]?.interval?.confidence ? `${Math.round((predictions as any).predictions.CH4["t30"].interval.confidence * 100)}%` : "N/A"}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[120px] text-gray-600 text-sm">
              Prediction model unavailable
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
