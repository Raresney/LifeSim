'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { NPC } from '../engine/types';
import { AvatarConfig } from '../engine/avatar';
import { getLocationCoords, IASI_CENTER, LOCATION_POINTS } from '../data/locations';

const MOOD_HEX: Record<string, string> = {
  happy: '#22c55e', sad: '#3b82f6', angry: '#ef4444',
  anxious: '#eab308', confident: '#a855f7', bored: '#9ca3af',
  excited: '#f97316', stressed: '#f87171', content: '#34d399',
  jealous: '#ca8a04',
};

const ACTIVITY_EMOJI: Record<string, string> = {
  sleeping: '😴', working: '💼', eating: '🍽️', traveling: '🚶',
  relaxing: '🛋️', socializing: '💬', exercising: '🏃', shopping: '🛒',
  studying: '📚', entertaining: '🎮', arguing: '😡', flirting: '💕',
  scheming: '🤫', helping: '🤝', gossiping: '👀',
};

const ROMANIA_ID = '642';

interface Props {
  npcs: Map<string, NPC>;
  avatars: Record<string, AvatarConfig>;
  onNPCClick: (npc: NPC) => void;
  focusedNPCId: string | null;
  onZoomIn?: () => void;
}

interface GlobePoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
  color: string;
  size: number;
  isPOI: boolean;
  emoji: string;
  npc?: NPC;
}

