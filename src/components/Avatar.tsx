'use client';

import { AvatarConfig } from '../engine/avatar';

interface Props {
  config: AvatarConfig;
  size?: number;
  mood?: string;
}

export default function Avatar({ config, size = 80, mood }: Props) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const headR = s * 0.32;
  const { skinTone, hairStyle, hairColor, eyeStyle, faceShape, accessory, clothingColor, clothingStyle } = config;

  // Face shape path
  const facePath = faceShape === 'round'
    ? `M ${cx - headR} ${cy} A ${headR} ${headR} 0 1 1 ${cx + headR} ${cy} A ${headR} ${headR} 0 1 1 ${cx - headR} ${cy}`
    : faceShape === 'square'
    ? `M ${cx - headR * 0.9} ${cy - headR * 0.85}
       Q ${cx - headR * 0.9} ${cy - headR} ${cx - headR * 0.7} ${cy - headR}
       L ${cx + headR * 0.7} ${cy - headR}
       Q ${cx + headR * 0.9} ${cy - headR} ${cx + headR * 0.9} ${cy - headR * 0.85}
       L ${cx + headR * 0.9} ${cy + headR * 0.7}
       Q ${cx + headR * 0.9} ${cy + headR} ${cx + headR * 0.5} ${cy + headR}
       L ${cx - headR * 0.5} ${cy + headR}
       Q ${cx - headR * 0.9} ${cy + headR} ${cx - headR * 0.9} ${cy + headR * 0.7} Z`
    : // oval
      `M ${cx - headR * 0.85} ${cy} A ${headR * 0.85} ${headR * 1.05} 0 1 1 ${cx + headR * 0.85} ${cy} A ${headR * 0.85} ${headR * 1.05} 0 1 1 ${cx - headR * 0.85} ${cy}`;

  const eyeY = cy - headR * 0.15;
  const eyeSpacing = headR * 0.35;
  const mouthY = cy + headR * 0.35;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} xmlns="http://www.w3.org/2000/svg">
      {/* Body / Clothing */}
      <ClothingShape cx={cx} cy={cy} headR={headR} s={s} color={clothingColor} style={clothingStyle} />

      {/* Neck */}
      <rect x={cx - headR * 0.2} y={cy + headR * 0.75} width={headR * 0.4} height={headR * 0.35} fill={skinTone} />

      {/* Ears */}
      <ellipse cx={cx - headR * 0.9} cy={cy} rx={headR * 0.12} ry={headR * 0.18} fill={skinTone} />
      <ellipse cx={cx + headR * 0.9} cy={cy} rx={headR * 0.12} ry={headR * 0.18} fill={skinTone} />

      {/* Face */}
      <path d={facePath} fill={skinTone} />

      {/* Hair (behind if long) */}
      <HairBack cx={cx} cy={cy} headR={headR} style={hairStyle} color={hairColor} s={s} />

      {/* Eyes */}
      <Eyes cx={cx} cy={eyeY} spacing={eyeSpacing} style={eyeStyle} headR={headR} mood={mood} />

      {/* Eyebrows */}
      <line x1={cx - eyeSpacing - headR * 0.08} y1={eyeY - headR * 0.18} x2={cx - eyeSpacing + headR * 0.12} y2={eyeY - headR * 0.22} stroke="#4a3728" strokeWidth={headR * 0.04} strokeLinecap="round" />
      <line x1={cx + eyeSpacing - headR * 0.12} y1={eyeY - headR * 0.22} x2={cx + eyeSpacing + headR * 0.08} y2={eyeY - headR * 0.18} stroke="#4a3728" strokeWidth={headR * 0.04} strokeLinecap="round" />

      {/* Nose */}
      <ellipse cx={cx} cy={cy + headR * 0.1} rx={headR * 0.06} ry={headR * 0.08} fill="none" stroke={darken(skinTone)} strokeWidth={headR * 0.03} opacity={0.5} />

      {/* Mouth */}
      <Mouth cx={cx} cy={mouthY} headR={headR} mood={mood} />

      {/* Hair (front) */}
      <HairFront cx={cx} cy={cy} headR={headR} style={hairStyle} color={hairColor} />

      {/* Accessory */}
      <AccessoryRender cx={cx} cy={cy} headR={headR} eyeY={eyeY} spacing={eyeSpacing} type={accessory} />
    </svg>
  );
}

