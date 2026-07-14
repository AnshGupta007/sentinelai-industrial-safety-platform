"use client";

import { cn, getRiskColor } from "@/lib/utils";

interface RiskScoreGaugeProps {
  score: number;
  size?: number;
}

export function RiskScoreGauge({ score, size = 150 }: RiskScoreGaugeProps) {
  const radius = (size - 24) / 2;
  const circumference = Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = getRiskColor(score);
  const level = score <= 25 ? "SAFE" : score <= 50 ? "CAUTION" : score <= 75 ? "HIGH" : "CRITICAL";
  const cx = size / 2;
  const cy = size / 2 + 4;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        {/* Track */}
        <path
          d={`M 12 ${cy} A ${radius} ${radius} 0 0 1 ${size - 12} ${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Glow */}
        <path
          d={`M 12 ${cy} A ${radius} ${radius} 0 0 1 ${size - 12} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
          className="transition-all duration-1000 ease-out"
        />
        {/* Tick marks at 25, 50, 75 */}
        {[25, 50, 75].map(pct => {
          const angle = Math.PI * (1 - pct / 100);
          const x1 = cx + (radius - 8) * Math.cos(angle);
          const y1 = cy - (radius - 8) * Math.sin(angle);
          const x2 = cx + (radius + 8) * Math.cos(angle);
          const y2 = cy - (radius + 8) * Math.sin(angle);
          return <line key={pct} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
        })}
      </svg>
      <div className="text-center -mt-1">
        <div className="text-4xl font-black font-mono-data tracking-tighter" style={{ color }}>{score}</div>
        <div className={cn(
          "text-[10px] font-bold uppercase tracking-widest mt-0.5",
          score <= 25 ? "text-emerald-400" : score <= 50 ? "text-amber-400" : score <= 75 ? "text-orange-400" : "text-red-400"
        )}>
          {level}
        </div>
      </div>
    </div>
  );
}

interface SensorCardProps {
  label: string;
  value: number;
  unit: string;
  status: "NORMAL" | "WARNING" | "CRITICAL";
}

