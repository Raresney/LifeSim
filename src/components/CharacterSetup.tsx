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

const TRAIT_COLOR: Record<string, string> = {
  ambitious: 'text-amber-600', lazy: 'text-zinc-500', social: 'text-blue-600',
  introverted: 'text-indigo-600', generous: 'text-green-600', greedy: 'text-yellow-600',
  honest: 'text-cyan-600', manipulative: 'text-red-500', optimistic: 'text-emerald-600',
  cynical: 'text-zinc-500', impulsive: 'text-orange-500', cautious: 'text-slate-500',
};

const ROLE_ICON: Record<string, string> = {
  programmer: '💻', teacher: '📚', doctor: '🏥', artist: '🎨', chef: '🍳',
  mechanic: '🔧', freelancer: '🌐', entrepreneur: '📊', student: '🎓', unemployed: '🏠',
};

const ease = [0.22, 1, 0.36, 1] as const;

interface Props {
  onStart: (avatars: Record<string, AvatarConfig>) => void;
  onBack: () => void;
}

export default function CharacterSetup({ onStart, onBack }: Props) {
  const [avatars, setAvatars] = useState<Record<string, AvatarConfig>>({ ...DEFAULT_AVATARS });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [rollingIds, setRollingIds] = useState<Set<string>>(new Set());
  const [lockedIn, setLockedIn] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const rollIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const updateAvatar = (npcId: string, patch: Partial<AvatarConfig>) => {
    setAvatars(prev => ({ ...prev, [npcId]: { ...prev[npcId], ...patch } }));
  };

  const randomizeAll = useCallback(() => {
    if (rolling) return;
    setRolling(true);
    setLockedIn(new Set());
    setReady(false);

    const allIds = INITIAL_NPCS.map(n => n.id);
    setRollingIds(new Set(allIds));

    for (const id of allIds) {
      const interval = setInterval(() => {
        setAvatars(prev => ({ ...prev, [id]: randomAvatar() }));
      }, 70);
      rollIntervals.current.set(id, interval);
    }

    allIds.forEach((id, index) => {
      const delay = 600 + index * 200;
      setTimeout(() => {
        const interval = rollIntervals.current.get(id);
        if (interval) {
          clearInterval(interval);
          rollIntervals.current.delete(id);
        }
        setAvatars(prev => ({ ...prev, [id]: randomAvatar() }));
        setRollingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setLockedIn(prev => new Set(prev).add(id));
      }, delay);
    });

    setTimeout(() => {
      setRolling(false);
      setRollingIds(new Set());
      setReady(true);
      setTimeout(() => setReady(false), 1500);
    }, 600 + allIds.length * 200 + 100);
  }, [rolling]);

  useEffect(() => {
    return () => {
      for (const interval of rollIntervals.current.values()) {
        clearInterval(interval);
      }
    };
  }, []);

  const editingNPC = editingId ? INITIAL_NPCS.find(n => n.id === editingId) : null;
  const editingAvatar = editingId ? avatars[editingId] : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col items-center justify-center p-6 relative overflow-hidden">

      <AnimatePresence mode="wait">
        {!editingId ? (
          <motion.div
            key="roster"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-5xl w-full"
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
              className="text-center mb-10"
            >
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 text-sm text-[#64748B] hover:text-[#0F172A] transition-colors mb-6"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back
              </button>
              <span className="landing-badge mb-4 block mx-auto w-fit">Character Select</span>
              <h1 className="text-4xl font-bold tracking-tight mt-4">
                Customize Your Cast
              </h1>
              <p className="text-[#64748B] mt-3 text-base">Click any character to edit their appearance, or randomize everyone.</p>
            </motion.div>

            {/* NPC Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-10">
              {INITIAL_NPCS.map((npc, index) => {
                const isRolling = rollingIds.has(npc.id);
                const isLocked = lockedIn.has(npc.id);

                return (
                  <motion.button
                    key={npc.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04, duration: 0.4, ease }}
                    onClick={() => !rolling && setEditingId(npc.id)}
                    disabled={rolling}
                    className="group relative"
                  >
                    <div className={`
                      landing-card relative flex flex-col items-center p-5 pb-4 overflow-hidden
                      ${isRolling ? 'border-[#4F8EF7]/40 scale-[1.02]' : ''}
                      ${isLocked ? 'border-[#4F8EF7]/50 shadow-[0_4px_20px_rgba(79,142,247,0.12)]' : ''}
                    `}>
                      {isRolling && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                          <div className="absolute inset-x-0 h-8 bg-gradient-to-b from-[#4F8EF7]/10 to-transparent animate-scan" />
                        </div>
                      )}

                      {isLocked && (
                        <div className="absolute inset-0 pointer-events-none animate-lockin-flash" />
                      )}

                      <div className={`relative rounded-2xl p-2 mb-3 transition-all duration-300 ${isLocked ? 'bg-blue-50' : 'bg-[#F1F5F9] group-hover:bg-blue-50/50'}`}>
                        {isLocked && (
                          <div className="absolute inset-0 rounded-2xl ring-2 ring-[#4F8EF7]/30 animate-pulse" />
                        )}
                        <Avatar config={avatars[npc.id]} size={72} mood={npc.currentMood} />
                      </div>

                      <span className={`text-sm font-semibold transition-colors ${isLocked ? 'text-[#4F8EF7]' : 'text-[#0F172A] group-hover:text-[#4F8EF7]'}`}>
                        {npc.name}
                      </span>

                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs">{ROLE_ICON[npc.occupation] ?? '👤'}</span>
                        <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider">{npc.occupation}</span>
                      </div>

                      <div className="flex gap-1 mt-2.5 flex-wrap justify-center">
                        {npc.personality.map(t => (
                          <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded-full bg-[#F1F5F9] ${TRAIT_COLOR[t] ?? 'text-[#64748B]'} font-medium`}>
                            {t}
                          </span>
                        ))}
                      </div>

                      {!rolling && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <span className="text-[10px] bg-[#F1F5F9] text-[#64748B] px-2 py-0.5 rounded-lg border border-[#E5E7EB]">edit</span>
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
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="flex justify-center items-center gap-4"
            >
              <button
                onClick={randomizeAll}
                disabled={rolling}
                className={`btn-secondary ${rolling ? 'opacity-50 cursor-wait' : ''}`}
              >
                {rolling ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#4F8EF7]/30 border-t-[#4F8EF7] rounded-full animate-spin" />
                    Rolling...
                  </span>
                ) : (
                  '🎲 Randomize All'
                )}
              </button>

              <button
                onClick={() => onStart(avatars)}
                disabled={rolling}
                className={`btn-primary ${
                  ready ? 'bg-[#4ADE80] shadow-[0_2px_12px_rgba(74,222,128,0.3)] scale-105' :
                  rolling ? 'opacity-50 cursor-wait' : ''
                }`}
              >
                {ready ? '✓ Ready — Start!' : 'Start Simulation'}
                {!ready && !rolling && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </motion.div>
          </motion.div>
        ) : editingNPC && editingAvatar ? (
          <motion.div
            key="editor"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="max-w-4xl w-full"
          >
            <div className="landing-card p-8">
              <div className="flex items-center justify-between mb-8">
                <button
                  onClick={() => setEditingId(null)}
                  className="text-[#64748B] hover:text-[#0F172A] text-sm flex items-center gap-2 transition-colors px-4 py-2 rounded-xl hover:bg-[#F1F5F9]"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Back to roster
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{ROLE_ICON[editingNPC.occupation]}</span>
                  <h2 className="text-xl font-bold">{editingNPC.name}</h2>
                </div>
                <button
                  onClick={() => updateAvatar(editingId, randomAvatar())}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  🎲 Randomize
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-10">
                <motion.div layout className="flex flex-col items-center gap-4">
                  <div className="bg-[#F1F5F9] rounded-3xl p-8 border border-[#E5E7EB]">
                    <Avatar config={editingAvatar} size={180} mood={editingNPC.currentMood} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-[#475569] font-medium">{editingNPC.occupation} · {editingNPC.age}y</p>
                    <div className="flex gap-1.5 justify-center mt-2">
                      {editingNPC.personality.map(t => (
                        <span key={t} className={`text-[10px] px-2.5 py-0.5 rounded-full bg-[#F1F5F9] border border-[#E5E7EB] ${TRAIT_COLOR[t] ?? 'text-[#64748B]'} font-medium`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>

                <div className="flex-1 space-y-5 overflow-y-auto max-h-[60vh] pr-2">
                  <OptionRow label="Skin Tone">
                    {SKIN_TONES.map(t => (
                      <ColorSwatch key={t} color={t} active={editingAvatar.skinTone === t}
                        onClick={() => updateAvatar(editingId, { skinTone: t })} />
                    ))}
                  </OptionRow>
                  <OptionRow label="Hair Style">
                    {HAIR_STYLES.map(s => (
                      <TextOption key={s} label={s} active={editingAvatar.hairStyle === s}
                        onClick={() => updateAvatar(editingId, { hairStyle: s })} />
                    ))}
                  </OptionRow>
                  <OptionRow label="Hair Color">
                    {HAIR_COLORS.map(c => (
                      <ColorSwatch key={c} color={c} active={editingAvatar.hairColor === c}
                        onClick={() => updateAvatar(editingId, { hairColor: c })} />
                    ))}
                  </OptionRow>
                  <OptionRow label="Eyes">
                    {EYE_STYLES.map(s => (
                      <TextOption key={s} label={s} active={editingAvatar.eyeStyle === s}
                        onClick={() => updateAvatar(editingId, { eyeStyle: s })} />
                    ))}
                  </OptionRow>
                  <OptionRow label="Face Shape">
                    {FACE_SHAPES.map(s => (
                      <TextOption key={s} label={s} active={editingAvatar.faceShape === s}
                        onClick={() => updateAvatar(editingId, { faceShape: s })} />
                    ))}
                  </OptionRow>
                  <OptionRow label="Accessory">
                    {ACCESSORIES.map(a => (
                      <TextOption key={a} label={a} active={editingAvatar.accessory === a}
                        onClick={() => updateAvatar(editingId, { accessory: a })} />
                    ))}
                  </OptionRow>
                  <OptionRow label="Clothing Style">
                    {CLOTHING_STYLES.map(s => (
                      <TextOption key={s} label={s} active={editingAvatar.clothingStyle === s}
                        onClick={() => updateAvatar(editingId, { clothingStyle: s })} />
                    ))}
                  </OptionRow>
                  <OptionRow label="Clothing Color">
                    {CLOTHING_COLORS.map(c => (
                      <ColorSwatch key={c} color={c} active={editingAvatar.clothingColor === c}
                        onClick={() => updateAvatar(editingId, { clothingColor: c })} />
                    ))}
                  </OptionRow>
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <button onClick={() => setEditingId(null)} className="btn-primary px-8">
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
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
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded-xl border-2 transition-all duration-200 ${
        active ? 'border-[#4F8EF7] scale-110 ring-2 ring-[#4F8EF7]/20 shadow-lg' : 'border-[#E5E7EB] hover:border-[#CBD5E1] hover:scale-105'
      }`}
      style={{ backgroundColor: color }}
    />
  );
}

function TextOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-xl text-xs transition-all duration-200 ${
        active
          ? 'bg-[#4F8EF7] text-white ring-2 ring-[#4F8EF7]/20 shadow-lg shadow-blue-500/15'
          : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] hover:text-[#0F172A] border border-[#E5E7EB]'
      }`}
    >
      {label}
    </button>
  );
}
