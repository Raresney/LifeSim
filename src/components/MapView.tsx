'use client';

import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { NPC, SimEvent } from '../engine/types';
import { AvatarConfig } from '../engine/avatar';
import { getLocationCoords, IASI_CENTER, DEFAULT_ZOOM, LOCATION_POINTS } from '../data/locations';
import { useNPCRoutes, NPCRouteState } from '../hooks/useNPCRoutes';
import { prefetchRoutes as prefetchOSRM } from '../lib/routing';

const MOOD_HEX: Record<string, string> = {
  happy: '#22c55e', sad: '#3b82f6', angry: '#ef4444',
  anxious: '#eab308', confident: '#a855f7', bored: '#9ca3af',
  excited: '#f97316', stressed: '#f87171', content: '#34d399',
  jealous: '#ca8a04',
};

const ACTIVITY_ICON: Record<string, string> = {
  sleeping: '🌙', working: '💼', eating: '🍽️', traveling: '🚶',
  relaxing: '🛋️', socializing: '💬', exercising: '🏃', shopping: '🛒',
  studying: '📚', entertaining: '🎮', arguing: '😡', flirting: '💕',
  scheming: '🤫', helping: '🤝', gossiping: '👀',
};

function getDayNightConfig(hour: number): {
  tileURL: string;
  overlayColor: string;
  overlayOpacity: number;
  buildingColor: string;
  buildingHighlight: string;
  showStars: boolean;
  skyGradient: string;
} {
  // Night (22-5)
  if (hour >= 22 || hour <= 4) return {
    tileURL: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    overlayColor: '#0a1628',
    overlayOpacity: 0.35,
    buildingColor: '#1a2744',
    buildingHighlight: '#2d4a7a',
    showStars: true,
    skyGradient: 'linear-gradient(to bottom, #0a1628, #1a2744)',
  };
  // Dawn (5-7)
  if (hour >= 5 && hour <= 7) return {
    tileURL: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    overlayColor: '#f4a460',
    overlayOpacity: 0.12,
    buildingColor: '#d4a574',
    buildingHighlight: '#e8c098',
    showStars: false,
    skyGradient: 'linear-gradient(to bottom, #87ceeb, #ffd89b)',
  };
  // Day (8-17)
  if (hour >= 8 && hour <= 17) return {
    tileURL: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    overlayColor: 'transparent',
    overlayOpacity: 0,
    buildingColor: '#c8d6e5',
    buildingHighlight: '#dfe6ed',
    showStars: false,
    skyGradient: 'linear-gradient(to bottom, #87ceeb, #e0f0ff)',
  };
  // Sunset (18-19)
  if (hour >= 18 && hour <= 19) return {
    tileURL: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    overlayColor: '#ff6b35',
    overlayOpacity: 0.15,
    buildingColor: '#c84b31',
    buildingHighlight: '#e8724a',
    showStars: false,
    skyGradient: 'linear-gradient(to bottom, #4a6fa5, #ff6b35)',
  };
  // Dusk (20-21)
  return {
    tileURL: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    overlayColor: '#1a2744',
    overlayOpacity: 0.25,
    buildingColor: '#2a3f6f',
    buildingHighlight: '#3b5998',
    showStars: hour >= 21,
    skyGradient: 'linear-gradient(to bottom, #111d35, #2a3f6f)',
  };
}

