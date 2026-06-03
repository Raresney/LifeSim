'use client';

import { useState, useCallback, useRef, useEffect, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { View, OrbitControls, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import {
  AvatarConfig, DEFAULT_AVATARS, randomAvatar,
  SKIN_TONES, HAIR_STYLES, HAIR_COLORS, EYE_STYLES,
  FACE_SHAPES, ACCESSORIES, CLOTHING_COLORS, CLOTHING_STYLES,
} from '../engine/avatar';
import { INITIAL_NPCS } from '../data/npcs';
import Character3D from './Character3D';
import PersonalityRadar from './PersonalityRadar';

const ROLE_ICON: Record<string, string> = {
  programmer: '💻', teacher: '📚', doctor: '🏥', artist: '🎨', chef: '🍳',
  mechanic: '🔧', freelancer: '🌐', entrepreneur: '📊', student: '🎓', unemployed: '🏠',
};

const TRAIT_COLOR: Record<string, string> = {
  ambitious: 'text-amber-600', lazy: 'text-zinc-500', social: 'text-blue-600',
  introverted: 'text-indigo-600', generous: 'text-green-600', greedy: 'text-yellow-600',
  honest: 'text-cyan-600', manipulative: 'text-red-500', optimistic: 'text-emerald-600',
  cynical: 'text-zinc-500', impulsive: 'text-orange-500', cautious: 'text-slate-500',
};

const spring = { type: 'spring' as const, stiffness: 120, damping: 15, mass: 0.8 };

interface Props {
  onStart: (avatars: Record<string, AvatarConfig>) => void;
  onBack: () => void;
}

export default function CharacterSetup({ onStart, onBack }: Props) {
  const containerRef = useRef<HTMLDivElement>(null!);
  const [avatars, setAvatars] = useState<Record<string, AvatarConfig>>({ ...DEFAULT_AVATARS });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [rollingIds, setRollingIds] = useState<Set<string>>(new Set());
  const [lockedIn, setLockedIn] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const rollIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const viewRefs = useMemo(() => {
    const m = new Map<string, { current: HTMLDivElement | null }>();
    INITIAL_NPCS.forEach(n => m.set(n.id, { current: null }));
    return m;
  }, []);

  const [, refresh] = useState(0);
  useEffect(() => { refresh(1); }, []);

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
    <div ref={containerRef} className="min-h-screen bg-[#F8FAFC] text-[#0F172A] relative overflow-hidden">
      <div className="relative z-10 flex flex-col items-center min-h-screen p-6">
        <AnimatePresence mode="wait">
          {!selectedId ? (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }} className="max-w-5xl w-full mt-4">

              {/* Header */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="text-center mb-10">
                <button onClick={onBack}
                  className="inline-flex items-center gap-2 text-sm text-[#64748B] hover:text-[#0F172A] transition-colors mb-6">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Back
                </button>
                <span className="landing-badge mb-4 block mx-auto w-fit">Character Select</span>
                <h1 className="text-4xl font-bold tracking-tight mt-4">Choose Your Cast</h1>
                <p className="text-[#64748B] mt-3 text-base">Click any character to explore their profile, or randomize everyone.</p>
              </motion.div>

              {/* Card Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-10">
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
                      className="group relative"
                    >
                      <div className={`landing-card relative flex flex-col items-center p-4 pb-3 overflow-hidden
                        ${isRolling ? 'border-[#4F8EF7]/40 scale-[1.02]' : ''}
                        ${isLocked ? 'border-[#4F8EF7]/50 shadow-[0_4px_20px_rgba(79,142,247,0.12)]' : ''}
                      `}>
                        {isRolling && (
                          <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <div className="absolute inset-x-0 h-8 bg-gradient-to-b from-[#4F8EF7]/10 to-transparent animate-scan" />
                          </div>
                        )}
                        {isLocked && <div className="absolute inset-0 pointer-events-none animate-lockin-flash" />}

                        {/* 3D Character Viewport */}
                        <div
                          ref={el => { viewRefs.get(npc.id)!.current = el; }}
                          className="w-full aspect-square rounded-2xl bg-gradient-to-b from-[#F1F5F9] to-[#E2E8F0] mb-2 relative"
                        >
                          {isLocked && <div className="absolute inset-0 rounded-2xl ring-2 ring-[#4F8EF7]/30 animate-pulse" />}
                        </div>

                        <span className={`text-sm font-semibold transition-colors ${
                          isLocked ? 'text-[#4F8EF7]' : 'text-[#0F172A] group-hover:text-[#4F8EF7]'
                        }`}>{npc.name}</span>

                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs">{ROLE_ICON[npc.occupation] ?? '👤'}</span>
                          <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider">{npc.occupation}</span>
                        </div>

                        <div className="flex gap-1 mt-2 flex-wrap justify-center">
                          {npc.personality.map(t => (
                            <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded-full bg-[#F1F5F9] ${TRAIT_COLOR[t] ?? 'text-[#64748B]'} font-medium`}>
                              {t}
                            </span>
                          ))}
                        </div>

                        {!rolling && (
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <span className="text-[10px] bg-[#F1F5F9] text-[#64748B] px-2 py-0.5 rounded-lg border border-[#E5E7EB]">view</span>
                          </div>
                        )}
                      </div>
                      <div className={`h-0.5 mx-3 mt-1.5 rounded-full transition-all duration-500 ${
                        isLocked ? 'bg-[#4F8EF7] opacity-100' :
                        isRolling ? 'bg-[#4F8EF7]/40 opacity-100 animate-pulse' :
                        'bg-[#E5E7EB] opacity-40'
                      }`} />
                    </motion.button>
                  );
                })}
              </div>

              {/* Actions */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }} className="flex justify-center items-center gap-4">
                <button onClick={randomizeAll} disabled={rolling}
                  className={`btn-secondary ${rolling ? 'opacity-50 cursor-wait' : ''}`}>
                  {rolling ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#4F8EF7]/30 border-t-[#4F8EF7] rounded-full animate-spin" />
                      Rolling...
                    </span>
                  ) : '🎲 Randomize All'}
                </button>
                <button onClick={() => onStart(avatars)} disabled={rolling}
                  className={`btn-primary ${
                    ready ? 'bg-[#4ADE80] shadow-[0_2px_12px_rgba(74,222,128,0.3)] scale-105' :
                    rolling ? 'opacity-50 cursor-wait' : ''
                  }`}>
                  {ready ? '✓ Ready — Start!' : 'Start Simulation'}
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

      {/* Shared Canvas for card 3D characters */}
      {!selectedId && (
        <Canvas
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 }}
          camera={{ position: [0, 0.3, 3], fov: 30 }}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 1.5]}
        >
          <Suspense fallback={null}>
            {INITIAL_NPCS.map(npc => {
              const ref = viewRefs.get(npc.id);
              return ref?.current ? (
                <View key={npc.id} track={ref as React.MutableRefObject<HTMLElement>}>
                  <PerspectiveCamera makeDefault position={[0, 0.3, 2.6]} fov={32} />
                  <ambientLight intensity={0.7} />
                  <directionalLight position={[2, 4, 3]} intensity={1.1} />
                  <directionalLight position={[-2, 2, -1]} intensity={0.3} color="#b8d4ff" />
                  <Character3D config={avatars[npc.id]} mood={npc.currentMood} occupation={npc.occupation} />
                </View>
              ) : null;
            })}
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}

