"use client";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { PlantState } from "@/lib/types";
import { api } from "@/lib/api";

const SUGGESTED = [
  "What is the current risk in Zone A?",
  "Why was the last alert triggered?",
  "What should I do about the CH4 reading?",
  "Generate a safety briefing for morning shift",
  "What OISD regulations apply to current conditions?",
  "Show incidents similar to what's happening now",
];

interface CopilotChatProps {
  plantState: PlantState;
  externalQuery?: string | null;
  onQueryHandled?: () => void;
}

export function CopilotChat({ plantState, externalQuery, onQueryHandled }: CopilotChatProps) {
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string; sources?: string[]; confidence?: number }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (externalQuery) {
      handleSend(externalQuery);
      onQueryHandled?.();
    }
  }, [externalQuery]);

  const handleSend = async (message?: string) => {
    const msg = message || input;
    if (!msg.trim()) return;
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.chatCopilot(msg);
      if (res.data) {
        setMessages(prev => [...prev, {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: res.data.response,
          sources: res.data.sources,
          confidence: res.data.confidence,
        }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: "assistant", content: "Error processing request.", confidence: 0 }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex-1 glass-card flex flex-col min-w-0" style={{ height: "calc(100vh - 220px)" }}>
      <div className="p-4 border-b border-white/[0.06] flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
          <span className="text-sm">🤖</span>
        </div>
        <div>
          <h3 className="text-[12px] font-bold text-gray-200">SentinelAI Copilot</h3>
          <p className="text-[9px] text-gray-600">Expert industrial safety AI · Real-time data access</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/10"><span className="text-2xl">🤖</span></div>
            <h3 className="text-base font-bold text-gray-300 mb-2">SentinelAI Copilot</h3>
            <p className="text-[12px] text-gray-500 mb-6 max-w-sm mx-auto">I have access to real-time sensor data, permits, worker locations, incidents, and regulations.</p>
            <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
              {SUGGESTED.map((p, i) => (
                <button key={i} onClick={() => handleSend(p)} className="text-[10px] text-left px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-gray-400 hover:text-gray-200 hover:border-white/[0.12] transition-all">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={cn("max-w-[80%]", msg.role === "user" ? "ml-auto" : "mr-auto")}>
            <div className={cn("p-4", msg.role === "user" ? "chat-user" : "chat-ai")}>
              <div className="text-[12px] text-gray-200 whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] text-gray-600">Sources:</span>
                  {msg.sources.slice(0, 3).map((s, i) => <span key={i} className="text-[9px] px-1.5 py-0.5 bg-white/[0.04] rounded text-gray-500">{s}</span>)}
                  {msg.confidence && msg.confidence > 0 && <span className="text-[9px] text-gray-600 ml-auto">{(msg.confidence * 100).toFixed(0)}%</span>}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="max-w-[80%] mr-auto"><div className="chat-ai p-4"><div className="flex gap-1.5"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} /><div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} /></div></div></div>}
        <div ref={endRef} />
      </div>
      <div className="p-4 border-t border-white/[0.06]">
        <div className="flex gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} placeholder="Ask about plant status, risks, regulations..." className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[12px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/40" />
          <button onClick={() => handleSend()} disabled={loading} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[12px] font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">Send</button>
        </div>
      </div>
    </div>
  );
}
