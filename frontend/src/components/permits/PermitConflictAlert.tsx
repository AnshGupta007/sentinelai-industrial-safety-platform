"use client";
import { cn } from "@/lib/utils";
import type { Permit, PermitConflict } from "@/lib/types";

interface PermitConflictAlertProps {
  permits: Permit[];
  onSuspend: (permitId: string) => void;
}

export function PermitConflictAlert({ permits, onSuspend }: PermitConflictAlertProps) {
  const allConflicts = permits.flatMap(p =>
    p.conflicts.map(c => ({ ...c, permitId: p.permitId }))
  );

  if (allConflicts.length === 0) {
    return <p className="text-sm text-gray-600 text-center py-6">No conflicts detected</p>;
  }

  return (
    <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
      {permits.filter(p => p.conflicts.length > 0).map(permit =>
        permit.conflicts.map((conflict, idx) => (
          <div key={`${permit.permitId}-${idx}`} className={cn(
            "rounded-xl border p-3.5",
            conflict.urgency === "CRITICAL" ? "bg-red-500/[0.06] border-red-500/20" :
            conflict.urgency === "HIGH" ? "bg-orange-500/[0.06] border-orange-500/20" :
            "bg-amber-500/[0.06] border-amber-500/20"
          )}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-gray-400 font-mono-data">{permit.permitId}</span>
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase",
                conflict.urgency === "CRITICAL" ? "bg-red-500/15 text-red-400" :
                conflict.urgency === "HIGH" ? "bg-orange-500/15 text-orange-400" :
                "bg-amber-500/15 text-amber-400"
              )}>{conflict.urgency}</span>
            </div>
            <p className="text-[11px] text-gray-300 mb-1 leading-snug">{conflict.description}</p>
            <p className="text-[9px] text-gray-600">Regulatory: {conflict.regulatoryBasis}</p>
            <p className="text-[9px] text-blue-400 mt-1 font-semibold">Action: {conflict.actionRequired}</p>
            {conflict.urgency === "CRITICAL" && (
              <button onClick={() => onSuspend(permit.permitId)} className="mt-2 text-[9px] px-2.5 py-1 bg-red-500/15 text-red-400 rounded-lg font-bold hover:bg-red-500/25 transition-colors">
                Suspend Permit
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