/* ═══════════════ Detail View ═══════════════ */

function DetailView({ npc, avatar, editMode, onBack, onCustomize, onDoneEdit, onUpdateAvatar, onRandomize, onStart }: {
  npc: (typeof INITIAL_NPCS)[0]; avatar: AvatarConfig; editMode: boolean;
  onBack: () => void; onCustomize: () => void; onDoneEdit: () => void;
  onUpdateAvatar: (p: Partial<AvatarConfig>) => void; onRandomize: () => void; onStart: () => void;
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Left: 3D Preview */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, ...spring }} className="flex-1 flex flex-col">
        <button onClick={onBack}
          className="text-[#64748B] hover:text-[#0F172A] text-sm flex items-center gap-2 transition-colors mb-4 self-start px-4 py-2 rounded-xl hover:bg-[#F1F5F9]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to roster
        </button>

        <div className="landing-card rounded-3xl overflow-hidden aspect-square max-h-[480px] relative bg-gradient-to-b from-[#F1F5F9] to-[#E2E8F0]">
          <Canvas camera={{ position: [0, 0.3, 3], fov: 28 }}
            gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
            <Suspense fallback={null}>
              <ambientLight intensity={0.7} />
              <directionalLight position={[3, 5, 2]} intensity={1.2} />
              <directionalLight position={[-2, 3, -1]} intensity={0.4} color="#b8d4ff" />
              <spotLight position={[0, 6, 0]} intensity={0.3} penumbra={1} angle={0.5} />
              <Character3D config={avatar} mood={npc.currentMood} occupation={npc.occupation} />
              <ContactShadows position={[0, -1.1, 0]} opacity={0.25} blur={2} scale={3} />
              <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8}
                minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 1.8} />
            </Suspense>
          </Canvas>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-[#94A3B8] flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Drag to rotate
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button onClick={onRandomize} className="btn-secondary flex-1">🎲 Randomize</button>
          <button onClick={editMode ? onDoneEdit : onCustomize} className="btn-secondary flex-1">
            {editMode ? '✓ Done' : '✏️ Customize'}
          </button>
          <button onClick={onStart} className="btn-primary flex-1">Start →</button>
        </div>
      </motion.div>

      {/* Right: Info Panel */}
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, ...spring }} className="w-full lg:w-[380px] flex-shrink-0">
        <div className="landing-card p-6 rounded-3xl overflow-y-auto max-h-[calc(100vh-120px)]">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-[#0F172A]">{npc.name}</h2>
            <p className="text-[#64748B] text-sm mt-1">{ROLE_ICON[npc.occupation]} {npc.occupation} · {npc.age} years old</p>
          </div>

          <div className="mb-6">
            <SectionLabel>Personality</SectionLabel>
            <PersonalityRadar traits={npc.personality} />
            <div className="flex gap-1.5 justify-center mt-3">
              {npc.personality.map(t => (
                <span key={t} className={`text-[10px] px-2.5 py-1 rounded-full bg-[#F1F5F9] border border-[#E5E7EB] ${TRAIT_COLOR[t] ?? 'text-[#64748B]'} font-medium`}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <SectionLabel>Stats</SectionLabel>
            <div className="space-y-3">
              <StatBar label="Energy" value={npc.stats.energy} color="#22c55e" />
              <StatBar label="Stress" value={npc.stats.stress} color="#ef4444" />
              <StatBar label="Happiness" value={npc.stats.happiness} color="#eab308" />
              <StatBar label="Hunger" value={npc.stats.hunger} color="#f97316" />
              <StatBar label="Health" value={npc.stats.health} color="#3b82f6" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#94A3B8]">Money</span>
                <span className="text-sm text-[#0F172A] font-semibold">${npc.stats.money.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <SectionLabel>Goals</SectionLabel>
            <div className="space-y-3">
              {npc.goals.map(g => (
                <div key={g.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#475569] text-xs">{g.description}</span>
                    <span className="text-[#94A3B8] text-xs font-medium">{g.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${g.progress}%` }}
                      transition={{ duration: 1.2, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                      className="h-full rounded-full bg-gradient-to-r from-[#4F8EF7] to-[#818cf8]" />
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

/* ═══════════════ Sub-components ═══════════════ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] text-[#94A3B8] uppercase tracking-[0.12em] mb-3 font-medium">{children}</h3>;
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#94A3B8] w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }}
          transition={{ duration: 1, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
          className="h-full rounded-full" style={{ backgroundColor: color }} />
      </div>
      <span className="text-xs text-[#64748B] w-8 text-right font-medium">{value}</span>
    </div>
  );
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-[#94A3B8] uppercase tracking-[0.12em] mb-2 block font-medium">{label}</label>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ColorSwatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-9 h-9 rounded-xl border-2 transition-all duration-200 ${
      active ? 'border-[#4F8EF7] scale-110 ring-2 ring-[#4F8EF7]/20 shadow-lg' : 'border-[#E5E7EB] hover:border-[#CBD5E1] hover:scale-105'
    }`} style={{ backgroundColor: color }} />
  );
}

function TextOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-3.5 py-1.5 rounded-xl text-xs transition-all duration-200 ${
      active ? 'bg-[#4F8EF7] text-white ring-2 ring-[#4F8EF7]/20 shadow-lg shadow-blue-500/15'
             : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] hover:text-[#0F172A] border border-[#E5E7EB]'
    }`}>{label}</button>
  );
}
