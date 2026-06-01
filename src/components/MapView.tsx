'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { NPC } from '../engine/types';
import { AvatarConfig } from '../engine/avatar';
import { getLocationCoords, IASI_CENTER, DEFAULT_ZOOM, LOCATION_POINTS } from '../data/locations';
import Avatar from './Avatar';
import 'leaflet/dist/leaflet.css';

const MOOD_HEX: Record<string, string> = {
  happy: '#22c55e', sad: '#3b82f6', angry: '#ef4444',
  anxious: '#eab308', confident: '#a855f7', bored: '#9ca3af',
  excited: '#f97316', stressed: '#f87171', content: '#34d399',
  jealous: '#ca8a04',
};

function createAvatarIcon(name: string, avatarConfig: AvatarConfig, mood: string, focused: boolean): L.DivIcon {
  const color = MOOD_HEX[mood] ?? '#9ca3af';
  const svgMarkup = renderToStaticMarkup(
    <Avatar config={avatarConfig} size={focused ? 44 : 36} mood={mood} />
  );

  const scale = focused ? 'scale(1.15)' : 'scale(1)';
  const glow = focused ? `box-shadow: 0 0 16px 4px ${color}60;` : '';
  const borderW = focused ? '3px' : '2px';

  return L.divIcon({
    className: '',
    html: `
      <div style="
        display: flex; flex-direction: column; align-items: center;
        transform: translate(-50%, -100%) ${scale}; pointer-events: auto;
        transition: transform 0.3s ease;
      ">
        <div style="
          background: #18181bdd; border: ${borderW} solid ${color}; border-radius: 12px;
          padding: 3px 8px 2px 4px; display: flex; align-items: center; gap: 5px;
          ${glow}
          backdrop-filter: blur(8px);
        ">
          <div style="width: ${focused ? 44 : 36}px; height: ${focused ? 44 : 36}px; flex-shrink: 0;">
            ${svgMarkup}
          </div>
          <span style="font-size: ${focused ? '12px' : '11px'}; color: #e4e4e7; font-family: system-ui; white-space: nowrap; font-weight: ${focused ? '600' : '400'};">${name}</span>
        </div>
        <div style="
          width: 0; height: 0; border-left: 6px solid transparent;
          border-right: 6px solid transparent; border-top: 7px solid ${color};
        "></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createPOIIcon(emoji: string, name: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        display: flex; flex-direction: column; align-items: center;
        transform: translate(-50%, -50%);
      ">
        <span style="font-size: 22px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">${emoji}</span>
        <span style="
          font-size: 9px; color: #a1a1aa; font-family: system-ui;
          background: #18181baa; padding: 1px 5px; border-radius: 4px;
          white-space: nowrap; margin-top: 1px; backdrop-filter: blur(4px);
        ">${name}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

interface NPCPosition {
  npcId: string;
  lat: number;
  lng: number;
  targetLat: number;
  targetLng: number;
}

// Fix: Leaflet needs a valid size at mount. Invalidate after a short delay.
function MapInitializer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      map.setView([IASI_CENTER.lat, IASI_CENTER.lng], DEFAULT_ZOOM);
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// Pan map to focused NPC
function FocusHandler({ focusedId, positions }: { focusedId: string | null; positions: Map<string, NPCPosition> }) {
  const map = useMap();
  useEffect(() => {
    if (!focusedId) return;
    const pos = positions.get(focusedId);
    if (pos) {
      map.flyTo([pos.lat, pos.lng], 15, { duration: 0.8 });
    }
  }, [focusedId, positions, map]);
  return null;
}

function AnimatedMarkers({
  npcs,
  avatars,
  positions,
  onNPCClick,
  focusedNPCId,
}: {
  npcs: Map<string, NPC>;
  avatars: Record<string, AvatarConfig>;
  positions: Map<string, NPCPosition>;
  onNPCClick: (npc: NPC) => void;
  focusedNPCId: string | null;
}) {
  return (
    <>
      {Array.from(npcs.values()).map(npc => {
        const pos = positions.get(npc.id);
        if (!pos) return null;
        const avatarConfig = avatars[npc.id];
        if (!avatarConfig) return null;
        const focused = npc.id === focusedNPCId;
        const icon = createAvatarIcon(npc.name, avatarConfig, npc.currentMood, focused);

        return (
          <Marker
            key={npc.id}
            position={[pos.lat, pos.lng]}
            icon={icon}
            zIndexOffset={focused ? 1000 : 0}
            eventHandlers={{ click: () => onNPCClick(npc) }}
          >
            <Popup>
              <div style={{ fontFamily: 'system-ui', fontSize: '12px', minWidth: '140px' }}>
                <strong>{npc.name}</strong> ({npc.occupation})<br />
                {npc.currentActivity} @ {npc.currentLocation}<br />
                Mood: {npc.currentMood}<br />
                Energy: {npc.stats.energy}% | Money: ${npc.stats.money}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

interface Props {
  npcs: Map<string, NPC>;
  avatars: Record<string, AvatarConfig>;
  onNPCClick: (npc: NPC) => void;
  focusedNPCId: string | null;
  onZoomOutToGlobe?: () => void;
}

// Debounced zoom-out detection with visual hint
function ZoomOutDetector({ onZoomOut }: { onZoomOut: () => void }) {
  const map = useMap();
  const [showHint, setShowHint] = useState(false);
  const triggeredRef = useRef(false);

  useEffect(() => {
    const handleZoom = () => {
      const zoom = map.getZoom();
      // Show hint when approaching threshold
      if (zoom <= 12 && zoom > 10) {
        setShowHint(true);
      } else {
        setShowHint(false);
      }
      // Trigger transition
      if (zoom <= 10 && !triggeredRef.current) {
        triggeredRef.current = true;
        onZoomOut();
      }
    };
    map.on('zoomend', handleZoom);
    return () => { map.off('zoomend', handleZoom); };
  }, [map, onZoomOut]);

  if (!showHint) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: '100px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      background: 'rgba(15,23,42,0.85)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(59,130,246,0.3)',
      borderRadius: '12px',
      padding: '8px 16px',
      color: '#93c5fd',
      fontSize: '11px',
      fontFamily: 'system-ui',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      animation: 'fade-in 0.3s ease',
    }}>
      🌍 Zoom out more to return to globe view
    </div>
  );
}

export default function MapView({ npcs, avatars, onNPCClick, focusedNPCId, onZoomOutToGlobe }: Props) {
  const [positions, setPositions] = useState<Map<string, NPCPosition>>(new Map());
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setPositions(prev => {
      const next = new Map(prev);
      for (const [id, npc] of npcs) {
        const target = getLocationCoords(npc.currentLocation, id);
        const existing = next.get(id);
        if (existing) {
          next.set(id, { ...existing, targetLat: target.lat, targetLng: target.lng });
        } else {
          next.set(id, { npcId: id, lat: target.lat, lng: target.lng, targetLat: target.lat, targetLng: target.lng });
        }
      }
      return next;
    });
  }, [npcs]);

  useEffect(() => {
    const animate = () => {
      setPositions(prev => {
        const next = new Map(prev);
        let changed = false;
        for (const [id, pos] of next) {
          const dLat = pos.targetLat - pos.lat;
          const dLng = pos.targetLng - pos.lng;
          if (Math.abs(dLat) > 0.00001 || Math.abs(dLng) > 0.00001) {
            next.set(id, {
              ...pos,
              lat: pos.lat + dLat * 0.08,
              lng: pos.lng + dLng * 0.08,
            });
            changed = true;
          }
        }
        return changed ? next : prev;
      });
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={[IASI_CENTER.lat, IASI_CENTER.lng]}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        minZoom={8}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {LOCATION_POINTS.map(loc => (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={createPOIIcon(loc.icon, loc.name)}
          >
            <Popup>
              <div style={{ fontFamily: 'system-ui', fontSize: '12px' }}>
                <strong>{loc.name}</strong>
              </div>
            </Popup>
          </Marker>
        ))}

        <AnimatedMarkers
          npcs={npcs}
          avatars={avatars}
          positions={positions}
          onNPCClick={onNPCClick}
          focusedNPCId={focusedNPCId}
        />
        <FocusHandler focusedId={focusedNPCId} positions={positions} />
        {onZoomOutToGlobe && <ZoomOutDetector onZoomOut={onZoomOutToGlobe} />}
      </MapContainer>
    </div>
  );
}