function ClothingShape({ cx, cy, headR, s, color, style }: { cx: number; cy: number; headR: number; s: number; color: string; style: string }) {
  const topY = cy + headR * 1.05;
  const w = headR * 1.6;

  if (style === 'hoodie') {
    return (
      <g>
        <path d={`M ${cx - w} ${topY} Q ${cx - w * 0.3} ${topY - headR * 0.1} ${cx} ${topY} Q ${cx + w * 0.3} ${topY - headR * 0.1} ${cx + w} ${topY} L ${cx + w * 1.1} ${s} L ${cx - w * 1.1} ${s} Z`} fill={color} />
        <path d={`M ${cx - headR * 0.3} ${topY} Q ${cx} ${topY + headR * 0.2} ${cx + headR * 0.3} ${topY} L ${cx + headR * 0.15} ${topY + headR * 0.4} Q ${cx} ${topY + headR * 0.55} ${cx - headR * 0.15} ${topY + headR * 0.4} Z`} fill={darken(color)} opacity={0.6} />
      </g>
    );
  }
  if (style === 'tank') {
    return <path d={`M ${cx - w * 0.5} ${topY} L ${cx + w * 0.5} ${topY} L ${cx + w * 0.9} ${s} L ${cx - w * 0.9} ${s} Z`} fill={color} />;
  }
  if (style === 'shirt') {
    return (
      <g>
        <path d={`M ${cx - w} ${topY} L ${cx + w} ${topY} L ${cx + w * 1.1} ${s} L ${cx - w * 1.1} ${s} Z`} fill={color} />
        <line x1={cx} y1={topY} x2={cx} y2={s} stroke={darken(color)} strokeWidth={headR * 0.03} opacity={0.4} />
        <path d={`M ${cx - headR * 0.2} ${topY} L ${cx} ${topY + headR * 0.3} L ${cx + headR * 0.2} ${topY}`} fill="none" stroke={darken(color)} strokeWidth={headR * 0.03} opacity={0.5} />
      </g>
    );
  }
  // tshirt default
  return <path d={`M ${cx - w} ${topY} Q ${cx} ${topY - headR * 0.05} ${cx + w} ${topY} L ${cx + w * 1.1} ${s} L ${cx - w * 1.1} ${s} Z`} fill={color} />;
}

function Eyes({ cx, cy, spacing, style, headR, mood }: { cx: number; cy: number; spacing: number; style: string; headR: number; mood?: string }) {
  const r = headR * 0.07;

  if (style === 'sleepy' || mood === 'sad') {
    return (
      <g>
        <line x1={cx - spacing - r * 1.2} y1={cy} x2={cx - spacing + r * 1.2} y2={cy} stroke="#1a1a2e" strokeWidth={r * 0.8} strokeLinecap="round" />
        <line x1={cx + spacing - r * 1.2} y1={cy} x2={cx + spacing + r * 1.2} y2={cy} stroke="#1a1a2e" strokeWidth={r * 0.8} strokeLinecap="round" />
      </g>
    );
  }
  if (style === 'wide') {
    return (
      <g>
        <circle cx={cx - spacing} cy={cy} r={r * 1.4} fill="white" />
        <circle cx={cx - spacing} cy={cy} r={r * 0.9} fill="#1a1a2e" />
        <circle cx={cx + spacing} cy={cy} r={r * 1.4} fill="white" />
        <circle cx={cx + spacing} cy={cy} r={r * 0.9} fill="#1a1a2e" />
      </g>
    );
  }
  if (style === 'narrow') {
    return (
      <g>
        <ellipse cx={cx - spacing} cy={cy} rx={r * 1.1} ry={r * 0.6} fill="white" />
        <circle cx={cx - spacing} cy={cy} r={r * 0.5} fill="#1a1a2e" />
        <ellipse cx={cx + spacing} cy={cy} rx={r * 1.1} ry={r * 0.6} fill="white" />
        <circle cx={cx + spacing} cy={cy} r={r * 0.5} fill="#1a1a2e" />
      </g>
    );
  }
  // round
  return (
    <g>
      <circle cx={cx - spacing} cy={cy} r={r * 1.2} fill="white" />
      <circle cx={cx - spacing} cy={cy} r={r * 0.7} fill="#1a1a2e" />
      <circle cx={cx + spacing} cy={cy} r={r * 1.2} fill="white" />
      <circle cx={cx + spacing} cy={cy} r={r * 0.7} fill="#1a1a2e" />
    </g>
  );
}

