'use client';

import { memo } from 'react';
import { AvatarConfig } from '../engine/avatar';

interface Props {
  config: AvatarConfig;
  size?: number;
  mood?: string;
}

export default memo(function Avatar({ config, size = 80, mood }: Props) {
  const s = size;
  const cx = s / 2;
  const headCy = s * 0.38;
  const headR = s * 0.33;
  const { skinTone, hairStyle, hairColor, eyeStyle, faceShape, accessory, clothingColor, clothingStyle } = config;

  const faceW = faceShape === 'square' ? headR * 0.88 : faceShape === 'oval' ? headR * 0.82 : headR * 0.92;
  const faceH = faceShape === 'square' ? headR * 0.85 : faceShape === 'oval' ? headR * 1.0 : headR * 0.92;

  const eyeY = headCy + headR * 0.05;
  const eyeSpacing = headR * 0.32;
  const mouthY = headCy + headR * 0.42;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`skin-${skinTone.replace('#','')}`} cx="40%" cy="35%">
          <stop offset="0%" stopColor={lighten(skinTone, 15)} />
          <stop offset="100%" stopColor={skinTone} />
        </radialGradient>
        <radialGradient id={`hair-${hairColor.replace('#','')}`} cx="30%" cy="25%">
          <stop offset="0%" stopColor={lighten(hairColor, 20)} />
          <stop offset="100%" stopColor={hairColor} />
        </radialGradient>
      </defs>

      {/* Body / Clothing — small chibi body */}
      <AnimeClothing cx={cx} bodyCy={headCy + headR * 0.85} s={s} headR={headR} color={clothingColor} style={clothingStyle} skinTone={skinTone} />

      {/* Face shape */}
      <ellipse cx={cx} cy={headCy} rx={faceW} ry={faceH}
        fill={`url(#skin-${skinTone.replace('#','')})`}
      />

      {/* Blush marks */}
      <ellipse cx={cx - eyeSpacing - headR * 0.1} cy={eyeY + headR * 0.18} rx={headR * 0.12} ry={headR * 0.07} fill="#FF9999" opacity={0.25} />
      <ellipse cx={cx + eyeSpacing + headR * 0.1} cy={eyeY + headR * 0.18} rx={headR * 0.12} ry={headR * 0.07} fill="#FF9999" opacity={0.25} />

      {/* Hair behind head */}
      <AnimeHairBack cx={cx} cy={headCy} headR={headR} faceW={faceW} faceH={faceH} style={hairStyle} color={hairColor} s={s} />

      {/* Anime eyes */}
      <AnimeEyes cx={cx} cy={eyeY} spacing={eyeSpacing} style={eyeStyle} headR={headR} mood={mood} />

      {/* Small anime nose */}
      <path d={`M ${cx - headR * 0.02} ${headCy + headR * 0.2} L ${cx} ${headCy + headR * 0.26} L ${cx + headR * 0.02} ${headCy + headR * 0.2}`}
        fill="none" stroke={darken(skinTone, 20)} strokeWidth={headR * 0.025} strokeLinecap="round" opacity={0.4} />

      {/* Mouth */}
      <AnimeMouth cx={cx} cy={mouthY} headR={headR} mood={mood} />

      {/* Hair front */}
      <AnimeHairFront cx={cx} cy={headCy} headR={headR} faceW={faceW} style={hairStyle} color={hairColor} />

      {/* Accessory */}
      <AnimeAccessory cx={cx} cy={headCy} headR={headR} eyeY={eyeY} spacing={eyeSpacing} type={accessory} />
    </svg>
  );
});

