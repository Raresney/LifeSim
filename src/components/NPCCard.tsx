'use client';

import { NPC } from '../engine/types';
import { AvatarConfig } from '../engine/avatar';
import Avatar from './Avatar';

const MOOD_COLOR: Record<string, string> = {
  happy: 'bg-green-500', sad: 'bg-blue-500', angry: 'bg-red-500',
  anxious: 'bg-yellow-500', confident: 'bg-purple-500', bored: 'bg-gray-400',
  excited: 'bg-orange-500', stressed: 'bg-red-400', content: 'bg-emerald-400',
  jealous: 'bg-yellow-600',
};

interface Props {
  npc: NPC;
  avatar: AvatarConfig;
  onClick: (npc: NPC) => void;
}

export default function NPCCard({ npc, avatar, onClick }: Props) {
  const moodColor = MOOD_COLOR[npc.currentMood] ?? 'bg-gray-500';

  return (
    <button
      onClick={() => onClick(npc)}
      className="w-full text-left p-3 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-zinc-500 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <Avatar config={avatar} size={42} mood={npc.currentMood} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-100 truncate">{npc.name}</span>
            <span className={`w-2 h-2 rounded-full ${moodColor}`} title={npc.currentMood} />
          </div>
          <div className="text-xs text-zinc-400">{npc.occupation} · {npc.age}y</div>
        </div>
        <span className="text-xs text-zinc-500 font-mono">${npc.stats.money}</span>
      </div>

      <div className="text-xs text-zinc-400 mb-2">
        {npc.currentActivity} @ {npc.currentLocation}
      </div>

      <div className="space-y-1">
        <StatBar label="⚡" value={npc.stats.energy} color="bg-yellow-500" />
        <StatBar label="❤️" value={npc.stats.health} color="bg-red-500" />
        <StatBar label="😊" value={npc.stats.happiness} color="bg-green-500" />
        <StatBar label="😰" value={npc.stats.stress} color="bg-orange-500" />
        <StatBar label="🍔" value={100 - npc.stats.hunger} color="bg-blue-400" />
      </div>
    </button>
  );
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] w-4">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
