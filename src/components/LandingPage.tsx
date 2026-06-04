'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import dynamic from 'next/dynamic';
import { INITIAL_NPCS } from '../data/npcs';
import { DEFAULT_AVATARS } from '../engine/avatar';
import Avatar from './Avatar';

const LandingGlobe = dynamic(() => import('./LandingGlobe'), { ssr: false });

interface Props {
  onStartSetup: () => void;
}

const ROLE_ICON: Record<string, string> = {
  programmer: '\u{1F4BB}', teacher: '\u{1F4DA}', doctor: '\u{1F3E5}', artist: '\u{1F3A8}', chef: '\u{1F373}',
  mechanic: '\u{1F527}', freelancer: '\u{1F310}', entrepreneur: '\u{1F4CA}', student: '\u{1F393}', unemployed: '\u{1F3E0}',
};

const TIMELINE_EVENTS = [
  { time: '08:00', text: 'Alex woke up and went to work at Palas Campus', type: 'action' },
  { time: '09:30', text: 'Maria started her morning class', type: 'action' },
  { time: '10:00', text: 'Victor spread a rumor about Mihai', type: 'rumor' },
  { time: '11:00', text: 'Elena and Victor had coffee together', type: 'social' },
  { time: '12:00', text: 'Alex and Maria had lunch at Centru Vechi', type: 'social' },
  { time: '13:00', text: 'Radu argued with Cristina about work', type: 'conflict' },
  { time: '14:00', text: 'Ioana received a study grant', type: 'life_event' },
  { time: '15:00', text: 'Dan started preparing dinner specials', type: 'action' },
  { time: '16:00', text: 'Andrei finished a new painting', type: 'life_event' },
  { time: '17:00', text: 'Maria and Elena went shopping at Palas Mall', type: 'social' },
];

const EVENT_COLORS: Record<string, string> = {
  action: '#64748B',
  social: '#007AFF',
  rumor: '#A855F7',
  conflict: '#EF4444',
  life_event: '#F59E0B',
};

const HOW_IT_WORKS = [
  {
    num: '01',
    title: 'NPCs Think',
    desc: 'Utility AI evaluates needs, goals, mood, personality and context to decide what each character does next.',
    color: '#007AFF',
    icon: '\u{1F9E0}',
  },
  {
    num: '02',
    title: 'NPCs Interact',
    desc: 'Characters build friendships, rivalries and romantic relationships through natural social encounters.',
    color: '#F472B6',
    icon: '\u{1F4AC}',
  },
  {
    num: '03',
    title: 'Stories Emerge',
    desc: 'Unexpected situations create unique narratives every simulation. No two worlds evolve the same way.',
    color: '#4ADE80',
    icon: '\u{2728}',
  },
];

const RELATIONSHIPS = [
  { from: 0, to: 2, type: 'romantic', color: '#F472B6' },
  { from: 0, to: 1, type: 'friend', color: '#007AFF' },
  { from: 3, to: 2, type: 'romantic', color: '#F472B6' },
  { from: 4, to: 5, type: 'rival', color: '#EF4444' },
  { from: 1, to: 8, type: 'friend', color: '#007AFF' },
  { from: 6, to: 7, type: 'friend', color: '#007AFF' },
  { from: 3, to: 9, type: 'rival', color: '#EF4444' },
  { from: 8, to: 1, type: 'friend', color: '#007AFF' },
  { from: 9, to: 3, type: 'enemy', color: '#EF4444' },
  { from: 7, to: 6, type: 'friend', color: '#4ADE80' },
];

const ease = [0.22, 1, 0.36, 1] as const;