/* ─── Anime Eyes ─── */
function AnimeEyes({ cx, cy, spacing, style, headR, mood }: {
  cx: number; cy: number; spacing: number; style: string; headR: number; mood?: string;
}) {
  const ew = headR * 0.16;
  const eh = headR * 0.22;

  if (style === 'sleepy' || mood === 'sad') {
    return (
      <g>
        {/* Closed/sleepy anime eyes — curved lines */}
        <path d={`M ${cx - spacing - ew} ${cy} Q ${cx - spacing} ${cy + eh * 0.4} ${cx - spacing + ew} ${cy}`}
          fill="none" stroke="#2D2B3D" strokeWidth={headR * 0.04} strokeLinecap="round" />
        <path d={`M ${cx + spacing - ew} ${cy} Q ${cx + spacing} ${cy + eh * 0.4} ${cx + spacing + ew} ${cy}`}
          fill="none" stroke="#2D2B3D" strokeWidth={headR * 0.04} strokeLinecap="round" />
        {/* Tiny lashes */}
        <line x1={cx - spacing - ew * 0.8} y1={cy - headR * 0.02} x2={cx - spacing - ew * 1.1} y2={cy - headR * 0.06}
          stroke="#2D2B3D" strokeWidth={headR * 0.02} strokeLinecap="round" />
        <line x1={cx + spacing + ew * 0.8} y1={cy - headR * 0.02} x2={cx + spacing + ew * 1.1} y2={cy - headR * 0.06}
          stroke="#2D2B3D" strokeWidth={headR * 0.02} strokeLinecap="round" />
      </g>
    );
  }

  const eyeH = style === 'narrow' ? eh * 0.6 : style === 'wide' ? eh * 1.2 : eh;
  const eyeW = style === 'narrow' ? ew * 1.1 : style === 'wide' ? ew * 1.1 : ew;
  const pupilR = style === 'narrow' ? headR * 0.06 : style === 'wide' ? headR * 0.1 : headR * 0.08;

  return (
    <g>
      {/* Left eye */}
      <ellipse cx={cx - spacing} cy={cy} rx={eyeW} ry={eyeH} fill="white" />
      <ellipse cx={cx - spacing} cy={cy} rx={eyeW} ry={eyeH} fill="none" stroke="#2D2B3D" strokeWidth={headR * 0.02} />
      {/* Iris */}
      <ellipse cx={cx - spacing} cy={cy + eyeH * 0.08} rx={pupilR * 1.3} ry={pupilR * 1.5} fill="#4F6D7A" />
      {/* Pupil */}
      <circle cx={cx - spacing} cy={cy + eyeH * 0.08} r={pupilR * 0.7} fill="#1a1a2e" />
      {/* Highlight sparkles */}
      <circle cx={cx - spacing - pupilR * 0.5} cy={cy - eyeH * 0.15} r={pupilR * 0.45} fill="white" />
      <circle cx={cx - spacing + pupilR * 0.3} cy={cy + eyeH * 0.15} r={pupilR * 0.2} fill="white" />
      {/* Top lid line */}
      <path d={`M ${cx - spacing - eyeW} ${cy - eyeH * 0.1} Q ${cx - spacing} ${cy - eyeH * 1.1} ${cx - spacing + eyeW} ${cy - eyeH * 0.1}`}
        fill="none" stroke="#2D2B3D" strokeWidth={headR * 0.035} strokeLinecap="round" />

      {/* Right eye */}
      <ellipse cx={cx + spacing} cy={cy} rx={eyeW} ry={eyeH} fill="white" />
      <ellipse cx={cx + spacing} cy={cy} rx={eyeW} ry={eyeH} fill="none" stroke="#2D2B3D" strokeWidth={headR * 0.02} />
      <ellipse cx={cx + spacing} cy={cy + eyeH * 0.08} rx={pupilR * 1.3} ry={pupilR * 1.5} fill="#4F6D7A" />
      <circle cx={cx + spacing} cy={cy + eyeH * 0.08} r={pupilR * 0.7} fill="#1a1a2e" />
      <circle cx={cx + spacing - pupilR * 0.5} cy={cy - eyeH * 0.15} r={pupilR * 0.45} fill="white" />
      <circle cx={cx + spacing + pupilR * 0.3} cy={cy + eyeH * 0.15} r={pupilR * 0.2} fill="white" />
      <path d={`M ${cx + spacing - eyeW} ${cy - eyeH * 0.1} Q ${cx + spacing} ${cy - eyeH * 1.1} ${cx + spacing + eyeW} ${cy - eyeH * 0.1}`}
        fill="none" stroke="#2D2B3D" strokeWidth={headR * 0.035} strokeLinecap="round" />
    </g>
  );
}

