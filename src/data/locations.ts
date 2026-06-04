import { Location } from '../engine/types';

export interface MapLocation {
  id: Location;
  name: string;
  lat: number;
  lng: number;
  icon: string;
  type: string;        // building category for 3D interaction
  description: string; // shown in building popup
}

export const LOCATION_POINTS: MapLocation[] = [
  { id: 'work',       name: 'Palas Campus (Offices)',     lat: 47.1555, lng: 27.5890, icon: '🏢', type: 'office',     description: 'Modern office complex at Palas Campus' },
  { id: 'cafe',       name: 'Cafeneaua de la Teatru',     lat: 47.1585, lng: 27.5870, icon: '☕', type: 'cafe',       description: 'Cozy cafe near the National Theatre' },
  { id: 'park',       name: 'Parcul Copou',               lat: 47.1740, lng: 27.5680, icon: '🌳', type: 'park',       description: 'Historic park with the famous Linden Tree of Eminescu' },
  { id: 'gym',        name: 'WorldClass Fitness',         lat: 47.1560, lng: 27.5870, icon: '🏋️', type: 'gym',        description: 'Premium fitness center' },
  { id: 'restaurant', name: 'Restaurant Centru Vechi',    lat: 47.1600, lng: 27.5890, icon: '🍽️', type: 'restaurant', description: 'Traditional Romanian restaurant in the Old Center' },
  { id: 'bar',        name: 'Old Center Bar',             lat: 47.1595, lng: 27.5910, icon: '🍺', type: 'bar',        description: 'Popular nightlife spot in Piața Unirii area' },
  { id: 'shop',       name: 'Palas Mall',                 lat: 47.1545, lng: 27.5875, icon: '🛒', type: 'mall',       description: 'Largest shopping mall in Iași' },
  { id: 'hospital',   name: 'Spitalul Sf. Spiridon',     lat: 47.1620, lng: 27.5840, icon: '🏥', type: 'hospital',   description: 'One of the oldest hospitals in Romania' },
];

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

function deterministicOffset(npcId: string, locationId: string): { dLat: number; dLng: number } {
  let hash = 0;
  const key = `${npcId}:${locationId}`;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  const dLat = ((hash & 0xFFFF) / 0xFFFF - 0.5) * 0.001;
  const dLng = (((hash >> 16) & 0xFFFF) / 0xFFFF - 0.5) * 0.001;
  return { dLat, dLng };
}

export function getLocationCoords(
  locationId: Location,
  npcId: string,
): { lat: number; lng: number } {
  if (locationId === 'home') {
    return NPC_HOMES[npcId] ?? { lat: 47.1600, lng: 27.5850 };
  }

  if (locationId === 'traveling') {
    const home = NPC_HOMES[npcId] ?? { lat: 47.1600, lng: 27.5850 };
    const offset = deterministicOffset(npcId, 'traveling');
    return {
      lat: home.lat + offset.dLat * 10,
      lng: home.lng + offset.dLng * 10,
    };
  }

  const point = LOCATION_POINTS.find(l => l.id === locationId);
  if (point) {
    const offset = deterministicOffset(npcId, locationId);
    return {
      lat: point.lat + offset.dLat,
      lng: point.lng + offset.dLng,
    };
  }

  return { lat: 47.1600, lng: 27.5850 };
}

export function getLocationInfo(locationId: Location): MapLocation | undefined {
  return LOCATION_POINTS.find(l => l.id === locationId);
}

export function getAllLocationCoords(): Array<{ lat: number; lng: number; id: string }> {
  const all: Array<{ lat: number; lng: number; id: string }> = [];
  for (const loc of LOCATION_POINTS) {
    all.push({ lat: loc.lat, lng: loc.lng, id: loc.id });
  }
  for (const [id, home] of Object.entries(NPC_HOMES)) {
    all.push({ lat: home.lat, lng: home.lng, id });
  }
  return all;
}

export const IASI_CENTER = { lat: 47.1585, lng: 27.5845 };
export const DEFAULT_ZOOM = 14;
