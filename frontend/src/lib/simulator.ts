import type {
  SensorReading, SensorType, Zone, Permit, PermitType, PermitConflict,
  Alert, RiskAssessment, TriggeredRule, WorkerLocation,
  HistoricalIncident, PlantState, EmergencyResponse, EmergencyStep,
} from "./types";
import {
  ZONE_CONFIG, SENSOR_THRESHOLDS, WORKER_NAMES, ROLES, PERMIT_CONFIG,
} from "./constants";
import { getSensorStatus, getRiskLevel, generateId, roundTo } from "./utils";

// ─── In-Memory State ───
let sensorHistory: Map<string, { timestamp: string; value: number }[]> = new Map();
let currentSensors: Map<string, SensorReading> = new Map();
let currentPermits: Permit[] = [];
let currentAlerts: Alert[] = [];
let currentWorkers: WorkerLocation[] = [];
let riskAssessments: Map<string, RiskAssessment> = new Map();
let demoStartTime: number = Date.now();
let demoPhase: number = 0;
let emergencyActive: EmergencyResponse | null = null;
let alertCounter: number = 1000;
let lastPhaseTransitionTime: number = Date.now();

function now(): string { return new Date().toISOString(); }

// ─── Sensor Simulation ───
function generateSensorReading(zoneId: string, type: SensorType, phase: number): number {
  const config = SENSOR_THRESHOLDS[type];
  const baseNormal = config.normalMax * 0.5;
  const noise = () => (Math.random() - 0.5) * baseNormal * 0.3;

  // Demo escalation for Zone A
  let escalation = 1;
  if (zoneId === "ZONE_A") {
    if (phase >= 1) escalation = 1.2; // T+30s: CH4 starts rising
    if (phase >= 2) escalation = 1.8; // T+60s: More escalation
    if (phase >= 3) escalation = 2.5; // T+90s: Critical
    if (phase >= 4) escalation = 3.0; // T+120s: Peak
  }

  // Zone B slight elevation
  if (zoneId === "ZONE_B" && phase >= 2) escalation = 1.3;

  // Spike probability
  const spike = Math.random() < 0.05;

  switch (type) {
    case "CO":
      if (zoneId === "ZONE_A" && phase >= 2) return roundTo(baseNormal * escalation + noise() + (spike ? 20 : 0), 1);
      return roundTo(Math.max(0, baseNormal * escalation + noise() + (spike ? 15 : 0)), 1);
    case "H2S":
      return roundTo(Math.max(0, 1.5 * escalation + noise() * 0.5 + (spike ? 5 : 0)), 1);
    case "CH4":
      if (zoneId === "ZONE_A" && phase >= 1) return roundTo(5 * escalation + noise() + (spike ? 10 : 0), 1);
      return roundTo(Math.max(0, 3 * escalation + noise() + (spike ? 8 : 0)), 1);
    case "O2":
      return roundTo(20.9 - (zoneId === "ZONE_A" && phase >= 2 ? 1.5 * escalation : 0) + noise() * 0.2, 1);
    case "TEMPERATURE":
      return roundTo(40 * escalation + noise() * 5 + (spike ? 30 : 0), 1);
    case "PRESSURE":
      return roundTo(1.0 + (zoneId === "ZONE_A" && phase >= 2 ? 0.2 * escalation : 0) + noise() * 0.1 + (spike ? 0.5 : 0), 2);
    case "HUMIDITY":
      return roundTo(50 + noise() * 10, 1);
    case "VIBRATION":
      return roundTo(2 * escalation + noise() + (spike ? 5 : 0), 1);
    default:
      return roundTo(baseNormal + noise(), 1);
  }
}

