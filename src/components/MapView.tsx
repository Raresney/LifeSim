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

function getDayNightConfig(hour: number) {
  if (hour >= 22 || hour <= 4) return {
    tileURL: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    overlayColor: '#0a1628', overlayOpacity: 0.35,
    buildingColor: '#1a2744', buildingHighlight: '#2d4a7a',
    showStars: true,
  };
  if (hour >= 5 && hour <= 7) return {
    tileURL: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    overlayColor: '#f4a460', overlayOpacity: 0.12,
    buildingColor: '#d4a574', buildingHighlight: '#e8c098',
    showStars: false,
  };
  if (hour >= 8 && hour <= 17) return {
    tileURL: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    overlayColor: 'transparent', overlayOpacity: 0,
    buildingColor: '#c8d6e5', buildingHighlight: '#dfe6ed',
    showStars: false,
  };
  if (hour >= 18 && hour <= 19) return {
    tileURL: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    overlayColor: '#ff6b35', overlayOpacity: 0.15,
    buildingColor: '#c84b31', buildingHighlight: '#e8724a',
    showStars: false,
  };
  return {
    tileURL: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    overlayColor: '#1a2744', overlayOpacity: 0.25,
    buildingColor: '#2a3f6f', buildingHighlight: '#3b5998',
    showStars: hour >= 21,
  };
}

function updateNPCMarkerEl(el: HTMLDivElement, npc: NPC, focused: boolean): void {
  const color = MOOD_HEX[npc.currentMood] ?? '#9ca3af';
  const emoji = ACTIVITY_ICON[npc.currentActivity] ?? '❓';
  const glow = focused
    ? `box-shadow:0 0 18px 5px ${color}50,0 4px 14px rgba(0,0,0,0.12);animation:marker-pulse 2s ease-in-out infinite;`
    : `box-shadow:0 2px 8px rgba(0,0,0,0.10);`;
  const bw = focused ? '3px' : '2px';
  const sc = focused ? 'scale(1.12)' : 'scale(1)';
  el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%) ${sc};transition:transform 0.3s ease;">
    <div style="background:rgba(255,255,255,0.94);border:${bw} solid ${color};border-radius:16px;padding:4px 12px 4px 6px;display:flex;align-items:center;gap:7px;${glow}">
      <span style="font-size:16px;">${emoji}</span>
      <div style="display:flex;flex-direction:column;">
        <span style="font-size:${focused ? '12' : '11'}px;color:#1e293b;font-family:system-ui;white-space:nowrap;font-weight:${focused ? '700' : '500'};line-height:1.2;">${npc.name}</span>
        <span style="font-size:9px;color:#64748b;font-family:system-ui;line-height:1.1;">${npc.currentActivity} @ ${npc.currentLocation}</span>
      </div>
    </div>
    <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:8px solid ${focused ? color : 'rgba(255,255,255,0.94)'};"></div>
  </div>`;
  el.dataset.focused = String(focused);
  el.dataset.activity = npc.currentActivity;
  el.dataset.mood = npc.currentMood;
}

function createNPCMarkerEl(npc: NPC, focused: boolean): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'npc-map-marker';
  el.style.cssText = 'cursor:pointer;pointer-events:auto;';
  updateNPCMarkerEl(el, npc, focused);
  return el;
}

function createPOIMarkerEl(icon: string, name: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'poi-map-marker';
  el.style.cssText = 'cursor:pointer;pointer-events:auto;';
  el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);">
    <span style="font-size:24px;">${icon}</span>
    <span style="font-size:10px;color:#475569;font-family:system-ui;background:rgba(255,255,255,0.92);padding:2px 7px;border-radius:6px;white-space:nowrap;margin-top:2px;font-weight:500;">${name}</span>
  </div>`;
  return el;
}

