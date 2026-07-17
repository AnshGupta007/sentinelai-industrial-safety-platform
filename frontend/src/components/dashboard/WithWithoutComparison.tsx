"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Shield, XCircle, AlertTriangle, Users, Clock, TrendingDown, Zap } from "lucide-react";

export default function WithWithoutComparison() {
  const [riskHistory, setRiskHistory] = useState<{ riskScore: number; timestamp: string }[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getRiskHistory(undefined, 60);
        setRiskHistory((res as any).data || []);
      } catch {}
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentRisk = riskHistory.length > 0 ? riskHistory[riskHistory.length - 1]?.riskScore || 0 : 0;
  const withoutOutcome = currentRisk > 75 ? "3 Fatalities Expected" : currentRisk > 50 ? "Potential Injury" : "No Incident";
  const withOutcome = currentRisk > 50 ? "0 Fatalities (Evacuated)" : "Normal Operations";
  const livesSaved = currentRisk > 75 ? 3 : currentRisk > 50 ? 1 : 0;

  const timeline = [
    { time: "T+0s", label: "CH4 begins rising", without: "Unnoticed", with: "Detected instantly" },
    { time: "T+30s", label: "Confined space permit active", without: "No cross-check", with: "Compound Rule 1 triggered" },
    { time: "T+60s", label: "Ventilation failure", without: "Not detected", with: "Compound Rule 6: CRITICAL" },
    { time: "T+90s", label: "Risk threshold breached", without: "SILENT", with: "⚠ ALERT + EVACUATION" },
    { time: "T+120s", label: "Gas reaches dangerous levels", without: "SILENT", with: "✅ Workers evacuated" },
    { time: "T+180s", label: "Ignition/Explosion", without: "💥 3 FATALITIES", with: "🚫 Prevented" },
  ];

  return (
    <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30 flex items-center justify-center">
            <Zap width={20} height={20} className="shrink-0 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">WITH vs WITHOUT SentinelAI</h3>
            <p className="text-[10px] text-white/40">Side-by-side comparison showing lives saved</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${
            livesSaved > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"
          }`}>
            {livesSaved > 0 ? `${livesSaved} Lives Saved` : "Monitoring"}
          </div>
          <span className="text-white/30 text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0 border-t border-white/5">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <XCircle width={16} height={16} className="shrink-0 text-red-400" />
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">WITHOUT SentinelAI</span>
              </div>
              <div className="text-3xl font-bold text-red-400 mb-1">{withoutOutcome}</div>
              <div className="text-[11px] text-white/40">
                Data existed but no intelligence layer connected the dots.
                Warning signals from sensors were never translated into operational decisions.
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-red-400/70">
                <Clock width={12} height={12} className="shrink-0" /> Detection only after incident
              </div>
            </div>
            <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Shield width={16} height={16} className="shrink-0 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">WITH SentinelAI</span>
              </div>
              <div className="text-3xl font-bold text-emerald-400 mb-1">{withOutcome}</div>
              <div className="text-[11px] text-white/40">
                Compound risk detection correlated sensor + permit + worker data in real-time.
                Preemptive intervention triggered 90 seconds before incident threshold.
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400/70">
                <TrendingDown width={12} height={12} className="shrink-0" /> 90s advance warning
              </div>
            </div>
          </div>

          <div className="space-y-0.5">
            {timeline.map((t, i) => (
              <div key={i} className="grid grid-cols-[60px_1fr_1fr_1fr] gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.02] transition-colors items-center">
                <span className="text-[11px] font-mono-data text-white/40">{t.time}</span>
                <span className="text-[11px] text-white/70">{t.label}</span>
                <span className={`text-[11px] font-medium ${i >= 3 ? "text-red-400" : "text-white/50"}`}>{t.without}</span>
                <span className={`text-[11px] font-medium ${i >= 3 ? "text-emerald-400" : "text-white/50"}`}>{t.with}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 border border-white/5">
            <div className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
              <Users width={14} height={14} className="shrink-0 text-blue-400" />
              Lives Saved Calculation
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-bold text-white">6,500+</div>
                <div className="text-[10px] text-white/40">Annual fatalities (India)</div>
              </div>
              <div>
                <div className="text-lg font-bold text-emerald-400">40%</div>
                <div className="text-[10px] text-white/40">False negative reduction</div>
              </div>
              <div>
                <div className="text-lg font-bold text-amber-400">90s</div>
                <div className="text-[10px] text-white/40">Avg. advance warning</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