/* ─── Anime Mouth ─── */
function AnimeMouth({ cx, cy, headR, mood }: { cx: number; cy: number; headR: number; mood?: string }) {
  const w = headR * 0.15;

  if (mood === 'happy' || mood === 'excited') {
    return (
      <g>
        <path d={`M ${cx - w} ${cy} Q ${cx} ${cy + headR * 0.15} ${cx + w} ${cy}`}
          fill="none" stroke="#C0616B" strokeWidth={headR * 0.035} strokeLinecap="round" />
        {mood === 'excited' && (
          <path d={`M ${cx - w * 0.7} ${cy + headR * 0.01} Q ${cx} ${cy + headR * 0.12} ${cx + w * 0.7} ${cy + headR * 0.01}`}
            fill="#E88090" opacity={0.5} />
        )}
      </g>
    );
  }
  if (mood === 'angry') {
    return <path d={`M ${cx - w} ${cy + headR * 0.03} L ${cx} ${cy - headR * 0.02} L ${cx + w} ${cy + headR * 0.03}`}
      fill="none" stroke="#C0616B" strokeWidth={headR * 0.035} strokeLinecap="round" />;
  }
  if (mood === 'sad' || mood === 'anxious') {
    return <path d={`M ${cx - w * 0.7} ${cy + headR * 0.05} Q ${cx} ${cy - headR * 0.03} ${cx + w * 0.7} ${cy + headR * 0.05}`}
      fill="none" stroke="#C0616B" strokeWidth={headR * 0.03} strokeLinecap="round" />;
  }
  // Neutral — small cat mouth ":3"
  return (
    <g>
      <path d={`M ${cx - w * 0.6} ${cy} Q ${cx - w * 0.1} ${cy + headR * 0.06} ${cx} ${cy}`}
        fill="none" stroke="#C0616B" strokeWidth={headR * 0.03} strokeLinecap="round" />
      <path d={`M ${cx} ${cy} Q ${cx + w * 0.1} ${cy + headR * 0.06} ${cx + w * 0.6} ${cy}`}
        fill="none" stroke="#C0616B" strokeWidth={headR * 0.03} strokeLinecap="round" />
    </g>
  );
}

