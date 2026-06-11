"use client";

import React from "react";

interface ProgressBarProps {
  label: string;
  value: number; // 0-100
  color?: string; // tailwind color class or CSS gradient
}

export default function ProgressBar({ label, value, color }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const grad = color || 'linear-gradient(90deg,#34D399,#06B6D4)';

  return (
    <div>
      <div className="flex items-center justify-between text-sm font-medium text-slate-600 mb-2">
        <span>{label}</span>
        <span className="text-slate-900 font-semibold">{pct}%</span>
      </div>

      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: grad }}></div>
      </div>
    </div>
  );
}