export function initializeSimulator(): void {
  demoStartTime = Date.now();
  demoPhase = 0;
  currentSensors.clear();
  sensorHistory.clear();
  currentAlerts = [];
  alertCounter = 1000;
  emergencyActive = null;

  // Initialize sensors for each zone
  const sensorTypes: SensorType[] = ["CO", "H2S", "CH4", "O2", "TEMPERATURE", "PRESSURE", "HUMIDITY", "VIBRATION"];
  ZONE_CONFIG.forEach((zone) => {
    sensorTypes.forEach((type) => {
      const sensorId = `${zone.zoneId}_${type}`;
      const value = generateSensorReading(zone.zoneId, type, 0);
      const reading: SensorReading = {
        sensorId,
        zoneId: zone.zoneId,
        type,
        value,
        unit: SENSOR_THRESHOLDS[type].unit,
        status: getSensorStatus(type, value),
        timestamp: now(),
      };
      currentSensors.set(sensorId, reading);
      sensorHistory.set(sensorId, [{ timestamp: now(), value }]);
    });
  });

  // Initialize permits
  currentPermits = [
    { permitId: "PTW-2024-0847", type: "CONFINED_SPACE", zoneId: "ZONE_A", authorizedBy: "Supervisor Rajan", workersInvolved: ["W001", "W002", "W003"], status: "ACTIVE", startTime: now(), endTime: new Date(Date.now() + 4 * 3600000).toISOString(), conflicts: [] },
    { permitId: "PTW-2024-0848", type: "HOT_WORK", zoneId: "ZONE_B", authorizedBy: "Supervisor Suresh", workersInvolved: ["W010", "W011"], status: "ACTIVE", startTime: now(), endTime: new Date(Date.now() + 2 * 3600000).toISOString(), conflicts: [] },
    { permitId: "PTW-2024-0849", type: "ELECTRICAL", zoneId: "ZONE_E", authorizedBy: "Supervisor Amit", workersInvolved: ["W020", "W021"], status: "ACTIVE", startTime: now(), endTime: new Date(Date.now() + 3 * 3600000).toISOString(), conflicts: [] },
    { permitId: "PTW-2024-0850", type: "HEIGHT", zoneId: "ZONE_B", authorizedBy: "Supervisor Vikram", workersInvolved: ["W012", "W013", "W014"], status: "ACTIVE", startTime: now(), endTime: new Date(Date.now() + 6 * 3600000).toISOString(), conflicts: [] },
    { permitId: "PTW-2024-0851", type: "CONFINED_SPACE", zoneId: "ZONE_C", authorizedBy: "Supervisor Deepak", workersInvolved: ["W025", "W026"], status: "ACTIVE", startTime: now(), endTime: new Date(Date.now() + 5 * 3600000).toISOString(), conflicts: [] },
    { permitId: "PTW-2024-0852", type: "HOT_WORK", zoneId: "ZONE_A", authorizedBy: "Supervisor Prakash", workersInvolved: ["W004", "W005"], status: "ACTIVE", startTime: now(), endTime: new Date(Date.now() + 2 * 3600000).toISOString(), conflicts: [] },
    { permitId: "PTW-2024-0853", type: "EXCAVATION", zoneId: "ZONE_F", authorizedBy: "Supervisor Ramesh", workersInvolved: ["W040", "W041"], status: "ACTIVE", startTime: now(), endTime: new Date(Date.now() + 8 * 3600000).toISOString(), conflicts: [] },
    { permitId: "PTW-2024-0854", type: "ELECTRICAL", zoneId: "ZONE_D", authorizedBy: "Supervisor Sanjay", workersInvolved: ["W030"], status: "ACTIVE", startTime: now(), endTime: new Date(Date.now() + 1 * 3600000).toISOString(), conflicts: [] },
    { permitId: "PTW-2024-0855", type: "HEIGHT", zoneId: "ZONE_C", authorizedBy: "Supervisor Mohan", workersInvolved: ["W027"], status: "ACTIVE", startTime: now(), endTime: new Date(Date.now() + 4 * 3600000).toISOString(), conflicts: [] },
    { permitId: "PTW-2024-0856", type: "HOT_WORK", zoneId: "ZONE_E", authorizedBy: "Supervisor Arjun", workersInvolved: ["W022", "W023"], status: "ACTIVE", startTime: now(), endTime: new Date(Date.now() + 3 * 3600000).toISOString(), conflicts: [] },
    { permitId: "PTW-2024-0857", type: "CONFINED_SPACE", zoneId: "ZONE_A", authorizedBy: "Supervisor Kiran", workersInvolved: ["W006"], status: "ACTIVE", startTime: now(), endTime: new Date(Date.now() + 2 * 3600000).toISOString(), conflicts: [] },
    { permitId: "PTW-2024-0858", type: "ELECTRICAL", zoneId: "ZONE_B", authorizedBy: "Supervisor Ravi", workersInvolved: ["W015"], status: "ACTIVE", startTime: now(), endTime: new Date(Date.now() + 5 * 3600000).toISOString(), conflicts: [] },
    { permitId: "PTW-2024-0859", type: "EXCAVATION", zoneId: "ZONE_A", authorizedBy: "Supervisor Sunil", workersInvolved: ["W007", "W008"], status: "ACTIVE", startTime: now(), endTime: new Date(Date.now() + 6 * 3600000).toISOString(), conflicts: [] },
    { permitId: "PTW-2024-0860", type: "HEIGHT", zoneId: "ZONE_E", authorizedBy: "Supervisor Manoj", workersInvolved: ["W024"], status: "ACTIVE", startTime: now(), endTime: new Date(Date.now() + 3 * 3600000).toISOString(), conflicts: [] },
    { permitId: "PTW-2024-0861", type: "HOT_WORK", zoneId: "ZONE_C", authorizedBy: "Supervisor Anil", workersInvolved: ["W028", "W029"], status: "ACTIVE", startTime: now(), endTime: new Date(Date.now() + 2 * 3600000).toISOString(), conflicts: [] },
  ];

  // Initialize workers
  currentWorkers = [];
  let wIdx = 0;
  ZONE_CONFIG.forEach((zone) => {
    const count = zone.zoneId === "ZONE_A" ? 12 : zone.zoneId === "ZONE_B" ? 10 : zone.zoneId === "ZONE_C" ? 8 : zone.zoneId === "ZONE_D" ? 5 : zone.zoneId === "ZONE_E" ? 8 : 7;
    for (let i = 0; i < count && wIdx < 50; i++) {
      currentWorkers.push({
        workerId: `W${String(wIdx + 1).padStart(3, "0")}`,
        name: WORKER_NAMES[wIdx],
        zoneId: zone.zoneId,
        shift: "B",
        role: ROLES[wIdx % ROLES.length],
        locationX: zone.x + Math.random() * zone.width,
        locationY: zone.y + Math.random() * zone.height,
        inDangerZone: false,
      });
      wIdx++;
    }
  });

  // Initialize risk assessments
  ZONE_CONFIG.forEach((zone) => {
    riskAssessments.set(zone.zoneId, {
      zoneId: zone.zoneId,
      riskScore: zone.zoneId === "ZONE_A" ? 18 : zone.zoneId === "ZONE_B" ? 15 : 10,
      riskLevel: "SAFE",
      triggeredRules: [],
      individualSensors: [],
      recommendedActions: [],
      predictionHorizon: "> 2 hours",
      confidence: 0.95,
      timestamp: now(),
    });
  });
}