function createEventMarkerEl(text: string, type: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'event-map-marker';
  el.style.cssText = 'pointer-events:none;';
  const colors: Record<string, string> = {
    social: '#3b82f6', conflict: '#ef4444', life_event: '#a855f7',
    goal: '#22c55e', mood_change: '#eab308', rumor: '#f97316', economic: '#14b8a6',
  };
  const color = colors[type] ?? '#64748b';
  el.innerHTML = `<div style="transform:translate(-50%,-100%);animation:event-float 3s ease-out forwards;">
    <div style="background:${color};color:white;font-size:10px;font-family:system-ui;font-weight:600;padding:4px 10px;border-radius:10px;box-shadow:0 2px 10px ${color}40;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis;">${text}</div>
  </div>`;
  return el;
}

function buildingPopupHTML(loc: typeof LOCATION_POINTS[0], npcsInside: NPC[]): string {
  const npcList = npcsInside.length > 0
    ? npcsInside.map(n =>
      `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;">
        <span style="font-size:12px;">${ACTIVITY_ICON[n.currentActivity] ?? '❓'}</span>
        <span style="font-size:11px;color:#334155;font-weight:500;">${n.name}</span>
        <span style="font-size:9px;color:#94a3b8;">— ${n.currentActivity}</span>
      </div>`).join('')
    : '<div style="font-size:11px;color:#94a3b8;padding:3px 0;">No one here right now</div>';
  return `<div style="font-family:system-ui;min-width:180px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <span style="font-size:20px;">${loc.icon}</span>
      <div>
        <div style="font-size:13px;font-weight:700;color:#1e293b;">${loc.name}</div>
        <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">${loc.type}</div>
      </div>
    </div>
    <div style="font-size:10px;color:#64748b;margin-bottom:8px;">${loc.description}</div>
    <div style="border-top:1px solid #e2e8f0;padding-top:6px;">
      <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">NPCs Here (${npcsInside.length})</div>
      ${npcList}
    </div>
  </div>`;
}

const FollowPanel = memo(function FollowPanel({ npc, routeState, isFollowing, onToggleFollow }: {
  npc: NPC; routeState: NPCRouteState | null; isFollowing: boolean; onToggleFollow: () => void;
}) {
  if (!routeState) return null;
  const distanceKm = routeState.routeDistance > 0 ? (routeState.routeDistance / 1000).toFixed(1) : '—';
  const etaMin = routeState.routeDuration > 0 ? Math.ceil(routeState.routeDuration * (1 - routeState.progress) / 60) : 0;
  return (
    <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 25, pointerEvents: 'auto' }}>
      <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '10px 16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.10)', border: '1px solid rgba(226,232,240,0.6)',
        display: 'flex', alignItems: 'center', gap: '14px', fontFamily: 'system-ui' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{ACTIVITY_ICON[npc.currentActivity] ?? '❓'} {npc.name}</span>
          <span style={{ fontSize: '10px', color: '#64748b' }}>{routeState.isMoving ? `→ ${npc.currentLocation}` : `@ ${npc.currentLocation}`}</span>
        </div>
        {routeState.isMoving && (
          <div style={{ display: 'flex', gap: '10px', padding: '0 10px', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '12px', fontWeight: 600, color: '#3b82f6' }}>{distanceKm} km</div><div style={{ fontSize: '8px', color: '#94a3b8', textTransform: 'uppercase' }}>distance</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '12px', fontWeight: 600, color: '#22c55e' }}>{etaMin} min</div><div style={{ fontSize: '8px', color: '#94a3b8', textTransform: 'uppercase' }}>ETA</div></div>
          </div>
        )}
        {routeState.isMoving && (
          <div style={{ width: '60px' }}><div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '2px', background: 'linear-gradient(90deg,#3b82f6,#60a5fa)', width: `${routeState.progress * 100}%`, transition: 'width 0.1s linear' }} />
          </div></div>
        )}
        <button onClick={(e) => { e.stopPropagation(); onToggleFollow(); }} style={{
          background: isFollowing ? '#3b82f6' : 'rgba(59,130,246,0.1)', color: isFollowing ? 'white' : '#3b82f6',
          border: isFollowing ? 'none' : '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '6px 14px',
          fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui', transition: 'all 0.2s ease', whiteSpace: 'nowrap',
          position: 'relative', zIndex: 1,
        }}>{isFollowing ? '📍 Following' : '📍 Follow'}</button>
      </div>
    </div>
  );
});

