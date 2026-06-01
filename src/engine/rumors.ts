import { Rumor, NPC, SimEvent } from './types';

let rumorIdCounter = 0;

const DISTORTION_TEMPLATES = [
  (fact: string) => fact.replace(/helped/i, 'tried to impress'),
  (fact: string) => fact.replace(/argued with/i, 'had a huge fight with'),
  (fact: string) => fact.replace(/talked to/i, 'was flirting with'),
  (fact: string) => fact.replace(/gave money/i, 'bribed'),
  (fact: string) => fact.replace(/was seen at/i, 'sneaked into'),
  (fact: string) => fact + ' (or so they say)',
  (fact: string) => 'Apparently, ' + fact.charAt(0).toLowerCase() + fact.slice(1),
  (fact: string) => fact.replace(/a little/i, 'a lot'),
];

export function createRumor(
  aboutNPCId: string,
  fact: string,
  spreaderId: string,
  isTrue: boolean,
  tick: number,
): Rumor {
  return {
    id: `rumor_${++rumorIdCounter}`,
    originalFact: fact,
    currentVersion: fact,
    aboutNPCId,
    spreadBy: [spreaderId],
    distortionLevel: 0,
    createdAtTick: tick,
    isTrue,
  };
}

export function spreadRumor(
  rumor: Rumor,
  spreaderId: string,
  spreaderPersonality: string[],
): Rumor {
  if (rumor.spreadBy.includes(spreaderId)) return rumor;

  let distorted = rumor.currentVersion;
  const willDistort = Math.random() < 0.4 + rumor.distortionLevel * 0.3;

  if (willDistort) {
    // Manipulative NPCs distort more
    const isManipulative = spreaderPersonality.includes('manipulative');
    const templates = isManipulative
      ? DISTORTION_TEMPLATES
      : DISTORTION_TEMPLATES.slice(5); // milder distortions for honest NPCs

    const template = templates[Math.floor(Math.random() * templates.length)];
    distorted = template(distorted);
  }

  return {
    ...rumor,
    currentVersion: distorted,
    spreadBy: [...rumor.spreadBy, spreaderId],
    distortionLevel: Math.min(1, rumor.distortionLevel + 0.15),
  };
}

export function shouldSpreadRumor(
  npc: NPC,
  rumor: Rumor,
): boolean {
  // NPC won't spread rumor about themselves
  if (rumor.aboutNPCId === npc.id) return false;
  // Already spread it
  if (rumor.spreadBy.includes(npc.id)) return false;

  // Social/manipulative NPCs spread rumors more
  const isSocial = npc.personality.includes('social');
  const isManipulative = npc.personality.includes('manipulative');
  const isHonest = npc.personality.includes('honest');

  let chance = 0.2;
  if (isSocial) chance += 0.25;
  if (isManipulative) chance += 0.3;
  if (isHonest && !rumor.isTrue) chance -= 0.3;

  // Gossiping activity massively boosts spread chance
  if (npc.currentActivity === 'gossiping') chance += 0.4;

  return Math.random() < Math.max(0, Math.min(1, chance));
}

export function generateRumorFromEvent(event: SimEvent, tick: number): Rumor | null {
  // Only interesting events become rumors
  if (event.type === 'action') return null;
  if (event.involvedNPCs.length < 2) return null;

  const chance = event.type === 'conflict' ? 0.7
    : event.type === 'social' ? 0.3
    : event.type === 'mood_change' ? 0.5
    : 0.1;

  if (Math.random() > chance) return null;

  return createRumor(
    event.involvedNPCs[0],
    event.description,
    event.involvedNPCs[1],
    true,
    tick,
  );
}

export function pruneOldRumors(rumors: Rumor[], currentTick: number): Rumor[] {
  const MAX_AGE = 48 * 2; // ~48 hours in ticks (tick = 30min)
  return rumors.filter(r => currentTick - r.createdAtTick < MAX_AGE);
}