// ─── Update Simulator (called periodically) ───
export function updateSimulator(): void {
  const elapsed = (Date.now() - demoStartTime) / 1000;

  // Demo phase progression
  const prevPhase = demoPhase;
  if (elapsed >= 120) demoPhase = 4;
  else if (elapsed >= 90) demoPhase = 3;
  else if (elapsed >= 60) demoPhase = 2;
  else if (elapsed >= 30) demoPhase = 1;
  else demoPhase = 0;
  if (demoPhase !== prevPhase) lastPhaseTransitionTime = Date.now();

  // Update sensor readings
  const sensorTypes: SensorType[] = ["CO", "H2S", "CH4", "O2", "TEMPERATURE", "PRESSURE", "HUMIDITY", "VIBRATION"];
  ZONE_CONFIG.forEach((zone) => {
    sensorTypes.forEach((type) => {
      const sensorId = `${zone.zoneId}_${type}`;
      const existing = currentSensors.get(sensorId);
      if (!existing) return;

      const value = generateSensorReading(zone.zoneId, type, demoPhase);
      const status = getSensorStatus(type, value);
      const reading: SensorReading = { ...existing, value, status, timestamp: now() };
      currentSensors.set(sensorId, reading);

      // Store history (keep last 900 entries = ~30 min at 2s intervals)
      const history = sensorHistory.get(sensorId) || [];
      history.push({ timestamp: now(), value });
      if (history.length > 900) history.shift();
      sensorHistory.set(sensorId, history);
    });
  });

  // Update worker positions slightly
  currentWorkers = currentWorkers.map((w) => ({
    ...w,
    locationX: w.locationX + (Math.random() - 0.5) * 2,
    locationY: w.locationY + (Math.random() - 0.5) * 2,
    inDangerZone: isZoneHighRisk(w.zoneId),
  }));

  // Run compound risk analysis
  ZONE_CONFIG.forEach((zone) => {
    const assessment = calculateRiskAssessment(zone.zoneId);
    riskAssessments.set(zone.zoneId, assessment);

    // Auto-generate alerts for HIGH and CRITICAL
    if (assessment.riskLevel === "CRITICAL" || assessment.riskLevel === "HIGH") {
      const existingCritical = currentAlerts.find(
        (a) => a.zoneId === zone.zoneId && !a.resolved && a.severity === "CRITICAL"
      );
      if (!existingCritical && assessment.riskLevel === "CRITICAL") {
        alertCounter++;
        currentAlerts.unshift({
          alertId: `ALT-2024-${alertCounter}`,
          zoneId: zone.zoneId,
          severity: "CRITICAL",
          title: `Compound Risk Detected in ${zone.name}`,
          description: assessment.triggeredRules.map((r) => r.description).join("; "),
          riskScore: assessment.riskScore,
          acknowledged: false,
          resolved: false,
          triggeredRules: assessment.triggeredRules,
          timestamp: now(),
        });
      }
      const existingHigh = currentAlerts.find(
        (a) => a.zoneId === zone.zoneId && !a.resolved && a.severity === "HIGH"
      );
      if (!existingHigh && assessment.riskLevel === "HIGH") {
        alertCounter++;
        currentAlerts.unshift({
          alertId: `ALT-2024-${alertCounter}`,
          zoneId: zone.zoneId,
          severity: "HIGH",
          title: `Elevated Risk in ${zone.name}`,
          description: `Risk score ${assessment.riskScore}. ${assessment.triggeredRules.map((r) => r.description).join("; ") || "Multiple sensor elevations detected"}`,
          riskScore: assessment.riskScore,
          acknowledged: false,
          resolved: false,
          triggeredRules: assessment.triggeredRules,
          timestamp: now(),
        });
      }
    }
  });

  // Update permit conflicts
  currentPermits = currentPermits.map((p) => {
    const conflicts = detectPermitConflicts(p);
    const status = conflicts.some((c) => c.urgency === "CRITICAL") ? "FLAGGED" : conflicts.length > 0 ? "FLAGGED" : p.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
    return { ...p, conflicts, status: status as Permit["status"] };
  });

  // Emergency orchestrator
  const criticalZones = ZONE_CONFIG.filter((z) => {
    const a = riskAssessments.get(z.zoneId);
    return a && a.riskScore > 75;
  });

  if (criticalZones.length > 0 && !emergencyActive) {
    const zone = criticalZones[0];
    const assessment = riskAssessments.get(zone.zoneId)!;
    emergencyActive = {
      status: "ACTIVE",
      zoneId: zone.zoneId,
      riskScore: assessment.riskScore,
      triggeredAt: now(),
      steps: generateEmergencySteps(zone.zoneId, assessment.riskScore),
    };
  }

  if (criticalZones.length === 0 && emergencyActive) {
    emergencyActive = null;
  }

  // Keep alerts manageable
  if (currentAlerts.length > 50) currentAlerts = currentAlerts.slice(0, 50);
}

function isZoneHighRisk(zoneId: string): boolean {
  const a = riskAssessments.get(zoneId);
  return a ? a.riskScore > 50 : false;
}