function createNPCMarkerEl(npc: NPC, focused: boolean): HTMLDivElement {
  const color = MOOD_HEX[npc.currentMood] ?? '#9ca3af';
  const emoji = ACTIVITY_ICON[npc.currentActivity] ?? '❓';
  const el = document.createElement('div');
  el.className = 'npc-map-marker';
  el.style.cssText = 'cursor:pointer; pointer-events:auto;';

  const glow = focused
    ? `box-shadow: 0 0 18px 5px ${color}50, 0 4px 14px rgba(0,0,0,0.12); animation: marker-pulse 2s ease-in-out infinite;`
    : `box-shadow: 0 2px 12px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.08);`;
  const borderW = focused ? '3px' : '2px';
  const scale = focused ? 'scale(1.12)' : 'scale(1)';

  el.innerHTML = `
    <div style="
      display:flex; flex-direction:column; align-items:center;
      transform: translate(-50%, -100%) ${scale};
      transition: transform 0.3s ease;
    ">
      <div style="
        background:rgba(255,255,255,0.94); border:${borderW} solid ${color};
        border-radius:16px; padding:4px 12px 4px 6px;
        display:flex; align-items:center; gap:7px;
        ${glow}
        backdrop-filter:blur(14px);
      ">
        <span style="font-size:16px; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.15));">${emoji}</span>
        <div style="display:flex; flex-direction:column;">
          <span style="font-size:${focused ? '12px' : '11px'}; color:#1e293b; font-family:system-ui;
            white-space:nowrap; font-weight:${focused ? '700' : '500'}; line-height:1.2;">
            ${npc.name}
          </span>
          <span style="font-size:9px; color:#64748b; font-family:system-ui; line-height:1.1;">
            ${npc.currentActivity} @ ${npc.currentLocation}
          </span>
        </div>
      </div>
      <div style="
        width:0; height:0;
        border-left:7px solid transparent; border-right:7px solid transparent;
        border-top:8px solid ${focused ? color : 'rgba(255,255,255,0.94)'};
        filter:drop-shadow(0 1px 3px rgba(0,0,0,0.08));
      "></div>
    </div>
  `;
  return el;
}

function createPOIMarkerEl(icon: string, name: string, type: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'poi-map-marker';
  el.style.cssText = 'cursor:pointer; pointer-events:auto;';
  el.innerHTML = `
    <div style="
      display:flex; flex-direction:column; align-items:center;
      transform:translate(-50%, -50%);
    ">
      <span style="font-size:24px; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.18));">${icon}</span>
      <span style="
        font-size:10px; color:#475569; font-family:system-ui;
        background:rgba(255,255,255,0.9); padding:2px 7px; border-radius:6px;
        white-space:nowrap; margin-top:2px; backdrop-filter:blur(8px);
        box-shadow:0 1px 4px rgba(0,0,0,0.08); font-weight:500;
      ">${name}</span>
    </div>
  `;
  return el;
}

function createEventMarkerEl(text: string, type: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'event-map-marker';
  el.style.cssText = 'pointer-events:none;';

  const colors: Record<string, string> = {
    social: '#3b82f6',
    conflict: '#ef4444',
    life_event: '#a855f7',
    goal: '#22c55e',
    mood_change: '#eab308',
    rumor: '#f97316',
    economic: '#14b8a6',
  };
  const color = colors[type] ?? '#64748b';

  el.innerHTML = `
    <div style="
      transform:translate(-50%, -100%);
      animation: event-float 3s ease-out forwards;
    ">
      <div style="
        background:${color}; color:white;
        font-size:10px; font-family:system-ui; font-weight:600;
        padding:4px 10px; border-radius:10px;
        box-shadow:0 2px 10px ${color}40;
        white-space:nowrap; max-width:200px; overflow:hidden; text-overflow:ellipsis;
      ">${text}</div>
    </div>
  `;
  return el;
}

function buildingPopupHTML(
  loc: typeof LOCATION_POINTS[0],
  npcsInside: NPC[],
): string {
  const npcList = npcsInside.length > 0
    ? npcsInside.map(n =>
      `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;">
        <span style="font-size:12px;">${ACTIVITY_ICON[n.currentActivity] ?? '❓'}</span>
        <span style="font-size:11px;color:#334155;font-weight:500;">${n.name}</span>
        <span style="font-size:9px;color:#94a3b8;">— ${n.currentActivity}</span>
      </div>`
    ).join('')
    : '<div style="font-size:11px;color:#94a3b8;padding:3px 0;">No one here right now</div>';

  return `
    <div style="font-family:system-ui;min-width:180px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="font-size:20px;">${loc.icon}</span>
        <div>
          <div style="font-size:13px;font-weight:700;color:#1e293b;">${loc.name}</div>
          <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">${loc.type}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#64748b;margin-bottom:8px;">${loc.description}</div>
      <div style="border-top:1px solid #e2e8f0;padding-top:6px;">
        <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">
          NPCs Here (${npcsInside.length})
        </div>
        ${npcList}
      </div>
    </div>
  `;
}

