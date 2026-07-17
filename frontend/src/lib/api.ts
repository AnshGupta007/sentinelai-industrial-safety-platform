import type { PlantState, Alert, Permit, SensorReading, RiskAssessment, EmergencyResponse, HistoricalIncident, WorkerLocation, CopilotMessage, ZonePredictions, WhatIfResult, PpeViolation, PpeDetectionEvent, PpeCamera, PpeStats, Notification, NotificationStats } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://sentinelai-industrial-safety-platform-production.up.railway.app";
let _backendAvailable: boolean | null = null;
let _simInitialized = false;
let _simTicker: ReturnType<typeof setInterval> | null = null;

function ensureSimulator() {
  if (!_simInitialized) {
    try {
      const sim = require("./simulator");
      sim.initializeSimulator();
      _simInitialized = true;
      if (_simTicker === null && typeof window !== "undefined") {
        _simTicker = setInterval(() => {
          try {
            const s = require("./simulator");
            s.updateSimulator();
          } catch {}
        }, 2000);
      }
    } catch {}
  }
}

function now(): string {
  return new Date().toISOString();
}

async function tryBackend<T>(path: string, options?: RequestInit): Promise<{ ok: true; data: T } | { ok: false }> {
  if (_backendAvailable === false) return { ok: false };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    _backendAvailable = true;
    return { ok: true, data: await res.json() };
  } catch {
    _backendAvailable = false;
    return { ok: false };
  }
}

function simPlantState(): PlantState {
  try {
    const sim = require("./simulator");
    return sim.getPlantState();
  } catch {
    return { overallRiskScore: 0, overallRiskLevel: "SAFE", zones: [], activeAlerts: 0, flaggedPermits: 0, workersAtRisk: 0, lastUpdated: now() };
  }
}

function simZoneRisk(zoneId?: string): RiskAssessment | RiskAssessment[] {
  try {
    const sim = require("./simulator");
    if (zoneId) return sim.getZoneRisk(zoneId) || { zoneId, riskScore: 0, riskLevel: "SAFE", triggeredRules: [], individualSensors: [], recommendedActions: [], predictionHorizon: "> 2 hours", confidence: 0.95, timestamp: now() };
    return sim.getRiskAssessments();
  } catch {
    return zoneId ? { zoneId, riskScore: 0, riskLevel: "SAFE" as const, triggeredRules: [], individualSensors: [], recommendedActions: [], predictionHorizon: "> 2 hours", confidence: 0.95, timestamp: now() } : [];
  }
}