// ─── Risk Assessment Engine ───
function calculateRiskAssessment(zoneId: string): RiskAssessment {
  const sensorTypes: SensorType[] = ["CO", "H2S", "CH4", "O2", "TEMPERATURE", "PRESSURE", "HUMIDITY", "VIBRATION"];
  const triggeredRules: TriggeredRule[] = [];
  let totalSensorRisk = 0;

  // 1. Individual sensor risk (0-40 points)
  const individualSensors = sensorTypes.map((type) => {
    const sensorId = `${zoneId}_${type}`;
    const reading = currentSensors.get(sensorId);
    if (!reading) return { sensorId, type, value: 0, riskContribution: 0 };

    const config = SENSOR_THRESHOLDS[type];
    let riskContribution = 0;

    if (reading.status === "CRITICAL") {
      riskContribution = 40 * config.weight / 1.5;
    } else if (reading.status === "WARNING") {
      riskContribution = 20 * config.weight / 1.5;
    } else {
      riskContribution = 2;
    }

    totalSensorRisk += riskContribution;
    return { sensorId, type, value: reading.value, riskContribution: roundTo(riskContribution, 1) };
  });

  totalSensorRisk = Math.min(40, totalSensorRisk / sensorTypes.length);

  // 2. Compound condition detection (0-40 points)
  const zoneSensors: Record<string, number> = {};
  sensorTypes.forEach((type) => {
    const sensorId = `${zoneId}_${type}`;
    const reading = currentSensors.get(sensorId);
    zoneSensors[type] = reading?.value ?? 0;
  });

  const zonePermits = currentPermits.filter((p) => p.zoneId === zoneId && p.status !== "SUSPENDED" && p.status !== "COMPLETED");
  const hasConfinedSpace = zonePermits.some((p) => p.type === "CONFINED_SPACE");
  const hasHotWork = zonePermits.some((p) => p.type === "HOT_WORK");
  const hasMaintenance = zonePermits.some((p) => p.type === "ELECTRICAL" || p.type === "HEIGHT" || p.type === "EXCAVATION");
  const hasElevatedGas = zoneSensors.CO > 25 || zoneSensors.H2S > 5 || zoneSensors.CH4 > 10;
  const hasPressureAnomaly = zoneSensors.PRESSURE > 1.2;

  // Demo: Zone A ventilation goes offline at phase 2+
  const ventilationOffline = zoneId === "ZONE_A" && demoPhase >= 2;

  // Rule 1: CONFINED_SPACE + ELEVATED_GAS
  if (hasConfinedSpace && hasElevatedGas) {
    triggeredRules.push({
      ruleId: "RULE_1",
      description: "Confined space permit active + elevated gas levels detected",
      contribution: 25,
      evidence: { permitType: "CONFINED_SPACE", gasReadings: { CO: zoneSensors.CO, H2S: zoneSensors.H2S, CH4: zoneSensors.CH4 } },
    });
  }

  // Rule 2: HOT_WORK + CH4 > 10 or H2S > 5
  if (hasHotWork && (zoneSensors.CH4 > 10 || zoneSensors.H2S > 5)) {
    triggeredRules.push({
      ruleId: "RULE_2",
      description: "Hot work permit + flammable gas detected — immediate suspension required",
      contribution: 30,
      evidence: { permitType: "HOT_WORK", CH4: zoneSensors.CH4, H2S: zoneSensors.H2S },
    });
  }

  // Rule 3: MAINTENANCE + PRESSURE_ANOMALY
  if (hasMaintenance && hasPressureAnomaly) {
    triggeredRules.push({
      ruleId: "RULE_3",
      description: "Maintenance active + pressure anomaly detected",
      contribution: 20,
      evidence: { pressure: zoneSensors.PRESSURE, maintenancePermits: zonePermits.filter((p) => hasMaintenance).map((p) => p.permitId) },
    });
  }

  // Rule 4: Shift changeover + elevated sensors
  const isShiftChangeover = demoPhase > 0 && (Date.now() - lastPhaseTransitionTime) < 15000;
  const hasElevatedSensors = zoneSensors.CO > 25 || zoneSensors.H2S > 5 || zoneSensors.CH4 > 10 || zoneSensors.O2 < 19.5 || zoneSensors.TEMPERATURE > 60 || zoneSensors.PRESSURE > 1.2;
  if (isShiftChangeover && hasElevatedSensors) {
    triggeredRules.push({
      ruleId: "RULE_4",
      description: "Shift changeover in progress + elevated sensor readings — handover communication required",
      contribution: 15,
      evidence: { phase: demoPhase, sensors: { CO: zoneSensors.CO, H2S: zoneSensors.H2S, CH4: zoneSensors.CH4 } },
    });
  }

  // Rule 5: Multiple permits same zone
  if (zonePermits.length > 2) {
    triggeredRules.push({
      ruleId: "RULE_5",
      description: `${zonePermits.length} permits active simultaneously in same zone`,
      contribution: 15,
      evidence: { permitCount: zonePermits.length, permits: zonePermits.map((p) => p.permitId) },
    });
  }

  // Rule 6: VENTILATION_OFFLINE + CONFINED_SPACE
  if (ventilationOffline && hasConfinedSpace) {
    triggeredRules.push({
      ruleId: "RULE_6",
      description: "Ventilation offline + confined space permit active — CRITICAL",
      contribution: 35,
      evidence: { ventilationStatus: "OFFLINE", permitType: "CONFINED_SPACE", permitId: "PTW-2024-0847" },
    });
  }

  // Rule 7: Night shift + overdue maintenance
  const isNightShift = demoPhase >= 2;
  const hasOverdueMaintenance = zonePermits.some((p) =>
    (p.type === "ELECTRICAL" || p.type === "HEIGHT" || p.type === "EXCAVATION") &&
    new Date(p.endTime) < new Date()
  );
  if (isNightShift && hasOverdueMaintenance) {
    triggeredRules.push({
      ruleId: "RULE_7",
      description: "Night shift with overdue maintenance work — fatigue and oversight risk",
      contribution: 20,
      evidence: { phase: demoPhase, overduePermits: zonePermits.filter((p) => new Date(p.endTime) < new Date()).map((p) => p.permitId) },
    });
  }

  const compoundRisk = Math.min(40, triggeredRules.reduce((sum, r) => sum + r.contribution, 0));

  // 3. Historical pattern bonus (0-20 points)
  const historicalBonus = (zoneId === "ZONE_A" && hasElevatedGas && hasConfinedSpace) ? 15 :
    (zoneId === "ZONE_B" && hasHotWork) ? 8 : 3;

  // 4. Time escalation
  const totalScore = totalSensorRisk + compoundRisk + historicalBonus;
  const timeEscalation = demoPhase >= 3 ? 1.3 : demoPhase >= 2 ? 1.15 : 1.0;
  const finalScore = Math.min(100, Math.round(totalScore * timeEscalation));

  const riskLevel = getRiskLevel(finalScore);
  const zoneName = ZONE_CONFIG.find((z) => z.zoneId === zoneId)?.name ?? zoneId;
  const workerCount = currentWorkers.filter((w) => w.zoneId === zoneId).length;

  const recommendedActions: string[] = [];
  if (riskLevel === "CRITICAL") {
    recommendedActions.push("Initiate emergency evacuation of Zone A immediately");
    recommendedActions.push("Suspend all active permits in affected zone");
    recommendedActions.push("Dispatch safety team to affected zone");
    recommendedActions.push("Notify Plant Manager and Safety Officer");
  } else if (riskLevel === "HIGH") {
    recommendedActions.push("Increase monitoring frequency for affected sensors");
    recommendedActions.push("Review active permits for conflicts");
    recommendedActions.push("Prepare evacuation plan for affected zone");
    recommendedActions.push("Alert zone supervisor");
  } else if (riskLevel === "CAUTION") {
    recommendedActions.push("Monitor sensor trends closely");
    recommendedActions.push("Verify permit conditions remain safe");
  }

  return {
    zoneId,
    riskScore: finalScore,
    riskLevel,
    triggeredRules,
    individualSensors,
    recommendedActions,
    predictionHorizon: finalScore > 60 ? `${Math.max(15, 90 - finalScore)} minutes to critical threshold` : "> 2 hours",
    confidence: roundTo(0.75 + Math.random() * 0.2, 2),
    timestamp: now(),
  };
}

