"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Zap, Brain, AlertTriangle, ArrowRight, Activity } from "lucide-react";
import { api } from "@/lib/api";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleEnter = () => {
    setLoading(true);
    api.resetDemo()
      .then(() => router.push("/dashboard"))
      .catch(() => router.push("/dashboard"));
  };

  return (
    <div className="min-h-screen bg-[#040810] flex flex-col relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-[20%] left-[15%] w-[500px] h-[500px] bg-blue-600/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] bg-red-600/[0.03] rounded-full blur-[100px]" />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-white/[0.02] rounded-full" />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] border border-white/[0.015] rounded-full" />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] border border-white/[0.01] rounded-full" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-3xl">
          {/* Logo */}
          <div className="flex items-center justify-center mb-10">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-400 flex items-center justify-center shadow-2xl shadow-blue-500/30 relative">
              <Shield className="w-10 h-10 text-white" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-400 blur-xl opacity-40" />
            </div>
          </div>

          <h1 className="text-7xl font-black tracking-tighter mb-4">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
              SentinelAI
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-2 font-medium tracking-tight">
            Industrial Safety Intelligence Platform
          </p>

          <p className="text-base text-gray-600 italic mb-12">
            &quot;Data existed. Intelligence did not. Until now.&quot;
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-3 gap-4 mb-12 max-w-2xl mx-auto">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 text-left backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 hover:border-red-500/20">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-3 border border-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-sm font-bold text-gray-200 mb-1">Compound Risk</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">Detects dangerous combinations no single sensor flags alone</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 text-left backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 hover:border-blue-500/20">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3 border border-blue-500/10">
                <Brain className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-sm font-bold text-gray-200 mb-1">AI Intelligence</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">RAG-powered incident analysis with regulatory guidance</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 text-left backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 hover:border-emerald-500/20">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3 border border-emerald-500/10">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-gray-200 mb-1">Auto Response</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">Emergency orchestrator triggers in &lt;5 seconds</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-10 mb-12">
            <div className="text-center">
              <div className="text-3xl font-black font-mono-data text-red-400">6,500+</div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mt-1">Fatal accidents/yr (India)</div>
            </div>
            <div className="w-px h-12 bg-white/[0.06]" />
            <div className="text-center">
              <div className="text-3xl font-black font-mono-data text-amber-400">40%</div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mt-1">False negative reduction</div>
            </div>
            <div className="w-px h-12 bg-white/[0.06]" />
            <div className="text-center">
              <div className="text-3xl font-black font-mono-data text-emerald-400">90s</div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mt-1">Advance warning time</div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleEnter}
            disabled={loading}
            className="group inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl text-white font-bold text-base shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.03] disabled:opacity-70 disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <Activity className="w-5 h-5 animate-spin" />
                Initializing Simulator...
              </>
            ) : (
              <>
                Enter Demo — Vizag Steel Plant
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <p className="text-[11px] text-gray-700 mt-5">
            Auto-plays the &quot;Visakhapatnam Replay Prevention&quot; scenario
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 py-6 text-center text-[11px] text-gray-700 border-t border-white/[0.04]">
        SentinelAI Hackathon Prototype · Next.js · Recharts · Rule-Based AI Engine
      </div>
    </div>
  );
}
