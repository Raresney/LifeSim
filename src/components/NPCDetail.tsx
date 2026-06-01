'use client';

import { useState } from 'react';
import { NPC, Relationship } from '../engine/types';
import { AvatarConfig } from '../engine/avatar';
import { summarizeMemoryForLLM } from '../engine/memory';
import Avatar from './Avatar';

interface Props {
  npc: NPC;
  avatar: AvatarConfig;
  relationships: Relationship[];
  allNPCs: Map<string, NPC>;
  onClose: () => void;
}

export default function NPCDetail({ npc, avatar, relationships, allNPCs, onClose }: Props) {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateNarrative = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npc: {
            name: npc.name,
            age: npc.age,
            personality: npc.personality,
            occupation: npc.occupation,
            stats: npc.stats,
            currentActivity: npc.currentActivity,
            currentLocation: npc.currentLocation,
            currentMood: npc.currentMood,
            goals: npc.goals.filter(g => g.status === 'active'),
          },
          memory: summarizeMemoryForLLM(npc.memory),
          relationships: relationships.map(r => ({
            name: allNPCs.get(r.targetId)?.name ?? 'Unknown',
            type: r.type,
            trust: r.trust,
            affection: r.affection,
          })),
        }),
      });
      const data = await res.json();
      setNarrative(data.narrative);
    } catch {
      setNarrative('Failed to generate narrative. Check API configuration.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-zinc-800 rounded-lg p-1.5">
              <Avatar config={avatar} size={64} mood={npc.currentMood} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-100">{npc.name}</h2>
              <p className="text-sm text-zinc-400">{npc.occupation} · {npc.age} years · {npc.currentMood}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 text-xl">×</button>
        </div>

        {/* Personality */}
        <div className="mb-4">
          <h3 className="text-xs font-medium text-zinc-500 uppercase mb-1">Personality</h3>
          <div className="flex gap-1.5">
            {npc.personality.map(t => (
              <span key={t} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs">{t}</span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-4">
          <h3 className="text-xs font-medium text-zinc-500 uppercase mb-1">Stats</h3>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <Stat label="Energy" value={npc.stats.energy} />
            <Stat label="Health" value={npc.stats.health} />
            <Stat label="Happiness" value={npc.stats.happiness} />
            <Stat label="Stress" value={npc.stats.stress} />
            <Stat label="Hunger" value={npc.stats.hunger} />
            <Stat label="Money" value={npc.stats.money} prefix="$" noBar />
          </div>
        </div>

        {/* Current state */}
        <div className="mb-4">
          <h3 className="text-xs font-medium text-zinc-500 uppercase mb-1">Currently</h3>
          <p className="text-sm text-zinc-300">{npc.currentActivity} at {npc.currentLocation}</p>
        </div>

        {/* Goals */}
        <div className="mb-4">
          <h3 className="text-xs font-medium text-zinc-500 uppercase mb-1">Goals</h3>
          <div className="space-y-1">
            {npc.goals.filter(g => g.status === 'active').map(g => (
              <div key={g.id} className="flex items-center gap-2 text-xs">
                <div className="flex-1 text-zinc-300">{g.description}</div>
                <span className="text-zinc-500">{g.progress}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Relationships */}
        <div className="mb-4">
          <h3 className="text-xs font-medium text-zinc-500 uppercase mb-1">Relationships</h3>
          <div className="space-y-1">
            {relationships.filter(r => r.type !== 'acquaintance').map(r => {
              const other = allNPCs.get(r.targetId);
              return (
                <div key={r.targetId} className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-300">{other?.name ?? '?'}</span>
                  <span className={`px-1.5 py-0.5 rounded ${
                    r.type === 'romantic' ? 'bg-pink-900 text-pink-300' :
                    r.type === 'enemy' ? 'bg-red-900 text-red-300' :
                    r.type === 'rival' ? 'bg-orange-900 text-orange-300' :
                    r.type === 'close_friend' ? 'bg-green-900 text-green-300' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>{r.type.replace('_', ' ')}</span>
                  <span className="text-zinc-500 ml-auto">T:{r.trust} A:{r.affection} R:{r.respect}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent memories */}
        <div className="mb-4">
          <h3 className="text-xs font-medium text-zinc-500 uppercase mb-1">Recent Memories</h3>
          <div className="space-y-1">
            {npc.memory.shortTerm.slice(0, 5).map(m => (
              <div key={m.id} className="text-xs text-zinc-400">• {m.description}</div>
            ))}
            {npc.memory.shortTerm.length === 0 && (
              <p className="text-xs text-zinc-500">No memories yet.</p>
            )}
          </div>
        </div>

        {/* LLM Narrative */}
        <div>
          <button
            onClick={generateNarrative}
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white text-sm rounded-lg transition-colors"
          >
            {loading ? 'Generating...' : narrative ? 'Regenerate Inner World' : 'Explore Inner World (LLM)'}
          </button>
          {narrative && (
            <div className="mt-3 p-3 bg-zinc-800 rounded-lg text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {narrative}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, prefix, noBar }: { label: string; value: number; prefix?: string; noBar?: boolean }) {
  return (
    <div>
      <div className="flex justify-between text-zinc-400 mb-0.5">
        <span>{label}</span>
        <span>{prefix ?? ''}{value}</span>
      </div>
      {!noBar && (
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              value > 60 ? 'bg-green-500' : value > 30 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${value}%` }}
          />
        </div>
      )}
    </div>
  );
}