const starsHTML = (() => {
  let svg = '';
  for (let i = 0; i < 30; i++) {
    const x = ((i * 7919 + 104729) % 10000) / 100;
    const y = ((i * 6271 + 32749) % 10000) / 100;
    const r = (1 + ((i * 3) % 3)) / 2;
    const delay = ((i * 1777) % 3000) / 1000;
    const dur = 2 + delay;
    svg += `<circle cx="${x}%" cy="${y}%" r="${r}" fill="white" class="star-twinkle" style="animation-duration:${dur}s;animation-delay:${delay}s"/>`;
  }
  return svg;
})();

const NightStars = memo(function NightStars() {
  return (<svg style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', width: '100%', height: '100%' }}
    dangerouslySetInnerHTML={{ __html: starsHTML }} />);
});

const Moon = memo(function Moon({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (<div style={{
    position: 'absolute', top: 24, right: 60, zIndex: 3, pointerEvents: 'none',
    width: 30, height: 30, borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, #fef9c3, #fde68a 40%, #d4a520)',
    boxShadow: '0 0 20px 6px rgba(253,230,138,0.3)', opacity: 0.85, transition: 'opacity 1.5s ease',
  }} />);
});

interface Props {
  npcs: Map<string, NPC>;
  avatars: Record<string, AvatarConfig>;
  onNPCClick: (npc: NPC) => void;
  focusedNPCId: string | null;
  onZoomOutToGlobe?: () => void;
  hour?: number;
  recentEvents?: SimEvent[];
  isRunning?: boolean;
  active?: boolean;  // false = map is hidden (globe view), skip ALL work
}

function MapViewInner({
  npcs, avatars, onNPCClick, focusedNPCId, onZoomOutToGlobe, hour = 12, recentEvents, isRunning = true, active = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const poiMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const eventMarkersRef = useRef<Array<{ marker: maplibregl.Marker; created: number; timer: ReturnType<typeof setTimeout> }>>([]);
  const routeLayerRef = useRef<boolean>(false);
  const followingRef = useRef<boolean>(false);
  const zoomHintTriggeredRef = useRef(false);
  const npcsRef = useRef(npcs);
  npcsRef.current = npcs;
  const focusedIdRef = useRef(focusedNPCId);
  focusedIdRef.current = focusedNPCId;
  const onNPCClickRef = useRef(onNPCClick);
  onNPCClickRef.current = onNPCClick;

  const [isFollowing, setIsFollowing] = useState(false);
  const [showZoomHint, setShowZoomHint] = useState(false);
  const [followPanelData, setFollowPanelData] = useState<{ npc: NPC; state: NPCRouteState } | null>(null);

  // Pass active + isRunning — when active=false, useNPCRoutes does ZERO work
  const routes = useNPCRoutes(npcs, isRunning ?? true, active ?? true);
  const { statesRef: routeStatesRef, subscribe: subscribeRoutes } = routes;

  const period = hour >= 22 || hour <= 4 ? 'night' : hour <= 7 ? 'dawn' : hour <= 17 ? 'day' : hour <= 19 ? 'sunset' : 'dusk';
  const dayNight = useMemo(() => getDayNightConfig(hour), [period]);

  // Direct DOM marker position updates + follow panel — ONLY when active
  useEffect(() => {
    if (!active) return;

    let followPanelTimer: ReturnType<typeof setInterval> | null = null;

    const unsub = subscribeRoutes(() => {
      for (const [id, state] of routeStatesRef.current) {
        const marker = markersRef.current.get(id);
        if (marker) {
          marker.setLngLat(state.position);
        }
      }

      const fId = focusedIdRef.current;
      if (fId && followingRef.current && mapRef.current) {
        const state = routeStatesRef.current.get(fId);
        if (state && state.isMoving) {
          mapRef.current.easeTo({ center: state.position, duration: 100, easing: (t: number) => t });
        }
      }
    });

    followPanelTimer = setInterval(() => {
      const fId = focusedIdRef.current;
      if (fId) {
        const npc = npcsRef.current.get(fId);
        const state = routeStatesRef.current.get(fId);
        if (npc && state) {
          setFollowPanelData({ npc, state: { ...state } });
        } else {
          setFollowPanelData(null);
        }
      } else {
        setFollowPanelData(prev => prev === null ? prev : null);
      }
    }, 500);

    return () => {
      unsub();
      if (followPanelTimer) clearInterval(followPanelTimer);
    };
  }, [subscribeRoutes, routeStatesRef, active]);

  // Map initialization
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (!document.getElementById('mapview-css')) {
      const style = document.createElement('style');
      style.id = 'mapview-css';
      style.textContent = `
        @keyframes marker-pulse { 0%,100%{transform:translate(-50%,-100%) scale(1.12);} 50%{transform:translate(-50%,-100%) scale(1.2);} }
        @keyframes event-float { 0%{opacity:1;transform:translate(-50%,-100%) translateY(0);} 70%{opacity:1;transform:translate(-50%,-100%) translateY(-30px);} 100%{opacity:0;transform:translate(-50%,-100%) translateY(-50px);} }
        .maplibregl-popup-content{border-radius:12px!important;padding:12px!important;box-shadow:0 4px 20px rgba(0,0,0,0.12)!important;}
        .maplibregl-popup-close-button{font-size:16px!important;padding:4px 8px!important;}
      `;
      document.head.appendChild(style);
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: { 'carto-tiles': { type: 'raster', tiles: [dayNight.tileURL.replace('{r}', '@2x')], tileSize: 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>' } },
        layers: [{ id: 'carto-base', type: 'raster', source: 'carto-tiles', minzoom: 0, maxzoom: 20 }],
      },
      center: [IASI_CENTER.lng, IASI_CENTER.lat],
      zoom: DEFAULT_ZOOM,
      pitch: 45,
      bearing: -15,
      minZoom: 8,
      maxZoom: 18,
    } as any);

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }), 'top-right');

    map.on('load', () => {
      try {
        map.addSource('osm-buildings', { type: 'vector', url: 'https://tiles.openfreemap.org/planet' });
        map.addLayer({
          id: '3d-buildings', source: 'osm-buildings', 'source-layer': 'building',
          type: 'fill-extrusion', minzoom: 14.5,
          paint: {
            'fill-extrusion-color': dayNight.buildingColor,
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['*', ['coalesce', ['get', 'building:levels'], 3], 3.5]],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 0.6,
          },
        });
      } catch {}

      map.addSource('npc-route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} } });
      map.addLayer({ id: 'npc-route-glow', type: 'line', source: 'npc-route', paint: { 'line-color': '#3b82f6', 'line-width': 6, 'line-opacity': 0.15, 'line-blur': 4 } });
      map.addLayer({ id: 'npc-route-line', type: 'line', source: 'npc-route',
        paint: { 'line-color': '#3b82f6', 'line-width': 3, 'line-opacity': 0.8, 'line-dasharray': [2, 3] },
        layout: { 'line-cap': 'round', 'line-join': 'round' } });
      routeLayerRef.current = true;

      for (const loc of LOCATION_POINTS) {
        const el = createPOIMarkerEl(loc.icon, loc.name);
        el.addEventListener('click', () => {
          const npcsHere = Array.from(npcsRef.current.values()).filter(n => n.currentLocation === loc.id);
          new maplibregl.Popup({ offset: 15, maxWidth: '260px' }).setLngLat([loc.lng, loc.lat]).setHTML(buildingPopupHTML(loc, npcsHere)).addTo(map);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([loc.lng, loc.lat]).addTo(map);
        poiMarkersRef.current.set(loc.id, marker);
      }
    });

    map.on('zoomend', () => {
      const zoom = map.getZoom();
      setShowZoomHint(zoom <= 12 && zoom > 10);
      if (zoom <= 10 && onZoomOutToGlobe && !zoomHintTriggeredRef.current) {
        zoomHintTriggeredRef.current = true;
        onZoomOutToGlobe();
      }
    });

    mapRef.current = map;
    prefetchOSRM(LOCATION_POINTS.map(l => ({ lat: l.lat, lng: l.lng, id: l.id }))).catch(() => {});

    return () => {
      for (const { marker, timer } of eventMarkersRef.current) {
        clearTimeout(timer);
        marker.remove();
      }
      for (const m of markersRef.current.values()) m.remove();
      for (const m of poiMarkersRef.current.values()) m.remove();
      markersRef.current.clear();
      poiMarkersRef.current.clear();
      eventMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // NPC marker update — skip when not active
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) return;
    const activeIds = new Set<string>();

    for (const [id, npc] of npcs) {
      activeIds.add(id);
      const focused = id === focusedNPCId;
      const existing = markersRef.current.get(id);

      if (existing) {
        const el = existing.getElement();
        if (el.dataset.focused !== String(focused) || el.dataset.activity !== npc.currentActivity || el.dataset.mood !== npc.currentMood) {
          updateNPCMarkerEl(el as HTMLDivElement, npc, focused);
        }
      } else {
        const el = createNPCMarkerEl(npc, focused);
        el.addEventListener('click', (e) => { e.stopPropagation(); onNPCClickRef.current(npc); });
        const rs = routeStatesRef.current.get(id);
        const pos: [number, number] = rs ? rs.position : [getLocationCoords(npc.currentLocation, id).lng, getLocationCoords(npc.currentLocation, id).lat];
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(pos).addTo(map);
        markersRef.current.set(id, marker);
      }
    }

    for (const [id, marker] of markersRef.current) {
      if (!activeIds.has(id)) { marker.remove(); markersRef.current.delete(id); }
    }
  }, [npcs, focusedNPCId, active]);

  // Route line for focused NPC
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeLayerRef.current || !active) return;
    const source = map.getSource('npc-route') as maplibregl.GeoJSONSource;
    if (!source) return;
    const state = focusedNPCId ? routeStatesRef.current.get(focusedNPCId) : null;
    if (state?.route && state.route.length >= 2) {
      source.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: state.route }, properties: {} });
    } else {
      source.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} });
    }
  }, [focusedNPCId, npcs, active]);

  useEffect(() => { followingRef.current = isFollowing; }, [isFollowing]);

  // Fly to focused NPC — only when active
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusedNPCId || !active) return;
    const rs = routeStatesRef.current.get(focusedNPCId);
    if (rs) {
      map.flyTo({ center: rs.position as [number, number], zoom: 16, pitch: 50, bearing: -15, duration: 1200 });
    } else {
      const coords = getLocationCoords(npcs.get(focusedNPCId)?.currentLocation ?? 'home', focusedNPCId);
      map.flyTo({ center: [coords.lng, coords.lat], zoom: 16, pitch: 50, bearing: -15, duration: 1200 });
    }
  }, [focusedNPCId, active]);

  // Day/night building color
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) return;
    const update = () => {
      if (map.getLayer('3d-buildings')) {
        try {
          map.setPaintProperty('3d-buildings', 'fill-extrusion-color', dayNight.buildingColor);
          map.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', dayNight.overlayOpacity > 0.2 ? 0.4 : 0.6);
        } catch {}
      }
    };
    if (map.isStyleLoaded()) update();
    else map.on('load', update);
  }, [dayNight, active]);

  // Event markers — only when active
  const shownEventIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !recentEvents || recentEvents.length === 0 || !active) return;
    const interesting = recentEvents.filter(e => e.type !== 'action' && e.type !== 'economic' && !shownEventIdsRef.current.has(e.id));
    for (const event of interesting.slice(-3)) {
      shownEventIdsRef.current.add(event.id);
      if (shownEventIdsRef.current.size > 100) shownEventIdsRef.current = new Set(Array.from(shownEventIdsRef.current).slice(-50));
      const npcId = event.involvedNPCs[0];
      if (!npcId) continue;
      const rs = routeStatesRef.current.get(npcId);
      let lng: number, lat: number;
      if (rs) { [lng, lat] = rs.position; }
      else { const npc = npcs.get(npcId); if (!npc) continue; const c = getLocationCoords(npc.currentLocation, npcId); lng = c.lng; lat = c.lat; }
      const el = createEventMarkerEl(event.description.length > 40 ? event.description.slice(0, 37) + '...' : event.description, event.type);
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat + 0.0003]).addTo(map);
      const timer = setTimeout(() => {
        marker.remove();
        eventMarkersRef.current = eventMarkersRef.current.filter(m => m.marker !== marker);
      }, 3200);
      eventMarkersRef.current.push({ marker, created: Date.now(), timer });
    }
  }, [recentEvents, active]);

  const handleToggleFollow = useCallback(() => setIsFollowing(prev => !prev), []);

  const focusedNPC = focusedNPCId ? npcs.get(focusedNPCId) ?? null : null;

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      {active && dayNight.overlayOpacity > 0 && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: dayNight.overlayColor, opacity: dayNight.overlayOpacity,
          transition: 'opacity 1.5s ease, background 1.5s ease',
        }} />
      )}
      {active && dayNight.showStars && <NightStars />}
      {active && <Moon visible={hour >= 21 || hour <= 5} />}
      {active && focusedNPC && followPanelData && (
        <FollowPanel npc={followPanelData.npc} routeState={followPanelData.state} isFollowing={isFollowing} onToggleFollow={handleToggleFollow} />
      )}
      {active && showZoomHint && (
        <div style={{
          position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          zIndex: 5, background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(226,232,240,0.6)',
          borderRadius: '12px', padding: '8px 16px', color: '#007AFF', fontSize: '11px',
          fontFamily: 'system-ui', whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>Zoom out more to return to globe view</div>
      )}
    </div>
  );
}

// PERF: React.memo with custom comparator — prevents re-render from parent snapshot updates
const MapView = memo(MapViewInner, (prev, next) => {
  // Re-render only when something MapView actually uses changes
  if (prev.active !== next.active) return false;
  if (prev.isRunning !== next.isRunning) return false;
  if (prev.focusedNPCId !== next.focusedNPCId) return false;
  if (prev.hour !== next.hour) return false;

  // Skip re-renders when not active (hidden behind globe)
  if (!next.active) return true;

  // Check if any NPC actually changed (not just new Map reference)
  if (prev.npcs !== next.npcs) {
    if (prev.npcs.size !== next.npcs.size) return false;
    for (const [id, npc] of next.npcs) {
      const prevNpc = prev.npcs.get(id);
      if (!prevNpc) return false;
      if (prevNpc.currentActivity !== npc.currentActivity ||
          prevNpc.currentLocation !== npc.currentLocation ||
          prevNpc.currentMood !== npc.currentMood) {
        return false; // Something MapView cares about changed
      }
    }
    // All NPCs are the same in terms of what MapView uses — skip re-render
    return true;
  }

  if (prev.recentEvents !== next.recentEvents) return false;
  return true;
});

export default MapView;