const FollowPanel = memo(function FollowPanel({
  npc, routeState, isFollowing, onToggleFollow,
}: {
  npc: NPC;
  routeState: NPCRouteState | null;
  isFollowing: boolean;
  onToggleFollow: () => void;
}) {
  if (!routeState) return null;

  const distanceKm = routeState.routeDistance > 0
    ? (routeState.routeDistance / 1000).toFixed(1)
    : '—';
  const etaMin = routeState.routeDuration > 0
    ? Math.ceil(routeState.routeDuration * (1 - routeState.progress) / 60)
    : 0;

  return (
    <div style={{
      position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 10, pointerEvents: 'auto',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)',
        borderRadius: '16px', padding: '10px 16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid rgba(226,232,240,0.6)',
        display: 'flex', alignItems: 'center', gap: '14px',
        fontFamily: 'system-ui',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
            {ACTIVITY_ICON[npc.currentActivity] ?? '❓'} {npc.name}
          </span>
          <span style={{ fontSize: '10px', color: '#64748b' }}>
            {routeState.isMoving ? `→ ${npc.currentLocation}` : `@ ${npc.currentLocation}`}
          </span>
        </div>

        {routeState.isMoving && (
          <div style={{
            display: 'flex', gap: '10px', padding: '0 10px',
            borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#3b82f6' }}>{distanceKm} km</div>
              <div style={{ fontSize: '8px', color: '#94a3b8', textTransform: 'uppercase' }}>distance</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#22c55e' }}>{etaMin} min</div>
              <div style={{ fontSize: '8px', color: '#94a3b8', textTransform: 'uppercase' }}>ETA</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#a855f7' }}>🚶</div>
              <div style={{ fontSize: '8px', color: '#94a3b8', textTransform: 'uppercase' }}>walking</div>
            </div>
          </div>
        )}

        {routeState.isMoving && (
          <div style={{ width: '60px' }}>
            <div style={{
              height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: '2px',
                background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                width: `${routeState.progress * 100}%`,
                transition: 'width 0.1s linear',
              }} />
            </div>
          </div>
        )}

        <button
          onClick={onToggleFollow}
          style={{
            background: isFollowing ? '#3b82f6' : 'rgba(59,130,246,0.1)',
            color: isFollowing ? 'white' : '#3b82f6',
            border: isFollowing ? 'none' : '1px solid rgba(59,130,246,0.2)',
            borderRadius: '10px', padding: '6px 14px',
            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
            fontFamily: 'system-ui', transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {isFollowing ? '📍 Following' : '📍 Follow'}
        </button>
      </div>
    </div>
  );
});

const NightStars = memo(function NightStars() {
  const stars = useMemo(() => {
    const s: { x: number; y: number; size: number; delay: number }[] = [];
    for (let i = 0; i < 50; i++) {
      s.push({
        x: ((i * 7919 + 104729) % 10000) / 100,
        y: ((i * 6271 + 32749) % 10000) / 100,
        size: 1 + ((i * 3) % 3),
        delay: ((i * 1777) % 3000) / 1000,
      });
    }
    return s;
  }, []);

  return (
    <svg style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', width: '100%', height: '100%' }}>
      {stars.map((star, i) => (
        <circle key={i} cx={`${star.x}%`} cy={`${star.y}%`} r={star.size / 2} fill="white" opacity={0.6}>
          <animate attributeName="opacity" values="0.2;0.9;0.2" dur={`${2 + star.delay}s`} begin={`${star.delay}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
});

const Moon = memo(function Moon({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'absolute', top: 24, right: 60, zIndex: 3,
      pointerEvents: 'none',
      width: 30, height: 30, borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 35%, #fef9c3, #fde68a 40%, #d4a520)',
      boxShadow: '0 0 20px 6px rgba(253,230,138,0.3), 0 0 60px 15px rgba(253,230,138,0.1)',
      opacity: 0.85,
      transition: 'opacity 1.5s ease',
    }} />
  );
});

const ZoomHint = memo(function ZoomHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)',
      zIndex: 5, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(226,232,240,0.6)', borderRadius: '12px',
      padding: '8px 16px', color: '#007AFF',
      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      fontSize: '11px', fontFamily: 'system-ui', whiteSpace: 'nowrap',
      pointerEvents: 'none', animation: 'fade-in 0.3s ease',
    }}>
      Zoom out more to return to globe view
    </div>
  );
});

interface Props {
  npcs: Map<string, NPC>;
  avatars: Record<string, AvatarConfig>;
  onNPCClick: (npc: NPC) => void;
  focusedNPCId: string | null;
  onZoomOutToGlobe?: () => void;
  hour?: number;
  recentEvents?: SimEvent[];
}

export default function MapView({
  npcs, avatars, onNPCClick, focusedNPCId, onZoomOutToGlobe, hour = 12, recentEvents,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const poiMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const eventMarkersRef = useRef<Array<{ marker: maplibregl.Marker; created: number }>>([]);
  const routeLayerRef = useRef<boolean>(false);
  const followingRef = useRef<boolean>(false);
  const zoomHintTriggeredRef = useRef(false);
  const npcsRef = useRef(npcs);
  npcsRef.current = npcs;

  const [isFollowing, setIsFollowing] = useState(false);
  const [showZoomHint, setShowZoomHint] = useState(false);

  const routePositions = useNPCRoutes(npcs);

  const focusedNPC = focusedNPCId ? npcs.get(focusedNPCId) ?? null : null;
  const focusedRouteState = focusedNPCId ? routePositions.get(focusedNPCId) ?? null : null;

  const dayNight = useMemo(() => getDayNightConfig(hour), [hour]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (!document.getElementById('mapview-css')) {
      const style = document.createElement('style');
      style.id = 'mapview-css';
      style.textContent = `
        @keyframes marker-pulse {
          0%, 100% { transform: translate(-50%, -100%) scale(1.12); }
          50% { transform: translate(-50%, -100%) scale(1.2); }
        }
        @keyframes event-float {
          0% { opacity: 1; transform: translate(-50%, -100%) translateY(0); }
          70% { opacity: 1; transform: translate(-50%, -100%) translateY(-30px); }
          100% { opacity: 0; transform: translate(-50%, -100%) translateY(-50px); }
        }
        .maplibregl-popup-content {
          border-radius: 12px !important;
          padding: 12px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.12) !important;
        }
        .maplibregl-popup-close-button {
          font-size: 16px !important;
          padding: 4px 8px !important;
        }
      `;
      document.head.appendChild(style);
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          'carto-tiles': {
            type: 'raster',
            tiles: [dayNight.tileURL.replace('{r}', '@2x')],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          },
        },
        layers: [
          {
            id: 'carto-base',
            type: 'raster',
            source: 'carto-tiles',
            minzoom: 0,
            maxzoom: 20,
          },
        ],
      },
      center: [IASI_CENTER.lng, IASI_CENTER.lat],
      zoom: DEFAULT_ZOOM,
      pitch: 45,
      bearing: -15,
      minZoom: 8,
      maxZoom: 18,
    } as any);

    map.addControl(new maplibregl.NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: true,
    }), 'top-right');

    map.on('load', () => {
      try {
        map.addSource('osm-buildings', {
          type: 'vector',
          url: 'https://tiles.openfreemap.org/planet',
        });
        map.addLayer({
          id: '3d-buildings',
          source: 'osm-buildings',
          'source-layer': 'building',
          type: 'fill-extrusion',
          minzoom: 13,
          paint: {
            'fill-extrusion-color': dayNight.buildingColor,
            'fill-extrusion-height': [
              'coalesce',
              ['get', 'render_height'],
              ['*', ['coalesce', ['get', 'building:levels'], 3], 3.5],
            ],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 0.7,
          },
        });
      } catch (e) {
        console.log('3D buildings not available:', e);
      }

      map.addSource('npc-route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
      });

      map.addLayer({
        id: 'npc-route-glow',
        type: 'line',
        source: 'npc-route',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 8,
          'line-opacity': 0.2,
          'line-blur': 6,
        },
      });

      map.addLayer({
        id: 'npc-route-line',
        type: 'line',
        source: 'npc-route',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 3,
          'line-opacity': 0.8,
          'line-dasharray': [2, 3],
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      });

      routeLayerRef.current = true;

      for (const loc of LOCATION_POINTS) {
        const el = createPOIMarkerEl(loc.icon, loc.name, loc.type);

        el.addEventListener('click', () => {
          const npcsHere = Array.from(npcsRef.current.values()).filter(n => n.currentLocation === loc.id);
          new maplibregl.Popup({ offset: 15, maxWidth: '260px' })
            .setLngLat([loc.lng, loc.lat])
            .setHTML(buildingPopupHTML(loc, npcsHere))
            .addTo(map);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([loc.lng, loc.lat])
          .addTo(map);
        poiMarkersRef.current.set(loc.id, marker);
      }
    });

    map.on('zoomend', () => {
      const zoom = map.getZoom();
      if (zoom <= 12 && zoom > 10) {
        setShowZoomHint(true);
      } else {
        setShowZoomHint(false);
      }
      if (zoom <= 10 && onZoomOutToGlobe && !zoomHintTriggeredRef.current) {
        zoomHintTriggeredRef.current = true;
        onZoomOutToGlobe();
      }
    });

    mapRef.current = map;

    const poiLocs = LOCATION_POINTS.map(l => ({ lat: l.lat, lng: l.lng, id: l.id }));
    prefetchOSRM(poiLocs).catch(() => {});

    return () => {
      for (const m of markersRef.current.values()) m.remove();
      for (const m of poiMarkersRef.current.values()) m.remove();
      for (const { marker } of eventMarkersRef.current) marker.remove();
      markersRef.current.clear();
      poiMarkersRef.current.clear();
      eventMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const activeIds = new Set<string>();

    for (const [id, npc] of npcs) {
      activeIds.add(id);

      const routeState = routePositions.get(id);
      let lng: number, lat: number;
      if (routeState) {
        [lng, lat] = routeState.position;
      } else {
        const coords = getLocationCoords(npc.currentLocation, id);
        lng = coords.lng;
        lat = coords.lat;
      }

      const focused = id === focusedNPCId;
      const existing = markersRef.current.get(id);

      if (existing) {
          existing.setLngLat([lng, lat]);
        const el = existing.getElement();
        const wasFocused = el.dataset.focused === 'true';
        const prevActivity = el.dataset.activity;
        if (wasFocused !== focused || prevActivity !== npc.currentActivity || el.dataset.mood !== npc.currentMood) {
          const newEl = createNPCMarkerEl(npc, focused);
          newEl.dataset.focused = String(focused);
          newEl.dataset.activity = npc.currentActivity;
          newEl.dataset.mood = npc.currentMood;
          newEl.addEventListener('click', (e) => {
            e.stopPropagation();
            onNPCClick(npc);
          });
          existing.getElement().replaceWith(newEl);
          existing.remove();
          const newMarker = new maplibregl.Marker({ element: newEl, anchor: 'bottom' })
            .setLngLat([lng, lat])
            .addTo(map);
          markersRef.current.set(id, newMarker);
        }
      } else {
        const el = createNPCMarkerEl(npc, focused);
        el.dataset.focused = String(focused);
        el.dataset.activity = npc.currentActivity;
        el.dataset.mood = npc.currentMood;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onNPCClick(npc);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .addTo(map);
        markersRef.current.set(id, marker);
      }
    }

    for (const [id, marker] of markersRef.current) {
      if (!activeIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }
  }, [npcs, routePositions, focusedNPCId, onNPCClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeLayerRef.current) return;

    const source = map.getSource('npc-route') as maplibregl.GeoJSONSource;
    if (!source) return;

    if (focusedRouteState?.route && focusedRouteState.route.length >= 2) {
      source.setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: focusedRouteState.route,
        },
        properties: {},
      });
    } else {
      source.setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [] },
        properties: {},
      });
    }
  }, [focusedRouteState]);

  useEffect(() => {
    followingRef.current = isFollowing;
  }, [isFollowing]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !followingRef.current || !focusedRouteState) return;

    const [lng, lat] = focusedRouteState.position;
    map.easeTo({
      center: [lng, lat],
      duration: 300,
      easing: (t) => t,
    });
  }, [focusedRouteState?.position[0], focusedRouteState?.position[1]]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusedNPCId) return;

    const routeState = routePositions.get(focusedNPCId);
    if (routeState) {
      map.flyTo({
        center: routeState.position as [number, number],
        zoom: 16,
        pitch: 50,
        bearing: -15,
        duration: 1200,
      });
    } else {
      const coords = getLocationCoords(
        npcs.get(focusedNPCId)?.currentLocation ?? 'home',
        focusedNPCId,
      );
      map.flyTo({
        center: [coords.lng, coords.lat],
        zoom: 16,
        pitch: 50,
        bearing: -15,
        duration: 1200,
      });
    }
  }, [focusedNPCId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const update = () => {
      if (map.getLayer('3d-buildings')) {
        try {
          map.setPaintProperty('3d-buildings', 'fill-extrusion-color', dayNight.buildingColor);
          const nightOpacity = dayNight.overlayOpacity > 0.2 ? 0.5 : 0.7;
          map.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', nightOpacity);
        } catch {
          }
      }
    };

    if (map.isStyleLoaded()) {
      update();
    } else {
      map.on('load', update);
    }
  }, [dayNight]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !recentEvents || recentEvents.length === 0) return;

    const interesting = recentEvents.filter(e =>
      e.type !== 'action' && e.type !== 'economic'
    );

    for (const event of interesting.slice(-3)) { // max 3 at a time
      const npcId = event.involvedNPCs[0];
      if (!npcId) continue;

      const routeState = routePositions.get(npcId);
      let lng: number, lat: number;
      if (routeState) {
        [lng, lat] = routeState.position;
      } else {
        const npc = npcs.get(npcId);
        if (!npc) continue;
        const coords = getLocationCoords(npc.currentLocation, npcId);
        lng = coords.lng;
        lat = coords.lat;
      }

      const text = event.description.length > 40
        ? event.description.slice(0, 37) + '...'
        : event.description;

      const el = createEventMarkerEl(text, event.type);
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng, lat + 0.0003]) // Offset slightly above NPC
        .addTo(map);

      eventMarkersRef.current.push({ marker, created: Date.now() });

      setTimeout(() => {
        marker.remove();
        eventMarkersRef.current = eventMarkersRef.current.filter(m => m.marker !== marker);
      }, 3200);
    }
  }, [recentEvents]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      eventMarkersRef.current = eventMarkersRef.current.filter(({ marker, created }) => {
        if (now - created > 4000) {
          marker.remove();
          return false;
        }
        return true;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleFollow = useCallback(() => {
    setIsFollowing(prev => !prev);
  }, []);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

      {dayNight.overlayOpacity > 0 && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          pointerEvents: 'none',
          background: dayNight.overlayColor,
          opacity: dayNight.overlayOpacity,
          transition: 'opacity 1.5s ease, background 1.5s ease',
          mixBlendMode: 'multiply',
        }} />
      )}

      {dayNight.showStars && <NightStars />}

      <Moon visible={hour >= 21 || hour <= 5} />

      {focusedNPC && focusedRouteState && (
        <FollowPanel
          npc={focusedNPC}
          routeState={focusedRouteState}
          isFollowing={isFollowing}
          onToggleFollow={handleToggleFollow}
        />
      )}

      <ZoomHint show={showZoomHint} />
    </div>
  );
}