/* ─── Anime Hair Front ─── */
function AnimeHairFront({ cx, cy, headR, faceW, style, color }: {
  cx: number; cy: number; headR: number; faceW: number; style: string; color: string;
}) {
  const gid = `url(#hair-${color.replace('#','')})`;

  if (style === 'bald') return null;

  if (style === 'buzz') {
    return (
      <path d={`M ${cx - faceW * 0.95} ${cy - headR * 0.3}
        Q ${cx - faceW * 0.85} ${cy - headR * 1.0} ${cx} ${cy - headR * 0.95}
        Q ${cx + faceW * 0.85} ${cy - headR * 1.0} ${cx + faceW * 0.95} ${cy - headR * 0.3}`}
        fill={gid} />
    );
  }

  if (style === 'mohawk') {
    return (
      <g>
        {/* Spiky mohawk */}
        <path d={`M ${cx - headR * 0.12} ${cy - headR * 0.85}
          L ${cx - headR * 0.08} ${cy - headR * 1.5}
          L ${cx} ${cy - headR * 1.15}
          L ${cx + headR * 0.08} ${cy - headR * 1.55}
          L ${cx + headR * 0.12} ${cy - headR * 0.85}`}
          fill={gid} />
        <path d={`M ${cx - faceW * 0.9} ${cy - headR * 0.3}
          Q ${cx - faceW * 0.6} ${cy - headR * 0.9} ${cx} ${cy - headR * 0.85}
          Q ${cx + faceW * 0.6} ${cy - headR * 0.9} ${cx + faceW * 0.9} ${cy - headR * 0.3}`}
          fill={gid} />
      </g>
    );
  }

  if (style === 'short') {
    return (
      <g>
        {/* Anime-style spiky bangs */}
        <path d={`M ${cx - faceW * 1.0} ${cy - headR * 0.15}
          Q ${cx - faceW * 0.9} ${cy - headR * 1.05} ${cx} ${cy - headR * 1.0}
          Q ${cx + faceW * 0.9} ${cy - headR * 1.05} ${cx + faceW * 1.0} ${cy - headR * 0.15}`}
          fill={gid} />
        {/* Spiky fringe */}
        <path d={`M ${cx - faceW * 0.7} ${cy - headR * 0.3}
          L ${cx - faceW * 0.45} ${cy - headR * 0.55}
          L ${cx - faceW * 0.15} ${cy - headR * 0.35}
          L ${cx + faceW * 0.1} ${cy - headR * 0.52}
          L ${cx + faceW * 0.4} ${cy - headR * 0.3}`}
          fill={gid} />
      </g>
    );
  }

  if (style === 'curly') {
    return (
      <g>
        {/* Fluffy curly mass */}
        <circle cx={cx - headR * 0.45} cy={cy - headR * 0.75} r={headR * 0.28} fill={gid} />
        <circle cx={cx} cy={cy - headR * 0.88} r={headR * 0.3} fill={gid} />
        <circle cx={cx + headR * 0.45} cy={cy - headR * 0.75} r={headR * 0.28} fill={gid} />
        <circle cx={cx - headR * 0.7} cy={cy - headR * 0.45} r={headR * 0.24} fill={gid} />
        <circle cx={cx + headR * 0.7} cy={cy - headR * 0.45} r={headR * 0.24} fill={gid} />
        <circle cx={cx - headR * 0.25} cy={cy - headR * 0.85} r={headR * 0.25} fill={gid} />
        <circle cx={cx + headR * 0.25} cy={cy - headR * 0.85} r={headR * 0.25} fill={gid} />
        {/* Side curls */}
        <circle cx={cx - headR * 0.85} cy={cy - headR * 0.15} r={headR * 0.2} fill={gid} />
        <circle cx={cx + headR * 0.85} cy={cy - headR * 0.15} r={headR * 0.2} fill={gid} />
      </g>
    );
  }

  if (style === 'ponytail') {
    return (
      <g>
        <path d={`M ${cx - faceW * 0.95} ${cy - headR * 0.15}
          Q ${cx - faceW * 0.9} ${cy - headR * 1.05} ${cx} ${cy - headR * 1.0}
          Q ${cx + faceW * 0.9} ${cy - headR * 1.05} ${cx + faceW * 0.95} ${cy - headR * 0.15}`}
          fill={gid} />
        {/* Side-swept bangs */}
        <path d={`M ${cx - faceW * 0.6} ${cy - headR * 0.2}
          L ${cx - faceW * 0.35} ${cy - headR * 0.5}
          L ${cx} ${cy - headR * 0.3}
          L ${cx + faceW * 0.2} ${cy - headR * 0.45}
          L ${cx + faceW * 0.45} ${cy - headR * 0.25}`}
          fill={gid} />
      </g>
    );
  }

  // long — dramatic anime long hair
  return (
    <g>
      <path d={`M ${cx - faceW * 1.0} ${cy - headR * 0.1}
        Q ${cx - faceW * 0.95} ${cy - headR * 1.1} ${cx} ${cy - headR * 1.05}
        Q ${cx + faceW * 0.95} ${cy - headR * 1.1} ${cx + faceW * 1.0} ${cy - headR * 0.1}`}
        fill={gid} />
      {/* Curtain bangs */}
      <path d={`M ${cx - faceW * 0.8} ${cy - headR * 0.15}
        L ${cx - faceW * 0.55} ${cy - headR * 0.45}
        L ${cx - faceW * 0.2} ${cy - headR * 0.25}
        L ${cx + faceW * 0.2} ${cy - headR * 0.45}
        L ${cx + faceW * 0.55} ${cy - headR * 0.25}
        L ${cx + faceW * 0.8} ${cy - headR * 0.15}`}
        fill={gid} />
    </g>
  );
}

