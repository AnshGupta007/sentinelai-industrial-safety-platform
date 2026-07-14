"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { useMemo } from "react";

interface TimeSeriesData {
  timestamp: string;
  value: number;
}

interface SensorTimeSeriesChartProps {
  data: Record<string, TimeSeriesData[]>;
  thresholds?: Record<string, { warning: number; critical: number }>;
}

const SENSOR_COLORS: Record<string, string> = {
  CO: "#EF4444",
  H2S: "#FBBF24",
  CH4: "#F97316",
  O2: "#3B82F6",
  TEMPERATURE: "#EF4444",
  PRESSURE: "#A78BFA",
  HUMIDITY: "#6B7280",
  VIBRATION: "#EC4899",
};

const TOOLTIP_STYLE = {
  backgroundColor: "rgba(8, 13, 28, 0.95)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  fontSize: "11px",
  padding: "10px 14px",
  backdropFilter: "blur(12px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

export function SensorTimeSeriesChart({ data, thresholds }: SensorTimeSeriesChartProps) {
  const chartData = useMemo(() => {
    const keys = Object.keys(data);
    if (keys.length === 0) return [];
    const baseKey = keys[0];
    const baseData = data[baseKey] || [];
    return baseData.map((entry, idx) => {
      const point: Record<string, string | number> = {
        time: new Date(entry.timestamp).toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };
      keys.forEach((key) => {
        const keyData = data[key];
        if (keyData && keyData[idx]) {
          point[key] = keyData[idx].value;
        }
      });
      return point;
    });
  }, [data]);

  const keys = Object.keys(data);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="time" tick={{ fill: '#4B5563', fontSize: 9 }} interval="preserveStartEnd" axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
        <YAxis tick={{ fill: '#4B5563', fontSize: 9 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#6B7280', fontSize: 10 }} />
        {keys.map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={SENSOR_COLORS[key] || "#6B7280"}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

interface RiskTrendChartProps {
  data: Array<{ time: string; score: number }>;
}

export function RiskTrendChart({ data }: RiskTrendChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    return sorted.map((d, i) => ({
      time: new Date(d.time).toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit" }),
      score: d.score,
      label: `T+${Math.round(i * 2)}m`,
    }));
  }, [data]);

  const interval = Math.max(1, Math.floor(chartData.length / 12));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
        <defs>
          <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="time" tick={{ fill: '#4B5563', fontSize: 9 }} interval={interval} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
        <YAxis domain={[0, 100]} tick={{ fill: '#4B5563', fontSize: 9 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#6B7280', fontSize: 10 }} formatter={(value) => [`${value}/100`, "Risk Score"]} />
        <Area type="monotone" dataKey="score" stroke="#EF4444" fill="url(#riskGradient)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface IncidentHistoryChartProps {
  typeCounts: Record<string, number>;
}

const PIE_COLORS = ["#EF4444", "#F97316", "#FBBF24", "#3B82F6", "#A78BFA", "#10B981", "#EC4899"];

export function IncidentHistoryChart({ typeCounts }: IncidentHistoryChartProps) {
  const data = useMemo(() =>
    Object.entries(typeCounts).map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] })),
    [typeCounts]
  );

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" nameKey="name" stroke="none">
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} fillOpacity={0.8} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#6B7280', fontSize: 10 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface IncidentBarChartProps {
  data: Array<{ type: string; count: number }>;
}

export function IncidentBarChart({ data }: IncidentBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} layout="vertical" margin={{ top: 2, right: 20, left: 0, bottom: 2 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
        <XAxis type="number" tick={{ fill: '#4B7280', fontSize: 8 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
        <YAxis type="category" dataKey="type" tick={{ fill: '#6B7280', fontSize: 8 }} axisLine={false} tickLine={false} width={80} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#6B7280', fontSize: 10 }} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} fillOpacity={0.7} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface AlertBarChartProps {
  data: Array<{ name: string; count: number; color: string }>;
}

export function AlertBarChart({ data }: AlertBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="name" tick={{ fill: '#4B5563', fontSize: 9 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
        <YAxis tick={{ fill: '#4B7280', fontSize: 9 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#6B7280', fontSize: 10 }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} fillOpacity={0.7} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
