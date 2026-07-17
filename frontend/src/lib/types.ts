// ── Zone Types ──
export type RiskLevel = "SAFE" | "CAUTION" | "HIGH" | "CRITICAL";

export interface Zone {
  zoneId: string;
  name: string;
  riskLevel: RiskLevel;
  riskScore: number;
  coordinates: { x: number; y: number; width: number; height: number };
  activePermits: number;
  workerCount: number;
  sensors: SensorReading[];
}

// ── Sensor Types ──
export type SensorStatus = "NORMAL" | "WARNING" | "CRITICAL";
export type SensorType = "CO" | "H2S" | "CH4" | "O2" | "TEMPERATURE" | "PRESSURE" | "HUMIDITY" | "VIBRATION";

export interface SensorReading {
  sensorId: string;
  zoneId: string;
  type: SensorType;
  value: number;
  unit: string;
  status: SensorStatus;
  timestamp: string;
}

export interface SensorHistory {
  sensorId: string;
  type: SensorType;
  unit: string;
  readings: { timestamp: string; value: number }[];
}

// ── Permit Types ──
export type PermitType = "HOT_WORK" | "CONFINED_SPACE" | "ELECTRICAL" | "HEIGHT" | "EXCAVATION";
export type PermitStatus = "ACTIVE" | "FLAGGED" | "SUSPENDED" | "COMPLETED";

export interface Permit {
  permitId: string;
  type: PermitType;
  zoneId: string;
  authorizedBy: string;
  workersInvolved: string[];
  status: PermitStatus;
  startTime: string;
  endTime: string;
  conflicts: PermitConflict[];
}

export interface PermitConflict {
  conflictType: string;
  description: string;
  regulatoryBasis: string;
  actionRequired: string;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

// ── Alert Types ──
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Alert {
  alertId: string;
  zoneId: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  riskScore: number;
  acknowledged: boolean;
  resolved: boolean;
  triggeredRules: TriggeredRule[];
  timestamp: string;
}

export interface GasReadings {
  CO?: number;
  H2S?: number;
  CH4?: number;
}

export interface RuleEvidence {
  permitType?: string;
  permitId?: string;
  gasReadings?: GasReadings;
  CH4?: number;
  H2S?: number;
  CO?: number;
  pressure?: number;
  phase?: number;
  nextShift?: string;
  count?: number;
  ventilationStatus?: string;
  permitCount?: number;
  shift?: string;
  maintenancePermits?: string[];
  permits?: string[];
  overduePermits?: string[];
  sensors?: GasReadings;
  [key: string]: unknown;
}

export interface TriggeredRule {
  ruleId: string;
  description: string;
  contribution: number;
  evidence: RuleEvidence;
}

// ── Incident Types ──
export interface HistoricalIncident {
  incident_id: string;
  date: string;
  plant: string;
  zone: string;
  type: string;
  fatalities: number;
  injuries: number;
  root_causes: string[];
  warning_signs_missed: string[];
  regulatory_violations: string[];
  prevention_measures: string[];
  description: string;
  similarity?: number;
}

// ── Worker Types ──
export interface WorkerLocation {
  workerId: string;
  name: string;
  zoneId: string;
  shift: string;
  role: string;
  locationX: number;
  locationY: number;
  inDangerZone: boolean;
}

// ── Risk Types ──
export interface RiskAssessment {
  zoneId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  triggeredRules: TriggeredRule[];
  individualSensors: { sensorId: string; type: SensorType; value: number; riskContribution: number }[];
  recommendedActions: string[];
  predictionHorizon: string;
  confidence: number;
  timestamp: string;
}

// ── Emergency Types ──
export type EmergencyStatus = "NORMAL" | "STANDBY" | "ACTIVE";

export interface EmergencyResponse {
  status: EmergencyStatus;
  zoneId: string;
  riskScore: number;
  triggeredAt: string;
  steps: EmergencyStep[];
}

export interface EmergencyStep {
  step: number;
  label: string;
  delay: number;
  completed: boolean;
  inProgress: boolean;
  details: string;
}

// ── Copilot Types ──
export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  confidence?: number;
  timestamp: string;
}

// ── Plant State ──
export interface PlantState {
  overallRiskScore: number;
  overallRiskLevel: RiskLevel;
  zones: Zone[];
  activeAlerts: number;
  flaggedPermits: number;
  workersAtRisk: number;
  lastUpdated: string;
}

// ── API Response Types ──
export interface ApiResponse<T> {
  data: T;
  timestamp: string;
}

// ── Prediction Types ──
export interface GasPrediction {
  predicted: number;
  interval: {
    lower: number;
    upper: number;
    confidence: number;
  };
}

export interface ZonePredictions {
  zoneId: string;
  predictions: Record<string, Record<string, GasPrediction>>;
  forecastedRisk30: number;
  forecastedRisk60: number;
  forecastedRisk90: number;
  currentRisk: number;
  horizon: string;
  timestamp: string;
}

export interface RiskPredictionPoint {
  time: string;
  score: number;
  predicted?: boolean;
  lower?: number;
  upper?: number;
}

// ── What-If Types ──
export interface WhatIfScenario {
  ventilationOffline?: boolean;
  hotWorkPermitActive?: boolean;
  shiftChangeover?: boolean;
  gasLeakZoneA?: boolean;
  maintenanceInZoneB?: boolean;
}

export interface WhatIfOverrides {
  CH4?: number;
  CO?: number;
  H2S?: number;
  O2?: number;
}

export interface WhatIfRequest {
  zoneId: string;
  overrides: WhatIfOverrides;
  scenarioFlags: WhatIfScenario;
}

export interface WhatIfResult {
  zoneId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  triggeredRules: Array<{
    ruleId: string;
    description: string;
    contribution: number;
    severity: string;
    scenario: boolean;
  }>;
  appliedOverrides: WhatIfOverrides;
  scenarioFlags: WhatIfScenario;
  sensorReadings: Record<string, number>;
  timestamp: string;
}

// ── PPE / CCTV Types ──
export interface PpeCamera {
  cameraId: string;
  zoneId: string;
  label: string;
}

export interface PpeViolation {
  violationId: string;
  workerId: string;
  workerName: string;
  zoneId: string;
  permitType: string;
  permitId: string;
  missingItems: string[];
  detectedAt: string;
  acknowledged: boolean;
}

export interface PpeDetectionEvent {
  eventId: string;
  cameraId: string;
  zoneId: string;
  workerId: string;
  detected: Record<string, boolean>;
  timestamp: string;
}

export interface PpeStats {
  totalViolations: number;
  activeViolations: number;
  byZone: Record<string, number>;
  byMissingItem: Record<string, number>;
}

// ── Notification Types ──
export interface Notification {
  notificationId: string;
  channel: string;
  recipient: string;
  message: string;
  templateType: string;
  timestamp: string;
  delivered: boolean;
}

export interface NotificationStats {
  total: number;
  byChannel: Record<string, number>;
  byType: Record<string, number>;
}
