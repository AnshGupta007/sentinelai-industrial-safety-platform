"use client";

import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import type { RiskLevel } from "@/lib/types";

interface PageWrapperProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  riskLevel?: RiskLevel;
  riskScore?: number;
  alertCount?: number;
  onRefresh?: () => void;
}

export default function PageWrapper({ title, subtitle, children, riskLevel, riskScore, alertCount = 0, onRefresh }: PageWrapperProps) {
  return (
    <div className="min-h-screen bg-[#060B18]">
      <Sidebar alertCount={alertCount} riskLevel={riskLevel} riskScore={riskScore} criticalAlert={riskLevel === "CRITICAL"} />
      {/* Main content area — offset by sidebar width */}
      <div className="pl-[260px] min-h-screen flex flex-col">
        <TopNav title={title} subtitle={subtitle} riskLevel={riskLevel} alertCount={alertCount} onRefresh={onRefresh} />
        <div className="flex-1 p-6 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
