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

  const getPoints = useCallback((): GlobePoint[] => {
    const points: GlobePoint[] = [];

    for (const loc of LOCATION_POINTS) {
      points.push({
        id: `poi_${loc.id}`,
        lat: loc.lat,
        lng: loc.lng,
        name: loc.name,
        color: 'rgba(59,130,246,0.7)',
        size: 0.06,
        isPOI: true,
        emoji: loc.icon,
      });
    }

    for (const [id, npc] of npcs) {
      const coords = getLocationCoords(npc.currentLocation, id);
      const focused = id === focusedNPCId;
      points.push({
        id,
        lat: coords.lat,
        lng: coords.lng,
        name: npc.name,
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

    // Load country borders GeoJSON
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(topology => {
        // Convert TopoJSON to GeoJSON features
        import('topojson-client').then(topojson => {
          countryFeatures = (topojson.feature(topology, topology.objects.countries) as any).features;
          if (globeRef.current) {
            globeRef.current.polygonsData(countryFeatures);
          }
        }).catch(() => {
          // topojson-client not installed, skip borders
        });
      })
      .catch(() => {});

    import('globe.gl').then((mod) => {
      const Globe = mod.default;
      const globe = new (Globe as any)(containerRef.current!)
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        .showGraticules(false)
        .pointOfView({ lat: 45, lng: 15, altitude: 2.0 }, 0)
        // Country polygons (borders)
        .polygonsData(countryFeatures)
        .polygonCapColor(() => 'rgba(0,0,0,0)')
        .polygonSideColor(() => 'rgba(0,0,0,0)')
        .polygonStrokeColor(() => 'rgba(219,39,119,0.45)')
        .polygonAltitude(0.001)
        // NPC & POI points
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
        // HTML markers for NPCs
        .htmlElementsData(getPoints().filter(p => !p.isPOI))
        .htmlElement((d: any) => {
          const el = document.createElement('div');
          el.style.cssText = `
            pointer-events: auto; cursor: pointer;
            display: flex; flex-direction: column; align-items: center;
            transform: translate(-50%, -100%);
          `;
          const focused = d.id === focusedNPCId;
          const glow = focused ? `box-shadow: 0 0 12px 3px ${d.color}50;` : 'box-shadow: 0 2px 8px rgba(0,0,0,0.2);';
          el.innerHTML = `
            <div style="
              background: #ffffffee; border: 2px solid ${d.color}; border-radius: 20px;
              padding: 3px 10px; display: flex; align-items: center; gap: 5px;
              ${glow}
            ">
              <span style="font-size: 13px;">${d.emoji}</span>
              <span style="font-size: 11px; color: #1e293b; font-family: system-ui; white-space: nowrap;
                font-weight: ${focused ? '700' : '500'};">${d.name}</span>
            </div>
            <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${d.color};"></div>
          `;
          el.onclick = () => { if (d.npc) onNPCClick(d.npc); };
          return el;
        })
        .htmlAltitude(0.018)
        .atmosphereColor('#6db3f2')
        .atmosphereAltitude(0.18)
        .width(containerRef.current!.clientWidth)
        .height(containerRef.current!.clientHeight);

      const globeMat = globe.globeMaterial();
      globeMat.bumpScale = 2;

      const renderer = globe.renderer();
      renderer.domElement.style.outline = 'none';

      globeRef.current = globe;
      setMounted(true);

      const controls = globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.2;
      controls.enableDamping = true;
      controls.dampingFactor = 0.12;
      controls.minDistance = 101;
      controls.maxDistance = 700;

      // Detect zoom-in: when altitude drops below threshold, switch to street map
      controls.addEventListener('change', () => {
        if (!globeRef.current || !onZoomIn) return;
        const pov = globeRef.current.pointOfView();
        if (pov.altitude < 0.08) {
          onZoomIn();
        }
      });

      // Animate from overview to Iași area
      setTimeout(() => {
        globe.pointOfView({ lat: IASI_CENTER.lat, lng: IASI_CENTER.lng, altitude: 0.6 }, 2000);
      }, 500);
    });

    return () => {
      if (globeRef.current && containerRef.current) {
        const canvas = containerRef.current.querySelector('canvas');
        if (canvas) canvas.remove();
        globeRef.current = null;
      }
    };
  }, []);

  // Update points when data changes
  useEffect(() => {
    if (!globeRef.current) return;
    const points = getPoints();
    globeRef.current.pointsData(points);
    globeRef.current.htmlElementsData(points.filter((p: GlobePoint) => !p.isPOI));
  }, [npcs, focusedNPCId, getPoints]);

  // Handle resize
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
