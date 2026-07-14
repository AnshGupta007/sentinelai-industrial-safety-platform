import type { RiskLevel, SensorType, PermitType } from "./types";

// ── Risk Thresholds ──
export const RISK_THRESHOLDS: Record<RiskLevel, { min: number; max: number; color: string; bgColor: string }> = {
  SAFE: { min: 0, max: 25, color: "#10B981", bgColor: "rgba(16, 185, 129, 0.15)" },
  CAUTION: { min: 26, max: 50, color: "#F59E0B", bgColor: "rgba(245, 158, 11, 0.15)" },
  HIGH: { min: 51, max: 75, color: "#F97316", bgColor: "rgba(249, 115, 22, 0.2)" },
  CRITICAL: { min: 76, max: 100, color: "#EF4444", bgColor: "rgba(239, 68, 68, 0.25)" },
};

// ── Sensor Thresholds ──
export const SENSOR_THRESHOLDS: Record<SensorType, {
  unit: string;
  normalMax: number;
  warningMax: number;
  criticalMin: number;
  weight: number;
  label: string;
}> = {
  CO: { unit: "ppm", normalMax: 25, warningMax: 50, criticalMin: 50, weight: 1.5, label: "Carbon Monoxide" },
  H2S: { unit: "ppm", normalMax: 5, warningMax: 10, criticalMin: 10, weight: 1.5, label: "Hydrogen Sulfide" },
  CH4: { unit: "%LEL", normalMax: 10, warningMax: 25, criticalMin: 25, weight: 1.5, label: "Methane" },
  O2: { unit: "%", normalMax: 23.5, warningMax: 19.5, criticalMin: 19.5, weight: 1.5, label: "Oxygen" },
  TEMPERATURE: { unit: "°C", normalMax: 60, warningMax: 80, criticalMin: 80, weight: 1.0, label: "Temperature" },
  PRESSURE: { unit: "bar", normalMax: 1.2, warningMax: 1.5, criticalMin: 1.5, weight: 1.2, label: "Pressure" },
  HUMIDITY: { unit: "%", normalMax: 70, warningMax: 85, criticalMin: 85, weight: 0.8, label: "Humidity" },
  VIBRATION: { unit: "mm/s", normalMax: 4, warningMax: 7, criticalMin: 7, weight: 1.0, label: "Vibration" },
};

// ── Zone Definitions ──
export const ZONE_CONFIG = [
  { zoneId: "ZONE_A", name: "Coke Oven Battery", riskLevel: "HIGH" as const, x: 5, y: 5, width: 44, height: 44 },
  { zoneId: "ZONE_B", name: "Blast Furnace Area", riskLevel: "HIGH" as const, x: 51, y: 5, width: 44, height: 44 },
  { zoneId: "ZONE_C", name: "Gas Processing Unit", riskLevel: "MEDIUM" as const, x: 28, y: 28, width: 44, height: 28 },
  { zoneId: "ZONE_D", name: "Control Room", riskLevel: "LOW" as const, x: 28, y: 60, width: 44, height: 20 },
  { zoneId: "ZONE_E", name: "Maintenance Workshop", riskLevel: "MEDIUM" as const, x: 5, y: 55, width: 20, height: 25 },
  { zoneId: "ZONE_F", name: "Raw Material Storage", riskLevel: "LOW" as const, x: 75, y: 55, width: 20, height: 25 },
];

// ── Permit Type Config ──
export const PERMIT_CONFIG: Record<PermitType, { label: string; color: string; icon: string }> = {
  HOT_WORK: { label: "Hot Work", color: "#EF4444", icon: "🔥" },
  CONFINED_SPACE: { label: "Confined Space", color: "#3B82F6", icon: "🚪" },
  ELECTRICAL: { label: "Electrical", color: "#F59E0B", icon: "⚡" },
  HEIGHT: { label: "Working at Height", color: "#8B5CF6", icon: "🏗️" },
  EXCAVATION: { label: "Excavation", color: "#F97316", icon: "⛏️" },
};

// ── Worker Names ──
export const WORKER_NAMES = [
  "Rajan M.", "Suresh K.", "Amit P.", "Vikram S.", "Deepak R.",
  "Prakash N.", "Ramesh T.", "Sanjay G.", "Mohan D.", "Arjun B.",
  "Kiran V.", "Ravi J.", "Sunil H.", "Manoj L.", "Anil F.",
  "Vijay W.", "Ganesh Q.", "Harish E.", "Naveen I.", "Prasad O.",
  "Dinesh U.", "Rajesh Y.", "Mahesh A.", "Chandra C.", "Venkat Z.",
  "Lakshman X.", "Balaji K.", "Narasimha R.", "Karthik P.", "Shankar M.",
  "Gopal S.", "Murali N.", "Srinivas T.", "Raghav D.", "Siddharth V.",
  "Ashok B.", "Paramesh H.", "Janardhan L.", "Venkatesh G.", "Subhash F.",
  "Ranganath E.", "Satish I.", "Jagdish O.", "Devendra U.", "Bhaskar Y.",
  "Keshav A.", "Madhav C.", "Purushottam Z.", "Ramakrishna X.", "Giridhar W.",
];

export const ROLES = ["Operator", "Technician", "Supervisor", "Welder", "Electrician", "Rigger", "Fitter", "Helper"];

// ── Emergency Muster Points ──
export const MUSTER_POINTS = [
  { id: "MP1", x: 2, y: 2, label: "North Gate" },
  { id: "MP2", x: 98, y: 2, label: "East Gate" },
  { id: "MP3", x: 2, y: 98, label: "South Gate" },
  { id: "MP4", x: 98, y: 98, label: "West Gate" },
];

// ── Compound Risk Rules ──
export const COMPOUND_RULES = [
  { ruleId: "RULE_1", description: "Confined space + elevated gas", severity: "CRITICAL" as const, points: 25 },
  { ruleId: "RULE_2", description: "Hot work permit + flammable gas detected", severity: "CRITICAL" as const, points: 30 },
  { ruleId: "RULE_3", description: "Maintenance active + pressure anomaly", severity: "HIGH" as const, points: 20 },
  { ruleId: "RULE_4", description: "Shift changeover + elevated sensors", severity: "MEDIUM" as const, points: 15 },
  { ruleId: "RULE_5", description: "Multiple permits in same zone (>2)", severity: "MEDIUM" as const, points: 15 },
  { ruleId: "RULE_6", description: "Ventilation offline + confined space permit", severity: "CRITICAL" as const, points: 35 },
  { ruleId: "RULE_7", description: "Night shift + overdue maintenance", severity: "HIGH" as const, points: 20 },
];
