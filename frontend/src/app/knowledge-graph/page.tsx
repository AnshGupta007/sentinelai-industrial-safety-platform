"use client";

import { useEffect, useState, useCallback } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import GraphVisualizer from "@/components/knowledge-graph/GraphVisualizer";
import { api } from "@/lib/api";
import { Search, Network, AlertTriangle, BookOpen, Lightbulb, TrendingUp, Activity, Shield, Zap } from "lucide-react";

interface GraphNode { id: string; label: string; type: string; }
interface GraphEdge { source: string; target: string; relationship: string; }

export default function KnowledgeGraphPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [querying, setQuerying] = useState(false);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [patterns, setPatterns] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"explore" | "patterns" | "prevention">("explore");

  useEffect(() => {
    loadGraph();
    loadPatterns();
  }, []);

  const loadGraph = async () => {
    try {
      const res = await api.getKgGraph();
      setGraphData(res.data);
    } catch (e) {
      console.error("Failed to load KG graph", e);
    } finally {
      setLoading(false);
    }
  };

  const loadPatterns = async () => {
    try {
      const res = await api.getKgPatterns();
      setPatterns(res.data);
    } catch (e) {
      console.error("Failed to load patterns", e);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) return;
    setQuerying(true);
    try {
      const res = await api.queryKg(query);
      setQueryResult(res.data);
      setActiveTab("explore");
    } catch (e) {
      console.error("KG query failed", e);
    } finally {
      setQuerying(false);
    }
  };

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNode(nodeId === selectedNode ? null : nodeId);
  }, [selectedNode]);

  const suggestedQueries = [
    "What similar incidents happened in coke oven with gas leaks?",
    "What regulations apply to confined space entry?",
    "What are the root causes of gas explosions?",
    "What prevention measures exist for confined space incidents?",
    "Show me patterns in blast furnace incidents",
    "What warning signs were missed in past explosions?",
  ];

  return (
    <PageWrapper title="Knowledge Graph" subtitle="Equipment-Permit-Incident Relationship Intelligence">
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-emerald-400 mb-1"><Network width={16} height={16} className="shrink-0" /><span className="text-xs font-semibold uppercase tracking-wider">Graph Status</span></div>
            <div className="text-2xl font-bold text-white">{graphData.nodes.length || "—"}</div>
            <div className="text-xs text-white/50">Connected Entities</div>
          </div>
          <div className="glass-card rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-blue-400 mb-1"><Activity width={16} height={16} className="shrink-0" /><span className="text-xs font-semibold uppercase tracking-wider">Relationships</span></div>
            <div className="text-2xl font-bold text-white">{graphData.edges.length || "—"}</div>
            <div className="text-xs text-white/50">Cross-References</div>
          </div>
          <div className="glass-card rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-amber-400 mb-1"><AlertTriangle width={16} height={16} className="shrink-0" /><span className="text-xs font-semibold uppercase tracking-wider">Incidents</span></div>
            <div className="text-2xl font-bold text-white">{patterns?.total_incidents || "—"}</div>
            <div className="text-xs text-white/50">Historical Cases</div>
          </div>
          <div className="glass-card rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-purple-400 mb-1"><BookOpen width={16} height={16} className="shrink-0" /><span className="text-xs font-semibold uppercase tracking-wider">Regulations</span></div>
            <div className="text-2xl font-bold text-white">8</div>
            <div className="text-xs text-white/50">OISD / Factory Act / DGMS</div>
          </div>
        </div>

        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQuery()}
                  placeholder="Ask the knowledge graph — e.g. 'What happened last time we had CH4 with confined space?'"
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <button
                onClick={handleQuery}
                disabled={querying || !query.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
              >
                {querying ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap width={16} height={16} className="shrink-0" />}
                {querying ? "Analyzing..." : "Query"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {suggestedQueries.map((sq, i) => (
                <button
                  key={i}
                  onClick={() => { setQuery(sq); }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[11px] text-white/50 hover:text-white/80 transition-colors"
                >
                  {sq}
                </button>
              ))}
            </div>
          </div>

          <div className="flex border-b border-white/5">
            {(["explore", "patterns", "prevention"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider transition-colors ${
                  activeTab === tab ? "text-blue-400 border-b-2 border-blue-400" : "text-white/40 hover:text-white/60"
                }`}
              >
                {tab === "explore" ? "Graph Explorer" : tab === "patterns" ? "Root Cause Patterns" : "Prevention Intelligence"}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === "explore" && (
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  {loading ? (
                    <div className="h-[500px] flex items-center justify-center text-white/30 text-sm">Loading graph...</div>
                  ) : (
                    <GraphVisualizer
                      nodes={graphData.nodes}
                      edges={graphData.edges}
                      width={800}
                      height={500}
                      onNodeClick={handleNodeClick}
                      selectedNode={selectedNode}
                    />
                  )}
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {queryResult ? (
                    <>
                      <div className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-2">Query Results</div>
                      <div className="text-xs text-white/70 mb-3 italic">&ldquo;{queryResult.interpretation}&rdquo;</div>

                      {queryResult.findings?.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-red-400 flex items-center gap-1"><AlertTriangle width={12} height={12} className="shrink-0" /> Similar Incidents ({queryResult.findings.length})</div>
                          {queryResult.findings.map((inc: any, i: number) => (
                            <div key={i} className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                              <div className="flex justify-between items-start">
                                <span className="text-xs font-medium text-white">{inc.incident_id}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  inc.fatalities > 0 ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"
                                }`}>
                                  {inc.fatalities}F / {inc.injuries}I
                                </span>
                              </div>
                              <div className="text-[10px] text-white/40 mt-0.5">{inc.plant} · {inc.date}</div>
                              <div className="text-[11px] text-white/60 mt-1 line-clamp-2">{inc.description}</div>
                              {inc.similarity_score && (
                                <div className="mt-1 flex items-center gap-1">
                                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${inc.similarity_score}%` }} />
                                  </div>
                                  <span className="text-[10px] text-white/40">{inc.similarity_score}% match</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {queryResult.regulations?.length > 0 && (
                        <div className="space-y-2 mt-3">
                          <div className="text-xs font-semibold text-purple-400 flex items-center gap-1"><BookOpen width={12} height={12} className="shrink-0" /> Regulations ({queryResult.regulations.length})</div>
                          {queryResult.regulations.map((reg: any, i: number) => (
                            <div key={i} className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                              <div className="text-xs font-medium text-white">{reg.source} §{reg.section}</div>
                              <div className="text-[10px] text-white/40">{reg.title}</div>
                              <div className="text-[10px] text-white/50 mt-1 line-clamp-2">{reg.content}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {queryResult.recommendations?.length > 0 && (
                        <div className="space-y-1 mt-3">
                          <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1"><Lightbulb width={12} height={12} className="shrink-0" /> Recommendations</div>
                          {queryResult.recommendations.map((rec: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] text-white/60">
                              <span className="text-emerald-400 mt-0.5">→</span>
                              <span>{rec}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-white/30">
                      <Network width={40} height={40} className="mb-3 opacity-30 shrink-0" />
                      <div className="text-sm">Ask a question or click a node</div>
                      <div className="text-xs mt-1">The knowledge graph connects incidents, permits, regulations, and equipment</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "patterns" && patterns && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><TrendingUp width={16} height={16} className="shrink-0 text-amber-400" /> Root Cause Patterns</div>
                  <div className="space-y-2">
                    {patterns.root_cause_patterns?.map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-white/60 w-40 truncate">{p.cause}</span>
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${p.percentage}%`, backgroundColor: `hsl(${10 + i * 20}, 70%, 50%)` }}
                          />
                        </div>
                        <span className="text-xs text-white/40 w-12 text-right">{p.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><AlertTriangle width={16} height={16} className="shrink-0 text-red-400" /> Warning Signs Missed</div>
                  <div className="space-y-2">
                    {patterns.warning_sign_patterns?.map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-white/60 w-40 truncate">{p.sign}</span>
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${p.percentage}%`, backgroundColor: `hsl(${200 + i * 25}, 70%, 50%)` }}
                          />
                        </div>
                        <span className="text-xs text-white/40 w-12 text-right">{p.percentage}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="text-xs font-medium text-amber-300 mb-1 flex items-center gap-1"><AlertTriangle width={12} height={12} className="shrink-0" /> Key Insight</div>
                    <div className="text-[11px] text-white/60">
                      {patterns.total_incidents} historical incidents analyzed. The most common root causes are
                      operational failures ({patterns.root_cause_patterns?.[0]?.percentage || 0}%)
                      followed by gas-related issues ({patterns.root_cause_patterns?.[1]?.percentage || 0}%).
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "prevention" && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Shield width={16} height={16} className="shrink-0 text-emerald-400" /> Proactive Prevention</div>
                  <div className="space-y-3">
                    {patterns?.root_cause_patterns?.slice(0, 5).map((p: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/5">
                        <div className="text-xs font-medium text-white">{p.cause}</div>
                        <div className="text-[10px] text-white/40 mt-0.5">Observed in {p.count} incidents ({p.percentage}%)</div>
                        <div className="mt-2 flex gap-1">
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded-full">
                            {p.percentage > 50 ? "High Priority" : p.percentage > 20 ? "Medium Priority" : "Monitor"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Lightbulb width={16} height={16} className="shrink-0 text-blue-400" /> Recommended Controls</div>
                  <div className="space-y-2 text-[11px] text-white/60">
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <span className="text-blue-300 font-medium">Automated Gas Monitoring:</span> Link all gas sensors to permit system — auto-suspend permits when gas exceeds thresholds
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <span className="text-blue-300 font-medium">Real-time SIMOPS Detection:</span> Flag simultaneous operations in same zone — prevent hot work near confined space
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <span className="text-blue-300 font-medium">Predictive Maintenance:</span> Use vibration + temperature trends to predict equipment failures before they cause incidents
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <span className="text-blue-300 font-medium">Regulatory Compliance Engine:</span> Auto-check all permits and conditions against OISD-105, Factory Act, and DGMS standards
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
