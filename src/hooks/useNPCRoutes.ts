'use client';

import { useRef, useCallback, useEffect } from 'react';
import { NPC } from '../engine/types';
import { getLocationCoords } from '../data/locations';
import { getRoute, interpolateRoute, RouteResult } from '../lib/routing';

export interface NPCRouteState {
  npcId: string;
  position: [number, number];
  route: [number, number][] | null;
  progress: number;
  targetLocation: string;
  previousLocation: string;
  isMoving: boolean;
  destination: { lat: number; lng: number };
  routeDuration: number;
  routeDistance: number;
}

const ANIMATION_SPEED = 0.008;

/**
 * @param npcs     - current NPC map from simulation
 * @param isRunning - simulation running state (pauses animation)
 * @param active    - whether the map is VISIBLE (false = skip ALL work)
 */
export function useNPCRoutes(npcs: Map<string, NPC>, isRunning: boolean, active: boolean) {
  const routeStatesRef = useRef<Map<string, NPCRouteState>>(new Map());
  const lastLocationsRef = useRef<Map<string, string>>(new Map());
  const animFrameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const listenersRef = useRef<Set<() => void>>(new Set());
  const versionRef = useRef(0);
  const isRunningRef = useRef(isRunning);
  const activeRef = useRef(active);

  // Sync refs
  useEffect(() => {
    isRunningRef.current = isRunning;
    activeRef.current = active;

    // If not active OR not running: kill animation loop immediately
    if (!isRunning || !active) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    // Resumed + active: restart if any NPC is mid-route
    let anyMoving = false;
    for (const [, state] of routeStatesRef.current) {
      if (state.isMoving && state.route && state.route.length >= 2 && state.progress < 1) {
        anyMoving = true;
        break;
      }
    }
    if (anyMoving) startAnimation();
  }, [isRunning, active]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, []);

  const notify = useCallback(() => {
    versionRef.current++;
    for (const fn of listenersRef.current) fn();
  }, []);

  const startAnimation = useCallback(() => {
    if (animFrameRef.current || !mountedRef.current) return;

    const animate = () => {
      if (!mountedRef.current) {
        animFrameRef.current = null;
        return;
      }

      // STOP if paused or hidden
      if (!isRunningRef.current || !activeRef.current) {
        animFrameRef.current = null;
        return;
      }

      let anyMoving = false;

      for (const [, state] of routeStatesRef.current) {
        if (!state.isMoving || !state.route || state.route.length < 2) continue;

        state.progress = Math.min(1, state.progress + ANIMATION_SPEED);
        state.position = interpolateRoute(state.route, state.progress);

        if (state.progress >= 1) {
          state.isMoving = false;
          state.position = [state.destination.lng, state.destination.lat];
        } else {
          anyMoving = true;
        }
      }

      notify();

      if (anyMoving) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [notify]);

  // Detect NPC location changes — skip entirely when not active
  useEffect(() => {
    if (!active) return;

    for (const [id, npc] of npcs) {
      const prevLoc = lastLocationsRef.current.get(id);
      const curLoc = npc.currentLocation;

      if (prevLoc === curLoc) continue;

      const prevCoords = prevLoc
        ? getLocationCoords(prevLoc as any, id)
        : getLocationCoords(curLoc, id);
      const targetCoords = getLocationCoords(curLoc, id);

      const currentState = routeStatesRef.current.get(id);
      const startPos: [number, number] = currentState
        ? currentState.position
        : [prevCoords.lng, prevCoords.lat];

      const initialState: NPCRouteState = {
        npcId: id,
        position: startPos,
        route: null,
        progress: 0,
        targetLocation: curLoc,
        previousLocation: prevLoc ?? curLoc,
        isMoving: prevLoc !== undefined && prevLoc !== curLoc,
        destination: targetCoords,
        routeDuration: 0,
        routeDistance: 0,
      };
      routeStatesRef.current.set(id, initialState);
      lastLocationsRef.current.set(id, curLoc);

      if (prevLoc !== undefined && prevLoc !== curLoc) {
        const fromCoords = { lat: startPos[1], lng: startPos[0] };
        getRoute(fromCoords, targetCoords).then((result: RouteResult) => {
          if (!mountedRef.current) return;
          const state = routeStatesRef.current.get(id);
          if (state && state.targetLocation === curLoc) {
            state.route = result.coordinates;
            state.routeDuration = result.duration;
            state.routeDistance = result.distance;
            state.progress = 0;
            state.isMoving = true;
            if (isRunningRef.current && activeRef.current) {
              startAnimation();
            }
          }
        });
      } else {
        initialState.position = [targetCoords.lng, targetCoords.lat];
        initialState.progress = 1;
        initialState.isMoving = false;
      }
    }

    notify();
    if (isRunningRef.current && activeRef.current) {
      startAnimation();
    }
  }, [npcs, active, startAnimation, notify]);

  return {
    statesRef: routeStatesRef,
    versionRef,
    subscribe: useCallback((fn: () => void) => {
      listenersRef.current.add(fn);
      return () => { listenersRef.current.delete(fn); };
    }, []),
  };
}
