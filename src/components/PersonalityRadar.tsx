'use client';

import { useState, useEffect, useMemo } from 'react';

const AXES = ['Ambition', 'Intelligence', 'Discipline', 'Creativity', 'Social', 'Confidence', 'Empathy', 'Risk'];

const TRAIT_MAP: Record<string, number[]> = {
  ambitious:    [40, 10, 15, 0, 5, 20, -5, 10],
  lazy:         [-35, -5, -30, 5, -5, -15, 5, -10],
  social:       [5, 0, 0, 5, 40, 15, 15, 5],
  introverted:  [-5, 10, 10, 20, -35, -10, 5, -15],
  generous:     [-5, 0, 5, 0, 15, 5, 40, -5],
  greedy:       [20, 5, 5, -5, -15, 10, -35, 20],
  honest:       [0, 5, 15, 0, 5, 10, 20, -15],
  manipulative: [10, 20, 5, 15, 10, 15, -30, 20],
  optimistic:   [10, 0, 5, 10, 15, 25, 15, 5],
  cynical:      [-5, 20, 5, 5, -15, 5, -20, -5],
  impulsive:    [5, -5, -25, 10, 10, 10, 0, 40],
  cautious:     [0, 15, 25, -5, -10, -5, 10, -35],
};

function computeValues(traits: string[]): number[] {
  const base = [50, 50, 50, 50, 50, 50, 50, 50];
  for (const trait of traits) {
    const mods = TRAIT_MAP[trait];
    if (mods) for (let i = 0; i < 8; i++) base[i] = Math.max(5, Math.min(95, base[i] + mods[i]));
  }
  return base;
}

export default function PersonalityRadar({ traits }: { traits: string[] }) {
  const [animated, setAnimated] = useState(false);
  const values = useMemo(() => computeValues(traits), [traits]);

  useEffect(() => {
    setAnimated(false);
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, [traits]);

  const R = 38, C = 50;

  const points = AXES.map((_, i) => {
    const a = (i / AXES.length) * Math.PI * 2 - Math.PI / 2;
    const v = animated ? values[i] / 100 : 0;
    return { x: C + Math.cos(a) * R * v, y: C + Math.sin(a) * R * v };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';

  return (
    <svg viewBox="0 0 100 100" className="w-full max-w-[240px] mx-auto">
      {[0.25, 0.5, 0.75, 1].map(scale => (
        <polygon key={scale}
          points={AXES.map((_, i) => {
            const a = (i / AXES.length) * Math.PI * 2 - Math.PI / 2;
            return `${(C + Math.cos(a) * R * scale).toFixed(1)},${(C + Math.sin(a) * R * scale).toFixed(1)}`;
          }).join(' ')}
          fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.3"
        />
      ))}
      {AXES.map((_, i) => {
        const a = (i / AXES.length) * Math.PI * 2 - Math.PI / 2;
        return <line key={i} x1={C} y1={C}
          x2={(C + Math.cos(a) * R).toFixed(1)} y2={(C + Math.sin(a) * R).toFixed(1)}
          stroke="rgba(0,0,0,0.05)" strokeWidth="0.3" />;
      })}
      <path d={pathD} fill="rgba(79, 142, 247, 0.12)" stroke="rgba(79, 142, 247, 0.7)" strokeWidth="0.7"
        style={{ transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
      <path d={pathD} fill="none" stroke="rgba(79, 142, 247, 0.25)" strokeWidth="2" filter="url(#radar-glow)"
        style={{ transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
      {points.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="1.5" fill="#4F8EF7"
          style={{ transition: `all 1s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.04}s` }} />
      ))}
      {AXES.map((label, i) => {
        const a = (i / AXES.length) * Math.PI * 2 - Math.PI / 2;
        return (
          <text key={i} x={(C + Math.cos(a) * (R + 9)).toFixed(1)} y={(C + Math.sin(a) * (R + 9)).toFixed(1)}
            textAnchor="middle" dominantBaseline="central"
            fill="rgba(0,0,0,0.35)" fontSize="2.8" fontWeight="500" fontFamily="system-ui, sans-serif">
            {label}
          </text>
        );
      })}
      <defs>
        <filter id="radar-glow"><feGaussianBlur stdDeviation="1.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
    </svg>
  );
}
