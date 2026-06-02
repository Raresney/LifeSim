'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  AvatarConfig, DEFAULT_AVATARS, randomAvatar,
  SKIN_TONES, HAIR_STYLES, HAIR_COLORS, EYE_STYLES,
  FACE_SHAPES, ACCESSORIES, CLOTHING_COLORS, CLOTHING_STYLES,
} from '../engine/avatar';
import { INITIAL_NPCS } from '../data/npcs';
import Avatar from './Avatar';

// ── Personality trait color mapping ──
const TRAIT_COLOR: Record<string, string> = {
  ambitious: 'text-amber-400', lazy: 'text-zinc-400', social: 'text-blue-400',
  introverted: 'text-indigo-400', generous: 'text-green-400', greedy: 'text-yellow-500',
  honest: 'text-cyan-400', manipulative: 'text-red-400', optimistic: 'text-emerald-400',
  cynical: 'text-zinc-500', impulsive: 'text-orange-400', cautious: 'text-slate-400',
};

const ROLE_ICON: Record<string, string> = {
  programmer: '💻', teacher: '📚', doctor: '🏥', artist: '🎨', chef: '🍳',
  mechanic: '🔧', freelancer: '🌐', entrepreneur: '📊', student: '🎓', unemployed: '🏠',
};

interface Props {
  onStart: (avatars: Record<string, AvatarConfig>) => void;
}