// ─── Permit Conflict Detection ───
function detectPermitConflicts(permit: Permit): PermitConflict[] {
  const conflicts: PermitConflict[] = [];
  const zoneSensors: Record<string, number> = {};
  ["CO", "H2S", "CH4", "O2", "TEMPERATURE", "PRESSURE"].forEach((type) => {
    const sensorId = `${permit.zoneId}_${type}`;
    const reading = currentSensors.get(sensorId);
    zoneSensors[type] = reading?.value ?? 0;
  });

  // HOT_WORK + GAS_ELEVATED
  if (permit.type === "HOT_WORK" && (zoneSensors.CH4 > 10 || zoneSensors.H2S > 5 || zoneSensors.CO > 25)) {
    conflicts.push({
      conflictType: "GAS_HAZARD",
      description: `Flammable gas detected (${zoneSensors.CH4 > 10 ? `CH4: ${zoneSensors.CH4}%LEL` : `H2S: ${zoneSensors.H2S}ppm`}) — hot work must be suspended`,
      regulatoryBasis: "OISD-105 Clause 6.3",
      actionRequired: "IMMEDIATE_SUSPENSION",
      urgency: "CRITICAL",
    });
  }

  // CONFINED_SPACE + VENTILATION_OFFLINE
  if (permit.type === "CONFINED_SPACE" && permit.zoneId === "ZONE_A" && demoPhase >= 2) {
    conflicts.push({
      conflictType: "VENTILATION_FAILURE",
      description: "Ventilation system offline with confined space entry permit active",
      regulatoryBasis: "OISD-105 Clause 8.2",
      actionRequired: "IMMEDIATE_SUSPENSION",
      urgency: "CRITICAL",
    });
  }

  // Multiple permits same zone
  const sameZonePermits = currentPermits.filter((p) => p.zoneId === permit.zoneId && p.permitId !== permit.permitId && p.status !== "SUSPENDED" && p.status !== "COMPLETED");
  if (sameZonePermits.length >= 2) {
    conflicts.push({
      conflictType: "SIMOPS_CONFLICT",
      description: `${sameZonePermits.length + 1} permits active in ${permit.zoneId} — review for simultaneous operation conflicts`,
      regulatoryBasis: "Factory Act Section 36",
      actionRequired: "REVIEW_REQUIRED",
      urgency: "MEDIUM",
    });
  }

  // ELECTRICAL + WET_CONDITIONS (humidity > 85%)
  const humidityReading = currentSensors.get(`${permit.zoneId}_HUMIDITY`);
  const isWetConditions = humidityReading !== undefined && humidityReading.value > 85;
  if (permit.type === "ELECTRICAL" && isWetConditions) {
    conflicts.push({
      conflictType: "WET_CONDITIONS",
      description: `Electrical work active with high humidity (${humidityReading!.value}%) — risk of short circuit and electrocution`,
      regulatoryBasis: "IE Rules 44A",
      actionRequired: "IMMEDIATE_SUSPENSION",
      urgency: "CRITICAL",
    });
  }

  return conflicts;
}

// ─── Emergency Steps ───
function generateEmergencySteps(zoneId: string, riskScore: number): EmergencyStep[] {
  const zoneName = ZONE_CONFIG.find((z) => z.zoneId === zoneId)?.name ?? zoneId;
  const workerCount = currentWorkers.filter((w) => w.zoneId === zoneId).length;
  const zonePermits = currentPermits.filter((p) => p.zoneId === zoneId && p.status !== "SUSPENDED" && p.status !== "COMPLETED");

  return [
    { step: 1, label: "Alert Generated", delay: 0, completed: true, inProgress: false, details: `Emergency alert generated for ${zoneName}. Risk Score: ${riskScore}` },
    { step: 2, label: "Notifications Dispatched", delay: 5, completed: true, inProgress: false, details: `Notified Safety Officer, Shift Supervisor, Plant Manager via in-app + SMS + Email` },
    { step: 3, label: "Permits Suspended", delay: 10, completed: true, inProgress: false, details: `${zonePermits.length} active permits in ${zoneId} suspended automatically` },
    { step: 4, label: "Sensor Snapshot Preserved", delay: 15, completed: true, inProgress: false, details: "Complete sensor state captured as immutable audit log entry" },
    { step: 5, label: "Evacuation Protocol", delay: 30, completed: false, inProgress: true, details: `${workerCount} workers in ${zoneName} — directing to nearest muster points` },
    { step: 6, label: "Incident Report Draft", delay: 60, completed: false, inProgress: false, details: "Auto-generating OISD-compliant preliminary incident report" },
  ];
}

// ─── Getters ───
export function getCurrentSensors(): SensorReading[] {
  return Array.from(currentSensors.values());
}

export function getZoneSensors(zoneId: string): SensorReading[] {
  return Array.from(currentSensors.values()).filter((s) => s.zoneId === zoneId);
}

export function getSensorHistory(sensorId: string): { timestamp: string; value: number }[] {
  return sensorHistory.get(sensorId) || [];
}

export function getZoneHistory(zoneId: string): Record<string, { timestamp: string; value: number }[]> {
  const result: Record<string, { timestamp: string; value: number }[]> = {};
  const sensorTypes: SensorType[] = ["CO", "H2S", "CH4", "O2", "TEMPERATURE", "PRESSURE"];
  sensorTypes.forEach((type) => {
    const sensorId = `${zoneId}_${type}`;
    const history = sensorHistory.get(sensorId);
    if (history) result[type] = history;
  });
  return result;
}

export function getPermits(): Permit[] {
  return currentPermits;
}

export function getAlerts(): Alert[] {
  return currentAlerts;
}

export function getWorkers(): WorkerLocation[] {
  return currentWorkers;
}

export function getRiskAssessments(): RiskAssessment[] {
  return Array.from(riskAssessments.values());
}

export function getZoneRisk(zoneId: string): RiskAssessment | undefined {
  return riskAssessments.get(zoneId);
}

export function getEmergencyResponse(): EmergencyResponse | null {
  return emergencyActive;
}

export function getPlantState(): PlantState {
  const assessments = Array.from(riskAssessments.values());
  const avgRisk = assessments.length > 0 ? Math.round(assessments.reduce((s, a) => s + a.riskScore, 0) / assessments.length) : 0;
  const zones: Zone[] = ZONE_CONFIG.map((zc) => {
    const assessment = riskAssessments.get(zc.zoneId);
    const zoneSensors = getZoneSensors(zc.zoneId);
    return {
      zoneId: zc.zoneId,
      name: zc.name,
      riskLevel: assessment?.riskLevel ?? "SAFE",
      riskScore: assessment?.riskScore ?? 0,
      coordinates: { x: zc.x, y: zc.y, width: zc.width, height: zc.height },
      activePermits: currentPermits.filter((p) => p.zoneId === zc.zoneId && p.status !== "SUSPENDED" && p.status !== "COMPLETED").length,
      workerCount: currentWorkers.filter((w) => w.zoneId === zc.zoneId).length,
      sensors: zoneSensors,
    };
  });

  return {
    overallRiskScore: avgRisk,
    overallRiskLevel: getRiskLevel(avgRisk),
    zones,
    activeAlerts: currentAlerts.filter((a) => !a.resolved).length,
    flaggedPermits: currentPermits.filter((p) => p.status === "FLAGGED").length,
    workersAtRisk: currentWorkers.filter((w) => isZoneHighRisk(w.zoneId)).length,
    lastUpdated: now(),
  };
}

