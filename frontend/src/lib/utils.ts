import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { RiskLevel, SensorStatus } from "./types";
import { RISK_THRESHOLDS } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRiskLevel(score: number): RiskLevel {
  if (score <= 25) return "SAFE";
  if (score <= 50) return "CAUTION";
  if (score <= 75) return "HIGH";
  return "CRITICAL";
}

export function getRiskColor(score: number): string {
  return RISK_THRESHOLDS[getRiskLevel(score)].color;
}

export function getRiskBgColor(score: number): string {
  return RISK_THRESHOLDS[getRiskLevel(score)].bgColor;
}

export function getSensorStatus(
  type: string,
  value: number
): SensorStatus {
  const thresholds: Record<string, { normalMax: number; warningMax: number }> = {
    CO: { normalMax: 25, warningMax: 50 },
    H2S: { normalMax: 5, warningMax: 10 },
    CH4: { normalMax: 10, warningMax: 25 },
    O2: { normalMax: 23.5, warningMax: 19.5 },
    TEMPERATURE: { normalMax: 60, warningMax: 80 },
    PRESSURE: { normalMax: 1.2, warningMax: 1.5 },
    HUMIDITY: { normalMax: 70, warningMax: 85 },
    VIBRATION: { normalMax: 4, warningMax: 7 },
  };
  const t = thresholds[type];
  if (!t) return "NORMAL";
  if (type === "O2") {
    if (value < 19.5 || value > 23.5) return value < 16 || value > 25 ? "CRITICAL" : "WARNING";
    return "NORMAL";
  }
  if (value > t.warningMax) return "CRITICAL";
  if (value > t.normalMax) return "WARNING";
  return "NORMAL";
}

export function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatDateTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("en-IN", { hour12: false });
}

export function timeAgo(ts: string): string {
  const now = Date.now();
  const then = new Date(ts).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