export default function CharacterSetup({ onStart }: Props) {
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

  // LoL-style rolling randomize: each card spins through random avatars
  // then locks in one-by-one with a stagger
  const randomizeAll = useCallback(() => {
    if (rolling) return;
    setRolling(true);
    setLockedIn(new Set());
    setReady(false);

    const allIds = INITIAL_NPCS.map(n => n.id);
    setRollingIds(new Set(allIds));

    // Start rapid cycling for all NPCs
    for (const id of allIds) {
      const interval = setInterval(() => {
        setAvatars(prev => ({ ...prev, [id]: randomAvatar() }));
      }, 70); // fast cycling
      rollIntervals.current.set(id, interval);
    }

    // Lock in one-by-one with stagger (LoL champion select style)
    allIds.forEach((id, index) => {
      const delay = 600 + index * 200; // stagger: 600ms, 800ms, 1000ms...
      setTimeout(() => {
        // Clear the rapid interval
        const interval = rollIntervals.current.get(id);
        if (interval) {
          clearInterval(interval);
          rollIntervals.current.delete(id);
        }
        // Set final avatar
        setAvatars(prev => ({ ...prev, [id]: randomAvatar() }));
        // Mark as locked in (triggers the lock-in animation)
        setRollingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setLockedIn(prev => new Set(prev).add(id));
      }, delay);
    });

    // All done
    setTimeout(() => {
      setRolling(false);
      setRollingIds(new Set());
      // Flash "READY" state briefly
      setReady(true);
      setTimeout(() => setReady(false), 1500);
    }, 600 + allIds.length * 200 + 100);
  }, [rolling]);

  // Cleanup intervals on unmount
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl w-full relative z-10">
        {!editingId ? (
          <>
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-blue-500/50" />
                <span className="text-[10px] text-blue-400 uppercase tracking-[0.3em] font-medium">Autonomous NPC Simulator</span>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-blue-500/50" />
              </div>
              <h1 className="text-4xl font-bold mb-2 tracking-tight">
                Life<span className="text-blue-400">Sim</span>
              </h1>
              <p className="text-zinc-500 text-sm">Select and customize your characters</p>
            </div>

            {/* NPC Grid — LoL champion select style */}
            <div className="grid grid-cols-5 gap-3 mb-8">
              {INITIAL_NPCS.map((npc, index) => {
                const isRolling = rollingIds.has(npc.id);
                const isLocked = lockedIn.has(npc.id);

                return (
                  <button
                    key={npc.id}
                    onClick={() => !rolling && setEditingId(npc.id)}
                    disabled={rolling}
                    className="group relative"
                  >
                    {/* Card */}
                    <div className={`
                      relative flex flex-col items-center p-4 pb-3 rounded-xl border transition-all duration-300 overflow-hidden
                      ${isRolling
                        ? 'border-blue-500/50 bg-zinc-900/80 scale-[1.02]'
                        : isLocked
                        ? 'border-blue-400/80 bg-zinc-900 scale-100'
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 hover:bg-zinc-900 hover:scale-[1.03]'
                      }
                    `}>
                      {/* Rolling scan line effect */}
                      {isRolling && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                          <div className="absolute inset-x-0 h-8 bg-gradient-to-b from-blue-400/15 to-transparent animate-scan" />
                        </div>
                      )}

                      {/* Lock-in flash */}
                      {isLocked && (
                        <div className="absolute inset-0 pointer-events-none animate-lockin-flash" />
                      )}

                      {/* Avatar with glow ring when locked */}
                      <div className={`
                        relative rounded-xl p-2 mb-2 transition-all duration-300
                        ${isLocked ? 'bg-zinc-800/80' : 'bg-zinc-800/40'}
                      `}>
                        {isLocked && (
                          <div className="absolute inset-0 rounded-xl ring-2 ring-blue-400/40 animate-pulse" />
                        )}
                        <Avatar config={avatars[npc.id]} size={80} mood={npc.currentMood} />
                      </div>

                      {/* Name + role */}
                      <span className={`
                        text-sm font-semibold transition-colors duration-300
                        ${isLocked ? 'text-blue-300' : 'text-zinc-200 group-hover:text-white'}
                      `}>
                        {npc.name}
                      </span>

                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs">{ROLE_ICON[npc.occupation] ?? '👤'}</span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                          {npc.occupation}
                        </span>
                      </div>

                      {/* Personality tags */}
                      <div className="flex gap-1 mt-2">
                        {npc.personality.map(t => (
                          <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded bg-zinc-800/80 ${TRAIT_COLOR[t] ?? 'text-zinc-400'}`}>
                            {t}
                          </span>
                        ))}
                      </div>

                      {/* Hover edit hint */}
                      {!rolling && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">edit</span>
                        </div>
                      )}
                    </div>

                    {/* Lock-in indicator bar */}
                    <div className={`
                      h-0.5 mx-2 mt-1 rounded-full transition-all duration-500
                      ${isLocked
                        ? 'bg-blue-400 opacity-100'
                        : isRolling
                        ? 'bg-blue-500/40 opacity-100 animate-pulse'
                        : 'bg-zinc-800 opacity-40'
                      }
                    `} />
                  </button>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex justify-center items-center gap-4">
              <button
                onClick={randomizeAll}
                disabled={rolling}
                className={`
                  relative px-6 py-2.5 rounded-xl text-sm font-medium transition-all overflow-hidden
                  ${rolling
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 cursor-wait'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500'
                  }
                `}
              >
                {rolling ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-blue-300/30 border-t-blue-300 rounded-full animate-spin" />
                    Rolling...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    🎲 Randomize All
                  </span>
                )}
              </button>

              <button
                onClick={() => onStart(avatars)}
                disabled={rolling}
                className={`
                  relative px-8 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${ready
                    ? 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/30 scale-105'
                    : rolling
                    ? 'bg-zinc-700 text-zinc-500 cursor-wait'
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-500/30'
                  }
                `}
              >
                {ready ? '✓ Ready — Start!' : 'Start Simulation →'}
              </button>
            </div>
          </>
        ) : editingNPC && editingAvatar ? (
          /* ── Editor ── */
          <div className="bg-zinc-900/80 border border-zinc-700/50 backdrop-blur-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setEditingId(null)}
                className="text-zinc-400 hover:text-zinc-200 text-sm flex items-center gap-1.5 transition-colors"
              >
                <span>&larr;</span> Back to roster
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs">{ROLE_ICON[editingNPC.occupation]}</span>
                <h2 className="text-lg font-bold">{editingNPC.name}</h2>
              </div>
              <button
                onClick={() => updateAvatar(editingId, randomAvatar())}
                className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700 flex items-center gap-1.5"
              >
                🎲 Randomize
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Preview */}
              <div className="flex flex-col items-center gap-3">
                <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700/50">
                  <Avatar config={editingAvatar} size={180} mood={editingNPC.currentMood} />
                </div>
                <div className="text-center">
                  <p className="text-sm text-zinc-300">{editingNPC.occupation} &middot; {editingNPC.age}y</p>
                  <div className="flex gap-1.5 justify-center mt-1.5">
                    {editingNPC.personality.map(t => (
                      <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/50 ${TRAIT_COLOR[t] ?? 'text-zinc-400'}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex-1 space-y-4 overflow-y-auto max-h-[60vh]">
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

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setEditingId(null)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* CSS animations */}
      <style jsx global>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(400%); }
        }
        .animate-scan {
          animation: scan 0.6s linear infinite;
        }
        @keyframes lockin-flash {
          0% { background: rgba(96, 165, 250, 0.3); }
          100% { background: transparent; }
        }
        .animate-lockin-flash {
          animation: lockin-flash 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5 block">{label}</label>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function ColorSwatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded-lg border-2 transition-all ${
        active ? 'border-blue-500 scale-110 ring-2 ring-blue-500/30' : 'border-zinc-700 hover:border-zinc-500'
      }`}
      style={{ backgroundColor: color }}
    />
  );
}

function TextOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-lg text-xs transition-all ${
        active
          ? 'bg-blue-600 text-white ring-2 ring-blue-600/30'
          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
      }`}
    >
      {label}
    </button>
  );
}
