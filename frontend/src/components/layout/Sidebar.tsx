"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, LayoutDashboard, Map, ClipboardList, BarChart3, Bell, AlertTriangle, Bot, Settings, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";

interface SidebarProps {
  alertCount?: number;
  riskLevel?: RiskLevel;
  riskScore?: number;
  criticalAlert?: boolean;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/heatmap", label: "Plant Heatmap", icon: Map },
  { href: "/permits", label: "Permit Intel", icon: ClipboardList },
  { href: "/incidents", label: "Incident RAG", icon: BarChart3 },
  { href: "/alerts", label: "Alert Center", icon: Bell },
  { href: "/emergency", label: "Emergency", icon: AlertTriangle },
  { href: "/copilot", label: "AI Copilot", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ alertCount = 0, riskLevel = "SAFE", riskScore = 0, criticalAlert = false }: SidebarProps) {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const update = () => setCurrentTime(new Date().toLocaleString("en-IN", { hour12: false, dateStyle: "medium", timeStyle: "medium" }));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const riskColor = riskLevel === "CRITICAL" ? "text-red-500" : riskLevel === "HIGH" ? "text-orange-500" : riskLevel === "CAUTION" ? "text-amber-500" : "text-emerald-500";
  const riskBg = riskLevel === "CRITICAL" ? "bg-red-500/10 border-red-500/20" : riskLevel === "HIGH" ? "bg-orange-500/10 border-orange-500/20" : riskLevel === "CAUTION" ? "bg-amber-500/10 border-amber-500/20" : "bg-emerald-500/10 border-emerald-500/20";
  const dotColor = riskLevel === "CRITICAL" ? "bg-red-500" : riskLevel === "HIGH" ? "bg-orange-500" : riskLevel === "CAUTION" ? "bg-amber-500" : "bg-emerald-500";

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-[#080D1C] border-r border-white/[0.06] flex flex-col z-50">
      {/* Logo */}
      <div className="p-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white">SentinelAI</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Safety Intelligence</p>
          </div>
        </div>
        <div className="mt-4 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <p className="text-[11px] text-gray-400 font-medium">Vizag Steel Plant</p>
          <p className="text-[10px] text-gray-600">Shift B · 06:00–14:00</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-blue-600/20 to-cyan-600/10 text-blue-400 border border-blue-500/20 shadow-sm shadow-blue-500/5"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
              )}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span>{item.label}</span>
              {item.label === "Alert Center" && alertCount > 0 && (
                <span className={cn(
                  "ml-auto text-[10px] min-w-[20px] text-center px-1.5 py-0.5 rounded-full font-bold",
                  "bg-red-500/20 text-red-400",
                  criticalAlert && "animate-pulse"
                )}>
                  {alertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-white/[0.06] space-y-3">
        <div className={cn("rounded-lg p-3 border", riskBg)}>
          <div className="flex items-center gap-2">
            <Activity className={cn("w-3.5 h-3.5", riskColor)} />
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Plant Status</span>
          </div>
          <div className={cn("text-sm font-bold mt-1", riskColor)}>
            {riskLevel} {riskScore > 0 && <span className="font-mono-data">({riskScore})</span>}
          </div>
        </div>
        <div className="text-[10px] text-gray-600">
          <p>{currentTime}</p>
          <p className="mt-0.5">Safety Officer — Rajan M.</p>
        </div>
      </div>
    </aside>
  );
}