export function getDemoPhase(): number {
  return demoPhase;
}

export function getDemoElapsedTime(): number {
  return Math.floor((Date.now() - demoStartTime) / 1000);
}

// ─── Actions ───
export function acknowledgeAlert(alertId: string): boolean {
  const alert = currentAlerts.find((a) => a.alertId === alertId);
  if (alert) { alert.acknowledged = true; return true; }
  return false;
}

export function resolveAlert(alertId: string): boolean {
  const alert = currentAlerts.find((a) => a.alertId === alertId);
  if (alert) { alert.resolved = true; alert.acknowledged = true; return true; }
  return false;
}

export function suspendPermit(permitId: string): boolean {
  const permit = currentPermits.find((p) => p.permitId === permitId);
  if (permit) { permit.status = "SUSPENDED"; return true; }
  return false;
}

export function suspendZonePermits(zoneId: string): number {
  let count = 0;
  currentPermits = currentPermits.map((p) => {
    if (p.zoneId === zoneId && p.status !== "SUSPENDED" && p.status !== "COMPLETED") {
      count++;
      return { ...p, status: "SUSPENDED" as Permit["status"] };
    }
    return p;
  });
  return count;
}

export function triggerEvacuation(zoneId: string): EmergencyResponse | null {
  const assessment = riskAssessments.get(zoneId);
  if (!assessment) return null;
  emergencyActive = {
    status: "ACTIVE",
    zoneId,
    riskScore: assessment.riskScore,
    triggeredAt: now(),
    steps: generateEmergencySteps(zoneId, assessment.riskScore),
  };
  return emergencyActive;
}

export function resetDemo(): void {
  initializeSimulator();
}