/* ─── Anime Hair Back ─── */
function AnimeHairBack({ cx, cy, headR, faceW, faceH, style, color, s }: {
  cx: number; cy: number; headR: number; faceW: number; faceH: number; style: string; color: string; s: number;
}) {
  const gid = `url(#hair-${color.replace('#','')})`;

  if (style === 'long') {
    return (
      <path d={`M ${cx - faceW * 1.05} ${cy - headR * 0.2}
        L ${cx - faceW * 0.95} ${cy + headR * 1.5}
        Q ${cx - faceW * 0.3} ${cy + headR * 1.65} ${cx} ${cy + headR * 1.6}
        Q ${cx + faceW * 0.3} ${cy + headR * 1.65} ${cx + faceW * 0.95} ${cy + headR * 1.5}
        L ${cx + faceW * 1.05} ${cy - headR * 0.2}`}
        fill={gid} opacity={0.85} />
    );
  }
  if (style === 'ponytail') {
    return (
      <g>
        {/* Ponytail flowing back */}
        <path d={`M ${cx + headR * 0.2} ${cy - headR * 0.7}
          Q ${cx + headR * 1.2} ${cy - headR * 0.5} ${cx + headR * 1.0} ${cy + headR * 0.6}
          Q ${cx + headR * 0.9} ${cy + headR * 1.0} ${cx + headR * 0.7} ${cy + headR * 1.2}`}
          stroke={gid} strokeWidth={headR * 0.3} fill="none" strokeLinecap="round" />
        {/* Hair tie */}
        <circle cx={cx + headR * 0.55} cy={cy - headR * 0.55} r={headR * 0.08} fill="#E74C6F" />
      </g>
    );
  }
  if (style === 'curly') {
    return (
      <g>
        <circle cx={cx - headR * 0.8} cy={cy + headR * 0.1} r={headR * 0.22} fill={gid} opacity={0.7} />
        <circle cx={cx + headR * 0.8} cy={cy + headR * 0.1} r={headR * 0.22} fill={gid} opacity={0.7} />
      </g>
    );
  }
  return null;
}