export default function GlobeView({ npcs, avatars, onNPCClick, focusedNPCId, onZoomIn }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const zoomTriggeredRef = useRef(false);
  const rendererRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  const getPoints = useCallback((): GlobePoint[] => {
    const points: GlobePoint[] = [];

    for (const loc of LOCATION_POINTS) {
      points.push({
        id: `poi_${loc.id}`,
        lat: loc.lat, lng: loc.lng, name: loc.name,
        color: 'rgba(59,130,246,0.7)', size: 0.06,
        isPOI: true, emoji: loc.icon,
      });
    }

    for (const [id, npc] of npcs) {
      const coords = getLocationCoords(npc.currentLocation, id);
      const focused = id === focusedNPCId;
      points.push({
        id, lat: coords.lat, lng: coords.lng, name: npc.name,
        color: MOOD_HEX[npc.currentMood] ?? '#9ca3af',
        size: focused ? 0.12 : 0.08,
        isPOI: false,
        emoji: ACTIVITY_EMOJI[npc.currentActivity] ?? '❓',
        npc,
      });
    }

    return points;
  }, [npcs, focusedNPCId]);

  useEffect(() => {
    if (!containerRef.current || mounted) return;

    let countryFeatures: any[] = [];
    let destroyed = false;

    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(topology => {
        if (destroyed) return;
        import('topojson-client').then(topojson => {
          if (destroyed) return;
          countryFeatures = (topojson.feature(topology, topology.objects.countries) as any).features;
          if (globeRef.current) {
            globeRef.current.polygonsData(countryFeatures);
          }
        }).catch(() => {});
      })
      .catch(() => {});

    import('globe.gl').then((mod) => {
      if (destroyed) return;
      const Globe = mod.default;
      const globe = new (Globe as any)(containerRef.current!)
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        .showGraticules(false)
        .pointOfView({ lat: 30, lng: 10, altitude: 2.5 }, 0)
        .polygonsData(countryFeatures)
        .polygonCapColor((d: any) => {
          if (d.id === ROMANIA_ID) return 'rgba(59, 130, 246, 0.12)';
          return 'rgba(0,0,0,0)';
        })
        .polygonSideColor(() => 'rgba(0,0,0,0)')
        .polygonStrokeColor((d: any) => {
          if (d.id === ROMANIA_ID) return 'rgba(59, 130, 246, 0.7)';
          return 'rgba(255,255,255,0.15)';
        })
        .polygonAltitude((d: any) => d.id === ROMANIA_ID ? 0.004 : 0.001)
        .pointsData(getPoints())
        .pointLat('lat')
        .pointLng('lng')
        .pointColor('color')
        .pointAltitude((d: any) => d.isPOI ? 0.006 : 0.014)
        .pointRadius((d: any) => d.size)
        .pointLabel((d: any) => {
          if (d.isPOI) {
            return `<div style="font-family:system-ui;font-size:11px;background:#ffffffee;color:#334155;padding:4px 10px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
              ${d.emoji} ${d.name}
            </div>`;
          }
          return `<div style="font-family:system-ui;font-size:12px;background:#ffffffee;color:#1e293b;padding:6px 12px;border-radius:8px;border:2px solid ${d.color};box-shadow:0 2px 12px rgba(0,0,0,0.2);">
            <div style="font-weight:600;">${d.emoji} ${d.name}</div>
            <div style="font-size:10px;color:#64748b;margin-top:2px;">${d.npc?.currentActivity ?? ''} @ ${d.npc?.currentLocation ?? ''}</div>
          </div>`;
        })
        .onPointClick((point: any) => {
          if (point.npc) onNPCClick(point.npc);
        })
        .htmlElementsData(getPoints().filter(p => !p.isPOI))
        .htmlElement((d: any) => {
          const el = document.createElement('div');
          el.style.cssText = `
            pointer-events: auto; cursor: pointer;
            display: flex; flex-direction: column; align-items: center;
            transform: translate(-50%, -100%);
          `;
          const focused = d.id === focusedNPCId;
          const glow = focused
            ? `box-shadow: 0 0 16px 4px ${d.color}60; animation: globe-marker-pulse 2s ease-in-out infinite;`
            : 'box-shadow: 0 2px 10px rgba(0,0,0,0.3);';

          el.innerHTML = `
            <div style="
              background: linear-gradient(135deg, #ffffffee, #f0f9ffee);
              border: 2px solid ${d.color}; border-radius: 22px;
              padding: 4px 12px; display: flex; align-items: center; gap: 6px;
              ${glow}
              transition: all 0.3s ease;
            ">
              <span style="font-size: 14px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2));">${d.emoji}</span>
              <span style="font-size: 11px; color: #1e293b; font-family: system-ui; white-space: nowrap;
                font-weight: ${focused ? '700' : '500'}; letter-spacing: 0.01em;">${d.name}</span>
            </div>
            <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${d.color}; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));"></div>
          `;
          el.onclick = () => { if (d.npc) onNPCClick(d.npc); };
          return el;
        })
        .htmlAltitude(0.018)
        .atmosphereColor('#87CEEB')
        .atmosphereAltitude(0.25)
        .width(containerRef.current!.clientWidth)
        .height(containerRef.current!.clientHeight);

      const globeMat = globe.globeMaterial();
      globeMat.bumpScale = 3;

      const renderer = globe.renderer();
      rendererRef.current = renderer;
      renderer.domElement.style.outline = 'none';

      if (!document.getElementById('globe-pulse-css')) {
        const style = document.createElement('style');
        style.id = 'globe-pulse-css';
        style.textContent = `
          @keyframes globe-marker-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.08); }
          }
        `;
        document.head.appendChild(style);
      }

      globeRef.current = globe;
      setMounted(true);

      const controls = globe.controls();
      controlsRef.current = controls;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;
      controls.enableDamping = true;
      controls.dampingFactor = 0.15;
      controls.minDistance = 101;
      controls.maxDistance = 600;
      controls.rotateSpeed = 0.6;
      controls.zoomSpeed = 0.8;

      controls.addEventListener('change', () => {
        if (!globeRef.current || !onZoomIn || zoomTriggeredRef.current) return;
        const pov = globeRef.current.pointOfView();
        if (pov.altitude < 0.1) {
          zoomTriggeredRef.current = true;
          onZoomIn();
        }
      });

      setTimeout(() => {
        if (destroyed) return;
        globe.pointOfView(
          { lat: IASI_CENTER.lat, lng: IASI_CENTER.lng, altitude: 0.5 },
          3000
        );
        setTimeout(() => {
          if (!destroyed && controls) controls.autoRotate = false;
        }, 3200);
      }, 800);
    });

    return () => {
      destroyed = true;

      // 1. Stop orbit controls (stops their internal event listeners + RAF updates)
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }

      // 2. Pause globe.gl's internal animation loop
      if (globeRef.current) {
        try {
          // globe.gl exposes pauseAnimation() to stop its internal RAF
          if (typeof globeRef.current.pauseAnimation === 'function') {
            globeRef.current.pauseAnimation();
          }
          // Clear all data to reduce Three.js scene size before dispose
          globeRef.current.pointsData([]);
          globeRef.current.htmlElementsData([]);
          globeRef.current.polygonsData([]);
        } catch {}
      }

      // 3. Dispose WebGL renderer (frees GPU memory)
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
        rendererRef.current = null;
      }

      // 4. Remove canvas from DOM
      if (containerRef.current) {
        const canvas = containerRef.current.querySelector('canvas');
        if (canvas) canvas.remove();
      }

      globeRef.current = null;
    };
  }, []);

  useEffect(() => {
    zoomTriggeredRef.current = false;
  }, []);

  const lastUpdateRef = useRef(0);
  const pendingUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevFocusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!globeRef.current) return;

    const doUpdate = () => {
      if (!globeRef.current) return;
      const points = getPoints();
      globeRef.current.pointsData(points);
      const focusChanged = prevFocusRef.current !== focusedNPCId;
      if (focusChanged) {
        prevFocusRef.current = focusedNPCId;
        globeRef.current.htmlElementsData(points.filter((p: GlobePoint) => !p.isPOI));
      }
      lastUpdateRef.current = Date.now();
    };

    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;

    if (elapsed >= 1000) {
      doUpdate();
    } else {
      if (pendingUpdateRef.current) clearTimeout(pendingUpdateRef.current);
      pendingUpdateRef.current = setTimeout(doUpdate, 1000 - elapsed);
    }

    return () => {
      if (pendingUpdateRef.current) clearTimeout(pendingUpdateRef.current);
    };
  }, [npcs, focusedNPCId, getPoints]);

  useEffect(() => {
    const handleResize = () => {
      if (!globeRef.current || !containerRef.current) return;
      globeRef.current.width(containerRef.current.clientWidth);
      globeRef.current.height(containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