function Mouth({ cx, cy, headR, mood }: { cx: number; cy: number; headR: number; mood?: string }) {
  const w = headR * 0.25;
  if (mood === 'happy' || mood === 'excited') {
    return <path d={`M ${cx - w} ${cy} Q ${cx} ${cy + headR * 0.2} ${cx + w} ${cy}`} fill="none" stroke="#4a3728" strokeWidth={headR * 0.04} strokeLinecap="round" />;
  }
  if (mood === 'angry') {
    return <path d={`M ${cx - w} ${cy + headR * 0.05} Q ${cx} ${cy - headR * 0.1} ${cx + w} ${cy + headR * 0.05}`} fill="none" stroke="#4a3728" strokeWidth={headR * 0.04} strokeLinecap="round" />;
  }
  if (mood === 'sad' || mood === 'anxious') {
    return <path d={`M ${cx - w * 0.8} ${cy + headR * 0.08} Q ${cx} ${cy - headR * 0.05} ${cx + w * 0.8} ${cy + headR * 0.08}`} fill="none" stroke="#4a3728" strokeWidth={headR * 0.035} strokeLinecap="round" />;
  }
  // neutral
  return <line x1={cx - w * 0.7} y1={cy} x2={cx + w * 0.7} y2={cy} stroke="#4a3728" strokeWidth={headR * 0.035} strokeLinecap="round" />;
}

function HairFront({ cx, cy, headR, style, color }: { cx: number; cy: number; headR: number; style: string; color: string }) {
  if (style === 'bald') return null;

  if (style === 'buzz') {
    return <path d={`M ${cx - headR * 0.85} ${cy - headR * 0.3} Q ${cx - headR * 0.8} ${cy - headR * 1.1} ${cx} ${cy - headR * 1.05} Q ${cx + headR * 0.8} ${cy - headR * 1.1} ${cx + headR * 0.85} ${cy - headR * 0.3}`} fill={color} />;
  }
  if (style === 'mohawk') {
    return (
      <g>
        <path d={`M ${cx - headR * 0.15} ${cy - headR * 0.9} Q ${cx} ${cy - headR * 1.6} ${cx + headR * 0.15} ${cy - headR * 0.9}`} fill={color} />
        <path d={`M ${cx - headR * 0.85} ${cy - headR * 0.3} Q ${cx - headR * 0.6} ${cy - headR * 0.95} ${cx} ${cy - headR * 0.9} Q ${cx + headR * 0.6} ${cy - headR * 0.95} ${cx + headR * 0.85} ${cy - headR * 0.3}`} fill={color} />
      </g>
    );
  }
  if (style === 'short') {
    return <path d={`M ${cx - headR * 0.9} ${cy - headR * 0.2} Q ${cx - headR * 0.85} ${cy - headR * 1.15} ${cx} ${cy - headR * 1.1} Q ${cx + headR * 0.85} ${cy - headR * 1.15} ${cx + headR * 0.9} ${cy - headR * 0.2}`} fill={color} />;
  }
  if (style === 'curly') {
    return (
      <g>
        <circle cx={cx - headR * 0.5} cy={cy - headR * 0.85} r={headR * 0.25} fill={color} />
        <circle cx={cx} cy={cy - headR * 0.95} r={headR * 0.28} fill={color} />
        <circle cx={cx + headR * 0.5} cy={cy - headR * 0.85} r={headR * 0.25} fill={color} />
        <circle cx={cx - headR * 0.75} cy={cy - headR * 0.55} r={headR * 0.22} fill={color} />
        <circle cx={cx + headR * 0.75} cy={cy - headR * 0.55} r={headR * 0.22} fill={color} />
        <circle cx={cx - headR * 0.3} cy={cy - headR * 0.95} r={headR * 0.22} fill={color} />
        <circle cx={cx + headR * 0.3} cy={cy - headR * 0.95} r={headR * 0.22} fill={color} />
      </g>
    );
  }
  // long + ponytail front part
  return (
    <path d={`M ${cx - headR * 0.92} ${cy - headR * 0.1} Q ${cx - headR * 0.9} ${cy - headR * 1.15} ${cx} ${cy - headR * 1.1} Q ${cx + headR * 0.9} ${cy - headR * 1.15} ${cx + headR * 0.92} ${cy - headR * 0.1}`} fill={color} />
  );
}

