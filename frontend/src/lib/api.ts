import type { PlantState, Alert, Permit, SensorReading, RiskAssessment, EmergencyResponse, HistoricalIncident, WorkerLocation, CopilotMessage, ZonePredictions, WhatIfResult, PpeViolation, PpeDetectionEvent, PpeCamera, PpeStats, Notification, NotificationStats } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  getPlantState: () => fetchApi<{ data: PlantState }>("/api/demo"),

  getSensors: (zoneId?: string) => {
    const path = zoneId ? `/api/sensors/${zoneId}` : "/api/sensors/current";
    return fetchApi<{ data: SensorReading[] }>(path);
  },

  getSensorHistory: (zoneId: string) =>
    fetchApi<{ data: Record<string, { timestamp: string; value: number }[]> }>(`/api/sensors/${zoneId}/history`),

  getAlerts: (active?: boolean, severity?: string) => {
    const params = new URLSearchParams();
    if (active) params.set("active", "true");
    if (severity) params.set("severity", severity);
    const qs = params.toString();
    return fetchApi<{ data: Alert[] }>(`/api/alerts${qs ? `?${qs}` : ""}`);
  },

  acknowledgeAlert: (alertId: string) =>
    fetchApi<{ data: { success: boolean } }>(`/api/alerts/${alertId}/acknowledge`, { method: "POST" }),

  resolveAlert: (alertId: string) =>
    fetchApi<{ data: { success: boolean } }>(`/api/alerts/${alertId}/resolve`, { method: "POST" }),

  getPermits: (active?: boolean) => {
    const params = active ? "?active=true" : "";
    return fetchApi<{ data: Permit[] }>(`/api/permits${params}`);
  },

  suspendPermit: (permitId: string) =>
    fetchApi<{ data: { success: boolean } }>(`/api/permits/${permitId}/suspend`, { method: "POST" }),

  getSimopsMatrix: () =>
    fetchApi<{ data: { permits: Permit[]; matrix: Record<string, Record<string, { status: string; reason: string }>> } }>("/api/permits/simops"),

  getRisk: (zoneId?: string) => {
    const path = zoneId ? `/api/risk/${zoneId}` : "/api/risk/plant";
    return fetchApi<{ data: RiskAssessment[] | RiskAssessment }>(path);
  },

  getRiskHistory: (zoneId?: string, limit: number = 120) => {
    const params = new URLSearchParams();
    if (zoneId) params.set("zone_id", zoneId);
    params.set("limit", String(limit));
    return fetchApi<{ data: Array<{ zoneId: string; riskScore: number; riskLevel: string; timestamp: string; triggeredRules?: Array<{ ruleId: string; description: string }> }> }>(`/api/risk/history?${params.toString()}`);
  },

  getIncidents: () => fetchApi<{ data: HistoricalIncident[] }>("/api/incidents"),

  queryIncidents: (query: string) =>
    fetchApi<{ data: { incidents: HistoricalIncident[]; regulations: { source: string; section: string; title: string }[]; summary: string } }>("/api/incidents/query", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  getSimilarIncidents: () => fetchApi<{ data: HistoricalIncident[] }>("/api/incidents/similar"),

  getIncidentPatterns: () => fetchApi<{ data: { typeCounts: Record<string, number>; totalIncidents: number; totalFatalities: number } }>("/api/incidents/patterns"),

  chatCopilot: (message: string) =>
    fetchApi<{ data: { response: string; sources: string[]; confidence: number } }>("/api/copilot/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  getEmergency: () => fetchApi<{ data: EmergencyResponse | null }>("/api/emergency"),

  triggerEmergency: (zoneId?: string) =>
    fetchApi<{ data: { success: boolean; emergency: EmergencyResponse } }>("/api/emergency/trigger", {
      method: "POST",
      body: JSON.stringify({ zone_id: zoneId || "" }),
    }),

  orchestrateEmergency: (zoneId: string) =>
    fetchApi<{ data: { steps: import("./types").EmergencyStep[] } }>(`/api/emergency/orchestrate/${zoneId}`, { method: "POST" }),

  resolveEmergency: () =>
    fetchApi<{ data: { success: boolean } }>("/api/emergency/resolve", { method: "POST" }),

  getWorkers: (inDanger?: boolean) => {
    const params = inDanger ? "?in_danger=true" : "";
    return fetchApi<{ data: WorkerLocation[] }>(`/api/workers${params}`);
  },

  resetDemo: () =>
    fetchApi<{ data: { success: boolean } }>("/api/demo", {
      method: "POST",
      body: JSON.stringify({ action: "reset" }),
    }),

  suspendZonePermits: (zoneId: string) =>
    fetchApi<{ data: { success: boolean } }>(`/api/emergency/suspend-permits/${zoneId}`, { method: "POST" }),

  triggerEvacuation: (zoneId: string) =>
    fetchApi<{ data: { success: boolean } }>(`/api/emergency/evacuate/${zoneId}`, { method: "POST" }),

  getKgStatus: () => fetchApi<{ data: { built: boolean; node_count: number; edge_count: number } }>("/api/knowledge-graph/status"),

  queryKg: (query: string) =>
    fetchApi<{ data: { query: string; interpretation: string; findings: any[]; regulations: any[]; recommendations: string[] } }>(`/api/knowledge-graph/query?q=${encodeURIComponent(query)}`),

  getKgGraph: () =>
    fetchApi<{ data: { nodes: { id: string; label: string; type: string }[]; edges: { source: string; target: string; relationship: string }[] } }>("/api/knowledge-graph/graph"),

  getKgZone: (zoneId: string) =>
    fetchApi<{ data: { nodes: { id: string; label: string; type: string; data?: any }[]; edges: { source: string; target: string; relationship: string }[] } }>(`/api/knowledge-graph/zone/${zoneId}`),

  getKgSimilarIncidents: (zoneId: string, gases?: string[], permits?: string[]) => {
    const params = new URLSearchParams({ zone_id: zoneId });
    if (gases?.length) params.set("gases", gases.join(","));
    if (permits?.length) params.set("permits", permits.join(","));
    return fetchApi<{ data: any[] }>(`/api/knowledge-graph/incidents/similar?${params.toString()}`);
  },

  getKgRegulations: (zoneId: string, gases?: string[], permits?: string[]) => {
    const params = new URLSearchParams({ zone_id: zoneId });
    if (gases?.length) params.set("gases", gases.join(","));
    if (permits?.length) params.set("permits", permits.join(","));
    return fetchApi<{ data: any[] }>(`/api/knowledge-graph/regulations?${params.toString()}`);
  },

  getKgPatterns: (incidentType?: string) => {
    const params = incidentType ? `?incident_type=${encodeURIComponent(incidentType)}` : "";
    return fetchApi<{ data: any }>(`/api/knowledge-graph/patterns${params}`);
  },

  getKgPreventionIntelligence: (zoneId?: string) => {
    const params = zoneId ? `?zone_id=${zoneId}` : "";
    return fetchApi<{ data: any }>(`/api/knowledge-graph/prevention-intelligence${params}`);
  },

  getRiskPredictions: (zoneId: string) =>
    fetchApi<{ data: ZonePredictions }>(`/api/risk/predictions/${zoneId}`),

  runWhatIf: (body: { zoneId: string; overrides: Record<string, number>; scenarioFlags: Record<string, boolean> }) =>
    fetchApi<{ data: WhatIfResult }>("/api/simulator/what-if", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  runPpeDetection: () =>
    fetchApi<{ data: { scanned: number; violations: PpeViolation[]; message: string } }>("/api/cv/detect", { method: "POST" }),

  getPpeViolations: () =>
    fetchApi<{ data: PpeViolation[] }>("/api/cv/violations"),

  acknowledgePpeViolation: (violationId: string) =>
    fetchApi<{ data: { success: boolean } }>(`/api/cv/violations/${violationId}/acknowledge`, { method: "POST" }),

  getPpeCameras: () =>
    fetchApi<{ data: PpeCamera[] }>("/api/cv/cameras"),

  getPpeDetectionLog: (limit: number = 50) =>
    fetchApi<{ data: PpeDetectionEvent[] }>(`/api/cv/log?limit=${limit}`),

  getPpeStats: () =>
    fetchApi<{ data: PpeStats }>("/api/cv/stats"),

  getEmergencyNotifications: (limit: number = 50) =>
    fetchApi<{ data: Notification[] }>(`/api/emergency/notifications?limit=${limit}`),

  getEmergencyNotificationStats: () =>
    fetchApi<{ data: NotificationStats }>("/api/emergency/notification-stats"),
};
