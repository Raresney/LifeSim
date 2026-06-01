import { Location } from '../engine/types';

export interface MapLocation {
  id: Location;
  name: string;
  lat: number;
  lng: number;
  icon: string;
}

// Real Iași coordinates for each location type
export const LOCATION_POINTS: MapLocation[] = [
  { id: 'work',       name: 'Palas Campus (Offices)',     lat: 47.1555, lng: 27.5890, icon: '🏢' },
  { id: 'cafe',       name: 'Cafeneaua de la Teatru',     lat: 47.1585, lng: 27.5870, icon: '☕' },
  { id: 'park',       name: 'Parcul Copou',               lat: 47.1740, lng: 27.5680, icon: '🌳' },
  { id: 'gym',        name: 'WorldClass Fitness',         lat: 47.1560, lng: 27.5870, icon: '🏋️' },
  { id: 'restaurant', name: 'Restaurant Centru Vechi',    lat: 47.1600, lng: 27.5890, icon: '🍽️' },
  { id: 'bar',        name: 'Old Center Bar',             lat: 47.1595, lng: 27.5910, icon: '🍺' },
  { id: 'shop',       name: 'Palas Mall',                 lat: 47.1545, lng: 27.5875, icon: '🛒' },
  { id: 'hospital',   name: 'Spitalul Sf. Spiridon',     lat: 47.1620, lng: 27.5840, icon: '🏥' },
];

// Each NPC has their own "home" location spread around the city
export const NPC_HOMES: Record<string, { lat: number; lng: number; name: string }> = {
  npc_1:  { lat: 47.1650, lng: 27.5750, name: 'Apartament Copou' },
  npc_2:  { lat: 47.1530, lng: 27.5950, name: 'Apartament Podu Roș' },
  npc_3:  { lat: 47.1700, lng: 27.5720, name: 'Casă Copou' },
  npc_4:  { lat: 47.1480, lng: 27.5830, name: 'Penthouse Tudor' },
  npc_5:  { lat: 47.1610, lng: 27.6000, name: 'Garsonieră Tătărași' },
  npc_6:  { lat: 47.1570, lng: 27.5760, name: 'Apartament Centru' },
  npc_7:  { lat: 47.1500, lng: 27.5920, name: 'Apartament Nicolina' },
  npc_8:  { lat: 47.1680, lng: 27.5800, name: 'Mansardă Copou' },
  npc_9:  { lat: 47.1720, lng: 27.5650, name: 'Cămin Studențesc' },
  npc_10: { lat: 47.1460, lng: 27.5880, name: 'Casă CUG' },
};

export function getLocationCoords(
  locationId: Location,
  npcId: string,
): { lat: number; lng: number } {
  if (locationId === 'home') {
    return NPC_HOMES[npcId] ?? { lat: 47.1600, lng: 27.5850 };
  }

  if (locationId === 'traveling') {
    // Traveling = random offset from current position (will be interpolated in map)
    const home = NPC_HOMES[npcId] ?? { lat: 47.1600, lng: 27.5850 };
    return {
      lat: home.lat + (Math.random() - 0.5) * 0.01,
      lng: home.lng + (Math.random() - 0.5) * 0.01,
    };
  }

  const point = LOCATION_POINTS.find(l => l.id === locationId);
  if (point) {
    // Add small random offset so NPCs don't stack exactly
    return {
      lat: point.lat + (Math.random() - 0.5) * 0.001,
      lng: point.lng + (Math.random() - 0.5) * 0.001,
    };
  }

  return { lat: 47.1600, lng: 27.5850 }; // city center fallback
}

// Iași city center for initial map view
export const IASI_CENTER = { lat: 47.1585, lng: 27.5845 };
export const DEFAULT_ZOOM = 14;
