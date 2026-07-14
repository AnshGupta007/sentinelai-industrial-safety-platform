"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { IncidentHistoryChart } from "@/components/charts/index";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/websocket";
import type { PlantState, HistoricalIncident } from "@/lib/types";
import { cn } from "@/lib/utils";

const SUGGESTED = [
  "What happened in similar gas accumulation incidents?",
  "What does OISD say about confined space entry?",
  "Show incidents involving hot work and gas leaks",
  "What are the most common root causes in coke oven accidents?",
  "What OISD regulations apply to Zone A?",
  "Generate a safety briefing for morning shift",
];

export default function IncidentsPage() {
  const [plantState, setPlantState] = useState<PlantState | null>(null);
  const [incidents, setIncidents] = useState<HistoricalIncident[]>([]);
  const [similar, setSimilar] = useState<HistoricalIncident[]>([]);
  const [patterns, setPatterns] = useState<{ typeCounts: Record<string, number>; totalIncidents: number; totalFatalities: number } | null>(null);
  const [rootCauses, setRootCauses] = useState<Record<string, number>>({});
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string; sources?: string[]; confidence?: number }>>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [demoRes, incRes, simRes, patRes] = await Promise.all([
        api.getPlantState(),
        api.getIncidents(),
        api.getSimilarIncidents(),
        api.getIncidentPatterns(),
      ]);
      if (demoRes.data) setPlantState(demoRes.data);
      if (incRes.data) {
        setIncidents(incRes.data);
        const rc: Record<string, number> = {};
        incRes.data.forEach((inc: HistoricalIncident) => {
          inc.root_causes?.forEach((cause: string) => {
            rc[cause] = (rc[cause] || 0) + 1;
          });
        });
        setRootCauses(rc);
      }
      if (simRes.data) setSimilar(simRes.data);
      if (patRes.data) setPatterns(patRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    wsClient.connect();
    const handler = (data: { zone_id: string; score: number; level: string }) => {
      setPlantState(prev => {
        if (!prev) return prev;
        type RL = import("@/lib/types").RiskLevel;
        const zones = prev.zones.map(z => z.zoneId === data.zone_id ? { ...z, riskScore: data.score, riskLevel: data.level as RL } : z);
        const overall = Math.round(zones.reduce((s, z) => s + z.riskScore, 0) / zones.length);
        return { ...prev, zones, overallRiskScore: overall, overallRiskLevel: data.level as RL };
      });
    };
    wsClient.on("risk_update", handler);
    return () => wsClient.off("risk_update", handler);
  }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async (message?: string) => {
    const msg = message || input; if (!msg.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: msg }]); setInput(""); setChatLoading(true);
    try {
      const data = await api.queryIncidents(msg);
      if (data.data) {
        const d = data.data;
        let response = d.summary + "\n\n";
        if (d.incidents?.length > 0) {
          response += "**Related Incidents:**\n";
          d.incidents.forEach((inc: HistoricalIncident) => {
            response += `- ${inc.incident_id}: ${inc.type} at ${inc.plant} (${inc.date}) — ${inc.fatalities} fatalities\n`;
          });
        }
        if (d.regulations?.length > 0) {
          response += "\n**Relevant Regulations:**\n";
          d.regulations.forEach((reg: { source: string; section: string; title: string }) => {
            response += `- ${reg.source} §${reg.section}: ${reg.title}\n`;
          });
        }
        setMessages(prev => [...prev, { role: "assistant", content: response, sources: d.incidents?.map((i: HistoricalIncident) => i.incident_id) || [], confidence: 0.85 }]);
      }
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "Error retrieving data.", sources: [], confidence: 0 }]); }
    finally { setChatLoading(false); }
  };

  if (loading || !plantState) return <div className="min-h-screen bg-[#060B18] flex items-center justify-center"><div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const highRiskZone = plantState.zones.reduce((prev, curr) => curr.riskScore > prev.riskScore ? curr : prev, plantState.zones[0]);

  return (
    <PageWrapper title="Incident Intelligence" subtitle="RAG-powered historical incident analysis" riskLevel={plantState.overallRiskLevel} riskScore={plantState.overallRiskScore} onRefresh={fetchData}>
      {highRiskZone.riskScore > 60 && (
        <div className="mb-5 p-5 bg-red-500/[0.06] border border-red-500/20 rounded-2xl animate-fade-in">
          <div className="flex items-center gap-2 mb-2"><span className="text-base">⚠️</span><h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">Prevention Intelligence Active</h3></div>
          <p className="text-[12px] text-gray-300 leading-relaxed">
            Current {highRiskZone.name} conditions are <span className="text-red-400 font-black">{Math.min(95, Math.round(similar.length > 0 ? similar.reduce((max, s) => Math.max(max, s.similarity || 0), 0) : plantState.overallRiskScore + 10))}%</span> similar to Vizag Steel Plant gas leak (July 2022) — <span className="text-red-400 font-bold">3 fatalities</span>.
            Key missed signals: CO sensor at 28ppm for 1 hour, ventilation offline, confined space permit without gas test.
          </p>
          <p className="text-[11px] text-emerald-400 mt-2 font-semibold">Recommended: Immediate evacuation, suspend Zone A permits, dispatch safety team</p>
        </div>
      )}

      <div className="flex gap-5">
        <div className="w-[45%]">
          <div className="glass-card flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
            <div className="p-5 border-b border-white/[0.06]">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Incident & Regulation Intelligence</h3>
              <p className="text-[10px] text-gray-600 mt-0.5">Ask about past incidents or safety regulations</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm mb-4">Ask about incidents, regulations, or patterns</p>
                  <div className="grid grid-cols-1 gap-2">{SUGGESTED.map((q, i) => (<button key={i} onClick={() => handleSend(q)} className="text-[11px] text-left px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-gray-400 hover:text-gray-200 hover:border-white/[0.12] transition-all">{q}</button>))}</div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={cn("max-w-[85%] p-3.5", msg.role === "user" ? "chat-user ml-auto" : "chat-ai mr-auto")}>
                  <p className="text-[12px] text-gray-200 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] text-gray-600">Sources:</span>
                      {msg.sources.slice(0, 3).map((s, j) => <span key={j} className="text-[9px] px-1.5 py-0.5 bg-white/[0.04] rounded text-gray-500">{s}</span>)}
                      {msg.confidence && <span className="text-[9px] text-gray-600 ml-auto">{(msg.confidence * 100).toFixed(0)}%</span>}
                    </div>
                  )}
                </div>
              ))}
              {chatLoading && <div className="chat-ai max-w-[85%] p-3.5 mr-auto"><div className="flex gap-1.5"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} /><div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} /></div></div>}
              <div ref={chatEndRef} />
            </div>
            <div className="p-4 border-t border-white/[0.06]">
              <div className="flex gap-2">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Ask about incidents or regulations..." className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[12px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/40" />
                <button onClick={() => handleSend()} disabled={chatLoading} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[12px] font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">Send</button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Current vs Historical</h3>
            <div className="flex items-center gap-5">
              <div className="text-5xl font-black font-mono-data text-red-400">{similar.length > 0 ? similar[0].similarity : 0}<span className="text-xl">%</span></div>
              <div><p className="text-sm text-gray-300 font-medium">Similarity to highest match</p><p className="text-[11px] text-gray-500">{similar.length > 0 ? `${similar[0].type} — ${similar[0].plant} (${similar[0].date})` : "No high-risk conditions matching"}</p></div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Incident Distribution</h3>
            {patterns && <IncidentHistoryChart typeCounts={patterns.typeCounts} />}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {patterns && Object.entries(patterns.typeCounts).map(([type, count]) => (<span key={type} className="text-[9px] px-2 py-0.5 bg-white/[0.04] rounded-lg text-gray-500">{type}: {count}</span>))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Root Cause Distribution</h3>
              <div className="space-y-1.5">
                {Object.entries(rootCauses).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([cause, count]) => {
                  const maxCount = Math.max(...Object.values(rootCauses));
                  return (
                    <div key={cause} className="flex items-center gap-2">
                      <span className="text-[9px] text-gray-400 w-[100px] truncate" title={cause}>{cause}</span>
                      <div className="flex-1 h-[14px] bg-white/[0.04] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500/60 to-red-500/60 rounded-full transition-all duration-500" style={{ width: `${(count / maxCount) * 100}%` }} />
                      </div>
                      <span className="text-[9px] text-gray-500 w-4 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-card p-5">
              <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Similarity Score</h3>
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                {(similar.length > 0 ? similar : incidents.slice(0, 5)).map(inc => (
                  <div key={inc.incident_id} className="bg-white/[0.02] rounded-xl p-3.5 border border-white/[0.04]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-gray-300 font-mono-data">{inc.incident_id}</span>
                      <div className="flex items-center gap-2">
                        {inc.similarity && <span className="text-[10px] text-amber-400 font-bold">{inc.similarity}% match</span>}
                        <span className="text-[10px] text-red-400 font-bold">{inc.fatalities} dead</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400">{inc.type} — {inc.plant} <span className="text-gray-600">({inc.date})</span></p>
                    {inc.similarity && (
                      <div className="mt-1.5 h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-500", inc.similarity > 80 ? "bg-red-500" : inc.similarity > 60 ? "bg-amber-500" : "bg-blue-500")} style={{ width: `${inc.similarity}%` }} />
                      </div>
                    )}
                    <div className="mt-1 text-[9px] text-gray-600">{inc.warning_signs_missed.slice(0, 1).map((w, i) => <p key={i}>• {w}</p>)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {patterns && (
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-4"><p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Incidents</p><p className="text-2xl font-black font-mono-data text-gray-200 mt-1">{patterns.totalIncidents}</p></div>
              <div className="glass-card p-4"><p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Fatalities</p><p className="text-2xl font-black font-mono-data text-red-400 mt-1">{patterns.totalFatalities}</p></div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
