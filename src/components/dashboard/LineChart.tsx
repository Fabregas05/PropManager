"use client";

import React from "react";

interface Point {
  label: string;
  value: number;
}

interface LineChartProps {
  data: Point[];
  height?: number;
}

export default function LineChart({ data, height = 200 }: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-400">Aucune donnée</div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (d.value / maxVal) * 100;
    return { x, y, label: d.label, value: d.value };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  const areaPath = `M ${points[0].x},100 ${linePath} L ${points[points.length - 1].x},100 Z`;

  return (
    <div className="w-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full" style={{ height }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="lineGradient" x1="0" x2="1">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>

        {/* grid lines */}
        {[0, 20, 40, 60, 80, 100].map((g) => (
          <line key={g} x1="0" x2="100" y1={g} y2={g} stroke="#eef2ff" strokeWidth={0.4} />
        ))}

        {/* area */}
        <path d={areaPath} fill="url(#areaGradient)" stroke="none" />

        {/* line */}
        <path d={linePath} fill="none" stroke="url(#lineGradient)" strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round" />

        {/* points */}
        {points.map((p, idx) => (
          <g key={idx} transform={`translate(${p.x}, ${p.y})`}>
            <circle r={1.4} fill="#fff" stroke="#4F46E5" strokeWidth={0.6} />
          </g>
        ))}
      </svg>

      <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
        {data.map((d, i) => (
          <div key={i} className="w-1/6 text-center truncate">{d.label}</div>
        ))}
      </div>
    </div>
  );
}
