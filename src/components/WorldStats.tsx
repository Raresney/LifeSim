'use client';

import { WorldState } from '../engine/types';

interface Props {
  world: WorldState;
}

export default function WorldStats({ world }: Props) {
  const npcs = Array.from(world.npcs.values());
  const avgHappiness = Math.round(npcs.reduce((s, n) => s + n.stats.happiness, 0) / npcs.length);
  const avgStress = Math.round(npcs.reduce((s, n) => s + n.stats.stress, 0) / npcs.length);
  const totalMoney = npcs.reduce((s, n) => s + n.stats.money, 0);
  const activeRumors = world.rumors.length;

  const activities = new Map<string, number>();
  for (const npc of npcs) {
    activities.set(npc.currentActivity, (activities.get(npc.currentActivity) ?? 0) + 1);
  }
  const topActivity = [...activities.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3">
      <h2 className="text-sm font-medium text-zinc-300 mb-2">World Overview</h2>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="text-zinc-400">Avg Happiness</div>
        <div className="text-zinc-200 text-right">{avgHappiness}%</div>
        <div className="text-zinc-400">Avg Stress</div>
        <div className="text-zinc-200 text-right">{avgStress}%</div>
        <div className="text-zinc-400">Total Economy</div>
        <div className="text-zinc-200 text-right">${totalMoney}</div>
        <div className="text-zinc-400">Active Rumors</div>
        <div className="text-zinc-200 text-right">{activeRumors}</div>
        <div className="text-zinc-400">Most Common</div>
        <div className="text-zinc-200 text-right">{topActivity ? `${topActivity[0]} (${topActivity[1]})` : '-'}</div>
        <div className="text-zinc-400">Total Events</div>
        <div className="text-zinc-200 text-right">{world.eventLog.length}</div>
      </div>
    </div>
  );
}