/* ─── Anime Clothing ─── */
function AnimeClothing({ cx, bodyCy, s, headR, color, style, skinTone }: {
  cx: number; bodyCy: number; s: number; headR: number; color: string; style: string; skinTone: string;
}) {
  const bodyW = headR * 0.85;
  const neckW = headR * 0.18;

  return (
    <g>
      {/* Neck */}
      <rect x={cx - neckW} y={bodyCy - headR * 0.05} width={neckW * 2} height={headR * 0.3}
        fill={skinTone} rx={neckW * 0.3} />

      {/* Body shape */}
      {style === 'hoodie' ? (
        <g>
          <path d={`M ${cx - bodyW} ${bodyCy + headR * 0.15}
            Q ${cx - bodyW * 0.3} ${bodyCy + headR * 0.05} ${cx} ${bodyCy + headR * 0.12}
            Q ${cx + bodyW * 0.3} ${bodyCy + headR * 0.05} ${cx + bodyW} ${bodyCy + headR * 0.15}
            L ${cx + bodyW * 1.15} ${s}
            L ${cx - bodyW * 1.15} ${s} Z`}
            fill={color} />
          {/* Hood line */}
          <path d={`M ${cx - neckW * 1.5} ${bodyCy + headR * 0.12}
            Q ${cx} ${bodyCy + headR * 0.3} ${cx + neckW * 1.5} ${bodyCy + headR * 0.12}`}
            fill="none" stroke={darken(color, 25)} strokeWidth={headR * 0.025} opacity={0.5} />
          {/* Pocket */}
          <rect x={cx - bodyW * 0.45} y={bodyCy + headR * 0.55} width={bodyW * 0.9} height={headR * 0.2}
            rx={headR * 0.05} fill={darken(color, 15)} opacity={0.3} />
        </g>
      ) : style === 'shirt' ? (
        <g>
          <path d={`M ${cx - bodyW} ${bodyCy + headR * 0.15}
            L ${cx + bodyW} ${bodyCy + headR * 0.15}
            L ${cx + bodyW * 1.15} ${s}
            L ${cx - bodyW * 1.15} ${s} Z`}
            fill={color} />
          {/* Collar */}
          <path d={`M ${cx - neckW * 1.2} ${bodyCy + headR * 0.15}
            L ${cx} ${bodyCy + headR * 0.35}
            L ${cx + neckW * 1.2} ${bodyCy + headR * 0.15}`}
            fill="none" stroke={darken(color, 20)} strokeWidth={headR * 0.025} />
          {/* Button line */}
          <line x1={cx} y1={bodyCy + headR * 0.35} x2={cx} y2={s}
            stroke={darken(color, 15)} strokeWidth={headR * 0.02} opacity={0.35} />
        </g>
      ) : style === 'tank' ? (
        <path d={`M ${cx - bodyW * 0.55} ${bodyCy + headR * 0.15}
          L ${cx + bodyW * 0.55} ${bodyCy + headR * 0.15}
          L ${cx + bodyW * 0.9} ${s}
          L ${cx - bodyW * 0.9} ${s} Z`}
          fill={color} />
      ) : (
        /* tshirt */
        <g>
          <path d={`M ${cx - bodyW} ${bodyCy + headR * 0.15}
            Q ${cx} ${bodyCy + headR * 0.08} ${cx + bodyW} ${bodyCy + headR * 0.15}
            L ${cx + bodyW * 1.15} ${s}
            L ${cx - bodyW * 1.15} ${s} Z`}
            fill={color} />
          {/* Collar */}
          <path d={`M ${cx - neckW * 1.5} ${bodyCy + headR * 0.15}
            Q ${cx} ${bodyCy + headR * 0.28} ${cx + neckW * 1.5} ${bodyCy + headR * 0.15}`}
            fill={darken(color, 10)} opacity={0.3} />
        </g>
      )}
    </g>
  );
}

