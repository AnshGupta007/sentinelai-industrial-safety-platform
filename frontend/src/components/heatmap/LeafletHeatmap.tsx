"use client";
import { MapContainer, TileLayer, SVGOverlay } from "react-leaflet";
import type { PlantState, WorkerLocation } from "@/lib/types";

interface LeafletHeatmapProps {
  plantState: PlantState;
  workers: WorkerLocation[];
  showWorkers: boolean;
  selectedZone: string | null;
  onZoneClick: (zoneId: string) => void;
}

const PLANT_BOUNDS: [[number, number], [number, number]] = [
  [17.683, 83.214],
  [17.691, 83.223],
];

const MUSTER_POINTS = [
  { id: "MP1", x: 5, y: 3, label: "North Gate" },
  { id: "MP2", x: 95, y: 3, label: "East Gate" },
  { id: "MP3", x: 5, y: 97, label: "South Gate" },
  { id: "MP4", x: 95, y: 97, label: "West Gate" },
];

const GATES = [
  { x: 50, y: 1.5, label: "Main Gate" },
  { x: 98.5, y: 50, label: "East Gate" },
  { x: 50, y: 98.5, label: "South Gate" },
  { x: 1.5, y: 50, label: "West Gate" },
];

function getZoneBg(score: number) {
  if (score > 75) return "rgba(239, 68, 68, 0.15)";
  if (score > 50) return "rgba(249, 115, 22, 0.12)";
  if (score > 25) return "rgba(245, 158, 11, 0.10)";
  return "rgba(16, 185, 129, 0.06)";
}

function getZoneBorder(score: number) {
  if (score > 75) return "#EF4444";
  if (score > 50) return "#F97316";
  if (score > 25) return "#F59E0B";
  return "#10B981";
}

const flipY = (y: number, h?: number) => (h !== undefined ? 100 - y - h : 100 - y);

export function LeafletHeatmap({ plantState, workers, showWorkers, onZoneClick }: LeafletHeatmapProps) {
  return (
    <MapContainer
      center={[17.687, 83.2185]}
      zoom={17}
      className="w-full rounded-xl"
      style={{ height: "55vh", background: "#040810" }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <SVGOverlay bounds={PLANT_BOUNDS}>
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <line x1="49" y1="0" x2="49" y2="100" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
          <line x1="51" y1="0" x2="51" y2="100" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
          <line x1="0" y1="52" x2="100" y2="52" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
          {plantState.zones.map((zone) => {
            const { x, y, width, height } = zone.coordinates;
            const fy = flipY(y, height);
            const border = getZoneBorder(zone.riskScore);
            const bg = getZoneBg(zone.riskScore);
            const isCritical = zone.riskScore > 75;
            return (
              <g key={zone.zoneId} onClick={() => onZoneClick(zone.zoneId)} className="heatmap-zone">
                <rect x={x} y={fy} width={width} height={height} fill={bg} stroke={border} strokeWidth={isCritical ? 0.8 : 0.4} rx="1.5" />
                {isCritical && <rect x={x} y={fy} width={width} height={height} fill="rgba(239,68,68,0.06)" stroke="none" rx="1.5" className="animate-pulse-critical" />}
                <text x={x + width / 2} y={fy + height / 2 - 3} textAnchor="middle" fill="#D1D5DB" fontSize="2.8" fontWeight="600">{zone.name}</text>
                <text x={x + width / 2} y={fy + height / 2 + 3} textAnchor="middle" fill={border} fontSize="5.5" fontWeight="800" fontFamily="monospace">{zone.riskScore}</text>
                <text x={x + width / 2} y={fy + height / 2 + 7.5} textAnchor="middle" fill="#4B5563" fontSize="1.8">{zone.workerCount} workers · {zone.activePermits} permits</text>
              </g>
            );
          })}
          {showWorkers && workers.map((w) => {
            const zone = plantState.zones.find(z => z.zoneId === w.zoneId);
            const danger = zone && zone.riskScore > 50;
            return (
              <circle key={w.workerId} cx={w.locationX} cy={flipY(w.locationY)} r="0.7" fill={danger ? "#EF4444" : "#FFFFFF"} opacity={danger ? 0.8 : 0.4}>
                <title>{w.name} ({w.role}) - {w.zoneId}</title>
              </circle>
            );
          })}
          {MUSTER_POINTS.map((mp) => (
            <g key={mp.id}>
              <polygon points={`${mp.x},${flipY(mp.y) + 2} ${mp.x - 1.5},${flipY(mp.y) - 1} ${mp.x + 1.5},${flipY(mp.y) - 1}`} fill="#10B981" opacity={0.7} />
              <text x={mp.x} y={flipY(mp.y) + 4} textAnchor="middle" fill="#10B981" fontSize="1.6" opacity={0.7}>{mp.label}</text>
            </g>
          ))}
          {GATES.map((gate, i) => (
            <g key={i}>
              <rect x={gate.x - 3} y={flipY(gate.y) - 1} width="6" height="2" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" rx="0.5" />
              <text x={gate.x} y={flipY(gate.y) + 4} textAnchor="middle" fill="#374151" fontSize="1.5">{gate.label}</text>
            </g>
          ))}
        </svg>
      </SVGOverlay>
    </MapContainer>
  );
}
