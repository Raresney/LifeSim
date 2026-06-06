export interface RouteResult {
  coordinates: [number, number][]; // [lng, lat] pairs (GeoJSON order)
  distance: number;                // meters
  duration: number;                // seconds
}

const routeCache = new Map<string, RouteResult>();
const pendingRequests = new Map<string, Promise<RouteResult>>();

let lastRequestTime = 0;
const MIN_REQUEST_GAP = 200;

function cacheKey(from: { lat: number; lng: number }, to: { lat: number; lng: number }): string {
  const fLat = from.lat.toFixed(4);
  const fLng = from.lng.toFixed(4);
  const tLat = to.lat.toFixed(4);
  const tLng = to.lng.toFixed(4);
  return `${fLat},${fLng}->${tLat},${tLng}`;
}

function straightLineRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): RouteResult {
  const steps = 8;
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    coords.push([
      from.lng + (to.lng - from.lng) * t,
      from.lat + (to.lat - from.lat) * t,
    ]);
  }
  const R = 6371000;
  const dLat = (to.lat - from.lat) * Math.PI / 180;
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const duration = distance / 1.25;

  return { coordinates: coords, distance, duration };
}

async function fetchOSRMRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<RouteResult> {
  const now = Date.now();
  const wait = Math.max(0, MIN_REQUEST_GAP - (now - lastRequestTime));
  if (wait > 0) {
    await new Promise(r => setTimeout(r, wait));
  }
  lastRequestTime = Date.now();

  const url = `https://router.project-osrm.org/route/v1/foot/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`OSRM ${res.status}`);

    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) {
      throw new Error('No route found');
    }

    const route = data.routes[0];
    return {
      coordinates: route.geometry.coordinates as [number, number][],
      distance: route.distance,
      duration: route.duration,
    };
  } catch {
    clearTimeout(timeout);
    return straightLineRoute(from, to);
  }
}

export async function getRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<RouteResult> {
  const dLat = Math.abs(from.lat - to.lat);
  const dLng = Math.abs(from.lng - to.lng);
  if (dLat < 0.0001 && dLng < 0.0001) {
    return { coordinates: [[from.lng, from.lat], [to.lng, to.lat]], distance: 0, duration: 0 };
  }

  const key = cacheKey(from, to);

  const cached = routeCache.get(key);
  if (cached) return cached;

  const pending = pendingRequests.get(key);
  if (pending) return pending;

  const promise = fetchOSRMRoute(from, to).then(result => {
    routeCache.set(key, result);
    pendingRequests.delete(key);
    return result;
  });

  pendingRequests.set(key, promise);
  return promise;
}

export async function prefetchRoutes(
  locations: Array<{ lat: number; lng: number; id: string }>,
): Promise<void> {
  const pairs: Array<[{ lat: number; lng: number }, { lat: number; lng: number }]> = [];
  for (let i = 0; i < locations.length; i++) {
    for (let j = i + 1; j < locations.length; j++) {
      pairs.push([locations[i]!, locations[j]!]);
    }
  }

  for (const [from, to] of pairs) {
    await getRoute(from, to);
    await getRoute(to, from);
  }
}

interface CachedRouteGeometry {
  route: [number, number][];
  segLengths: number[];
  totalLength: number;
}

const geometryCache = new WeakMap<[number, number][], CachedRouteGeometry>();

function getRouteGeometry(route: [number, number][]): CachedRouteGeometry {
  const cached = geometryCache.get(route);
  if (cached) return cached;

  const segLengths: number[] = [];
  let totalLength = 0;
  for (let i = 1; i < route.length; i++) {
    const dx = route[i]![0] - route[i - 1]![0];
    const dy = route[i]![1] - route[i - 1]![1];
    const len = Math.sqrt(dx * dx + dy * dy);
    segLengths.push(len);
    totalLength += len;
  }

  const result = { route, segLengths, totalLength };
  geometryCache.set(route, result);
  return result;
}

export function interpolateRoute(
  route: [number, number][],
  progress: number,
): [number, number] {
  if (route.length === 0) return [0, 0];
  if (route.length === 1 || progress <= 0) return route[0]!;
  if (progress >= 1) return route[route.length - 1]!;

  const { segLengths, totalLength } = getRouteGeometry(route);

  if (totalLength === 0) return route[0]!;

  const targetDist = progress * totalLength;
  let traveled = 0;
  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i]!;
    if (traveled + segLen >= targetDist) {
      const segProgress = segLen > 0 ? (targetDist - traveled) / segLen : 0;
      const [lng1, lat1] = route[i]!;
      const [lng2, lat2] = route[i + 1]!;
      return [
        lng1 + (lng2 - lng1) * segProgress,
        lat1 + (lat2 - lat1) * segProgress,
      ];
    }
    traveled += segLen;
  }

  return route[route.length - 1]!;
}

export function getRouteCacheSize(): number {
  return routeCache.size;
}
