'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AvatarConfig, DEFAULT_AVATARS, randomAvatar,
  SKIN_TONES, HAIR_STYLES, HAIR_COLORS, EYE_STYLES,
  FACE_SHAPES, ACCESSORIES, CLOTHING_COLORS, CLOTHING_STYLES,
} from '../engine/avatar';
import { INITIAL_NPCS } from '../data/npcs';
import Avatar from './Avatar';
import PersonalityRadar from './PersonalityRadar';

const ROLE_ICON: Record<string, string> = {
  programmer: '\u{1F4BB}', teacher: '\u{1F4DA}', doctor: '\u{1F3E5}', artist: '\u{1F3A8}', chef: '\u{1F373}',
  mechanic: '\u{1F527}', freelancer: '\u{1F310}', entrepreneur: '\u{1F4CA}', student: '\u{1F393}', unemployed: '\u{1F3E0}',
};

const TRAIT_COLOR: Record<string, string> = {
  ambitious: 'text-amber-600', lazy: 'text-zinc-500', social: 'text-blue-600',
  introverted: 'text-indigo-500', generous: 'text-green-600', greedy: 'text-yellow-600',
  honest: 'text-cyan-600', manipulative: 'text-red-500', optimistic: 'text-emerald-600',
  cynical: 'text-zinc-500', impulsive: 'text-orange-500', cautious: 'text-slate-500',
};

const spring = { type: 'spring' as const, stiffness: 120, damping: 15, mass: 0.8 };

interface Props {
  onStart: (avatars: Record<string, AvatarConfig>) => void;
  onBack: () => void;
}

