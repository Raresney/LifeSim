interface CacheEntry {
  narrative: string;
  model: string;
  createdAt: number;
  hitCount: number;
}

const cache = new Map<string, CacheEntry>();
const MAX_ENTRIES = 200;
const TTL_MS = 10 * 60 * 1000;

export function hashNpcState(npc: {
  name: string;
  currentMood: string;
  currentActivity: string;
  currentLocation: string;
  stats: { energy: number; stress: number; happiness: number; money: number; health: number };
}): string {
  const bucket = (v: number) => Math.floor(v / 10) * 10;
  const moneyBucket = Math.floor(npc.stats.money / 100) * 100;

  return [
    npc.name,
    npc.currentMood,
    npc.currentActivity,
    npc.currentLocation,
    bucket(npc.stats.energy),
    bucket(npc.stats.stress),
    bucket(npc.stats.happiness),
    bucket(npc.stats.health),
    moneyBucket,
  ].join('|');
}

export function getCached(hash: string): CacheEntry | null {
  const entry = cache.get(hash);
  if (!entry) return null;

  if (Date.now() - entry.createdAt > TTL_MS) {
    cache.delete(hash);
    return null;
  }

  entry.hitCount++;
  return entry;
}

export function setCached(hash: string, narrative: string, model: string): void {
  if (cache.size >= MAX_ENTRIES) {
    let evictKey: string | null = null;
    let evictScore = Infinity;
    for (const [key, entry] of cache) {
      const score = entry.hitCount * 1000 + (entry.createdAt / 1000);
      if (score < evictScore) {
        evictScore = score;
        evictKey = key;
      }
    }
    if (evictKey) cache.delete(evictKey);
  }

  cache.set(hash, {
    narrative,
    model,
    createdAt: Date.now(),
    hitCount: 1,
  });
}
