"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface GraphNode {
  id: string;
  label: string;
  type: string;
}

interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
}

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width?: number;
  height?: number;
  onNodeClick?: (nodeId: string) => void;
  selectedNode?: string | null;
}

const COLORS: Record<string, string> = {
  zone: "#3B82F6",
  sensor: "#10B981",
  incident: "#EF4444",
  regulation: "#8B5CF6",
  root_cause: "#F59E0B",
  warning_sign: "#F97316",
  prevention_measure: "#06B6D4",
  equipment: "#6366F1",
  worker: "#14B8A6",
  permit_type: "#EC4899",
  violation: "#DC2626",
};

const TYPE_LABELS: Record<string, string> = {
  zone: "Zone",
  sensor: "Sensor",
  incident: "Incident",
  regulation: "Regulation",
  root_cause: "Root Cause",
  warning_sign: "Warning Sign",
  prevention_measure: "Prevention",
  equipment: "Equipment",
  worker: "Worker",
  permit_type: "Permit Type",
  violation: "Violation",
};

export default function GraphVisualizer({ nodes, edges, width = 800, height = 500, onNodeClick, selectedNode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  const nodeMap = useRef<Record<string, GraphNode>>({});
  useEffect(() => {
    nodeMap.current = {};
    nodes.forEach((n) => (nodeMap.current[n.id] = n));
  }, [nodes]);

  useEffect(() => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;
    const pos: Record<string, { x: number; y: number }> = {};

    const typeOrder: Record<string, number> = {
      zone: 0,
      equipment: 1,
      sensor: 2,
      worker: 3,
      permit_type: 4,
      incident: 5,
      root_cause: 6,
      warning_sign: 7,
      prevention_measure: 8,
      regulation: 9,
      violation: 10,
    };

    const byType: Record<string, GraphNode[]> = {};
    nodes.forEach((n) => {
      const t = n.type || "unknown";
      if (!byType[t]) byType[t] = [];
      byType[t].push(n);
    });

    let angleOffset = 0;
    Object.entries(byType)
      .sort(([a], [b]) => (typeOrder[a] ?? 99) - (typeOrder[b] ?? 99))
      .forEach(([type, typeNodes]) => {
        const count = typeNodes.length;
        const layerRadius = radius * (0.3 + (typeOrder[type] ?? 5) * 0.07);
        typeNodes.forEach((n, i) => {
          const angle = (2 * Math.PI * i) / count + angleOffset;
          pos[n.id] = {
            x: centerX + layerRadius * Math.cos(angle),
            y: centerY + layerRadius * Math.sin(angle),
          };
        });
        angleOffset += 0.3;
      });

    if (nodes.length <= 1 && nodes.length > 0) {
      pos[nodes[0].id] = { x: centerX, y: centerY };
    }

    setPositions(pos);
  }, [nodes, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);

      edges.forEach((e) => {
        const src = positions[e.source];
        const tgt = positions[e.target];
        if (!src || !tgt) return;
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      nodes.forEach((n) => {
        const p = positions[n.id];
        if (!p) return;
        const isSelected = n.id === selectedNode;
        const isHovered = n.id === hovered;
        const color = COLORS[n.type] || "#94A3B8";
        const nodeRadius = isSelected ? 10 : isHovered ? 9 : 7;

        ctx.beginPath();
        ctx.arc(p.x, p.y, nodeRadius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.globalAlpha = selectedNode && !isSelected ? 0.3 : 1;
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.globalAlpha = 1;

        if (isSelected || isHovered || !selectedNode) {
          ctx.font = "10px Inter, sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.textAlign = "center";
          ctx.fillText(n.label, p.x, p.y + nodeRadius + 12);
        }
      });

      ctx.restore();
    };

    render();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [nodes, edges, positions, selectedNode, hovered, offset, scale, width, height]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = (e.clientX - rect.left - offset.x) / scale;
      const my = (e.clientY - rect.top - offset.y) / scale;

      let found: string | null = null;
      for (const n of nodes) {
        const p = positions[n.id];
        if (!p) continue;
        const dx = mx - p.x;
        const dy = my - p.y;
        if (dx * dx + dy * dy < 144) {
          found = n.id;
          break;
        }
      }
      setHovered(found);
      if (found) {
        setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 10, text: nodeMap.current[found]?.label || found });
      } else {
        setTooltip(null);
      }
    },
    [nodes, positions, offset, scale]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !onNodeClick) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = (e.clientX - rect.left - offset.x) / scale;
      const my = (e.clientY - rect.top - offset.y) / scale;

      for (const n of nodes) {
        const p = positions[n.id];
        if (!p) continue;
        const dx = mx - p.x;
        const dy = my - p.y;
        if (dx * dx + dy * dy < 144) {
          onNodeClick(n.id);
          return;
        }
      }
    },
    [nodes, positions, offset, scale, onNodeClick]
  );

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(3, Math.max(0.3, s * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = { ...offset };
  }, [offset]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      setOffset({
        x: offsetStart.current.x + (e.clientX - dragStart.current.x),
        y: offsetStart.current.y + (e.clientY - dragStart.current.y),
      });
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", () => setDragging(false));
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", () => setDragging(false));
    };
  }, [dragging]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full rounded-lg cursor-grab active:cursor-grabbing"
        style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.06)" }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setHovered(null); setTooltip(null); }}
      />
      {tooltip && (
        <div
          className="absolute bg-[#1E293B] text-white text-xs px-2 py-1 rounded pointer-events-none z-10 border border-white/10"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1 text-[10px] text-white/60">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[type] || "#94A3B8" }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="absolute top-3 right-3 text-[10px] text-white/40 flex gap-2">
        <button onClick={() => setScale(1)} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10">Reset</button>
        <button onClick={() => setOffset({ x: 0, y: 0 })} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10">Center</button>
      </div>
    </div>
  );
}