export default function LandingPage({ onStartSetup }: Props) {
  const [hoveredNpc, setHoveredNpc] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  const handleStartSimulation = useCallback(() => {
    setTransitioning(true);
  }, []);

  const handleZoomComplete = useCallback(() => {
    onStartSetup();
  }, [onStartSetup]);

  const handleScrollToHow = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const networkPositions = useMemo(() => {
    const positions: { x: number; y: number }[] = [];
    const cx = 300, cy = 200, r = 150;
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      positions.push({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    }
    return positions;
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden landing-light">

      {/* HERO */}
      <section className="relative min-h-screen flex items-center">
        {/* Ambient glow backgrounds */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[10%] left-[5%] w-[500px] h-[500px] rounded-full bg-blue-400/[0.06] blur-[120px]" />
          <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-cyan-400/[0.05] blur-[100px]" />
          <div className="absolute top-[50%] left-[40%] w-[300px] h-[300px] rounded-full bg-emerald-400/[0.03] blur-[80px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-20 relative z-10">

          {/* Left: Text */}
          <motion.div
            style={{
              opacity: heroOpacity,
            }}
            className={`relative z-10 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              transitioning ? 'opacity-0 -translate-y-8 scale-95 blur-sm' : ''
            }`}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
            >
              <span className="landing-badge-light">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Autonomous Life Simulation
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease }}
              className="mt-8 text-5xl md:text-6xl lg:text-[4.25rem] font-bold leading-[1.08] tracking-tight"
              style={{ color: '#0F172A' }}
            >
              10 NPCs.<br />
              One Week.<br />
              <span className="bg-gradient-to-r from-[#007AFF] via-[#00D2FF] to-[#007AFF] bg-clip-text text-transparent">
                Infinite Stories.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease }}
              className="mt-6 text-lg leading-relaxed max-w-lg"
              style={{ color: '#475569' }}
            >
              LifeSim simulates autonomous characters living their own lives in Iași, Romania.
              Every decision, relationship, memory, and rumor emerges naturally through a Utility AI engine.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-3 text-sm leading-relaxed max-w-lg"
              style={{ color: '#94A3B8' }}
            >
              No scripted stories. No predefined outcomes.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <button onClick={handleStartSimulation} className="btn-primary-light" disabled={transitioning}>
                {transitioning ? 'Launching...' : 'Start Simulation'}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <a href="#how-it-works" onClick={handleScrollToHow} className="btn-ghost-light">
                See How It Works
              </a>
            </motion.div>

            {/* NPC Preview Row */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6, ease }}
              className="mt-10 flex items-center gap-3"
            >
              {INITIAL_NPCS.slice(0, 3).map((npc, i) => (
                <motion.div
                  key={npc.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.1, duration: 0.4 }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-2xl border border-slate-200/80 bg-white/60 backdrop-blur-sm shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100/80 flex items-center justify-center">
                    <Avatar config={DEFAULT_AVATARS[npc.id]} size={36} mood={npc.currentMood} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800 leading-tight">{npc.name}</div>
                    <div className="text-[10px] text-slate-400 capitalize">{npc.occupation}</div>
                  </div>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="text-xs text-slate-400 ml-1"
              >
                +7 more
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Right: Globe (same globe.gl as in simulation) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease }}
            className="relative w-full h-[min(580px,80vh)] mx-auto lg:ml-auto"
            style={{
              overflow: 'visible',
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
            }}
          >
            <LandingGlobe zooming={transitioning} onZoomComplete={handleZoomComplete} />
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-28 px-6 lg:px-12 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease }}
            className="text-center mb-16"
          >
            <span className="landing-badge-light mb-4">How It Works</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 tracking-tight text-slate-900">
              A simulation that runs itself
            </h2>
            <p className="mt-4 text-slate-500 max-w-lg mx-auto">
              No scripts. No pre-written dialogue. Just autonomous characters making their own choices.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((card, i) => (
              <motion.div
                key={card.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: i * 0.12, duration: 0.5, ease }}
              >
                <div className="light-card p-8 h-full group cursor-default">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5
                    group-hover:scale-110 transition-transform duration-300"
                    style={{ background: `${card.color}10`, border: `1px solid ${card.color}20` }}
                  >
                    {card.icon}
                  </div>
                  <div className="text-xs font-mono mb-2" style={{ color: card.color }}>{card.num}</div>
                  <h3 className="text-xl font-semibold mb-2 text-slate-800">{card.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{card.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* MEET THE NPCs */}
      <section className="py-24 px-6 lg:px-12 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-blue-400/[0.03] blur-[100px]" />
        </div>
        <div className="max-w-[1100px] mx-auto px-0 md:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease }}
            className="text-center mb-14"
          >
            <span className="landing-badge-light mb-4">Your Cast</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 tracking-tight text-slate-900">
              Meet the NPCs
            </h2>
            <p className="mt-4 text-slate-500 max-w-md mx-auto">
              Ten characters with distinct personalities, goals, and stories waiting to unfold.
            </p>
          </motion.div>

          {/* Grid 5x2 */}
          <div
            className="grid gap-5"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            }}
          >
            {INITIAL_NPCS.map((npc, i) => (
              <motion.div
                key={npc.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ delay: i * 0.05, duration: 0.4, ease }}
              >
                <div className="light-card group cursor-default overflow-hidden npc-card-light">
                  {/* Avatar zone */}
                  <div
                    style={{
                      height: 200,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, rgba(241,245,249,0.9) 0%, rgba(226,232,240,0.5) 100%)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Role icon watermark */}
                    <span style={{
                      position: 'absolute', top: 10, right: 10,
                      fontSize: 22, opacity: 0.1,
                      transition: 'opacity 0.3s, transform 0.3s',
                    }} className="group-hover:opacity-20 group-hover:scale-110">
                      {ROLE_ICON[npc.occupation] ?? '\u{1F464}'}
                    </span>
                    {/* Glow behind avatar */}
                    <div className="absolute w-24 h-24 rounded-full bg-blue-400/8 blur-xl group-hover:bg-blue-400/15 transition-all duration-500" />
                    <div className="relative group-hover:scale-110 transition-transform duration-500 ease-out">
                      <Avatar config={DEFAULT_AVATARS[npc.id]} size={140} mood={npc.currentMood} />
                    </div>
                  </div>

                  {/* Info zone */}
                  <div style={{ textAlign: 'center', padding: '14px 10px 18px' }}>
                    <h4 className="text-[15px] font-bold text-slate-700 group-hover:text-[#007AFF] transition-colors duration-200">
                      {npc.name}
                    </h4>
                    <div className="flex items-center justify-center gap-1.5 mt-1.5">
                      <span className="text-xs">{ROLE_ICON[npc.occupation] ?? '\u{1F464}'}</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                        {npc.occupation}
                      </span>
                    </div>
                    <div className="flex justify-center gap-1.5 mt-3 flex-wrap">
                      {npc.personality.map(t => {
                        const isPositive = ['generous', 'honest', 'optimistic', 'social', 'ambitious'].includes(t);
                        return (
                          <span
                            key={t}
                            className="text-[9px] px-2 py-0.5 rounded-full font-medium capitalize"
                            style={{
                              background: isPositive ? 'rgba(74, 222, 128, 0.12)' : 'rgba(251, 146, 60, 0.1)',
                              color: isPositive ? '#16a34a' : '#c2410c',
                              border: `1px solid ${isPositive ? 'rgba(74, 222, 128, 0.2)' : 'rgba(251, 146, 60, 0.18)'}`,
                            }}
                          >
                            {t}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE SIMULATION PREVIEW */}
      <section className="py-28 px-6 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease }}
            className="text-center mb-14"
          >
            <span className="landing-badge-light mb-4">Preview</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 tracking-tight text-slate-900">
              A day in the simulation
            </h2>
            <p className="mt-4 text-slate-500 max-w-md mx-auto">
              Watch how a typical day unfolds as NPCs go about their autonomous lives.
            </p>
          </motion.div>

          <div className="light-card p-8 md:p-10">
            <div className="space-y-0">
              {TIMELINE_EVENTS.map((event, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ delay: i * 0.06, duration: 0.4, ease }}
                  className="flex items-start gap-5 group"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-mono text-slate-400 w-12 text-right shrink-0 pt-0.5">{event.time}</span>
                  </div>
                  <div className="flex flex-col items-center pt-1">
                    <div
                      className="w-3 h-3 rounded-full shrink-0 border-2 border-white transition-transform duration-200 group-hover:scale-125"
                      style={{ backgroundColor: EVENT_COLORS[event.type] ?? '#94A3B8', boxShadow: `0 0 8px ${EVENT_COLORS[event.type] ?? '#94A3B8'}30` }}
                    />
                    {i < TIMELINE_EVENTS.length - 1 && (
                      <div className="w-px h-8 bg-slate-200" />
                    )}
                  </div>
                  <p className="text-[14px] text-slate-500 pt-0 leading-relaxed group-hover:text-slate-700 transition-colors duration-200">
                    {event.text}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* EMERGENT STORIES / RELATIONSHIP NETWORK */}
      <section className="py-28 px-6 lg:px-12 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease }}
            className="text-center mb-14"
          >
            <span className="landing-badge-light mb-4">Social Dynamics</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 tracking-tight text-slate-900">
              Emergent Stories
            </h2>
            <p className="mt-4 text-slate-500 max-w-md mx-auto">
              Friendships, rivalries, romances, and rumors form a living social network.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease }}
            className="light-card p-8 flex flex-col items-center"
          >
            <svg
              viewBox="0 0 600 400"
              className="w-full max-w-[600px]"
              style={{ overflow: 'visible' }}
            >
              {/* Relationship lines */}
              {RELATIONSHIPS.map((rel, i) => {
                const from = networkPositions[rel.from];
                const to = networkPositions[rel.to];
                const isHighlighted = hoveredNpc === null || hoveredNpc === rel.from || hoveredNpc === rel.to;
                return (
                  <line
                    key={i}
                    x1={from.x} y1={from.y}
                    x2={to.x} y2={to.y}
                    stroke={rel.color}
                    strokeWidth={isHighlighted ? 2 : 1}
                    strokeOpacity={isHighlighted ? 0.5 : 0.1}
                    strokeDasharray={rel.type === 'rival' || rel.type === 'enemy' ? '6,4' : 'none'}
                    style={{ transition: 'all 0.3s ease' }}
                  />
                );
              })}

              {/* NPC nodes */}
              {INITIAL_NPCS.slice(0, 10).map((npc, i) => {
                const pos = networkPositions[i];
                const isHighlighted = hoveredNpc === null || hoveredNpc === i ||
                  RELATIONSHIPS.some(r => (r.from === hoveredNpc && r.to === i) || (r.to === hoveredNpc && r.from === i));
                return (
                  <g
                    key={npc.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onMouseEnter={() => setHoveredNpc(i)}
                    onMouseLeave={() => setHoveredNpc(null)}
                    style={{ cursor: 'pointer', transition: 'opacity 0.3s ease' }}
                    opacity={isHighlighted ? 1 : 0.3}
                  >
                    <circle r="24" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" />
                    <circle r="22" fill="#ffffff" />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="20"
                      style={{ pointerEvents: 'none' }}
                    >
                      {ROLE_ICON[npc.occupation] ?? '\u{1F464}'}
                    </text>
                    <text
                      y="36"
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="600"
                      fill="#334155"
                      style={{ pointerEvents: 'none' }}
                    >
                      {npc.name}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="flex flex-wrap justify-center gap-4 mt-8">
              {[
                { color: '#007AFF', label: 'Friendship', dash: false },
                { color: '#F472B6', label: 'Romance', dash: false },
                { color: '#EF4444', label: 'Rivalry', dash: true },
                { color: '#4ADE80', label: 'Trust', dash: false },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 text-xs text-slate-500">
                  <svg width="24" height="2">
                    <line
                      x1="0" y1="1" x2="24" y2="1"
                      stroke={item.color}
                      strokeWidth="2"
                      strokeDasharray={item.dash ? '4,3' : 'none'}
                    />
                  </svg>
                  {item.label}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
            Every simulation creates<br />
            <span className="bg-gradient-to-r from-[#007AFF] to-[#00D2FF] bg-clip-text text-transparent">
              a different story.
            </span>
          </h2>
          <p className="mt-5 text-lg text-slate-500">
            No two worlds evolve the same way.
          </p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-10"
          >
            <button onClick={handleStartSimulation} className="btn-primary-light text-base px-10 py-4" disabled={transitioning}>
              Start Your World
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 border-t border-slate-200/60">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-sm text-slate-400">
            <span className="font-semibold text-slate-600">LifeSim</span> — Autonomous NPC Simulator
          </span>
          <span className="text-xs text-slate-400">Built with Next.js, Three.js & AI</span>
        </div>
      </footer>
    </div>
  );
}