// ─── Historical Incidents ───
export const HISTORICAL_INCIDENTS: HistoricalIncident[] = [
  { incident_id: "INC-2023-001", date: "2023-03-15", plant: "Bhilai Steel Plant", zone: "Coke Oven Battery", type: "Gas Explosion", fatalities: 2, injuries: 5, root_causes: ["Elevated CO levels not acted upon", "Simultaneous maintenance and confined space entry", "Permit-to-work not checked against gas readings"], warning_signs_missed: ["CO sensor reading 35ppm for 2 hours before incident", "Ventilation inspection overdue by 3 days"], regulatory_violations: ["OISD-105 Section 4.2", "Factory Act Section 36"], prevention_measures: ["Automated gas-monitoring linked to permit system", "Mandatory cross-check of sensor data before permit approval"], description: "Explosion during maintenance in coke oven battery area due to accumulated CO gas. Workers entered confined space without verifying gas levels." },
  { incident_id: "INC-2023-002", date: "2023-05-22", plant: "Rourkela Steel Plant", zone: "Blast Furnace", type: "Hot Metal Splash", fatalities: 1, injuries: 3, root_causes: ["Furnace refractory failure", "Inadequate pre-shift inspection", "Workers too close to tap hole"], warning_signs_missed: ["Vibration sensor showed 6.2mm/s for 48 hours", "Refractory thickness inspection overdue by 2 weeks"], regulatory_violations: ["OISD-105 Section 5.1", "Factory Act Section 34"], prevention_measures: ["Continuous refractory monitoring", "Automated exclusion zone enforcement"], description: "Hot metal splash from blast furnace tap hole due to refractory lining failure." },
  { incident_id: "INC-2022-003", date: "2022-07-10", plant: "Vizag Steel Plant", zone: "Gas Processing", type: "Gas Leak", fatalities: 3, injuries: 8, root_causes: ["CO gas leak from valve", "No gas detector in vicinity", "Emergency response delayed 25 minutes"], warning_signs_missed: ["Gas detector non-functional for 72 hours", "Maintenance schedule missed", "No stand-by gas detector deployed"], regulatory_violations: ["OISD-105 Section 3.2", "Factory Act Section 36A"], prevention_measures: ["Redundant gas detection", "Automated valve isolation", "Real-time monitoring integration"], description: "CO gas leak from processing unit valve. Three workers died due to prolonged exposure before detection." },
  { incident_id: "INC-2023-004", date: "2023-01-18", plant: "Durgapur Steel Plant", zone: "Coke Oven Battery", type: "Fire", fatalities: 0, injuries: 4, root_causes: ["Hot work near gas pipeline", "No gas testing before welding", "Fire watch inadequate"], warning_signs_missed: ["CH4 sensor reading 12%LEL 30 min before incident", "Hot work permit not cross-checked with gas readings"], regulatory_violations: ["OISD-105 Clause 6.3", "Factory Act Section 35"], prevention_measures: ["Mandatory gas testing before hot work", "Automated permit-gas cross-reference system"], description: "Fire broke out during welding near gas pipeline. CH4 accumulation ignited from welding spark." },
  { incident_id: "INC-2022-005", date: "2022-11-05", plant: "Bokaro Steel Plant", zone: "Maintenance Workshop", type: "Electrical Shock", fatalities: 1, injuries: 1, root_causes: ["LOTO not properly applied", "Work on live circuit", "No verification of isolation"], warning_signs_missed: ["Electrical permit not closed from previous shift", "No second-person verification"], regulatory_violations: ["Factory Act Section 32", "IE Rules 44A"], prevention_measures: ["Digital LOTO system", "Mandatory verification step in electrical permits"], description: "Electrician received fatal shock while working on panel that was not properly isolated." },
  { incident_id: "INC-2023-006", date: "2023-08-30", plant: "SAIL Bhilai", zone: "Blast Furnace", type: "Fall from Height", fatalities: 1, injuries: 0, root_causes: ["Scaffold plank failure", "Safety harness not anchored", "Inspection overdue"], warning_signs_missed: ["Scaffold inspection tag expired 5 days prior", "Weather advisory for high winds ignored"], regulatory_violations: ["Factory Act Section 38", "OISD-105 Section 9"], prevention_measures: ["Digital scaffold inspection system", "Weather-integrated work scheduling"], description: "Worker fell from scaffold during blast furnace maintenance. Plank had deteriorated past inspection date." },
  { incident_id: "INC-2022-007", date: "2022-04-14", plant: "Tata Steel Jamshedpur", zone: "Gas Processing", type: "Confined Space Asphyxiation", fatalities: 2, injuries: 1, root_causes: ["Oxygen deficient atmosphere", "No pre-entry gas testing", "Inadequate rescue plan"], warning_signs_missed: ["O2 level at 17.2% recorded 1 hour before entry", "Confined space permit approved without gas test results"], regulatory_violations: ["OISD-105 Section 8.2", "Factory Act Section 36"], prevention_measures: ["Mandatory real-time gas monitoring during confined space work", "Automated permit approval with sensor validation"], description: "Two workers asphyxiated in gas processing vessel. No gas testing was performed before entry." },
  { incident_id: "INC-2023-008", date: "2023-06-25", plant: "JSW Bellary", zone: "Raw Material Storage", type: "Wall Collapse", fatalities: 3, injuries: 6, root_causes: ["Overloaded storage wall", "Water damage from rain", "No structural monitoring"], warning_signs_missed: ["Cracks reported in inspection log 2 weeks prior", "Rain accumulation not addressed"], regulatory_violations: ["Factory Act Section 31", "DGMS Technical Circular 2/2010"], prevention_measures: ["Structural health monitoring system", "Weather-triggered inspections"], description: "Storage area wall collapsed after heavy rain. Three workers buried under debris." },
  { incident_id: "INC-2022-009", date: "2022-09-03", plant: "Vizag Steel Plant", zone: "Coke Oven Battery", type: "Burns Injury", fatalities: 0, injuries: 6, root_causes: ["Steam line rupture", "Corroded pipe not replaced", "Workers in blast zone"], warning_signs_missed: ["Pipe thickness below minimum reported 3 months earlier", "Vibration readings elevated for 2 weeks"], regulatory_violations: ["Factory Act Section 34", "OISD-105 Section 5.2"], prevention_measures: ["Predictive maintenance using vibration analysis", "Automated exclusion zones around critical equipment"], description: "Steam line ruptured during operation causing severe burns to nearby workers." },
  { incident_id: "INC-2023-010", date: "2023-02-28", plant: "RINL Vizag", zone: "Blast Furnace", type: "Gas Poisoning", fatalities: 1, injuries: 3, root_causes: ["CO leak from furnace shell", "Wind direction change pushed gas into work area", "No portable detector"], warning_signs_missed: ["Fixed CO detector showed 28ppm for 1 hour before escalation", "Weather station showed wind shift"], regulatory_violations: ["OISD-105 Section 4.2", "Factory Act Section 36A"], prevention_measures: ["Wind-aware gas dispersion modeling", "Mandatory portable detectors for all furnace area workers"], description: "CO gas from blast furnace shell leak poisoned workers. Wind shift carried gas into normally safe area." },
  { incident_id: "INC-2022-011", date: "2022-12-15", plant: "SAIL Rourkela", zone: "Maintenance Workshop", type: "Crush Injury", fatalities: 1, injuries: 0, root_causes: ["Crane failure during lift", "Overloaded beyond rated capacity", "No load testing"], warning_signs_missed: ["Crane load test overdue by 6 months", "Maintenance log showed hydraulic pressure anomaly"], regulatory_violations: ["Factory Act Section 29", "OISD-105 Section 7"], prevention_measures: ["IoT-enabled crane monitoring", "Automated load verification before lift"], description: "Worker crushed when overloaded crane failed during material handling operation." },
  { incident_id: "INC-2023-012", date: "2023-04-20", plant: "NMDC Donimalai", zone: "Raw Material Storage", type: "Landslide", fatalities: 4, injuries: 2, root_causes: ["Slope instability", "Blasting nearby", "No slope monitoring"], warning_signs_missed: ["Inclinometer showed 2mm/day movement for 2 weeks", "Rain gauge showed above-threshold precipitation"], regulatory_violations: ["DGMS Technical Circular 3/2016", "MMRD Act Section 18"], prevention_measures: ["Real-time slope stability monitoring", "Blasting exclusion zones based on slope data"], description: "Landslide at ore storage area after blasting. Four workers killed by debris flow." },
  { incident_id: "INC-2023-013", date: "2023-09-12", plant: "Tata Steel Kalinganagar", zone: "Gas Processing", type: "Explosion", fatalities: 2, injuries: 7, root_causes: ["Gas accumulation in enclosed space", "Ignition from static discharge", "No continuous monitoring"], warning_signs_missed: ["CH4 detector showed 15%LEL 2 hours before incident", "Ventilation system shut down for maintenance without alternate arrangement"], regulatory_violations: ["OISD-105 Section 3.2", "Factory Act Section 36A", "IS:3254"], prevention_measures: ["Continuous gas monitoring with automated ventilation", "Static discharge prevention protocols"], description: "Gas explosion in processing unit. Accumulated methane ignited from static discharge during maintenance." },
  { incident_id: "INC-2022-014", date: "2022-08-08", plant: "JSW Dolvi", zone: "Coke Oven Battery", type: "Toxic Exposure", fatalities: 0, injuries: 12, root_causes: ["Benzene leak from coke oven", "Inadequate PPE", "Delayed evacuation"], warning_signs_missed: ["Air quality monitor showed elevated VOC for 4 hours", "Workers reported unusual odor but were told to continue"], regulatory_violations: ["Factory Act Section 36A", "OISD-105 Section 4.1"], prevention_measures: ["Automated VOC monitoring with evacuation triggers", "Real-time PPE compliance tracking"], description: "Mass benzene exposure at coke oven. 12 workers hospitalized after prolonged exposure." },
  { incident_id: "INC-2023-015", date: "2023-07-04", plant: "SAIL Bokaro", zone: "Control Room", type: "Electrical Fire", fatalities: 0, injuries: 2, root_causes: ["Short circuit in PLC panel", "Dust accumulation in electrical room", "Fire suppression not triggered"], warning_signs_missed: ["Temperature in electrical room elevated for 1 week", "Dust cleaning schedule missed for 3 months"], regulatory_violations: ["IE Rules 64", "NBC 2016 Part 4"], prevention_measures: ["Automated fire suppression", "Environmental monitoring in electrical rooms"], description: "Electrical fire in control room PLC panel due to dust accumulation and overheating." },
  { incident_id: "INC-2022-016", date: "2022-06-19", plant: "Vizag Steel Plant", zone: "Blast Furnace", type: "Hot Metal Breakout", fatalities: 2, injuries: 5, root_causes: ["Refractory failure in hearth", "Cooling system malfunction", "No thermal imaging"], warning_signs_missed: ["Cooling water temperature differential decreased over 2 weeks", "Thermal imaging inspection not performed as scheduled"], regulatory_violations: ["OISD-105 Section 5.1", "Factory Act Section 34"], prevention_measures: ["Continuous thermal imaging of furnace shell", "Predictive cooling system monitoring"], description: "Hot metal breakout from blast furnace hearth. Refractory lining had thinned below safe limits." },
  { incident_id: "INC-2023-017", date: "2023-10-30", plant: "NMDC Bacheli", zone: "Maintenance Workshop", type: "Mechanical Injury", fatalities: 0, injuries: 3, root_causes: ["Guard removed from conveyor", "No lockout during maintenance", "Unexpected startup"], warning_signs_missed: ["Guard removal not logged in maintenance system", "LOTO procedure bypassed for 'quick fix'"], regulatory_violations: ["Factory Act Section 21", "IS:7244"], prevention_measures: ["Digital LOTO with interlock", "Guard removal requires management authorization"], description: "Workers injured when conveyor started unexpectedly during maintenance. Guards had been removed without proper lockout." },
  { incident_id: "INC-2022-018", date: "2022-03-27", plant: "RINL Vizag", zone: "Gas Processing", type: "Pipeline Rupture", fatalities: 1, injuries: 4, root_causes: ["Corrosion under insulation", "No inspection program", "Pressure exceeded design limit"], warning_signs_missed: ["Pressure gauge showing gradual increase over 3 days", "Corrosion inspection of insulated piping never performed"], regulatory_violations: ["OISD-105 Section 5.2", "Factory Act Section 31"], prevention_measures: ["CUI inspection program", "Automated pressure monitoring with alerts"], description: "Gas pipeline ruptured due to corrosion under insulation. Pressure had been building for days without alarm." },
  { incident_id: "INC-2023-019", date: "2023-11-22", plant: "Tata Steel Jamshedpur", zone: "Raw Material Storage", type: "Dust Explosion", fatalities: 1, injuries: 5, root_causes: ["Coal dust accumulation", "Ignition from spark", "No dust suppression"], warning_signs_missed: ["Dust monitoring system showed >4mg/m³ for 5 days", "Housekeeping audit findings not addressed for 2 weeks"], regulatory_violations: ["OISD-105 Section 4.3", "Factory Act Section 34A"], prevention_measures: ["Continuous dust concentration monitoring", "Automated dust suppression system"], description: "Coal dust explosion in storage area. Accumulated dust ignited from spark during material handling." },
  { incident_id: "INC-2022-020", date: "2022-10-11", plant: "JSW Vijayanagar", zone: "Coke Oven Battery", type: "Chemical Burn", fatalities: 0, injuries: 3, root_causes: ["Ammonium sulfate spill", "Inadequate chemical handling procedure", "PPE not worn"], warning_signs_missed: ["Chemical storage inspection found expired PPE 1 week prior", "Spill containment system test overdue"], regulatory_violations: ["Factory Act Section 36A", "MSIHC Rules 2000"], prevention_measures: ["Automated chemical spill detection", "PPE compliance monitoring system"], description: "Workers received chemical burns from ammonium sulfate spill during transfer operation." },
];

