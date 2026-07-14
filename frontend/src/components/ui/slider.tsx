"use client";
import { cn } from "@/lib/utils";
import { useCallback, useRef, useState, type InputHTMLAttributes } from "react";

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  value?: number;
  onChange?: (value: number) => void;
}

export function Slider({ className, value = 0, onChange, min = 0, max = 100, step = 1, ...props }: SliderProps) {
  const [local, setLocal] = useState(value);
  const current = value !== undefined ? value : local;
  const pct = ((current - Number(min)) / (Number(max) - Number(min))) * 100;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (value === undefined) setLocal(v);
    onChange?.(v);
  }, [onChange, value]);

  return (
    <div className={cn("relative w-full h-2", className)}>
      <div className="absolute inset-0 rounded-full bg-white/[0.06]" />
      <div className="absolute top-0 left-0 h-full rounded-full bg-blue-500/60" style={{ width: `${pct}%` }} />
      <input type="range" value={current} onChange={handleChange} min={min} max={max} step={step} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" {...props} />
      <div className="absolute -top-1.5" style={{ left: `calc(${pct}% - 6px)` }}>
        <div className="w-3 h-3 rounded-full bg-blue-400 border-2 border-[#060B18]" />
      </div>
    </div>
  );
}
