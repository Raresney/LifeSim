'use client';

import { memo, useMemo } from 'react';
import { SimEvent } from '../engine/types';

const TYPE_STYLE: Record<string, { color: string; bg: string; icon: string }> = {
  action:     { color: 'text-zinc-500', bg: 'bg-zinc-500/10', icon: '•' },
  social:     { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: '💬' },
  economic:   { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: '💰' },
  rumor:      { color: 'text-purple-400', bg: 'bg-purple-500/10', icon: '👀' },
  life_event: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: '⭐' },
  goal:       { color: 'text-cyan-400', bg: 'bg-cyan-500/10', icon: '🎯' },
  mood_change:{ color: 'text-pink-400', bg: 'bg-pink-500/10', icon: '😊' },
  conflict:   { color: 'text-red-400', bg: 'bg-red-500/10', icon: '⚔️' },
};

interface Props {
  events: SimEvent[];
}

export default memo(function Timeline({ events }: Props) {
  const display = useMemo(() => {
    const interesting = events.filter(e => e.type !== 'action');
    return interesting.length > 0 ? interesting.slice(-30) : events.slice(-5);
  }, [events]);

  return (
    <div className="space-y-1">
      {display.length === 0 && (
        <div className="text-center py-8">
          <div className="text-2xl mb-2 opacity-30">📋</div>
          <p className="text-[11px] text-zinc-600">Events appear after the first day rolls over.</p>
        </div>
      )}
      {display.map(event => {
        const style = TYPE_STYLE[event.type] ?? TYPE_STYLE.action;
        return (
          <div
            key={event.id}
            className={`text-[11px] ${style.color} flex gap-2.5 items-start px-2.5 py-2 rounded-xl
              hover:bg-white/[0.02] transition-colors duration-200 group`}
          >
            <span className={`flex-shrink-0 w-6 h-6 rounded-lg ${style.bg} flex items-center justify-center text-xs mt-0`}>
              {style.icon}
            </span>
            <span className="leading-relaxed text-zinc-400 group-hover:text-zinc-300 transition-colors">{event.description}</span>
          </div>
        );
      })}
    </div>
  );
});