// ─── Regulation Data ───
export const REGULATIONS = [
  { id: "OISD-105-4.2", source: "OISD-105", section: "4.2", title: "Gas Detection in Confined Spaces", content: "All confined spaces must have continuous gas monitoring. Entry is prohibited when gas levels exceed prescribed limits. CO: 25ppm, H2S: 5ppm, CH4: 10%LEL, O2: 19.5-23.5%." },
  { id: "OISD-105-6.3", source: "OISD-105", section: "6.3", title: "Hot Work Near Flammable Areas", content: "Hot work permits shall not be issued in areas where flammable gas concentration exceeds 10% of LEL. Gas testing must be performed within 30 minutes before and continuously during hot work operations." },
  { id: "OISD-105-8.2", source: "OISD-105", section: "8.2", title: "Confined Space Ventilation", content: "Mechanical ventilation must be operational before and during confined space entry. If ventilation fails, all personnel must evacuate immediately and permit must be suspended." },
  { id: "OISD-105-5.1", source: "OISD-105", section: "5.1", title: "Pressure Equipment Safety", content: "Pressure equipment must be monitored continuously. Any deviation beyond 120% of design pressure requires immediate shutdown and investigation." },
  { id: "FACTORY-36", source: "Factory Act 1948", section: "36", title: "Precautions Against Dangerous Fumes", content: "No person shall enter or remain in any chamber, tank, vat, pit, pipe, flue or similar confined space where dangerous fumes are likely to be present to such an extent as to involve risk of persons being overcome." },
  { id: "FACTORY-36A", source: "Factory Act 1948", section: "36A", title: "Explosive or Inflammable Gas", content: "Where any work is to be carried out in any place where explosive or inflammable gas, fume or dust is present, adequate measures shall be taken to prevent fire or explosion." },
  { id: "DGMS-2-2010", source: "DGMS Technical Circular", section: "2/2010", title: "Slope Stability Monitoring in Mines", content: "All open pit mines must have continuous slope stability monitoring. Movement exceeding 2mm/day requires evacuation and geotechnical assessment." },
  { id: "OISD-105-3.2", source: "OISD-105", section: "3.2", title: "Gas Detector Placement and Maintenance", content: "Gas detectors must be installed at all potential gas release points. Detectors must be calibrated monthly and tested weekly. Non-functional detectors must be replaced within 4 hours." },
  { id: "FACTORY-34", source: "Factory Act 1948", section: "34", title: "Protection from Hot Substances", content: "Effective measures shall be taken to protect workers from burns and scalds caused by hot substances. Barriers, screens, or protective clothing must be provided." },
  { id: "FACTORY-35", source: "Factory Act 1948", section: "35", title: "Precautions Regarding Explosive Dust", content: "Where dust of an explosive nature is present, all practicable measures shall be taken to prevent accumulation of dust and to prevent explosion." },
];

