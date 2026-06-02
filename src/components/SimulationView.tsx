'use client';

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { NPC } from '../engine/types';
import { AvatarConfig } from '../engine/avatar';
import { useSimulation } from '../hooks/useSimulation';
import NPCDetail from './NPCDetail';
import Timeline from './Timeline';
import Avatar from './Avatar';

const GlobeView = dynamic(() => import('./GlobeView'), { ssr: false });
const MapView = dynamic(() => import('./MapView'), { ssr: false });

interface Props {
  avatars: Record<string, AvatarConfig>;
  onBack: () => void;
}

const DAY_NAMES = ['', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const MOOD_LABEL: Record<string, string> = {
  happy: 'Happy', sad: 'Melancholic', angry: 'Furious', anxious: 'Anxious',
  confident: 'Confident', bored: 'Bored', excited: 'Excited',
  stressed: 'Stressed', content: 'Content', jealous: 'Jealous',
};

const PERIOD_NAMES: Record<number, string> = {
  0: 'Night', 3: 'Early Morning', 6: 'Morning', 9: 'Late Morning',
  12: 'Afternoon', 15: 'Late Afternoon', 18: 'Evening', 21: 'Night',
};

const ACTIVITY_ICON: Record<string, string> = {
  sleeping: '🌙', working: '💼', eating: '🍽️', traveling: '🚶',
  relaxing: '🛋️', socializing: '💬', exercising: '🏃', shopping: '🛒',
  studying: '📚', entertaining: '🎮', arguing: '😡', flirting: '💕',
  scheming: '🤫', helping: '🤝', gossiping: '👀',
};

function getMoodColor(mood: string): string {
  return mood === 'happy' || mood === 'excited' || mood === 'content'
    ? 'bg-emerald-400' : mood === 'angry' || mood === 'stressed'
    ? 'bg-red-400' : mood === 'sad' || mood === 'anxious'
    ? 'bg-amber-400' : 'bg-zinc-500';
}

function getMoodGlow(mood: string): string {
  return mood === 'happy' || mood === 'excited' || mood === 'content'
    ? 'shadow-emerald-400/30' : mood === 'angry' || mood === 'stressed'
    ? 'shadow-red-400/30' : mood === 'sad' || mood === 'anxious'
    ? 'shadow-amber-400/30' : 'shadow-zinc-500/30';
}

/**
 * PERF FIX: NPCSidebarItem uses CSS transitions instead of Framer Motion
 * for stat bars. AnimatePresence kept only for expand/collapse toggle.
 */
const NPCSidebarItem = memo(function NPCSidebarItem({
  npc, avatar, isFocused, onFocus, onUnfocus, onDetail,
}: {
  npc: NPC;
  avatar: AvatarConfig;
  isFocused: boolean;
  onFocus: (npc: NPC) => void;
  onUnfocus: () => void;
  onDetail: (npc: NPC) => void;
}) {
  const moodColor = getMoodColor(npc.currentMood);
  const moodGlow = getMoodGlow(npc.currentMood);

  return (
    <button
      onClick={() => isFocused ? onUnfocus() : onFocus(npc)}
      onDoubleClick={() => onDetail(npc)}
      className={`w-full text-left px-3 py-2.5 mx-1 my-0.5 rounded-xl transition-all duration-300 group ${
        isFocused
          ? 'bg-blue-500/10 border border-blue-500/20 shadow-lg shadow-blue-500/5'
          : 'hover:bg-white/[0.03] border border-transparent hover:border-zinc-800/60'
      }`}
      style={{ width: 'calc(100% - 8px)' }}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className={`absolute -inset-0.5 rounded-lg transition-all duration-300 ${isFocused ? 'ring-2 ring-blue-400/30' : ''}`} />
          <Avatar config={avatar} size={36} mood={npc.currentMood} />
          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${moodColor} shadow-sm ${moodGlow}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-[13px] font-medium truncate transition-colors duration-200 ${isFocused ? 'text-blue-300' : 'text-zinc-300 group-hover:text-zinc-100'}`}>
              {npc.name}
            </span>
            {isFocused && (
              <span className="text-[7px] px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-400 uppercase tracking-widest font-semibold border border-blue-500/20">
                focus
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wide">{npc.occupation}</span>
            <span className="text-zinc-800">&middot;</span>
            <span className="text-[10px] text-zinc-600">{MOOD_LABEL[npc.currentMood] ?? npc.currentMood}</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <span className="text-base leading-none">
            {ACTIVITY_ICON[npc.currentActivity] ?? '?'}
          </span>
          <span className="text-[8px] text-zinc-600 capitalize leading-none">
            {npc.currentActivity.length > 8 ? npc.currentActivity.slice(0, 7) + '.' : npc.currentActivity}
          </span>
        </div>
      </div>
      {/* PERF: Use CSS height transition instead of AnimatePresence for stats */}
      <div
        className="overflow-hidden transition-all duration-200 ease-out"
        style={{ maxHeight: isFocused ? '120px' : '0px', opacity: isFocused ? 1 : 0 }}
      >
        <div className="mt-2.5 ml-12 space-y-1.5">
          <MiniBar label="Energy" value={npc.stats.energy} color="#eab308" />
          <MiniBar label="Health" value={npc.stats.health} color="#ef4444" />
          <MiniBar label="Happy" value={npc.stats.happiness} color="#22c55e" />
          <MiniBar label="Stress" value={npc.stats.stress} color="#f97316" />
          <div className="flex items-center justify-between pt-1">
            <span className="text-[9px] text-zinc-500 font-mono">$ {npc.stats.money}</span>
            <span className="text-[9px] text-zinc-500 font-mono">{100 - npc.stats.hunger}% fed</span>
          </div>
        </div>
      </div>
    </button>
  );
});

type ViewMode = 'globe' | 'map' | 'transitioning-to-map' | 'transitioning-to-globe';

export default function SimulationView({ avatars, onBack }: Props) {
  const { world, recentEvents, formattedTime, tick, play, pause, setSpeed, reset } = useSimulation();
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [focusedNPC, setFocusedNPC] = useState<NPC | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('globe');
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // PERF: Stable array reference — only changes when world.npcs Map identity changes
  const npcs = useMemo(() => Array.from(world.npcs.values()), [world.npcs]);

  // PERF: Get fresh NPC data from world for the focused one
  const viewing = focusedNPC ? (world.npcs.get(focusedNPC.id) ?? null) : null;

  // PERF: Stable callbacks — no deps on viewMode so they don't recreate
  const transitionToMap = useCallback((npc: NPC) => {
    setFocusedNPC(npc);
    setViewMode(prev => {
      if (prev === 'transitioning-to-map') return prev;
      return 'transitioning-to-map';
    });
  }, []);

  useEffect(() => {
    if (viewMode !== 'transitioning-to-map') return;
    const t = setTimeout(() => setViewMode('map'), 400);
    return () => clearTimeout(t);
  }, [viewMode]);

  const transitionToGlobe = useCallback(() => {
    setViewMode(prev => {
      if (prev === 'transitioning-to-globe') return prev;
      return 'transitioning-to-globe';
    });
  }, []);

  useEffect(() => {
    if (viewMode !== 'transitioning-to-globe') return;
    const t = setTimeout(() => {
      setFocusedNPC(null);
      setViewMode('globe');
    }, 400);
    return () => clearTimeout(t);
  }, [viewMode]);

  // PERF: Stable callback refs for sidebar items
  const handleDetail = useCallback((npc: NPC) => setSelectedNPC(npc), []);

  const isShowingMap = viewMode === 'map' || viewMode === 'transitioning-to-globe';
  const isShowingGlobe = viewMode === 'globe' || viewMode === 'transitioning-to-map';
  const isTransitioning = viewMode === 'transitioning-to-map' || viewMode === 'transitioning-to-globe';

  // PERF: Memoize map handlers
  const handleMapNPCClick = useCallback((npc: NPC) => {
    setFocusedNPC(npc);
    setSelectedNPC(npc);
  }, []);

  const handleGlobeNPCClick = useCallback((npc: NPC) => {
    transitionToMap(npc);
  }, [transitionToMap]);

  const handleGlobeZoomIn = useCallback(() => {
    const first = Array.from(world.npcs.values())[0];
    if (first) transitionToMap(first);
  }, [world.npcs, transitionToMap]);

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden relative flex flex-col sim-dark">

      {/* ── Transition overlay ── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-400"
        style={{
          opacity: isTransitioning ? 1 : 0,
          background: 'radial-gradient(ellipse at center, rgba(15,23,42,0.95) 0%, rgba(9,9,11,0.98) 100%)',
        }}
      >
        {isTransitioning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 border-2 border-blue-400/20 rounded-full" />
                <div className="absolute inset-0 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
              <span className="text-xs text-zinc-400 tracking-[0.2em] uppercase font-medium">
                {viewMode === 'transitioning-to-map' ? 'Zooming in...' : 'Returning to globe...'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Top Bar ── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2.5">
          {/* PERF: Removed whileHover/whileTap — CSS hover instead */}
          <button
            onClick={onBack}
            className="flex items-center gap-3 glass rounded-2xl px-4 py-2.5 hover:bg-zinc-800/50 transition-all duration-300 group hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-zinc-500 group-hover:text-zinc-300 transition-colors">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <div className="text-sm font-bold leading-tight text-zinc-200">{"Iași, Romania"}</div>
              <div className="text-[10px] text-zinc-500 font-mono">{formattedTime}</div>
            </div>
          </button>

          <div className={`text-[10px] px-3 py-1.5 rounded-xl font-medium uppercase tracking-[0.15em] transition-all duration-300 ${
            isShowingMap
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
          }`}>
            {isShowingMap ? '🗺️ Street' : '🌍 Globe'}
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {viewing ? (
            <div className="flex items-center gap-2">
              <StatPill icon="$" value={`${viewing.stats.money}`} color="text-emerald-400" glow="shadow-emerald-400/10" />
              <StatPill icon="❤️" value={`${viewing.stats.health}`} color="text-red-400" glow="shadow-red-400/10" />
              <StatPill icon="✨" value={MOOD_LABEL[viewing.currentMood] ?? viewing.currentMood} color="text-purple-400" glow="shadow-purple-400/10" />
              <div className="glass rounded-2xl p-1.5 ml-1">
                <Avatar config={avatars[viewing.id]} size={36} mood={viewing.currentMood} />
              </div>
            </div>
          ) : (
            <>
              <StatPill icon="👥" value={`${npcs.length} NPCs`} color="text-blue-400" glow="shadow-blue-400/10" />
              <StatPill icon="💰" value={`$${npcs.reduce((s, n) => s + n.stats.money, 0)}`} color="text-emerald-400" glow="shadow-emerald-400/10" />
              <StatPill icon="👀" value={`${world.rumors.length} rumors`} color="text-purple-400" glow="shadow-purple-400/10" />
            </>
          )}
        </div>
      </div>

      {/* ── Left Sidebar: Population ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-16 left-3 bottom-20 z-20 w-72"
          >
            <div className="h-full glass-strong rounded-2xl overflow-hidden flex flex-col shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/40">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-30" />
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-[0.15em]">Population</span>
                  <span className="text-[10px] text-zinc-600 font-mono bg-zinc-800/50 px-1.5 py-0.5 rounded-md">{npcs.length}</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all duration-200">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-1">
                {npcs.map(npc => (
                  <NPCSidebarItem
                    key={npc.id}
                    npc={npc}
                    avatar={avatars[npc.id]}
                    isFocused={focusedNPC?.id === npc.id}
                    onFocus={transitionToMap}
                    onUnfocus={transitionToGlobe}
                    onDetail={handleDetail}
                  />
                ))}
              </div>

              <div className="px-4 py-2.5 border-t border-zinc-800/40 flex items-center justify-between">
                <span className="text-[9px] text-zinc-600">Click to focus</span>
                <span className="text-[9px] text-zinc-600">Double-click for details</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute top-16 left-3 z-20 glass rounded-xl px-3.5 py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition-all duration-200 flex items-center gap-2 hover:scale-105 active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2a6 6 0 100 12A6 6 0 008 2z" stroke="currentColor" strokeWidth="1.2"/>
            <circle cx="6" cy="7" r="1" fill="currentColor"/><circle cx="10" cy="7" r="1" fill="currentColor"/>
            <path d="M5.5 10c.5 1 2.5 1.5 5 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
          </svg>
          People
        </button>
      )}

      {/* ── Map background ── */}
      <div className="absolute inset-0 z-0">
        {isShowingMap ? (
          <MapView
            npcs={world.npcs}
            avatars={avatars}
            onNPCClick={handleMapNPCClick}
            focusedNPCId={focusedNPC?.id ?? null}
            onZoomOutToGlobe={transitionToGlobe}
          />
        ) : (
          <GlobeView
            npcs={world.npcs}
            avatars={avatars}
            onNPCClick={handleGlobeNPCClick}
            focusedNPCId={null}
            onZoomIn={handleGlobeZoomIn}
          />
        )}
      </div>

      {/* ── Floating "doing now" card ── */}
      <AnimatePresence>
        {viewing && !isTransitioning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20"
          >
            <div className="glass rounded-2xl px-5 py-3 flex items-center gap-3 shadow-xl shadow-black/20">
              <span className="text-[10px] text-zinc-500 uppercase tracking-[0.15em] font-medium">doing now</span>
              <div className="flex items-center gap-2 bg-zinc-800/50 rounded-xl px-3.5 py-1.5 border border-zinc-700/20">
                <span className="text-base">{ACTIVITY_ICON[viewing.currentActivity] ?? '❓'}</span>
                <span className="text-sm font-medium capitalize text-zinc-200">{viewing.currentActivity}</span>
              </div>
              <span className="text-[10px] text-zinc-500">@ {viewing.currentLocation}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Bar ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="flex items-center justify-center gap-5 py-3 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent pt-10">
          <BottomButton icon="people" label="People" active={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)} />

          <div className="text-center min-w-[80px]">
            <div className="text-lg font-bold text-zinc-200 tracking-wide">{DAY_NAMES[world.time.day]}</div>
            <div className="text-[10px] text-zinc-500 font-mono">{world.time.hour.toString().padStart(2, '0')}:00</div>
            <div className="text-[9px] text-zinc-600 mt-0.5">{PERIOD_NAMES[world.time.hour] ?? ''}</div>
          </div>

          {/* PERF: CSS hover/active instead of Framer whileHover/whileTap */}
          <button
            onClick={() => world.isRunning ? pause() : play()}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl hover:scale-105 active:scale-[0.92] ${
              world.isRunning
                ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/30 hover:shadow-red-500/40'
                : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30 hover:shadow-blue-500/40'
            }`}
          >
            {world.isRunning ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="white">
                <rect x="3" y="2" width="4" height="14" rx="1.5" />
                <rect x="11" y="2" width="4" height="14" rx="1.5" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="white">
                <path d="M4 2L16 9L4 16V2Z" />
              </svg>
            )}
          </button>

          <div className="text-center min-w-[60px]">
            <div className={`text-xs font-semibold uppercase tracking-[0.15em] transition-colors duration-300 ${world.isRunning ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {world.isRunning ? 'Running' : 'Paused'}
            </div>
            <div className="text-[10px] text-zinc-600 font-mono">Tick #{world.time.tick}</div>
          </div>

          <BottomButton icon="events" label="Events" active={showTimeline} onClick={() => setShowTimeline(!showTimeline)} />

          <div className="flex items-center glass rounded-xl overflow-hidden">
            {[1, 2, 5, 10].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-3 py-2 text-xs font-medium transition-all duration-200 ${
                  world.speed === s
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            onClick={tick}
            disabled={world.isRunning}
            className="glass rounded-xl px-3.5 py-2 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-25 transition-all duration-200 font-medium hover:scale-[1.03] active:scale-[0.97]"
          >
            Step ▶
          </button>
        </div>
      </div>

      {/* ── Timeline panel ── */}
      <AnimatePresence>
        {showTimeline && !selectedNPC && (
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-16 right-3 bottom-20 w-72 z-20"
          >
            <div className="h-full glass-strong rounded-2xl overflow-hidden flex flex-col shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/40">
                <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-[0.15em]">Events</span>
                <button onClick={() => setShowTimeline(false)} className="w-6 h-6 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all duration-200">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <Timeline events={recentEvents} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NPC Detail panel ── */}
      <AnimatePresence>
        {selectedNPC && (
          <NPCDetail
            npc={world.npcs.get(selectedNPC.id) ?? selectedNPC}
            avatar={avatars[selectedNPC.id]}
            relationships={world.relationships.get(selectedNPC.id) ?? []}
            allNPCs={world.npcs}
            onClose={() => setSelectedNPC(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const StatPill = memo(function StatPill({ icon, value, color, glow }: { icon: string; value: string; color: string; glow?: string }) {
  return (
    <div className={`glass rounded-xl px-3 py-1.5 flex items-center gap-1.5 ${glow ? `shadow-lg ${glow}` : ''}`}>
      <span className="text-xs">{icon}</span>
      <span className={`text-xs font-semibold ${color}`}>{value}</span>
    </div>
  );
});

/**
 * PERF FIX: BottomButton — CSS hover/active instead of Framer whileHover/whileTap.
 * Eliminates Framer Motion overhead on frequently-rendered controls.
 */
const BottomButton = memo(function BottomButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 group hover:scale-105 active:scale-95 transition-transform duration-150"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
        active ? 'glass border-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
      }`}>
        {icon === 'people' ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M1 17c0-3 2.5-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="14" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M15 12c2 0 4 1.5 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M7 6h6M7 10h4M7 14h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        )}
      </div>
      <span className={`text-[9px] font-medium transition-colors duration-200 ${active ? 'text-blue-400' : 'text-zinc-600 group-hover:text-zinc-400'}`}>{label}</span>
    </button>
  );
});

/**
 * PERF FIX: MiniBar uses CSS transition instead of Framer motion.div animate.
 * Before: Framer Motion recalculated layout animation every tick (expensive).
 * After:  CSS transition on width — GPU-composited, zero JS overhead.
 */
const MiniBar = memo(function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-zinc-500 w-10">{label}</span>
      <div className="flex-1 h-1 bg-zinc-800/80 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ backgroundColor: color, width: `${value}%` }}
        />
      </div>
      <span className="text-[9px] text-zinc-500 w-5 text-right font-mono">{value}</span>
    </div>
  );
});
