"use client";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { PERMIT_CONFIG } from "@/lib/constants";
import type { Permit } from "@/lib/types";

interface PermitTableProps {
  permits: Permit[];
  onSelect: (permit: Permit) => void;
  onSuspend: (permitId: string) => void;
}

type SortKey = "permitId" | "type" | "zoneId" | "status";

export function PermitTable({ permits, onSelect, onSuspend }: PermitTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("permitId");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    const list = [...permits];
    list.sort((a, b) => {
      const aVal = String(a[sortKey] ?? "");
      const bVal = String(b[sortKey] ?? "");
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return list;
  }, [permits, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="ml-1 opacity-20">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {([{ key: "permitId", label: "Permit ID" }, { key: "type", label: "Type" }, { key: "zoneId", label: "Zone" }, { key: null, label: "Workers" }, { key: "status", label: "Status" }, { key: null, label: "Conflicts" }, { key: null, label: "Actions" }] as const).map(h => (
              <th key={h.label} className={cn("text-left p-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wider", h.key && "cursor-pointer hover:text-gray-300 transition-colors")} onClick={() => h.key && toggleSort(h.key as SortKey)}>
                {h.label}{h.key && <SortIcon col={h.key as SortKey} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(permit => {
            const config = PERMIT_CONFIG[permit.type];
            const statusBg = permit.status === "FLAGGED" ? "bg-red-500/15 text-red-400" : permit.status === "SUSPENDED" ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/10 text-emerald-400";
            return (
              <tr key={permit.permitId} className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors" onClick={() => onSelect(permit)}>
                <td className="p-4 font-mono-data text-gray-300 font-medium">{permit.permitId}</td>
                <td className="p-4"><span className="flex items-center gap-1.5"><span>{config?.icon}</span><span className="text-gray-300">{config?.label}</span></span></td>
                <td className="p-4 text-gray-400">{permit.zoneId}</td>
                <td className="p-4 text-gray-400">{permit.workersInvolved.length}</td>
                <td className="p-4"><span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase", statusBg)}>{permit.status}</span></td>
                <td className="p-4">{permit.conflicts.length > 0 ? <span className="text-red-400 font-bold">{permit.conflicts.length}</span> : <span className="text-gray-600">—</span>}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onSelect(permit); }} className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold">View</button>
                    {permit.status !== "SUSPENDED" && permit.conflicts.length > 0 && (
                      <button onClick={(e) => { e.stopPropagation(); onSuspend(permit.permitId); }} className="text-[10px] text-red-400 hover:text-red-300 font-semibold">Suspend</button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
