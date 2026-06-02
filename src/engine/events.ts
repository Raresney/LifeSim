import {
  SimEvent, EventEffect, NPC, WorldState,
  Activity, Mood, Memory, Relationship,
} from './types';
import { addMemory, createMemory } from './memory';
import { adjustRelationship, getRelationship, setRelationship, updateReputation } from './social';
import { generateRumorFromEvent, spreadRumor, shouldSpreadRumor } from './rumors';

let eventIdCounter = 0;

export function createEvent(
  type: SimEvent['type'],
  tick: number,
  involvedNPCs: string[],
  description: string,
  effects: EventEffect[],
): SimEvent {
  return {
    id: `evt_${tick}_${++eventIdCounter}`,
    type,
    tick,
    involvedNPCs,
    description,
    effects,
  };
}

function applyStatChanges(npc: NPC, changes: Partial<NPC['stats']>): NPC {
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  return {
    ...npc,
    stats: {
      energy: clamp(changes.energy ?? npc.stats.energy, 0, 100),
      stress: clamp(changes.stress ?? npc.stats.stress, 0, 100),
      happiness: clamp(changes.happiness ?? npc.stats.happiness, 0, 100),
      hunger: clamp(changes.hunger ?? npc.stats.hunger, 0, 100),
      money: Math.max(0, changes.money ?? npc.stats.money),
      health: clamp(changes.health ?? npc.stats.health, 0, 100),
    },
  };
}

export function applyEffects(world: WorldState, event: SimEvent): WorldState {
  let { npcs, relationships, reputation, rumors } = world;
  npcs = new Map(npcs);
  let newReputation = [...reputation];
  let newRumors = [...rumors];

  for (const effect of event.effects) {
    const npc = npcs.get(effect.targetNPCId);
    if (!npc) continue;

    let updated = { ...npc };

    if (effect.statChanges) {
      updated = applyStatChanges(updated, effect.statChanges);
    }
    if (effect.moodChange) {
      updated.currentMood = effect.moodChange;
    }
    if (effect.newActivity) {
      updated.currentActivity = effect.newActivity;
    }
    if (effect.newLocation) {
      updated.currentLocation = effect.newLocation;
    }
    if (effect.newMemory) {
      const mem = createMemory({ ...effect.newMemory, tick: event.tick });
      updated.memory = addMemory(updated.memory, mem);
    }
    if (effect.newGoal) {
      const goal = {
        ...effect.newGoal,
        id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        createdAtTick: event.tick,
      };
      updated.goals = [...updated.goals, goal];
    }
    if (effect.relationshipChange) {
      const rc = effect.relationshipChange;
      const existing = getRelationship(relationships, effect.targetNPCId, rc.targetId);
      if (existing) {
        const adjusted = adjustRelationship(
          existing,
          rc.trustDelta ?? 0,
          rc.affectionDelta ?? 0,
          rc.respectDelta ?? 0,
          event.tick,
        );
        relationships = setRelationship(relationships, effect.targetNPCId, adjusted);
      }
    }

    npcs.set(effect.targetNPCId, updated);
  }

  const newRumor = generateRumorFromEvent(event, event.tick);
  if (newRumor) {
    newRumors.push(newRumor);
  }

  return {
    ...world,
    npcs,
    relationships,
    reputation: newReputation,
    rumors: newRumors,
  };
}

export function generateSocialEvents(worldParam: WorldState): SimEvent[] {
  let world = worldParam;
  const events: SimEvent[] = [];
  const npcArray = Array.from(world.npcs.values());
  const tick = world.time.tick;

  const byLocation = new Map<string, NPC[]>();
  for (const npc of npcArray) {
    if (npc.currentActivity === 'sleeping') continue;
    const group = byLocation.get(npc.currentLocation) ?? [];
    group.push(npc);
    byLocation.set(npc.currentLocation, group);
  }

  for (const [location, npcsHere] of byLocation) {
    if (npcsHere.length < 2) continue;

    for (let i = 0; i < npcsHere.length; i++) {
      for (let j = i + 1; j < npcsHere.length; j++) {
        if (Math.random() > 0.3) continue;

        const a = npcsHere[i];
        const b = npcsHere[j];
        const relA = getRelationship(world.relationships, a.id, b.id);
        const relB = getRelationship(world.relationships, b.id, a.id);

        const event = generateInteraction(a, b, relA, relB, location, tick);
        if (event) events.push(event);
      }
    }

    if (['cafe', 'bar', 'park'].includes(location)) {
      for (const npc of npcsHere) {
        for (let ri = 0; ri < world.rumors.length; ri++) {
          const rumor = world.rumors[ri];
          if (shouldSpreadRumor(npc, rumor)) {
            const target = npcsHere.find(n => n.id !== npc.id && !rumor.spreadBy.includes(n.id));
            if (target) {
              const spread = spreadRumor(rumor, npc.id, npc.personality);
              world = { ...world, rumors: world.rumors.map((r, i) => i === ri ? spread : r) };

              events.push(createEvent(
                'rumor',
                tick,
                [npc.id, target.id],
                `${npc.name} told ${target.name}: "${spread.currentVersion}"`,
                [
                  {
                    targetNPCId: target.id,
                    newMemory: {
                      category: 'rumor',
                      description: `Heard from ${npc.name}: "${spread.currentVersion}"`,
                      involvedNPCs: [npc.id, spread.aboutNPCId],
                      emotionalWeight: 4,
                      tick,
                      isLongTerm: false,
                    },
                  },
                ],
              ));
            }
          }
        }
      }
    }
  }

  return events;
}

