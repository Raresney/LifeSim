'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { WorldState, SimEvent } from '../engine/types';
import { createWorld } from '../engine/world';
import { processTick, formatTime } from '../engine/tick';

// Reduced from 400ms to 250ms for faster NPC location change propagation
const UI_SYNC_INTERVAL = 250;

export function useSimulation() {
  const worldRef = useRef<WorldState>(createWorld());
  const eventsRef = useRef<SimEvent[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uiSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dirtyRef = useRef(false);

  const [snapshot, setSnapshot] = useState<{
    world: WorldState;
    recentEvents: SimEvent[];
    version: number;
  }>(() => ({
    world: worldRef.current,
    recentEvents: [],
    version: 0,
  }));

  const engineTick = useCallback(() => {
    if (worldRef.current.time.day >= 7 && worldRef.current.time.hour >= 24) {
      worldRef.current = { ...worldRef.current, isRunning: false };
      dirtyRef.current = true;
      return;
    }
    const { world: next, events } = processTick(worldRef.current);
    worldRef.current = next;
    eventsRef.current = events;
    dirtyRef.current = true;
  }, []);

  const flushToReact = useCallback(() => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    const w = worldRef.current;
    const e = eventsRef.current;
    setSnapshot(prev => ({
      world: w,
      recentEvents: e,
      version: prev.version + 1,
    }));
  }, []);

  const tick = useCallback(() => {
    engineTick();
    dirtyRef.current = false;
    const w = worldRef.current;
    const e = eventsRef.current;
    setSnapshot(prev => ({
      world: w,
      recentEvents: e,
      version: prev.version + 1,
    }));
  }, [engineTick]);

  const play = useCallback(() => {
    worldRef.current = { ...worldRef.current, isRunning: true };
    dirtyRef.current = true;
    flushToReact();
  }, [flushToReact]);

  const pause = useCallback(() => {
    // Stop engine interval immediately
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Stop UI sync interval
    if (uiSyncRef.current) {
      clearInterval(uiSyncRef.current);
      uiSyncRef.current = null;
    }
    worldRef.current = { ...worldRef.current, isRunning: false };
    dirtyRef.current = true;
    // Immediate flush so React sees isRunning=false THIS frame
    flushToReact();
  }, [flushToReact]);

  const setSpeed = useCallback((speed: number) => {
    worldRef.current = { ...worldRef.current, speed };
    dirtyRef.current = true;
    flushToReact();
  }, [flushToReact]);

  const reset = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (uiSyncRef.current) { clearInterval(uiSyncRef.current); uiSyncRef.current = null; }
    worldRef.current = createWorld();
    eventsRef.current = [];
    dirtyRef.current = false;
    setSnapshot({ world: worldRef.current, recentEvents: [], version: 0 });
  }, []);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const w = worldRef.current;
    if (w.isRunning) {
      const ms = Math.max(300, 1000 / w.speed);
      intervalRef.current = setInterval(engineTick, ms);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [snapshot.world.isRunning, snapshot.world.speed, engineTick]);

  useEffect(() => {
    if (uiSyncRef.current) {
      clearInterval(uiSyncRef.current);
      uiSyncRef.current = null;
    }

    if (snapshot.world.isRunning) {
      uiSyncRef.current = setInterval(flushToReact, UI_SYNC_INTERVAL);
    }

    return () => {
      if (uiSyncRef.current) clearInterval(uiSyncRef.current);
    };
  }, [snapshot.world.isRunning, flushToReact]);

  const formattedTime = useMemo(
    () => formatTime(snapshot.world.time),
    [snapshot.world.time.day, snapshot.world.time.hour]
  );

  return {
    world: snapshot.world,
    recentEvents: snapshot.recentEvents,
    formattedTime,
    tick,
    play,
    pause,
    setSpeed,
    reset,
  };
}
