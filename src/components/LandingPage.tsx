'use client';

import { useState, useRef, useMemo } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import dynamic from 'next/dynamic';
import { INITIAL_NPCS } from '../data/npcs';
import { DEFAULT_AVATARS } from '../engine/avatar';
import Avatar from './Avatar';

const HeroGlobe = dynamic(() => import('./HeroGlobe'), { ssr: false });

interface Props {
  onStartSetup: () => void;
}

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
  social: '#4F8EF7',
  rumor: '#A855F7',
  conflict: '#EF4444',
  life_event: '#FACC15',
};

const HOW_IT_WORKS = [
  {
    num: '01',
    title: 'NPCs Think',
    desc: 'Utility AI evaluates needs, goals, mood, personality and context to decide what each character does next.',
    color: '#4F8EF7',
    bg: 'bg-blue-50',
    icon: '🧠',
  },
  {
    num: '02',
    title: 'NPCs Interact',
    desc: 'Characters build friendships, rivalries and romantic relationships through natural social encounters.',
    color: '#F472B6',
    bg: 'bg-pink-50',
    icon: '💬',
  },
  {
    num: '03',
    title: 'Stories Emerge',
    desc: 'Unexpected situations create unique narratives every simulation. No two worlds evolve the same way.',
    color: '#4ADE80',
    bg: 'bg-green-50',
    icon: '✨',
  },
];

const RELATIONSHIPS = [
  { from: 0, to: 2, type: 'romantic', color: '#F472B6' },
  { from: 0, to: 1, type: 'friend', color: '#4F8EF7' },
  { from: 3, to: 2, type: 'romantic', color: '#F472B6' },
  { from: 4, to: 5, type: 'rival', color: '#EF4444' },
  { from: 1, to: 8, type: 'friend', color: '#4F8EF7' },
  { from: 6, to: 7, type: 'friend', color: '#4F8EF7' },
  { from: 3, to: 9, type: 'rival', color: '#EF4444' },
  { from: 8, to: 1, type: 'friend', color: '#4F8EF7' },
  { from: 9, to: 3, type: 'enemy', color: '#EF4444' },
  { from: 7, to: 6, type: 'friend', color: '#4ADE80' },
];

const ease = [0.22, 1, 0.36, 1] as const;

