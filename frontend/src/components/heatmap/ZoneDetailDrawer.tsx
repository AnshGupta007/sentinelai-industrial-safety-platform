"use client";
import { cn } from "@/lib/utils";
import type { Zone, WorkerLocation } from "@/lib/types";

interface ZoneDetailDrawerProps {
  zone: Zone;
  workers: WorkerLocation[];
  onClose: () => void;
}

export function ZoneDetailDrawer({ zone, workers, onClose }: ZoneDetailDrawerProps) {
  return (
    <div className="glass-card p-5 animate-slide-in border-blue-500/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">{zone.name}</h3>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-xs transition-colors">✕</button>
      </div>
      <div className="mb-4">
        <span className={cn(
          "inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
          zone.riskLevel === "CRITICAL" ? "bg-red-500/15 text-red-400" :
          zone.riskLevel === "HIGH" ? "bg-orange-500/15 text-orange-400" :
          zone.riskLevel === "CAUTION" ? "bg-amber-500/15 text-amber-400" :
          "bg-emerald-500/10 text-emerald-400"
        )}>
          {zone.riskLevel} — {zone.riskScore}
        </span>
      </div>
      <div className="space-y-1 mb-4">
        <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Live Sensors</h4>
        {zone.sensors.slice(0, 6).map(s => (
          <div key={s.sensorId} className="flex items-center justify-between py-1 text-[11px]">
            <span className="text-gray-500">{s.type}</span>
            <span className={cn("font-mono-data font-bold", s.status === "CRITICAL" ? "text-red-400" : s.status === "WARNING" ? "text-amber-400" : "text-gray-300")}>
              {s.value} {s.unit}
            </span>
          </div>
        ))}
      </div>
      <div className="mb-4">
        <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Workers ({workers.length})</h4>
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {workers.slice(0, 8).map(w => (
            <div key={w.workerId} className="flex justify-between text-[10px]">
              <span className="text-gray-400">{w.name}</span>
              <span className="text-gray-600">{w.role}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl bg-blue-500/[0.06] border border-blue-500/15 p-3">
        <h4 className="text-[10px] font-bold text-blue-400 mb-1">AI Recommendation</h4>
        <p className="text-[10px] text-gray-400 leading-relaxed">
          {zone.riskScore > 75 ? "IMMEDIATE ACTION: Evacuate zone. Suspend all permits. Notify safety team." :
           zone.riskScore > 50 ? "CAUTION: Monitor gas levels closely. Review permits for conflicts." :
           "Zone operating within normal parameters."}
        </p>
      </div>
    </div>
  );
}