export const api = {
  getPlantState: async () => {
    const result = await tryBackend<{ data: PlantState }>("/api/demo");
    if (result.ok) return result.data;
    ensureSimulator();
    return { data: simPlantState(), timestamp: now() };
  },

  getSensors: async (zoneId?: string) => {
    const path = zoneId ? `/api/sensors/${zoneId}` : "/api/sensors/current";
    const result = await tryBackend<{ data: SensorReading[] }>(path);
    if (result.ok) return result.data;
    ensureSimulator();
    const sim = require("./simulator");
    const sensors = zoneId ? sim.getZoneSensors(zoneId) : sim.getCurrentSensors();
    return { data: sensors, timestamp: now() };
  },

  getSensorHistory: async (zoneId: string) => {
    const result = await tryBackend<{ data: Record<string, { timestamp: string; value: number }[]> }>(`/api/sensors/${zoneId}/history`);
    if (result.ok) return result.data;
    ensureSimulator();
    const sim = require("./simulator");
    return { data: sim.getZoneHistory(zoneId), timestamp: now() };
  },

  getAlerts: async (active?: boolean, severity?: string) => {
    const params = new URLSearchParams();
    if (active) params.set("active", "true");
    if (severity) params.set("severity", severity);
    const qs = params.toString();
    const result = await tryBackend<{ data: Alert[] }>(`/api/alerts${qs ? `?${qs}` : ""}`);
    if (result.ok) return result.data;
    ensureSimulator();
    const sim = require("./simulator");
    let alerts = sim.getAlerts();
    if (active) alerts = alerts.filter((a: Alert) => !a.resolved);
    if (severity) alerts = alerts.filter((a: Alert) => a.severity === severity);
    return { data: alerts, timestamp: now() };
  },

  acknowledgeAlert: async (alertId: string) => {
    const result = await tryBackend<{ data: { success: boolean } }>(`/api/alerts/${alertId}/acknowledge`, { method: "POST" });
    if (result.ok) return result.data;
    ensureSimulator();
    const sim = require("./simulator");
    return { data: { success: sim.acknowledgeAlert(alertId) }, timestamp: now() };
  },

  resolveAlert: async (alertId: string) => {
    const result = await tryBackend<{ data: { success: boolean } }>(`/api/alerts/${alertId}/resolve`, { method: "POST" });
    if (result.ok) return result.data;
    ensureSimulator();
    const sim = require("./simulator");
    return { data: { success: sim.resolveAlert(alertId) }, timestamp: now() };
  },

  getPermits: async (active?: boolean) => {
    const params = active ? "?active=true" : "";
    const result = await tryBackend<{ data: Permit[] }>(`/api/permits${params}`);
    if (result.ok) return result.data;
    ensureSimulator();
    const sim = require("./simulator");
    let permits = sim.getPermits();
    if (active) permits = permits.filter((p: Permit) => p.status === "ACTIVE" || p.status === "FLAGGED");
    return { data: permits, timestamp: now() };
  },

  suspendPermit: async (permitId: string) => {
    const result = await tryBackend<{ data: { success: boolean } }>(`/api/permits/${permitId}/suspend`, { method: "POST" });
    if (result.ok) return result.data;
    ensureSimulator();
    const sim = require("./simulator");
    return { data: { success: sim.suspendPermit(permitId) }, timestamp: now() };
  },

  getSimopsMatrix: async () => {
    const result = await tryBackend<{ data: { permits: Permit[]; matrix: Record<string, Record<string, { status: string; reason: string }>> } }>("/api/permits/simops");
    if (result.ok) return result.data;
    ensureSimulator();
    const sim = require("./simulator");
    const permits = sim.getPermits();
    const zones = ["ZONE_A", "ZONE_B", "ZONE_C", "ZONE_D", "ZONE_E", "ZONE_F"];
    const matrix: Record<string, Record<string, { status: string; reason: string }>> = {};
    zones.forEach(z1 => {
      matrix[z1] = {};
      zones.forEach(z2 => {
        matrix[z1][z2] = z1 === z2 ? { status: "SAME", reason: "Same zone" } : { status: "COMPATIBLE", reason: "No conflict" };
      });
    });
    return { data: { permits, matrix }, timestamp: now() };
  },

  getRisk: async (zoneId?: string) => {
    const path = zoneId ? `/api/risk/${zoneId}` : "/api/risk/plant";
    const result = await tryBackend<{ data: RiskAssessment[] | RiskAssessment }>(path);
    if (result.ok) return result.data;
    ensureSimulator();
    return { data: simZoneRisk(zoneId) as any, timestamp: now() };
  },

  getRiskHistory: async (zoneId?: string, limit: number = 120) => {
    const params = new URLSearchParams();
    if (zoneId) params.set("zone_id", zoneId);
    params.set("limit", String(limit));
    const result = await tryBackend<{ data: Array<{ zoneId: string; riskScore: number; riskLevel: string; timestamp: string; triggeredRules?: Array<{ ruleId: string; description: string }> }> }>(`/api/risk/history?${params.toString()}`);
    if (result.ok) return result.data;
    const hs: Array<{ zoneId: string; riskScore: number; riskLevel: string; timestamp: string }> = [];
    const zones = zoneId ? [zoneId] : ["ZONE_A", "ZONE_B", "ZONE_C", "ZONE_D", "ZONE_E", "ZONE_F"];
    const t = Date.now();
    for (let i = 0; i < 60; i++) {
      for (const z of zones) {
        const score = 10 + Math.floor(Math.random() * 30) + (z === "ZONE_A" ? Math.floor(i / 5) * 3 : 0);
        hs.push({ zoneId: z, riskScore: Math.min(100, score), riskLevel: score > 50 ? "HIGH" : score > 25 ? "CAUTION" : "SAFE", timestamp: new Date(t - i * 2000).toISOString() });
      }
    }
    return { data: hs.slice(-limit), timestamp: now() };
  },

  getIncidents: async () => {
    const result = await tryBackend<{ data: HistoricalIncident[] }>("/api/incidents");
    if (result.ok) return result.data;
    ensureSimulator();
    const sim = require("./simulator");
    return { data: sim.HISTORICAL_INCIDENTS, timestamp: now() };
  },

  queryIncidents: async (query: string) => {
    const result = await tryBackend<{ data: { incidents: HistoricalIncident[]; regulations: { source: string; section: string; title: string }[]; summary: string } }>("/api/incidents/query", { method: "POST", body: JSON.stringify({ query }) });
    if (result.ok) return result.data;
    ensureSimulator();
    const sim = require("./simulator");
    const q = query.toLowerCase();
    const incidents = sim.HISTORICAL_INCIDENTS.filter((i: HistoricalIncident) => i.description.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.root_causes.some((r: string) => r.toLowerCase().includes(q)));
    const regulations = sim.REGULATIONS.filter((r: { source: string; title: string }) => r.title.toLowerCase().includes(q) || r.source.toLowerCase().includes(q));
    return { data: { incidents, regulations, summary: `Found ${incidents.length} incidents and ${regulations.length} regulations matching "${query}".` }, timestamp: now() };
  },

  getSimilarIncidents: async () => {
    const result = await tryBackend<{ data: HistoricalIncident[] }>("/api/incidents/similar");
    if (result.ok) return result.data;
    ensureSimulator();
    const sim = require("./simulator");
    return { data: sim.HISTORICAL_INCIDENTS.slice(0, 5), timestamp: now() };
  },

  getIncidentPatterns: async () => {
    const result = await tryBackend<{ data: { typeCounts: Record<string, number>; totalIncidents: number; totalFatalities: number } }>("/api/incidents/patterns");
    if (result.ok) return result.data;
    ensureSimulator();
    const sim = require("./simulator");
    const typeCounts: Record<string, number> = {};
    let totalFatalities = 0;
    for (const inc of sim.HISTORICAL_INCIDENTS) {
      typeCounts[inc.type] = (typeCounts[inc.type] || 0) + 1;
      totalFatalities += inc.fatalities;
    }
    return { data: { typeCounts, totalIncidents: sim.HISTORICAL_INCIDENTS.length, totalFatalities }, timestamp: now() };
  },

  chatCopilot: async (message: string) => {
    const result = await tryBackend<{ data: { response: string; sources: string[]; confidence: number } }>("/api/copilot/chat", { method: "POST", body: JSON.stringify({ message }) });
    if (result.ok) return result.data;
    return { data: { response: `I'm operating in offline mode. Your query: "${message}". Connect the backend for full AI-powered analysis.`, sources: [], confidence: 0 }, timestamp: now() };
  },

  getEmergency: async () => {
    const result = await tryBackend<{ data: EmergencyResponse | null }>("/api/emergency");
    if (result.ok) return result.data;
    ensureSimulator();
    const sim = require("./simulator");
    return { data: sim.getEmergencyResponse(), timestamp: now() };
  },

  triggerEmergency: async (zoneId?: string) => {
    const result = await tryBackend<{ data: { success: boolean; emergency: EmergencyResponse } }>("/api/emergency/trigger", { method: "POST", body: JSON.stringify({ zone_id: zoneId || "" }) });
    if (result.ok) return result.data;
    ensureSimulator();
    const sim = require("./simulator");
    const zid = zoneId || "ZONE_A";
    const emg = sim.triggerEvacuation(zid);
    return { data: { success: !!emg, emergency: emg || { status: "ACTIVE", zoneId: zid, riskScore: 80, triggeredAt: now(), steps: [] } }, timestamp: now() };
  },

  orchestrateEmergency: async (zoneId: string) => {
    const result = await tryBackend<{ data: { steps: import("./types").EmergencyStep[] } }>(`/api/emergency/orchestrate/${zoneId}`, { method: "POST" });
    if (result.ok) return result.data;
    const steps = [
      { step: 1, label: "Alert Generation", delay: 0, completed: true, inProgress: false, details: `Emergency for ${zoneId} triggered` },
      { step: 2, label: "Notifications Dispatched", delay: 5, completed: true, inProgress: false, details: "Notified Safety Officer, Shift Supervisor, Plant Manager" },
      { step: 3, label: "Permits Suspended", delay: 10, completed: true, inProgress: false, details: `Permits in ${zoneId} suspended` },
      { step: 4, label: "Sensor Snapshot", delay: 15, completed: true, inProgress: false, details: "Sensor state preserved" },
      { step: 5, label: "Evacuation Protocol", delay: 30, completed: false, inProgress: true, details: "Evacuating workers" },
      { step: 6, label: "Incident Report", delay: 60, completed: false, inProgress: false, details: "Generating report" },
    ];
    return { data: { steps }, timestamp: now() };
  },

  resolveEmergency: async () => {
    const result = await tryBackend<{ data: { success: boolean } }>("/api/emergency/resolve", { method: "POST" });
    if (result.ok) return result.data;
    return { data: { success: true }, timestamp: now() };
  },

  getWorkers: async (inDanger?: boolean) => {
    const params = inDanger ? "?in_danger=true" : "";
    const result = await tryBackend<{ data: WorkerLocation[] }>(`/api/workers${params}`);
    if (result.ok) return result.data;
    ensureSimulator();
    const sim = require("./simulator");
    let workers = sim.getWorkers();
    if (inDanger) workers = workers.filter((w: WorkerLocation) => w.inDangerZone);
    return { data: workers, timestamp: now() };
  },

  resetDemo: async () => {
    const result = await tryBackend<{ data: { success: boolean } }>("/api/demo", { method: "POST", body: JSON.stringify({ action: "reset" }) });
    if (result.ok) return result.data;
    ensureSimulator();
    const sim = require("./simulator");
    sim.resetDemo();
    return { data: { success: true }, timestamp: now() };
  },

  suspendZonePermits: async (zoneId: string) => {
    const result = await tryBackend<{ data: { success: boolean } }>(`/api/emergency/suspend-permits/${zoneId}`, { method: "POST" });
    if (result.ok) return result.data;
    ensureSimulator();
    const sim = require("./simulator");
    return { data: { success: sim.suspendZonePermits(zoneId) > 0 }, timestamp: now() };
  },

  triggerEvacuation: async (zoneId: string) => {
    const result = await tryBackend<{ data: { success: boolean } }>(`/api/emergency/evacuate/${zoneId}`, { method: "POST" });
    if (result.ok) return result.data;
    return { data: { success: true }, timestamp: now() };
  },

  getKgStatus: async () => {
    const result = await tryBackend<{ data: { built: boolean; node_count: number; edge_count: number } }>("/api/knowledge-graph/status");
    if (result.ok) return result.data;
    return { data: { built: false, node_count: 0, edge_count: 0 }, timestamp: now() };
  },

  queryKg: async (query: string) => {
    const result = await tryBackend<{ data: { query: string; interpretation: string; findings: any[]; regulations: any[]; recommendations: string[] } }>(`/api/knowledge-graph/query?q=${encodeURIComponent(query)}`);
    if (result.ok) return result.data;
    return { data: { query, interpretation: "Knowledge graph unavailable in offline mode.", findings: [], regulations: [], recommendations: ["Connect backend for knowledge graph access."] }, timestamp: now() };
  },

  getKgGraph: async () => {
    const result = await tryBackend<{ data: { nodes: { id: string; label: string; type: string }[]; edges: { source: string; target: string; relationship: string }[] } }>("/api/knowledge-graph/graph");
    if (result.ok) return result.data;
    return { data: { nodes: [], edges: [] }, timestamp: now() };
  },

  getKgZone: async (zoneId: string) => {
    const result = await tryBackend<{ data: { nodes: { id: string; label: string; type: string; data?: any }[]; edges: { source: string; target: string; relationship: string }[] } }>(`/api/knowledge-graph/zone/${zoneId}`);
    if (result.ok) return result.data;
    return { data: { nodes: [], edges: [] }, timestamp: now() };
  },

  getKgSimilarIncidents: async (zoneId: string, gases?: string[], permits?: string[]) => {
    const params = new URLSearchParams({ zone_id: zoneId });
    if (gases?.length) params.set("gases", gases.join(","));
    if (permits?.length) params.set("permits", permits.join(","));
    const result = await tryBackend<{ data: any[] }>(`/api/knowledge-graph/incidents/similar?${params.toString()}`);
    if (result.ok) return result.data;
    return { data: [], timestamp: now() };
  },

  getKgRegulations: async (zoneId: string, gases?: string[], permits?: string[]) => {
    const params = new URLSearchParams({ zone_id: zoneId });
    if (gases?.length) params.set("gases", gases.join(","));
    if (permits?.length) params.set("permits", permits.join(","));
    const result = await tryBackend<{ data: any[] }>(`/api/knowledge-graph/regulations?${params.toString()}`);
    if (result.ok) return result.data;
    return { data: [], timestamp: now() };
  },

  getKgPatterns: async (incidentType?: string) => {
    const params = incidentType ? `?incident_type=${encodeURIComponent(incidentType)}` : "";
    const result = await tryBackend<{ data: any }>(`/api/knowledge-graph/patterns${params}`);
    if (result.ok) return result.data;
    return { data: { patterns: [] }, timestamp: now() };
  },

  getKgPreventionIntelligence: async (zoneId?: string) => {
    const params = zoneId ? `?zone_id=${zoneId}` : "";
    const result = await tryBackend<{ data: any }>(`/api/knowledge-graph/prevention-intelligence${params}`);
    if (result.ok) return result.data;
    return { data: { recommendations: [] }, timestamp: now() };
  },

  getRiskPredictions: async (zoneId: string) => {
    const result = await tryBackend<{ data: ZonePredictions }>(`/api/risk/predictions/${zoneId}`);
    if (result.ok) return result.data;
    return { data: { zoneId, predictions: {}, forecastedRisk30: 0, forecastedRisk60: 0, forecastedRisk90: 0, currentRisk: 0, horizon: "90min", timestamp: now() }, timestamp: now() };
  },

  runWhatIf: async (body: { zoneId: string; overrides: Record<string, number>; scenarioFlags: Record<string, boolean> }) => {
    const result = await tryBackend<{ data: WhatIfResult }>("/api/simulator/what-if", { method: "POST", body: JSON.stringify(body) });
    if (result.ok) return result.data;
    let total = 18;
    const triggered = [];
    const f = body.scenarioFlags;
    if (f.ventilationOffline) { total += 35; triggered.push({ ruleId: "RULE_6", description: "Ventilation offline + confined space", contribution: 35, severity: "CRITICAL", scenario: true }); }
    if (f.hotWorkPermitActive) { total += 25; triggered.push({ ruleId: "RULE_2", description: "Hot work + flammable gas risk", contribution: 25, severity: "CRITICAL", scenario: true }); }
    if (f.shiftChangeover) { total += 15; triggered.push({ ruleId: "RULE_4", description: "Shift changeover imminent", contribution: 15, severity: "MEDIUM", scenario: true }); }
    if (f.gasLeakZoneA) { total += 30; triggered.push({ ruleId: "RULE_1", description: "Confined space + elevated gas leak", contribution: 30, severity: "CRITICAL", scenario: true }); }
    if (f.maintenanceInZoneB) { total += 20; triggered.push({ ruleId: "RULE_3", description: "Maintenance + pressure anomaly", contribution: 20, severity: "HIGH", scenario: true }); }
    total = Math.min(100, Math.max(5, total));
    const level = total > 75 ? "CRITICAL" : total > 50 ? "HIGH" : total > 25 ? "CAUTION" : "SAFE";
    return { data: { zoneId: body.zoneId, riskScore: total, riskLevel: level as any, triggeredRules: triggered, appliedOverrides: body.overrides, scenarioFlags: body.scenarioFlags, sensorReadings: {}, timestamp: now() }, timestamp: now() };
  },

  runPpeDetection: async () => {
    const result = await tryBackend<{ data: { scanned: number; violations: PpeViolation[]; message: string } }>("/api/cv/detect", { method: "POST" });
    if (result.ok) return result.data;
    return { data: { scanned: 0, violations: [], message: "PPE detection unavailable offline" }, timestamp: now() };
  },

  getPpeViolations: async () => {
    const result = await tryBackend<{ data: PpeViolation[] }>("/api/cv/violations");
    if (result.ok) return result.data;
    return { data: [], timestamp: now() };
  },

  acknowledgePpeViolation: async (violationId: string) => {
    const result = await tryBackend<{ data: { success: boolean } }>(`/api/cv/violations/${violationId}/acknowledge`, { method: "POST" });
    if (result.ok) return result.data;
    return { data: { success: true }, timestamp: now() };
  },

  getPpeCameras: async () => {
    const result = await tryBackend<{ data: PpeCamera[] }>("/api/cv/cameras");
    if (result.ok) return result.data;
    return { data: [
      { cameraId: "CAM-A-01", zoneId: "ZONE_A", label: "Coke Oven — North Entry" },
      { cameraId: "CAM-A-02", zoneId: "ZONE_A", label: "Coke Oven — South Platform" },
      { cameraId: "CAM-B-01", zoneId: "ZONE_B", label: "Blast Furnace — Taphole" },
      { cameraId: "CAM-B-02", zoneId: "ZONE_B", label: "Blast Furnace — Cast House" },
      { cameraId: "CAM-C-01", zoneId: "ZONE_C", label: "Gas Processing — Valve Station" },
      { cameraId: "CAM-D-01", zoneId: "ZONE_D", label: "Control Room — Entry" },
      { cameraId: "CAM-E-01", zoneId: "ZONE_E", label: "Maintenance — Bay 1" },
      { cameraId: "CAM-F-01", zoneId: "ZONE_F", label: "Raw Material — Conveyor" },
    ], timestamp: now() };
  },

  getPpeDetectionLog: async (limit: number = 50) => {
    const result = await tryBackend<{ data: PpeDetectionEvent[] }>(`/api/cv/log?limit=${limit}`);
    if (result.ok) return result.data;
    return { data: [], timestamp: now() };
  },

  getPpeStats: async () => {
    const result = await tryBackend<{ data: PpeStats }>("/api/cv/stats");
    if (result.ok) return result.data;
    return { data: { totalViolations: 0, activeViolations: 0, byZone: {}, byMissingItem: {} }, timestamp: now() };
  },

  getEmergencyNotifications: async (limit: number = 50) => {
    const result = await tryBackend<{ data: Notification[] }>(`/api/emergency/notifications?limit=${limit}`);
    if (result.ok) return result.data;
    return { data: [], timestamp: now() };
  },

  getEmergencyNotificationStats: async () => {
    const result = await tryBackend<{ data: NotificationStats }>("/api/emergency/notification-stats");
    if (result.ok) return result.data;
    return { data: { total: 0, byChannel: {}, byType: {} }, timestamp: now() };
  },
};
