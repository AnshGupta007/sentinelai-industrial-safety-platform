"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import { api } from "@/lib/api";

const STORAGE_KEY = "sentinelai_settings";

interface Settings {
  refInterval: number;
  demoSpeed: number;
  autoReset: boolean;
  pushNotifications: boolean;
  emailAlerts: boolean;
  soundAlerts: boolean;
  autoAckLow: boolean;
}

const DEFAULTS: Settings = {
  refInterval: 3,
  demoSpeed: 1,
  autoReset: true,
  pushNotifications: true,
  emailAlerts: true,
  soundAlerts: true,
  autoAckLow: false,
};

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function saveSettings(s: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("sentinelai-settings-changed", { detail: s }));
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [resetting, setResetting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const update = (partial: Partial<Settings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.resetDemo();
      router.push("/dashboard");
    } catch {
      window.location.href = "/dashboard";
    }
    setResetting(false);
  };

  return (
    <PageWrapper title="Settings" subtitle="Configure platform behavior">
      <div className="max-w-2xl space-y-4">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Refresh & Simulation</h3>
            {saved && <span className="text-[10px] text-emerald-400 font-semibold animate-fade-in">Saved</span>}
          </div>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[12px] text-gray-300 font-medium">Poll interval (s)</label>
                <span className="text-[11px] text-blue-400 font-mono-data font-bold">{settings.refInterval}s</span>
              </div>
              <input type="range" min="1" max="10" value={settings.refInterval} onChange={(e) => update({ refInterval: Number(e.target.value) })} className="w-full accent-blue-500" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[12px] text-gray-300 font-medium">Demo speed</label>
                <span className="text-[11px] text-blue-400 font-mono-data font-bold">{settings.demoSpeed}x</span>
              </div>
              <input type="range" min="0.5" max="5" step="0.5" value={settings.demoSpeed} onChange={(e) => update({ demoSpeed: Number(e.target.value) })} className="w-full accent-blue-500" />
            </div>
            <label className="flex items-center gap-3 text-[12px] text-gray-400">
              <input type="checkbox" checked={settings.autoReset} onChange={(e) => update({ autoReset: e.target.checked })} className="rounded bg-white/[0.04] border-white/[0.08]" />
              Auto-reset scenario after completion
            </label>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-4">Alerting</h3>
          <div className="space-y-3">
            {[
              { label: "Push notifications", key: "pushNotifications" as const },
              { label: "Email alerts for critical events", key: "emailAlerts" as const },
              { label: "Sound alerts for emergencies", key: "soundAlerts" as const },
              { label: "Auto-acknowledge low-severity alerts", key: "autoAckLow" as const },
            ].map((s) => (
              <label key={s.key} className="flex items-center justify-between text-[12px] text-gray-400">
                <span>{s.label}</span>
                <input type="checkbox" checked={settings[s.key]} onChange={(e) => update({ [s.key]: e.target.checked })} className="rounded bg-white/[0.04] border-white/[0.08]" />
              </label>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-4">System</h3>
          <div className="text-[11px] text-gray-500 space-y-1">
            <p>Backend: FastAPI v0.1.0</p>
            <p>Frontend: Next.js 14</p>
            <p>AI Engine: LangChain + LangGraph</p>
            <p>Vector Store: ChromaDB</p>
            <p>Embedding: OpenAI text-embedding-3-small</p>
            <p>Demo Scenario: Visakhapatnam Replay Prevention (T+120s cycle)</p>
          </div>
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <button onClick={handleReset} disabled={resetting} className="px-5 py-2 bg-red-500/10 text-red-400 rounded-xl text-[12px] font-bold hover:bg-red-500/20 transition-colors border border-red-500/15 disabled:opacity-50">
              {resetting ? "Resetting..." : "Reset Demo Scenario"}
            </button>
            <p className="text-[9px] text-gray-600 mt-2">Resets the simulation and returns to dashboard</p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
