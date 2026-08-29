"use client";

import { formatDuration } from "@/lib/duration";

export function StatsChart({ values, labels }: { values: number[]; labels?: string[] }) {
  const safe = values.length ? values : [0];
  const max = Math.max(60, ...safe);
  const points = safe.map((value, index) => {
    const x = safe.length === 1 ? 50 : (index / (safe.length - 1)) * 100;
    const y = 92 - (Math.max(0, value) / max) * 78;
    return `${x},${y}`;
  }).join(" ");
  const area = `0,100 ${points} 100,100`;
  return (
    <div className="stats-chart" aria-label={`Focus chart, peak ${formatDuration(max)}`}>
      <svg viewBox="0 0 100 100" role="img" preserveAspectRatio="none">
        <defs><linearGradient id="stats-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="var(--studio-lamplight)" stopOpacity=".38" /><stop offset="1" stopColor="var(--studio-lamplight)" stopOpacity="0" /></linearGradient></defs>
        <polyline points={area} fill="url(#stats-fill)" stroke="none" />
        <polyline points={points} fill="none" stroke="var(--studio-lamplight)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
      </svg>
      {labels && <div className="stats-chart__labels"><span>{labels[0]}</span><span>{labels[labels.length - 1]}</span></div>}
    </div>
  );
}
