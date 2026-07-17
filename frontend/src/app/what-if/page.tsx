"use client";

import { useState, useCallback } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { RiskScoreGauge, CompoundRiskPanel } from "@/components/dashboard/index";
import { api } from "@/lib/api";
import type { WhatIfResult, WhatIfScenario, WhatIfOverrides } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RefreshCw, Zap, AlertTriangle, CheckCircle, XCircle, ArrowRight } from "lucide-react";

const SCENARIO_DEFAULTS: WhatIfScenario = {
  ventilationOffline: false,
  hotWorkPermitActive: false,
  shiftChangeover: false,
  gasLeakZoneA: false,
  maintenanceInZoneB: false,
};

const OVERRIDE_DEFAULTS: WhatIfOverrides = {
  CH4: 0,
  CO: 0,
  H2S: 0,
  O2: 20.9,
};

export default function WhatIfPage() {
  const [scenarioFlags, setScenarioFlags] = useState<WhatIfScenario>(SCENARIO_DEFAULTS);
  const [overrides, setOverrides] = useState<WhatIfOverrides>(OVERRIDE_DEFAULTS);
  const [selectedZone, setSelectedZone] = useState("ZONE_A");
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeAnimations, setActiveAnimations] = useState<string[]>([]);

  const toggleScenario = (key: keyof WhatIfScenario) => {
    setScenarioFlags(prev => {
      const next = { ...prev, [key]: !prev[key] };
      return next;
    });
  };

  const updateOverride = (key: keyof WhatIfOverrides, value: number) => {
    setOverrides(prev => ({ ...prev, [key]: value }));
  };

  const runSimulation = useCallback(async () => {
    setLoading(true);
    setActiveAnimations([]);
    try {
      const res = await api.runWhatIf({
        zoneId: selectedZone,
        overrides: overrides as Record<string, number>,
        scenarioFlags: scenarioFlags as Record<string, boolean>,
      });
      if (res?.data) {
        setResult(res.data);
        const activeRules = res.data.triggeredRules.filter(r => r.scenario).map(r => r.ruleId);
        setActiveAnimations(activeRules);
      }
    } catch {
      const simulated: WhatIfResult = {
        zoneId: selectedZone,
        riskScore: 0,
        riskLevel: "SAFE",
        triggeredRules: [],
        appliedOverrides: overrides,
        scenarioFlags,
        sensorReadings: {},
        timestamp: new Date().toISOString(),
      };
      let totalRisk = 18;
      const triggered = [];
      if (scenarioFlags.ventilationOffline) { totalRisk += 35; triggered.push({ ruleId: "RULE_6", description: "Ventilation offline + confined space", contribution: 35, severity: "CRITICAL", scenario: true }); }
      if (scenarioFlags.hotWorkPermitActive) { totalRisk += 25; triggered.push({ ruleId: "RULE_2", description: "Hot work + flammable gas risk", contribution: 25, severity: "CRITICAL", scenario: true }); }
      if (scenarioFlags.shiftChangeover) { totalRisk += 15; triggered.push({ ruleId: "RULE_4", description: "Shift changeover imminent", contribution: 15, severity: "MEDIUM", scenario: true }); }
      if (scenarioFlags.gasLeakZoneA) { totalRisk += 30; triggered.push({ ruleId: "RULE_1", description: "Confined space + elevated gas leak", contribution: 30, severity: "CRITICAL", scenario: true }); }
      if (scenarioFlags.maintenanceInZoneB) { totalRisk += 20; triggered.push({ ruleId: "RULE_3", description: "Maintenance + pressure anomaly", contribution: 20, severity: "HIGH", scenario: true }); }
      const ch4 = overrides.CH4 || 0;
      const co = overrides.CO || 0;
      if (ch4 > 10 || co > 25) { totalRisk += 15; }
      totalRisk = Math.min(100, Math.max(5, totalRisk));
      const level = totalRisk > 75 ? "CRITICAL" : totalRisk > 50 ? "HIGH" : totalRisk > 25 ? "CAUTION" : "SAFE" as const;
      simulated.riskScore = totalRisk;
      simulated.riskLevel = level;
      simulated.triggeredRules = triggered;
      setResult(simulated);
    } finally {
      setLoading(false);
    }
  }, [selectedZone, overrides, scenarioFlags]);

  const resetAll = () => {
    setScenarioFlags(SCENARIO_DEFAULTS);
    setOverrides(OVERRIDE_DEFAULTS);
    setResult(null);
    setActiveAnimations([]);
  };

  return (
    <PageWrapper title="What-If Simulator" subtitle="Model compound risk scenarios in real-time">
      <div className="grid grid-cols-5 gap-4">
        {/* Controls Panel */}
        <div className="col-span-2 space-y-4">
          {/* Scenario Toggles */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Scenario Toggles</h3>
            <div className="space-y-2.5">
              {[
                { key: "ventilationOffline" as keyof WhatIfScenario, label: "Ventilation Offline", desc: "Zone ventilation system failure" },
                { key: "hotWorkPermitActive" as keyof WhatIfScenario, label: "Hot Work Permit Active", desc: "Welding / cutting in progress" },
                { key: "shiftChangeover" as keyof WhatIfScenario, label: "Shift Changeover", desc: "Handover between shifts" },
                { key: "gasLeakZoneA" as keyof WhatIfScenario, label: "Gas Leak — Zone A", desc: "CH4 / CO leak in Coke Oven" },
                { key: "maintenanceInZoneB" as keyof WhatIfScenario, label: "Maintenance — Zone B", desc: "Electrical work in Blast Furnace" },
              ].map(({ key, label, desc }) => {
                const active = scenarioFlags[key];
                return (
                  <button
                    key={key}
                    onClick={() => toggleScenario(key)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-300 text-left",
                      active
                        ? "bg-amber-500/[0.08] border-amber-500/30"
                        : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {active ? (
                          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-gray-600 shrink-0" />
                        )}
                        <span className={cn("text-sm font-medium", active ? "text-amber-300" : "text-gray-400")}>{label}</span>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-0.5 ml-6">{desc}</p>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                      active ? "bg-amber-500 border-amber-500" : "border-gray-600"
                    )}>
                      {active && <span className="text-white text-[10px]">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gas Override Sliders */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Gas Level Overrides</h3>
            <div className="space-y-4">
              {[
                { key: "CH4" as keyof WhatIfOverrides, label: "CH4 (%LEL)", min: 0, max: 50, step: 0.5 },
                { key: "CO" as keyof WhatIfOverrides, label: "CO (ppm)", min: 0, max: 100, step: 1 },
                { key: "H2S" as keyof WhatIfOverrides, label: "H2S (ppm)", min: 0, max: 20, step: 0.5 },
                { key: "O2" as keyof WhatIfOverrides, label: "O2 (%)", min: 15, max: 25, step: 0.1 },
              ].map(({ key, label, min, max, step }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-400">{label}</span>
                    <span className="text-sm font-bold font-mono-data text-gray-200">{overrides[key]}</span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={overrides[key] || 0}
                    onChange={(e) => updateOverride(key, parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/[0.06] rounded-full appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                    <span>{min}</span>
                    <span>{max}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={runSimulation}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold text-sm hover:from-blue-500 hover:to-cyan-500 transition-all disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? "Simulating..." : "Run Simulation"}
            </button>
            <button
              onClick={resetAll}
              className="px-5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-400 font-medium text-sm hover:bg-white/[0.06] transition-all"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="col-span-3 space-y-4">
          {/* Risk Meter */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Calculated Risk</h3>
            <div className="flex items-center justify-center">
              <RiskScoreGauge score={result?.riskScore || 0} size={180} />
            </div>
          </div>

          {/* Triggered Rules */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Compound Rules</h3>
            {result && result.triggeredRules.length > 0 ? (
              <div className="space-y-2.5">
                {result.triggeredRules.map((rule) => {
                  const isAnimating = activeAnimations.includes(rule.ruleId);
                  const sevStyle = rule.severity === "CRITICAL"
                    ? { bg: "bg-red-500/[0.06]", border: "border-red-500/20", text: "text-red-400" }
                    : rule.severity === "HIGH"
                    ? { bg: "bg-orange-500/[0.06]", border: "border-orange-500/20", text: "text-orange-400" }
                    : { bg: "bg-amber-500/[0.06]", border: "border-amber-500/20", text: "text-amber-400" };
                  return (
                    <div
                      key={rule.ruleId}
                      className={cn(
                        "rounded-xl border p-4 transition-all duration-500",
                        sevStyle.bg,
                        sevStyle.border,
                        isAnimating && "animate-pulse"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{rule.ruleId}</span>
                          {rule.scenario && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">SCENARIO</span>
                          )}
                        </div>
                        <span className={cn("text-xs font-black font-mono-data", sevStyle.text)}>+{rule.contribution}</span>
                      </div>
                      <p className="text-[12px] font-medium text-gray-300 leading-snug">{rule.description}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-sm text-gray-500">No compound rules triggered</p>
                <p className="text-[10px] text-gray-600 mt-1">Toggle scenarios above to simulate risks</p>
              </div>
            )}
          </div>

          {/* Sensor Readings */}
          {result && Object.keys(result.sensorReadings).length > 0 && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Simulated Sensor Readings</h3>
              <div className="grid grid-cols-3 gap-2.5">
                {Object.entries(result.sensorReadings).map(([type, value]) => {
                  const isElevated = (type === "CH4" && value > 10) || (type === "CO" && value > 25) || (type === "H2S" && value > 5) || (type === "O2" && (value < 19.5 || value > 23.5));
                  return (
                    <div key={type} className={cn(
                      "rounded-xl border p-3",
                      isElevated ? "bg-red-500/[0.06] border-red-500/20" : "bg-white/[0.02] border-white/[0.06]"
                    )}>
                      <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">{type}</div>
                      <div className={cn("text-lg font-bold font-mono-data", isElevated ? "text-red-400" : "text-gray-200")}>
                        {typeof value === "number" ? value.toFixed(1) : value}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