function generateInteraction(
  a: NPC, b: NPC,
  relA: Relationship | undefined,
  relB: Relationship | undefined,
  location: string,
  tick: number,
): SimEvent | null {
  const affinity = ((relA?.affection ?? 0) + (relB?.affection ?? 0)) / 2;
  const trust = ((relA?.trust ?? 0) + (relB?.trust ?? 0)) / 2;

  if (affinity > 0 || Math.random() > 0.4) {
    const isSocialA = a.currentActivity === 'socializing' || a.currentActivity === 'flirting';
    const isSocialB = b.currentActivity === 'socializing' || b.currentActivity === 'flirting';

    if ((isSocialA || isSocialB) && affinity > 20 && Math.random() < 0.15) {
      return createEvent('social', tick, [a.id, b.id],
        `${a.name} and ${b.name} flirted at the ${location}`,
        [
          {
            targetNPCId: a.id,
            statChanges: { happiness: Math.min(100, a.stats.happiness + 10) },
            relationshipChange: { targetId: b.id, affectionDelta: 8, trustDelta: 3 },
            newMemory: {
              category: 'romance',
              description: `Flirted with ${b.name} at the ${location}`,
              involvedNPCs: [a.id, b.id],
              emotionalWeight: 6,
              tick,
              isLongTerm: false,
            },
          },
          {
            targetNPCId: b.id,
            statChanges: { happiness: Math.min(100, b.stats.happiness + 10) },
            relationshipChange: { targetId: a.id, affectionDelta: 8, trustDelta: 3 },
            newMemory: {
              category: 'romance',
              description: `Flirted with ${a.name} at the ${location}`,
              involvedNPCs: [a.id, b.id],
              emotionalWeight: 6,
              tick,
              isLongTerm: false,
            },
          },
        ],
      );
    }

    return createEvent('social', tick, [a.id, b.id],
      `${a.name} and ${b.name} had a nice chat at the ${location}`,
      [
        {
          targetNPCId: a.id,
          statChanges: { happiness: Math.min(100, a.stats.happiness + 5), stress: Math.max(0, a.stats.stress - 3) },
          relationshipChange: { targetId: b.id, affectionDelta: 3, trustDelta: 2 },
          newMemory: {
            category: 'social',
            description: `Had a nice chat with ${b.name}`,
            involvedNPCs: [a.id, b.id],
            emotionalWeight: 3,
            tick,
            isLongTerm: false,
          },
        },
        {
          targetNPCId: b.id,
          statChanges: { happiness: Math.min(100, b.stats.happiness + 5), stress: Math.max(0, b.stats.stress - 3) },
          relationshipChange: { targetId: a.id, affectionDelta: 3, trustDelta: 2 },
          newMemory: {
            category: 'social',
            description: `Had a nice chat with ${a.name}`,
            involvedNPCs: [a.id, b.id],
            emotionalWeight: 3,
            tick,
            isLongTerm: false,
          },
        },
      ],
    );
  }

  if (affinity < -10 || (a.currentMood === 'angry' || b.currentMood === 'angry')) {
    return createEvent('conflict', tick, [a.id, b.id],
      `${a.name} and ${b.name} had an argument at the ${location}`,
      [
        {
          targetNPCId: a.id,
          statChanges: { stress: Math.min(100, a.stats.stress + 15), happiness: Math.max(0, a.stats.happiness - 10) },
          moodChange: 'angry',
          relationshipChange: { targetId: b.id, affectionDelta: -10, trustDelta: -8 },
          newMemory: {
            category: 'conflict',
            description: `Had a heated argument with ${b.name}`,
            involvedNPCs: [a.id, b.id],
            emotionalWeight: 7,
            tick,
            isLongTerm: true,
          },
        },
        {
          targetNPCId: b.id,
          statChanges: { stress: Math.min(100, b.stats.stress + 15), happiness: Math.max(0, b.stats.happiness - 10) },
          moodChange: 'angry',
          relationshipChange: { targetId: a.id, affectionDelta: -10, trustDelta: -8 },
          newMemory: {
            category: 'conflict',
            description: `Had a heated argument with ${a.name}`,
            involvedNPCs: [a.id, b.id],
            emotionalWeight: 7,
            tick,
            isLongTerm: true,
          },
        },
      ],
    );
  }

  return null;
}