export function SensorCard({ label, value, unit, status }: SensorCardProps) {
  const borderColor = status === "CRITICAL" ? "border-red-500/30" : status === "WARNING" ? "border-amber-500/30" : "border-white/[0.06]";
  const glowColor = status === "CRITICAL" ? "shadow-red-500/5" : status === "WARNING" ? "shadow-amber-500/5" : "";
  const valueColor = status === "CRITICAL" ? "text-red-400" : status === "WARNING" ? "text-amber-400" : "text-gray-100";
  const statusBg = status === "CRITICAL" ? "bg-red-500/15 text-red-400" : status === "WARNING" ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/10 text-emerald-400";

  return (
    <div className={cn("rounded-xl border p-3 bg-white/[0.02] backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.04]", borderColor, glowColor)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{label}</span>
        <span className={cn("text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase", statusBg)}>{status}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-xl font-bold font-mono-data", valueColor)}>{typeof value === "number" ? value.toFixed(1) : value}</span>
        <span className="text-[10px] text-gray-600">{unit}</span>
      </div>
    </div>
  );
}

interface AlertFeedProps {
  alerts: Array<{
    alertId: string;
    severity: string;
    title: string;
    description: string;
    zoneId: string;
    timestamp: string;
    acknowledged: boolean;
  }>;
  onAcknowledge?: (id: string) => void;
}

export function AlertFeed({ alerts, onAcknowledge }: AlertFeedProps) {
  const severityLeftBorder: Record<string, string> = {
    CRITICAL: "border-l-red-500",
    HIGH: "border-l-orange-500",
    MEDIUM: "border-l-amber-500",
    LOW: "border-l-blue-500",
  };
  const severityBadge: Record<string, string> = {
    CRITICAL: "bg-red-500/15 text-red-400",
    HIGH: "bg-orange-500/15 text-orange-400",
    MEDIUM: "bg-amber-500/15 text-amber-400",
    LOW: "bg-blue-500/15 text-blue-400",
  };

  return (
    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
      {alerts.length === 0 && (
        <div className="text-center py-12">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <span className="text-emerald-400 text-lg">✓</span>
          </div>
          <p className="text-sm text-gray-500">All clear — no active alerts</p>
        </div>
      )}
      {alerts.map((alert) => (
        <div key={alert.alertId} className={cn(
          "rounded-lg border-l-[3px] p-3 bg-white/[0.02] border border-white/[0.06] transition-all duration-200 hover:bg-white/[0.04]",
          severityLeftBorder[alert.severity] || "border-l-gray-600"
        )}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase", severityBadge[alert.severity] || "bg-gray-600/15 text-gray-400")}>
                {alert.severity}
              </span>
              <span className="text-[11px] text-gray-500 font-medium">{alert.zoneId}</span>
            </div>
            <span className="text-[10px] text-gray-600 font-mono-data">
              {new Date(alert.timestamp).toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
          <p className="text-[12px] font-semibold text-gray-200">{alert.title}</p>
          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{alert.description}</p>
          {!alert.acknowledged && onAcknowledge && (
            <button
              onClick={() => onAcknowledge(alert.alertId)}
              className="text-[10px] text-blue-400 hover:text-blue-300 mt-2 font-semibold"
            >
              Acknowledge →
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

interface ZoneStatusGridProps {
  zones: Array<{
    zoneId: string;
    name: string;
    riskScore: number;
    riskLevel: string;
    activePermits: number;
    workerCount: number;
  }>;
  onZoneClick?: (zoneId: string) => void;
}

export function ZoneStatusGrid({ zones, onZoneClick }: ZoneStatusGridProps) {
  const getZoneBg = (level: string) => {
    switch (level) {
      case "CRITICAL": return "bg-red-500/[0.06] border-red-500/20 hover:border-red-500/40";
      case "HIGH": return "bg-orange-500/[0.06] border-orange-500/20 hover:border-orange-500/40";
      case "CAUTION": return "bg-amber-500/[0.06] border-amber-500/20 hover:border-amber-500/40";
      default: return "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]";
    }
  };
  const getZoneDot = (level: string) => {
    switch (level) {
      case "CRITICAL": return "bg-red-500 shadow-red-500/50 shadow-sm";
      case "HIGH": return "bg-orange-500";
      case "CAUTION": return "bg-amber-500";
      default: return "bg-emerald-500";
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {zones.map((zone) => (
        <button
          key={zone.zoneId}
          onClick={() => onZoneClick?.(zone.zoneId)}
          className={cn("rounded-xl border p-3.5 text-left transition-all duration-200", getZoneBg(zone.riskLevel))}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("w-2 h-2 rounded-full", getZoneDot(zone.riskLevel), zone.riskLevel === "CRITICAL" && "animate-pulse")} />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{zone.zoneId}</span>
          </div>
          <p className="text-[12px] font-semibold text-gray-200 mb-2 leading-tight">{zone.name}</p>
          <div className="flex items-center justify-between">
            <span className="font-mono-data font-black text-lg" style={{ color: getRiskColor(zone.riskScore) }}>
              {zone.riskScore}
            </span>
            <div className="text-right text-[10px] text-gray-600">
              <div>{zone.workerCount} workers</div>
              <div>{zone.activePermits} permits</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

interface CompoundRiskPanelProps {
  rules: Array<{
    ruleId: string;
    description: string;
    contribution: number;
    severity: string;
  }>;
}

export function CompoundRiskPanel({ rules }: CompoundRiskPanelProps) {
  if (rules.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <span className="text-emerald-400 text-lg">✓</span>
        </div>
        <p className="text-sm text-gray-500">No compound risks detected</p>
        <p className="text-[10px] text-gray-600 mt-1">All sensor & permit combinations are safe</p>
      </div>
    );
  }

  const severityStyles: Record<string, { bg: string; border: string; text: string }> = {
    CRITICAL: { bg: "bg-red-500/[0.06]", border: "border-red-500/20", text: "text-red-400" },
    HIGH: { bg: "bg-orange-500/[0.06]", border: "border-orange-500/20", text: "text-orange-400" },
    MEDIUM: { bg: "bg-amber-500/[0.06]", border: "border-amber-500/20", text: "text-amber-400" },
  };

  return (
    <div className="space-y-2.5">
      {rules.map((rule) => {
        const style = severityStyles[rule.severity] || severityStyles.MEDIUM;
        return (
          <div key={rule.ruleId} className={cn("rounded-xl border p-4", style.bg, style.border)}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{rule.ruleId}</span>
              <span className={cn("text-xs font-black font-mono-data", style.text)}>+{rule.contribution}</span>
            </div>
            <p className="text-[12px] font-medium text-gray-300 leading-snug">{rule.description}</p>
          </div>
        );
      })}
    </div>
  );
}
