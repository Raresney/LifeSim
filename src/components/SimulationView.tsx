'use client';

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
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

const ACTIVITY_ICON: Record<string, string> = {
  sleeping: '🌙', working: '💼', eating: '🍽️', traveling: '🚶',
  relaxing: '🛋️', socializing: '💬', exercising: '🏃', shopping: '🛒',
  studying: '📚', entertaining: '🎮', arguing: '😡', flirting: '💕',
  scheming: '🤫', helping: '🤝', gossiping: '👀',
};

function getMoodColor(mood: string): string {
  return mood === 'happy' || mood === 'excited' || mood === 'content'
    ? 'bg-green-400' : mood === 'angry' || mood === 'stressed'
    ? 'bg-red-400' : mood === 'sad' || mood === 'anxious'
    ? 'bg-yellow-400' : 'bg-zinc-500';
}

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

  return (
    <button
      onClick={() => isFocused ? onUnfocus() : onFocus(npc)}
      onDoubleClick={() => onDetail(npc)}
      className={`w-full text-left px-3 py-2.5 mx-1 my-0.5 rounded-xl transition-all duration-200 group ${
        isFocused
          ? 'bg-blue-500/10 border border-blue-500/20'
          : 'hover:bg-zinc-800/60 border border-transparent'
      }`}
      style={{ width: 'calc(100% - 8px)' }}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className={`absolute -inset-0.5 rounded-lg ${isFocused ? 'ring-2 ring-blue-400/40' : ''}`} />
          <Avatar config={avatar} size={36} mood={npc.currentMood} />
          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${moodColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-[13px] font-medium truncate ${isFocused ? 'text-blue-300' : 'text-zinc-200 group-hover:text-white'}`}>
              {npc.name}
            </span>
            {isFocused && (
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase tracking-wider font-semibold">
                focus
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wide">{npc.occupation}</span>
            <span className="text-zinc-700">·</span>
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
      {isFocused && (
        <div className="mt-2.5 ml-12 space-y-1.5">
          <MiniBar label="Energy" value={npc.stats.energy} color="#eab308" />
          <MiniBar label="Health" value={npc.stats.health} color="#ef4444" />
          <MiniBar label="Happy" value={npc.stats.happiness} color="#22c55e" />
          <MiniBar label="Stress" value={npc.stats.stress} color="#f97316" />
          <div className="flex items-center justify-between pt-1">
            <span className="text-[9px] text-zinc-500">$ {npc.stats.money}</span>
            <span className="text-[9px] text-zinc-500">{100 - npc.stats.hunger}%</span>
          </div>
        </div>
      )}
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

  const npcs = useMemo(() => Array.from(world.npcs.values()), [world.npcs]);
  const viewing = focusedNPC ? (world.npcs.get(focusedNPC.id) ?? focusedNPC) : null;

  // Smooth transition: globe → map
  const transitionToMap = useCallback((npc: NPC) => {
    if (viewMode === 'transitioning-to-map') return;
    setFocusedNPC(npc);
    setViewMode('transitioning-to-map');
    // Let fade overlay appear, then switch view
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
      setViewMode('map');
    }, 400);
  }, [viewMode]);

  // Smooth transition: map → globe
  const transitionToGlobe = useCallback(() => {
    if (viewMode === 'transitioning-to-globe') return;
    setViewMode('transitioning-to-globe');
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
      setFocusedNPC(null);
      setViewMode('globe');
    }, 400);
  }, [viewMode]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, []);

  const isShowingMap = viewMode === 'map' || viewMode === 'transitioning-to-globe';
  const isShowingGlobe = viewMode === 'globe' || viewMode === 'transitioning-to-map';
  const isTransitioning = viewMode === 'transitioning-to-map' || viewMode === 'transitioning-to-globe';

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden relative flex flex-col">

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
            <div className="flex flex-col items-center gap-3 animate-pulse">
              <div className="w-8 h-8 border-2 border-blue-400/60 border-t-blue-400 rounded-full animate-spin" />
              <span className="text-xs text-zinc-400 tracking-wider uppercase">
                {viewMode === 'transitioning-to-map' ? 'Zooming in...' : 'Returning to globe...'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Top Bar ── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2.5 pointer-events-none">
        {/* Left: City name + view mode indicator */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button onClick={onBack} className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/50 rounded-xl px-4 py-2 hover:bg-zinc-800/80 transition-colors">
            <span className="text-sm text-zinc-400">&larr;</span>
            <div>
              <div className="text-sm font-bold leading-tight">Iași, Romania</div>
              <div className="text-[10px] text-zinc-500">{formattedTime}</div>
            </div>
          </button>
          {/* View mode badge */}
          <div className={`text-[10px] px-2.5 py-1 rounded-full font-medium uppercase tracking-wider transition-all duration-300 ${
            isShowingMap
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }`}>
            {isShowingMap ? '🗺️ Street' : '🌍 Globe'}
          </div>
        </div>

        {/* Right: focused NPC stats or world stats */}
        <div className="pointer-events-auto flex items-center gap-2">
          {viewing ? (
            <>
              <StatPill icon="$" value={`${viewing.stats.money}`} color="text-green-400" />
              <StatPill icon="❤️" value={`${viewing.stats.health}`} color="text-red-400" />
              <StatPill icon="✨" value={MOOD_LABEL[viewing.currentMood] ?? viewing.currentMood} color="text-purple-400" />
              <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-1.5 ml-1">
                <Avatar config={avatars[viewing.id]} size={36} mood={viewing.currentMood} />
              </div>
            </>
          ) : (
            <>
              <StatPill icon="👥" value={`${npcs.length} NPCs`} color="text-blue-400" />
              <StatPill icon="💰" value={`$${npcs.reduce((s, n) => s + n.stats.money, 0)}`} color="text-green-400" />
              <StatPill icon="👀" value={`${world.rumors.length} rumors`} color="text-purple-400" />
            </>
          )}
        </div>
      </div>

      {/* ── Left Sidebar: Population ── */}
      <div className={`absolute top-16 left-3 bottom-20 z-20 transition-all duration-300 ${sidebarOpen ? 'w-72' : 'w-0'}`}>
        <div className={`h-full bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/60 rounded-2xl overflow-hidden flex flex-col ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-[0.15em]">Population</span>
              <span className="text-[10px] text-zinc-600 font-mono">{npcs.length}</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="text-zinc-600 hover:text-zinc-300 text-sm transition-colors">&times;</button>
          </div>

          {/* NPC List */}
          <div className="flex-1 overflow-y-auto py-1">
            {npcs.map(npc => (
              <NPCSidebarItem
                key={npc.id}
                npc={npc}
                avatar={avatars[npc.id]}
                isFocused={focusedNPC?.id === npc.id}
                onFocus={transitionToMap}
                onUnfocus={transitionToGlobe}
                onDetail={setSelectedNPC}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-zinc-800/50 bg-zinc-900/30 flex items-center justify-between">
            <span className="text-[9px] text-zinc-600">Click to focus</span>
            <span className="text-[9px] text-zinc-600">Double-click for details</span>
          </div>
        </div>
      </div>

      {/* Sidebar toggle (when closed) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute top-16 left-3 z-20 bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/50 rounded-xl px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          👥 People
        </button>
      )}

      {/* ── Map background: Globe overview or Street map when focused ── */}
      <div className="absolute inset-0 z-0">
        {isShowingMap ? (
          <MapView
            npcs={world.npcs}
            avatars={avatars}
            onNPCClick={(npc) => {
              setFocusedNPC(npc);
              setSelectedNPC(npc);
            }}
            focusedNPCId={focusedNPC?.id ?? null}
            onZoomOutToGlobe={transitionToGlobe}
          />
        ) : (
          <GlobeView
            npcs={world.npcs}
            avatars={avatars}
            onNPCClick={(npc) => {
              transitionToMap(npc);
            }}
            focusedNPCId={null}
            onZoomIn={() => {
              const first = Array.from(world.npcs.values())[0];
              if (first) transitionToMap(first);
            }}
          />
        )}
      </div>

      {/* ── "doing now" floating card (when NPC focused) ── */}
      {viewing && !isTransitioning && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-zinc-900/85 backdrop-blur-md border border-zinc-700/50 rounded-2xl px-5 py-2.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">doing now:</span>
            <div className="flex items-center gap-1.5 bg-zinc-800/80 rounded-lg px-3 py-1">
              <span>{ACTIVITY_ICON[viewing.currentActivity] ?? '❓'}</span>
              <span className="text-sm font-medium capitalize">{viewing.currentActivity}</span>
            </div>
            <span className="text-[10px] text-zinc-500">@ {viewing.currentLocation}</span>
          </div>
        </div>
      )}

      {/* ── Bottom Bar ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="flex items-center justify-center gap-6 py-3 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent pt-8">
          {/* People button */}
          <BottomButton icon="👥" label="People" active={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)} />

          {/* Day */}
          <div className="text-center">
            <div className="text-lg font-bold text-zinc-200">{DAY_NAMES[world.time.day]}</div>
            <div className="text-[10px] text-zinc-500">{world.time.hour.toString().padStart(2, '0')}:00</div>
          </div>

          {/* Play/Pause button */}
          <button
            onClick={() => world.isRunning ? pause() : play()}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
              world.isRunning
                ? 'bg-red-500/90 hover:bg-red-400 shadow-red-500/30'
                : 'bg-blue-500/90 hover:bg-blue-400 shadow-blue-500/30'
            }`}
          >
            {world.isRunning ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="white">
                <rect x="3" y="2" width="4" height="14" rx="1" />
                <rect x="11" y="2" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="white">
                <path d="M4 2L16 9L4 16V2Z" />
              </svg>
            )}
          </button>

          {/* Status */}
          <div className="text-center min-w-[60px]">
            <div className={`text-xs font-semibold uppercase tracking-wider ${world.isRunning ? 'text-green-400' : 'text-zinc-500'}`}>
              {world.isRunning ? 'Running' : 'Paused'}
            </div>
            <div className="text-[10px] text-zinc-600">Tick #{world.time.tick}</div>
          </div>

          {/* Events/Timeline */}
          <BottomButton icon="📋" label="Events" active={showTimeline} onClick={() => setShowTimeline(!showTimeline)} />

          {/* Speed */}
          <div className="flex items-center gap-1 bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-zinc-700/50 overflow-hidden">
            {[1, 2, 5, 10].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2.5 py-1.5 text-xs transition-colors ${
                  world.speed === s ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Step */}
          <button
            onClick={tick}
            disabled={world.isRunning}
            className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/50 rounded-xl px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition-colors"
          >
            Step ▶
          </button>
        </div>
      </div>

      {/* ── Timeline overlay ── */}
      {showTimeline && (
        <div className="absolute top-16 right-3 bottom-20 w-72 z-20">
          <div className="h-full bg-zinc-900/85 backdrop-blur-md border border-zinc-700/50 rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Events</span>
              <button onClick={() => setShowTimeline(false)} className="text-zinc-500 hover:text-zinc-300 text-sm">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <Timeline events={recentEvents} />
            </div>
          </div>
        </div>
      )}

      {/* ── NPC Detail Modal ── */}
      {selectedNPC && (
        <NPCDetail
          npc={world.npcs.get(selectedNPC.id) ?? selectedNPC}
          avatar={avatars[selectedNPC.id]}
          relationships={world.relationships.get(selectedNPC.id) ?? []}
          allNPCs={world.npcs}
          onClose={() => setSelectedNPC(null)}
        />
      )}
    </div>
  );
}

const StatPill = memo(function StatPill({ icon, value, color }: { icon: string; value: string; color: string }) {
  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/50 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
      <span className="text-xs">{icon}</span>
      <span className={`text-xs font-semibold ${color}`}>{value}</span>
    </div>
  );
});

const BottomButton = memo(function BottomButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5">
      <span className="text-lg">{icon}</span>
      <span className={`text-[10px] ${active ? 'text-blue-400' : 'text-zinc-500'}`}>{label}</span>
    </button>
  );
});

const MiniBar = memo(function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-zinc-500 w-10">{label}</span>
      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-[9px] text-zinc-500 w-5 text-right">{value}</span>
    </div>
  );
});