function HairBack({ cx, cy, headR, style, color, s }: { cx: number; cy: number; headR: number; style: string; color: string; s: number }) {
  if (style === 'long') {
    return (
      <g>
        <path d={`M ${cx - headR * 0.95} ${cy - headR * 0.3} L ${cx - headR * 0.85} ${cy + headR * 1.3} Q ${cx} ${cy + headR * 1.5} ${cx + headR * 0.85} ${cy + headR * 1.3} L ${cx + headR * 0.95} ${cy - headR * 0.3}`} fill={color} opacity={0.9} />
      </g>
    );
  }
  if (style === 'ponytail') {
    return (
      <g>
        <path d={`M ${cx + headR * 0.3} ${cy - headR * 0.7} Q ${cx + headR * 1.3} ${cy - headR * 0.3} ${cx + headR * 1.0} ${cy + headR * 0.8}`} stroke={color} strokeWidth={headR * 0.25} fill="none" strokeLinecap="round" />
      </g>
    );
  }
  return null;
}

function AccessoryRender({ cx, cy, headR, eyeY, spacing, type }: { cx: number; cy: number; headR: number; eyeY: number; spacing: number; type: string }) {
  if (type === 'glasses') {
    return (
      <g>
        <circle cx={cx - spacing} cy={eyeY} r={headR * 0.16} fill="none" stroke="#555" strokeWidth={headR * 0.03} />
        <circle cx={cx + spacing} cy={eyeY} r={headR * 0.16} fill="none" stroke="#555" strokeWidth={headR * 0.03} />
        <line x1={cx - spacing + headR * 0.16} y1={eyeY} x2={cx + spacing - headR * 0.16} y2={eyeY} stroke="#555" strokeWidth={headR * 0.025} />
        <line x1={cx - spacing - headR * 0.16} y1={eyeY} x2={cx - headR * 0.85} y2={eyeY - headR * 0.05} stroke="#555" strokeWidth={headR * 0.025} />
        <line x1={cx + spacing + headR * 0.16} y1={eyeY} x2={cx + headR * 0.85} y2={eyeY - headR * 0.05} stroke="#555" strokeWidth={headR * 0.025} />
      </g>
    );
  }
  if (type === 'sunglasses') {
    return (
      <g>
        <rect x={cx - spacing - headR * 0.17} y={eyeY - headR * 0.1} width={headR * 0.34} height={headR * 0.22} rx={headR * 0.04} fill="#1a1a2e" />
        <rect x={cx + spacing - headR * 0.17} y={eyeY - headR * 0.1} width={headR * 0.34} height={headR * 0.22} rx={headR * 0.04} fill="#1a1a2e" />
        <line x1={cx - spacing + headR * 0.17} y1={eyeY} x2={cx + spacing - headR * 0.17} y2={eyeY} stroke="#1a1a2e" strokeWidth={headR * 0.03} />
        <line x1={cx - spacing - headR * 0.17} y1={eyeY} x2={cx - headR * 0.88} y2={eyeY - headR * 0.08} stroke="#1a1a2e" strokeWidth={headR * 0.03} />
        <line x1={cx + spacing + headR * 0.17} y1={eyeY} x2={cx + headR * 0.88} y2={eyeY - headR * 0.08} stroke="#1a1a2e" strokeWidth={headR * 0.03} />
      </g>
    );
  }
  if (type === 'earring') {
    return (
      <g>
        <circle cx={cx - headR * 0.92} cy={cy + headR * 0.1} r={headR * 0.06} fill="#FFD700" />
        <circle cx={cx + headR * 0.92} cy={cy + headR * 0.1} r={headR * 0.06} fill="#FFD700" />
      </g>
    );
  }
  if (type === 'hat') {
    return (
      <g>
        <ellipse cx={cx} cy={cy - headR * 0.8} rx={headR * 1.2} ry={headR * 0.12} fill="#334155" />
        <path d={`M ${cx - headR * 0.7} ${cy - headR * 0.8} Q ${cx - headR * 0.65} ${cy - headR * 1.5} ${cx} ${cy - headR * 1.5} Q ${cx + headR * 0.65} ${cy - headR * 1.5} ${cx + headR * 0.7} ${cy - headR * 0.8}`} fill="#334155" />
      </g>
    );
  }
  if (type === 'bandana') {
    return (
      <g>
        <path d={`M ${cx - headR * 0.88} ${cy - headR * 0.55} Q ${cx} ${cy - headR * 0.75} ${cx + headR * 0.88} ${cy - headR * 0.55}`} fill="#dc2626" />
        <path d={`M ${cx - headR * 0.88} ${cy - headR * 0.55} L ${cx - headR * 1.1} ${cy - headR * 0.2}`} stroke="#dc2626" strokeWidth={headR * 0.08} strokeLinecap="round" />
      </g>
    );
  }
  return null;
}

function darken(hex: string): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - 30);
  const g = Math.max(0, ((num >> 8) & 0xff) - 30);
  const b = Math.max(0, (num & 0xff) - 30);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}