/* ─── Anime Accessories ─── */
function AnimeAccessory({ cx, cy, headR, eyeY, spacing, type }: {
  cx: number; cy: number; headR: number; eyeY: number; spacing: number; type: string;
}) {
  if (type === 'glasses') {
    const glassR = headR * 0.18;
    return (
      <g>
        <circle cx={cx - spacing} cy={eyeY} r={glassR} fill="none" stroke="#64748B" strokeWidth={headR * 0.025} />
        <circle cx={cx + spacing} cy={eyeY} r={glassR} fill="none" stroke="#64748B" strokeWidth={headR * 0.025} />
        <line x1={cx - spacing + glassR} y1={eyeY} x2={cx + spacing - glassR} y2={eyeY}
          stroke="#64748B" strokeWidth={headR * 0.02} />
        <line x1={cx - spacing - glassR} y1={eyeY} x2={cx - headR * 0.82} y2={eyeY - headR * 0.04}
          stroke="#64748B" strokeWidth={headR * 0.02} />
        <line x1={cx + spacing + glassR} y1={eyeY} x2={cx + headR * 0.82} y2={eyeY - headR * 0.04}
          stroke="#64748B" strokeWidth={headR * 0.02} />
      </g>
    );
  }
  if (type === 'sunglasses') {
    const sw = headR * 0.2;
    const sh = headR * 0.14;
    return (
      <g>
        <rect x={cx - spacing - sw} y={eyeY - sh / 2} width={sw * 2} height={sh} rx={headR * 0.04}
          fill="#1E293B" opacity={0.85} />
        <rect x={cx + spacing - sw} y={eyeY - sh / 2} width={sw * 2} height={sh} rx={headR * 0.04}
          fill="#1E293B" opacity={0.85} />
        {/* Shine */}
        <rect x={cx - spacing - sw * 0.6} y={eyeY - sh * 0.3} width={sw * 0.4} height={sh * 0.2} rx={2}
          fill="white" opacity={0.3} />
        <rect x={cx + spacing - sw * 0.6} y={eyeY - sh * 0.3} width={sw * 0.4} height={sh * 0.2} rx={2}
          fill="white" opacity={0.3} />
        <line x1={cx - spacing + sw} y1={eyeY} x2={cx + spacing - sw} y2={eyeY}
          stroke="#1E293B" strokeWidth={headR * 0.025} />
        <line x1={cx - spacing - sw} y1={eyeY} x2={cx - headR * 0.88} y2={eyeY - headR * 0.06}
          stroke="#1E293B" strokeWidth={headR * 0.025} />
        <line x1={cx + spacing + sw} y1={eyeY} x2={cx + headR * 0.88} y2={eyeY - headR * 0.06}
          stroke="#1E293B" strokeWidth={headR * 0.025} />
      </g>
    );
  }
  if (type === 'earring') {
    return (
      <g>
        <circle cx={cx - headR * 0.85} cy={cy + headR * 0.15} r={headR * 0.055} fill="#FFD700"
          stroke="#DAA520" strokeWidth={headR * 0.015} />
        <circle cx={cx + headR * 0.85} cy={cy + headR * 0.15} r={headR * 0.055} fill="#FFD700"
          stroke="#DAA520" strokeWidth={headR * 0.015} />
      </g>
    );
  }
  if (type === 'hat') {
    return (
      <g>
        <ellipse cx={cx} cy={cy - headR * 0.75} rx={headR * 1.15} ry={headR * 0.1} fill="#334155" />
        <path d={`M ${cx - headR * 0.65} ${cy - headR * 0.75}
          Q ${cx - headR * 0.6} ${cy - headR * 1.4} ${cx} ${cy - headR * 1.4}
          Q ${cx + headR * 0.6} ${cy - headR * 1.4} ${cx + headR * 0.65} ${cy - headR * 0.75}`}
          fill="#334155" />
        {/* Hat band */}
        <rect x={cx - headR * 0.65} y={cy - headR * 0.83} width={headR * 1.3} height={headR * 0.08}
          rx={headR * 0.02} fill="#475569" />
      </g>
    );
  }
  if (type === 'bandana') {
    return (
      <g>
        <path d={`M ${cx - headR * 0.85} ${cy - headR * 0.5}
          Q ${cx} ${cy - headR * 0.68} ${cx + headR * 0.85} ${cy - headR * 0.5}`}
          fill="#EF4444" />
        {/* Knot tail */}
        <path d={`M ${cx - headR * 0.85} ${cy - headR * 0.5}
          L ${cx - headR * 1.05} ${cy - headR * 0.2}`}
          stroke="#EF4444" strokeWidth={headR * 0.07} strokeLinecap="round" />
        {/* Dot pattern */}
        <circle cx={cx - headR * 0.3} cy={cy - headR * 0.55} r={headR * 0.025} fill="#FCA5A5" opacity={0.6} />
        <circle cx={cx + headR * 0.15} cy={cy - headR * 0.58} r={headR * 0.025} fill="#FCA5A5" opacity={0.6} />
        <circle cx={cx + headR * 0.5} cy={cy - headR * 0.53} r={headR * 0.025} fill="#FCA5A5" opacity={0.6} />
      </g>
    );
  }
  return null;
}

/* ─── Helpers ─── */
function darken(hex: string, amount = 30): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function lighten(hex: string, amount = 20): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}
