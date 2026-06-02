'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { WorldState, SimEvent } from '../engine/types';
import { createWorld } from '../engine/world';
import { processTick, formatTime } from '../engine/tick';

/**
 * PERFORMANCE FIX: Simulation loop decoupled from React rendering.
 *
 * BEFORE: setWorld() called every tick → full React re-render at 10 FPS+
 * AFTER:  Engine runs in useRef, UI syncs at throttled rate (max ~4 FPS)
 *
 * This eliminates the #1 performance bottleneck.
 */

const UI_SYNC_INTERVAL = 250; // ms — sync React state ~4x/sec max

export function useSimulation() {
  // ── Authoritative state lives in refs (no React overhead) ──
  const worldRef = useRef<WorldState>(createWorld());
  const eventsRef = useRef<SimEvent[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uiSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dirtyRef = useRef(false);

  // ── React state: only for rendering, updated at throttled rate ──
  const [snapshot, setSnapshot] = useState<{
    world: WorldState;
    recentEvents: SimEvent[];
    version: number;
  }>(() => ({
    world: worldRef.current,
    recentEvents: [],
    version: 0,
  }));

  // ── Engine tick: pure computation, no React ──
  const engineTick = useCallback(() => {
    const { world: next, events } = processTick(worldRef.current);
    worldRef.current = next;
    eventsRef.current = events;
    dirtyRef.current = true;
  }, []);

  // ── Flush to React (throttled) ──
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

  // ── Manual single-step tick ──
  const tick = useCallback(() => {
    engineTick();
    // Immediate flush for manual step
    dirtyRef.current = false;
    const w = worldRef.current;
    const e = eventsRef.current;
    setSnapshot(prev => ({
      world: w,
      recentEvents: e,
      version: prev.version + 1,
    }));
  }, [engineTick]);

  // ── Play: start engine loop + UI sync loop ──
  const play = useCallback(() => {
    worldRef.current = { ...worldRef.current, isRunning: true };
    dirtyRef.current = true;
    flushToReact();
  }, [flushToReact]);

  // ── Pause: stop both loops ──
  const pause = useCallback(() => {
    worldRef.current = { ...worldRef.current, isRunning: false };
    dirtyRef.current = true;
    flushToReact();
  }, [flushToReact]);

  // ── Speed change ──
  const setSpeed = useCallback((speed: number) => {
    worldRef.current = { ...worldRef.current, speed };
    dirtyRef.current = true;
    flushToReact();
  }, [flushToReact]);

  // ── Reset ──
  const reset = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    worldRef.current = createWorld();
    eventsRef.current = [];
    dirtyRef.current = false;
    setSnapshot({ world: worldRef.current, recentEvents: [], version: 0 });
  }, []);

  // ── Engine interval: runs fast, no React involvement ──
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const w = worldRef.current;
    if (w.isRunning) {
      const ms = Math.max(150, 1000 / w.speed);
      intervalRef.current = setInterval(engineTick, ms);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [snapshot.world.isRunning, snapshot.world.speed, engineTick]);

  // ── UI sync interval: independent of engine speed ──
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
