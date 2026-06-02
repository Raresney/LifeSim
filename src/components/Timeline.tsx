'use client';

import { memo, useMemo } from 'react';
import { SimEvent } from '../engine/types';

const TYPE_STYLE: Record<string, { color: string; icon: string }> = {
  action:     { color: 'text-zinc-500', icon: '•' },
  social:     { color: 'text-blue-400', icon: '💬' },
  economic:   { color: 'text-green-400', icon: '💰' },
  rumor:      { color: 'text-purple-400', icon: '👀' },
  life_event: { color: 'text-yellow-400', icon: '⭐' },
  goal:       { color: 'text-cyan-400', icon: '🎯' },
  mood_change:{ color: 'text-pink-400', icon: '😊' },
  conflict:   { color: 'text-red-400', icon: '⚔️' },
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
    <div className="space-y-1.5">
      {display.length === 0 && (
        <p className="text-xs text-zinc-600 text-center py-4">Events appear after the first day rolls over.</p>
      )}
      {display.map(event => {
        const style = TYPE_STYLE[event.type] ?? TYPE_STYLE.action;
        return (
          <div key={event.id} className={`text-xs ${style.color} flex gap-2 items-start`}>
            <span className="flex-shrink-0 mt-0.5">{style.icon}</span>
            <span className="leading-relaxed">{event.description}</span>
          </div>
        );
      })}
    </div>
  );
});
