'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { WorldState, SimEvent } from '../engine/types';
import { createWorld } from '../engine/world';
import { processTick, formatTime } from '../engine/tick';

export function useSimulation() {
  const [world, setWorld] = useState<WorldState>(() => createWorld());
  const [recentEvents, setRecentEvents] = useState<SimEvent[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    setWorld(prev => {
      const { world: next, events } = processTick(prev);
      // Schedule event update outside of setWorld to avoid nested state updates
      queueMicrotask(() => setRecentEvents(events));
      return next;
    });
  }, []);

  const play = useCallback(() => {
    setWorld(prev => ({ ...prev, isRunning: true }));
  }, []);

  const pause = useCallback(() => {
    setWorld(prev => ({ ...prev, isRunning: false }));
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setWorld(prev => ({ ...prev, speed }));
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setWorld(createWorld());
    setRecentEvents([]);
  }, []);

  // Auto-tick when running
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (world.isRunning) {
      const ms = Math.max(100, 1000 / world.speed);
      intervalRef.current = setInterval(tick, ms);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [world.isRunning, world.speed, tick]);

  return {
    world,
    recentEvents,
    formattedTime: formatTime(world.time),
    tick,
    play,
    pause,
    setSpeed,
    reset,
  };
}
