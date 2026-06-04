'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { NPC } from '../engine/types';
import { getLocationCoords } from '../data/locations';
import { getRoute, interpolateRoute, RouteResult } from '../lib/routing';

export interface NPCRouteState {
  npcId: string;
  // Current interpolated position (GeoJSON order: [lng, lat])
  position: [number, number];
  // Full route from previous location to current target
  route: [number, number][] | null;
  // Route progress: 0 = at origin, 1 = at destination
  progress: number;
  // Target location id
  targetLocation: string;
  // Previous location id (where they came from)
  previousLocation: string;
  // Is this NPC currently in transit?
  isMoving: boolean;
  // Destination coordinates
  destination: { lat: number; lng: number };
  // Estimated arrival (route duration in seconds)
  routeDuration: number;
  // Route distance in meters
  routeDistance: number;
}

const ANIMATION_SPEED = 0.008;

export function useNPCRoutes(npcs: Map<string, NPC>) {
  const routeStatesRef = useRef<Map<string, NPCRouteState>>(new Map());
  const lastLocationsRef = useRef<Map<string, string>>(new Map());
  const animFrameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const lastFlushRef = useRef(0);

  const [positions, setPositions] = useState<Map<string, NPCRouteState>>(new Map());

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

  useEffect(() => {
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
          }
        });
      } else {
        initialState.position = [targetCoords.lng, targetCoords.lat];
        initialState.progress = 1;
        initialState.isMoving = false;
      }
    }

    startAnimation();
  }, [npcs]);

  const startAnimation = useCallback(() => {
    if (animFrameRef.current || !mountedRef.current) return;

    const animate = (now: number) => {
      if (!mountedRef.current) {
        animFrameRef.current = null;
        return;
      }

      let anyMoving = false;

      for (const [id, state] of routeStatesRef.current) {
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

      if (now - lastFlushRef.current > 66) {
        lastFlushRef.current = now;
        setPositions(new Map(routeStatesRef.current));
      }

      if (anyMoving) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setPositions(new Map(routeStatesRef.current));
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  return positions;
}