export default function LandingPage({ onStartSetup }: Props) {
  const [hoveredNpc, setHoveredNpc] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

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
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] overflow-x-hidden">

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-20">

          {/* Left: Text */}
          <motion.div
            style={{ opacity: heroOpacity }}
            className="relative z-10"
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
            >
              <span className="landing-badge">
                <span className="w-2 h-2 rounded-full bg-[#4ADE80] inline-block" />
                Autonomous Life Simulation
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease }}
              className="mt-8 text-5xl md:text-6xl lg:text-[4.25rem] font-bold leading-[1.08] tracking-tight"
            >
              10 NPCs.<br />
              One Week.<br />
              <span className="text-[#4F8EF7]">Infinite Stories.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease }}
              className="mt-6 text-lg text-[#64748B] leading-relaxed max-w-lg"
            >
              LifeSim simulates autonomous characters living their own lives in Iași, Romania.
              Every decision, relationship, memory, and rumor emerges naturally through a Utility AI engine.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-3 text-sm text-[#94A3B8] leading-relaxed max-w-lg"
            >
              No scripted stories. No predefined outcomes.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <button onClick={onStartSetup} className="btn-primary">
                Start Simulation
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <a href="#how-it-works" className="btn-secondary">
                See How It Works
              </a>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="mt-10 flex flex-wrap gap-6"
            >
              {[
                { value: '10', label: 'NPCs' },
                { value: 'Dynamic', label: 'Relationships' },
                { value: 'Living', label: 'Memory System' },
                { value: 'Zero', label: 'LLM Cost in Sim' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.08, duration: 0.4 }}
                  className="flex flex-col"
                >
                  <span className="text-sm font-semibold text-[#0F172A]">{stat.value}</span>
                  <span className="text-xs text-[#94A3B8]">{stat.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Globe */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3, ease }}
            className="relative w-full aspect-square max-w-[600px] mx-auto lg:ml-auto overflow-hidden rounded-[32px]"
          >
            <HeroGlobe />
          </motion.div>
        </div>

      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section id="how-it-works" className="py-28 px-6 lg:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease }}
            className="text-center mb-16"
          >
            <span className="landing-badge mb-4">How It Works</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 tracking-tight">
              A simulation that runs itself
            </h2>
            <p className="mt-4 text-[#64748B] max-w-lg mx-auto">
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
                <div className="landing-card p-8 h-full group cursor-default">
                  <div
                    className={`w-14 h-14 rounded-2xl ${card.bg} flex items-center justify-center text-2xl mb-5
                    group-hover:scale-110 transition-transform duration-300`}
                  >
                    {card.icon}
                  </div>
                  <div className="text-xs font-mono text-[#94A3B8] mb-2" style={{ color: card.color }}>{card.num}</div>
                  <h3 className="text-xl font-semibold mb-2">{card.title}</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">{card.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ MEET THE NPCs ═══════════════ */}
      <section className="py-24 px-6 lg:px-12 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease }}
            className="text-center mb-14"
          >
            <span className="landing-badge mb-4">Your Cast</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 tracking-tight">
              Meet the NPCs
            </h2>
            <p className="mt-4 text-[#64748B] max-w-md mx-auto">
              Ten characters with distinct personalities, goals, and stories waiting to unfold.
            </p>
          </motion.div>

          <div
            ref={carouselRef}
            className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: 'none' }}
          >
            {INITIAL_NPCS.map((npc, i) => (
              <motion.div
                key={npc.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ delay: i * 0.06, duration: 0.4, ease }}
                className="flex-shrink-0 snap-start"
              >
                <div className="landing-card w-[180px] p-5 text-center group cursor-default">
                  <div className="mx-auto w-fit mb-3 group-hover:scale-105 transition-transform duration-300">
                    <Avatar config={DEFAULT_AVATARS[npc.id]} size={72} mood={npc.currentMood} />
                  </div>
                  <h4 className="font-semibold text-[15px]">{npc.name}</h4>
                  <p className="text-xs text-[#64748B] mt-0.5 capitalize">{npc.occupation}</p>
                  <div className="flex justify-center gap-1.5 mt-3">
                    {npc.personality.map(t => (
                      <span
                        key={t}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] font-medium capitalize"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ LIVE SIMULATION PREVIEW ═══════════════ */}
      <section className="py-28 px-6 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease }}
            className="text-center mb-14"
          >
            <span className="landing-badge mb-4">Preview</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 tracking-tight">
              A day in the simulation
            </h2>
            <p className="mt-4 text-[#64748B] max-w-md mx-auto">
              Watch how a typical day unfolds as NPCs go about their autonomous lives.
            </p>
          </motion.div>

          <div className="landing-card p-8 md:p-10">
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
                    <span className="text-xs font-mono text-[#94A3B8] w-12 text-right shrink-0 pt-0.5">{event.time}</span>
                  </div>
                  <div className="flex flex-col items-center pt-1">
                    <div
                      className="w-3 h-3 rounded-full shrink-0 border-2 border-white transition-transform duration-200 group-hover:scale-125"
                      style={{ backgroundColor: EVENT_COLORS[event.type] ?? '#64748B', boxShadow: `0 0 0 3px ${EVENT_COLORS[event.type] ?? '#64748B'}15` }}
                    />
                    {i < TIMELINE_EVENTS.length - 1 && (
                      <div className="w-px h-8 bg-[#E5E7EB]" />
                    )}
                  </div>
                  <p className="text-[14px] text-[#475569] pt-0 leading-relaxed group-hover:text-[#0F172A] transition-colors duration-200">
                    {event.text}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ EMERGENT STORIES / RELATIONSHIP NETWORK ═══════════════ */}
      <section className="py-28 px-6 lg:px-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease }}
            className="text-center mb-14"
          >
            <span className="landing-badge mb-4">Social Dynamics</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 tracking-tight">
              Emergent Stories
            </h2>
            <p className="mt-4 text-[#64748B] max-w-md mx-auto">
              Friendships, rivalries, romances, and rumors form a living social network.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease }}
            className="landing-card p-8 flex flex-col items-center"
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
                    <circle r="24" fill="white" stroke="#E5E7EB" strokeWidth="2" />
                    <circle r="22" fill="#F8FAFC" />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="20"
                      style={{ pointerEvents: 'none' }}
                    >
                      {npc.occupation === 'programmer' ? '💻' :
                       npc.occupation === 'teacher' ? '📚' :
                       npc.occupation === 'doctor' ? '🏥' :
                       npc.occupation === 'entrepreneur' ? '📊' :
                       npc.occupation === 'freelancer' ? '🌐' :
                       npc.occupation === 'chef' ? '🍳' :
                       npc.occupation === 'artist' ? '🎨' :
                       npc.occupation === 'student' ? '🎓' :
                       npc.occupation === 'mechanic' ? '🔧' : '👤'}
                    </text>
                    <text
                      y="36"
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="600"
                      fill="#0F172A"
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
                { color: '#4F8EF7', label: 'Friendship', dash: false },
                { color: '#F472B6', label: 'Romance', dash: false },
                { color: '#EF4444', label: 'Rivalry', dash: true },
                { color: '#4ADE80', label: 'Trust', dash: false },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 text-xs text-[#64748B]">
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

      {/* ═══════════════ FINAL CTA ═══════════════ */}
      <section className="py-32 px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
            Every simulation creates<br />
            <span className="text-[#4F8EF7]">a different story.</span>
          </h2>
          <p className="mt-5 text-lg text-[#64748B]">
            No two worlds evolve the same way.
          </p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-10"
          >
            <button onClick={onStartSetup} className="btn-primary text-base px-10 py-4">
              Start Your World
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="py-8 px-6 border-t border-[#E5E7EB]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-sm text-[#94A3B8]">
            <span className="font-semibold text-[#0F172A]">LifeSim</span> — Autonomous NPC Simulator
          </span>
          <span className="text-xs text-[#CBD5E1]">Built with Next.js, Three.js & AI</span>
        </div>
      </footer>
    </div>
  );
}