export default function CharacterSetup({ onStart, onBack }: Props) {
  const [avatars, setAvatars] = useState<Record<string, AvatarConfig>>({ ...DEFAULT_AVATARS });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [rollingIds, setRollingIds] = useState<Set<string>>(new Set());
  const [lockedIn, setLockedIn] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const rollIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const updateAvatar = (id: string, patch: Partial<AvatarConfig>) => {
    setAvatars(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const randomizeAll = useCallback(() => {
    if (rolling) return;
    setRolling(true); setLockedIn(new Set()); setReady(false);
    const allIds = INITIAL_NPCS.map(n => n.id);
    setRollingIds(new Set(allIds));
    for (const id of allIds) {
      const iv = setInterval(() => setAvatars(prev => ({ ...prev, [id]: randomAvatar() })), 70);
      rollIntervals.current.set(id, iv);
    }
    allIds.forEach((id, i) => {
      setTimeout(() => {
        const iv = rollIntervals.current.get(id);
        if (iv) { clearInterval(iv); rollIntervals.current.delete(id); }
        setAvatars(prev => ({ ...prev, [id]: randomAvatar() }));
        setRollingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        setLockedIn(prev => new Set(prev).add(id));
      }, 600 + i * 200);
    });
    setTimeout(() => {
      setRolling(false); setRollingIds(new Set()); setReady(true);
      setTimeout(() => setReady(false), 1500);
    }, 600 + allIds.length * 200 + 100);
  }, [rolling]);

  useEffect(() => () => { for (const iv of rollIntervals.current.values()) clearInterval(iv); }, []);

  const selectedNPC = selectedId ? INITIAL_NPCS.find(n => n.id === selectedId) : null;

  return (
    <div className="h-screen char-select-bg relative overflow-hidden">
      {/* Floating ambient particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[15%] left-[8%] w-[350px] h-[350px] rounded-full bg-blue-400/[0.06] blur-[100px] animate-float-particle" />
        <div className="absolute bottom-[20%] right-[5%] w-[280px] h-[280px] rounded-full bg-purple-400/[0.05] blur-[90px] animate-float-particle" style={{ animationDelay: '-7s' }} />
        <div className="absolute top-[60%] left-[50%] w-[200px] h-[200px] rounded-full bg-cyan-400/[0.04] blur-[80px] animate-float-particle" style={{ animationDelay: '-12s' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center h-full px-6 py-3">
        <AnimatePresence mode="wait">
          {!selectedId ? (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }} className="max-w-6xl w-full flex flex-col h-full">

              {/* Header */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <button onClick={onBack}
                    className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors group">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:-translate-x-0.5 transition-transform">
                      <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Back
                  </button>
                  <span className="landing-badge-light">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse" />
                    Character Select
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">
                  Choose Your <span className="bg-gradient-to-r from-[#007AFF] via-[#00D2FF] to-[#A855F7] bg-clip-text text-transparent">Cast</span>
                </h1>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-500">Cast Selection</span>
                  <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-lg border border-slate-200/60">
                    <div className="flex gap-0.5">
                      {INITIAL_NPCS.map((_, i) => (
                        <div key={i} className="w-3 h-1.5 rounded-full bg-gradient-to-r from-[#007AFF] to-[#00D2FF]" />
                      ))}
                    </div>
                    <span className="text-xs font-mono text-slate-500 ml-1">{INITIAL_NPCS.length}/{INITIAL_NPCS.length} NPCs</span>
                  </div>
                </div>
              </motion.div>

              <p className="text-slate-500 text-sm text-center mb-4">
                Click any character to explore their profile, or randomize everyone.
              </p>

              {/* Card Grid */}
              <div className="grid grid-cols-5 grid-rows-2 gap-3 flex-1 min-h-0 mb-4">
                {INITIAL_NPCS.map((npc, index) => {
                  const isRolling = rollingIds.has(npc.id);
                  const isLocked = lockedIn.has(npc.id);
                  return (
                    <motion.button key={npc.id}
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04, ...spring }}
                      whileHover={!rolling ? { y: -4, scale: 1.02, transition: { type: 'spring', stiffness: 200, damping: 14 } } : undefined}
                      onClick={() => !rolling && setSelectedId(npc.id)}
                      disabled={rolling}
                      className="group relative h-full"
                    >
                      <div className={`glass-card-premium relative flex flex-col items-center h-full p-2 pb-2
                        ${isRolling ? 'border-blue-400/40 scale-[1.02]' : ''}
                        ${isLocked ? 'card-locked' : ''}
                      `}>
                        {isRolling && (
                          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[22px]">
                            <div className="absolute inset-x-0 h-8 bg-gradient-to-b from-blue-400/12 to-transparent animate-scan" />
                          </div>
                        )}
                        {isLocked && <div className="absolute inset-0 pointer-events-none animate-lockin-flash rounded-[22px]" />}

                        {/* Avatar — 2D SVG, centered and properly framed */}
                        <div
                          className="w-full flex-1 rounded-xl relative overflow-hidden min-h-0 flex items-center justify-center"
                          style={{ background: 'linear-gradient(180deg, rgba(241,245,249,0.8) 0%, rgba(226,232,240,0.5) 100%)' }}
                        >
                          {/* Soft glow behind avatar */}
                          <div className="absolute w-24 h-24 rounded-full bg-blue-400/0 blur-xl group-hover:bg-blue-400/12 transition-all duration-500" />
                          <div className={`relative transition-transform duration-500 ease-out group-hover:scale-110 ${isRolling ? 'animate-pulse' : ''}`}>
                            <Avatar config={avatars[npc.id]} size={140} mood={npc.currentMood} />
                          </div>
                          {isLocked && <div className="absolute inset-0 rounded-xl ring-2 ring-blue-500/25 animate-pulse" />}
                        </div>

                        {/* Name & info */}
                        <div className="mt-1.5 text-center w-full">
                          <span className={`text-sm font-semibold transition-colors duration-300 block ${
                            isLocked ? 'text-[#007AFF]' : 'text-slate-700 group-hover:text-[#007AFF]'
                          }`}>{npc.name}</span>

                          <div className="flex items-center gap-1 justify-center mt-0.5">
                            <span className="text-[10px]">{ROLE_ICON[npc.occupation] ?? '\u{1F464}'}</span>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider">{npc.occupation}</span>
                          </div>

                          <div className="flex gap-1 mt-1 flex-wrap justify-center">
                            {npc.personality.map(t => (
                              <span key={t} className={`text-[8px] px-1.5 py-0.5 rounded-full bg-slate-100/80 border border-slate-200/60 ${TRAIT_COLOR[t] ?? 'text-slate-500'} font-medium`}>
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Actions */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }} className="flex justify-center items-center gap-4 pb-2">
                <button onClick={randomizeAll} disabled={rolling}
                  className={`btn-secondary-light ${rolling ? 'opacity-50 cursor-wait' : ''}`}>
                  {rolling ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                      Rolling...
                    </span>
                  ) : '\u{1F3B2} Randomize All'}
                </button>
                <button onClick={() => onStart(avatars)} disabled={rolling}
                  className={`btn-primary-light ${
                    ready ? '!bg-gradient-to-r !from-emerald-500 !to-green-500 !shadow-[0_2px_20px_rgba(74,222,128,0.35)] scale-105' :
                    rolling ? 'opacity-50 cursor-wait' : ''
                  }`}>
                  {ready ? '\u{2713} Ready \u{2014} Start!' : 'Start Simulation'}
                  {!ready && !rolling && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </motion.div>
            </motion.div>
          ) : selectedNPC ? (
            <motion.div key="detail" initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }} className="max-w-5xl w-full mt-4">
              <DetailView
                npc={selectedNPC} avatar={avatars[selectedId]} editMode={editMode}
                onBack={() => { setSelectedId(null); setEditMode(false); }}
                onCustomize={() => setEditMode(true)} onDoneEdit={() => setEditMode(false)}
                onUpdateAvatar={(patch) => updateAvatar(selectedId, patch)}
                onRandomize={() => updateAvatar(selectedId, randomAvatar())}
                onStart={() => onStart(avatars)}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* Detail View */

function DetailView({ npc, avatar, editMode, onBack, onCustomize, onDoneEdit, onUpdateAvatar, onRandomize, onStart }: {
  npc: (typeof INITIAL_NPCS)[0]; avatar: AvatarConfig; editMode: boolean;
  onBack: () => void; onCustomize: () => void; onDoneEdit: () => void;
  onUpdateAvatar: (p: Partial<AvatarConfig>) => void; onRandomize: () => void; onStart: () => void;
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Left: Avatar Preview */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, ...spring }} className="flex-1 flex flex-col">
        <button onClick={onBack}
          className="text-slate-500 hover:text-slate-800 text-sm flex items-center gap-2 transition-colors mb-4 self-start px-4 py-2 rounded-xl hover:bg-slate-100/60 group">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:-translate-x-0.5 transition-transform">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to roster
        </button>

        <div className="glass-card-premium rounded-[22px] overflow-hidden aspect-square max-h-[480px] relative flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(241,245,249,0.95) 0%, rgba(226,232,240,0.7) 50%, rgba(241,245,249,0.98) 100%)' }}>
          {/* Decorative glow */}
          <div className="absolute w-48 h-48 rounded-full bg-blue-400/8 blur-3xl" />
          <div className="relative">
            <Avatar config={avatar} size={320} mood={npc.currentMood} />
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button onClick={onRandomize} className="btn-secondary-light flex-1">{'\u{1F3B2}'} Randomize</button>
          <button onClick={editMode ? onDoneEdit : onCustomize} className="btn-secondary-light flex-1">
            {editMode ? '\u{2713} Done' : '\u{270F}\u{FE0F} Customize'}
          </button>
          <button onClick={onStart} className="btn-primary-light flex-1">Start {'\u{2192}'}</button>
        </div>
      </motion.div>

      {/* Right: Info Panel */}
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, ...spring }} className="w-full lg:w-[380px] flex-shrink-0">
        <div className="glass-card-premium p-6 rounded-[22px] overflow-y-auto max-h-[calc(100vh-120px)]">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">{npc.name}</h2>
            <p className="text-slate-500 text-sm mt-1">{ROLE_ICON[npc.occupation]} {npc.occupation} &middot; {npc.age} years old</p>
          </div>

          <div className="mb-6">
            <SectionLabel>Personality</SectionLabel>
            <PersonalityRadar traits={npc.personality} />
            <div className="flex gap-1.5 justify-center mt-3">
              {npc.personality.map(t => (
                <span key={t} className={`text-[10px] px-2.5 py-1 rounded-full bg-slate-100/80 border border-slate-200/60 ${TRAIT_COLOR[t] ?? 'text-slate-500'} font-medium`}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <SectionLabel>Stats</SectionLabel>
            <div className="space-y-3">
              <StatBarLight label="Energy" value={npc.stats.energy} color="#22c55e" />
              <StatBarLight label="Stress" value={npc.stats.stress} color="#ef4444" />
              <StatBarLight label="Happiness" value={npc.stats.happiness} color="#eab308" />
              <StatBarLight label="Hunger" value={npc.stats.hunger} color="#f97316" />
              <StatBarLight label="Health" value={npc.stats.health} color="#3b82f6" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Money</span>
                <span className="text-sm text-slate-800 font-semibold">${npc.stats.money.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <SectionLabel>Goals</SectionLabel>
            <div className="space-y-3">
              {npc.goals.map(g => (
                <div key={g.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 text-xs">{g.description}</span>
                    <span className="text-slate-400 text-xs font-medium">{g.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${g.progress}%` }}
                      transition={{ duration: 1.2, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                      className="h-full rounded-full bg-gradient-to-r from-[#007AFF] to-[#A855F7]" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {editMode && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <SectionLabel>Customize Avatar</SectionLabel>
                <div className="space-y-4">
                  <OptionRow label="Skin Tone">{SKIN_TONES.map(t => <ColorSwatch key={t} color={t} active={avatar.skinTone === t} onClick={() => onUpdateAvatar({ skinTone: t })} />)}</OptionRow>
                  <OptionRow label="Hair Style">{HAIR_STYLES.map(s => <TextOption key={s} label={s} active={avatar.hairStyle === s} onClick={() => onUpdateAvatar({ hairStyle: s })} />)}</OptionRow>
                  <OptionRow label="Hair Color">{HAIR_COLORS.map(c => <ColorSwatch key={c} color={c} active={avatar.hairColor === c} onClick={() => onUpdateAvatar({ hairColor: c })} />)}</OptionRow>
                  <OptionRow label="Eyes">{EYE_STYLES.map(s => <TextOption key={s} label={s} active={avatar.eyeStyle === s} onClick={() => onUpdateAvatar({ eyeStyle: s })} />)}</OptionRow>
                  <OptionRow label="Face Shape">{FACE_SHAPES.map(s => <TextOption key={s} label={s} active={avatar.faceShape === s} onClick={() => onUpdateAvatar({ faceShape: s })} />)}</OptionRow>
                  <OptionRow label="Accessory">{ACCESSORIES.map(a => <TextOption key={a} label={a} active={avatar.accessory === a} onClick={() => onUpdateAvatar({ accessory: a })} />)}</OptionRow>
                  <OptionRow label="Clothing">{CLOTHING_STYLES.map(s => <TextOption key={s} label={s} active={avatar.clothingStyle === s} onClick={() => onUpdateAvatar({ clothingStyle: s })} />)}</OptionRow>
                  <OptionRow label="Clothing Color">{CLOTHING_COLORS.map(c => <ColorSwatch key={c} color={c} active={avatar.clothingColor === c} onClick={() => onUpdateAvatar({ clothingColor: c })} />)}</OptionRow>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

/* Sub-components */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] text-slate-400 uppercase tracking-[0.12em] mb-3 font-medium">{children}</h3>;
}

function StatBarLight({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }}
          transition={{ duration: 1, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
          className="h-full rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}25` }} />
      </div>
      <span className="text-xs text-slate-600 w-8 text-right font-medium font-mono">{value}</span>
    </div>
  );
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-slate-500 uppercase tracking-[0.12em] mb-2 block font-medium">{label}</label>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ColorSwatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-9 h-9 rounded-xl border-2 transition-all duration-200 ${
      active ? 'border-[#007AFF] scale-110 ring-2 ring-blue-400/20 shadow-lg shadow-blue-500/15' : 'border-slate-200 hover:border-slate-300 hover:scale-105'
    }`} style={{ backgroundColor: color }} />
  );
}

function TextOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-3.5 py-1.5 rounded-xl text-xs transition-all duration-200 ${
      active ? 'bg-[#007AFF] text-white ring-2 ring-blue-400/20 shadow-lg shadow-blue-500/15'
             : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-800 border border-slate-200/60'
    }`}>{label}</button>
  );
}
