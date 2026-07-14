"use client";

import { Bell, RefreshCw } from "lucide-react";
import type { RiskLevel } from "@/lib/types";

interface TopNavProps {
  title: string;
  subtitle?: string;
  riskLevel?: RiskLevel;
  alertCount?: number;
  onRefresh?: () => void;
}

export default function TopNav({ title, subtitle, riskLevel, alertCount = 0, onRefresh }: TopNavProps) {
  const statusColor = riskLevel === "CRITICAL" ? "bg-red-500" : riskLevel === "HIGH" ? "bg-orange-500" : riskLevel === "CAUTION" ? "bg-amber-500" : "bg-emerald-500";
  const statusLabel = riskLevel || "SAFE";

  return (
    <div className="flex items-center justify-between px-8 py-4 bg-[#080D1C]/80 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-40">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
          <div className={`w-2 h-2 rounded-full ${statusColor} ${riskLevel === "CRITICAL" ? "animate-pulse" : ""}`} />
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{statusLabel}</span>
        </div>
        <button className="relative p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-gray-500">
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white px-1">
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          )}
        </button>
        {onRefresh && (
          <button onClick={onRefresh} className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-gray-500">
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
