import { LifeEventTemplate, NPC, SimTime, EventEffect } from './types';

export const LIFE_EVENTS: LifeEventTemplate[] = [
  {
    id: 'unexpected_bonus',
    name: 'Unexpected Bonus',
    description: 'received an unexpected bonus at work',
    probability: 0.005,
    conditions: (npc) => npc.occupation !== 'unemployed' && npc.occupation !== 'student',
    effects: (npc) => [{
      targetNPCId: npc.id,
      statChanges: { money: npc.stats.money + 300, happiness: Math.min(100, npc.stats.happiness + 20) },
      moodChange: 'excited',
      newMemory: {
        category: 'achievement',
        description: `${npc.name} received an unexpected bonus of $300`,
        involvedNPCs: [npc.id],
        emotionalWeight: 6,
        tick: 0,
        isLongTerm: false,
      },
    }],
  },
  {
    id: 'got_sick',
    name: 'Fell Ill',
    description: 'came down with a bad cold',
    probability: 0.008,
    conditions: (npc) => npc.stats.health > 20 && npc.stats.energy < 40,
    effects: (npc) => [{
      targetNPCId: npc.id,
      statChanges: { health: Math.max(0, npc.stats.health - 25), energy: Math.max(0, npc.stats.energy - 20) },
      moodChange: 'sad',
      newActivity: 'relaxing',
      newLocation: 'home',
      newMemory: {
        category: 'life_event',
        description: `${npc.name} fell ill and had to rest`,
        involvedNPCs: [npc.id],
        emotionalWeight: 5,
        tick: 0,
        isLongTerm: false,
      },
    }],
  },
  {
    id: 'inheritance',
    name: 'Small Inheritance',
    description: 'received a small inheritance from a distant relative',
    probability: 0.002,
    conditions: () => true,
    effects: (npc) => [{
      targetNPCId: npc.id,
      statChanges: { money: npc.stats.money + 800 },
      moodChange: 'happy',
      newMemory: {
        category: 'life_event',
        description: `${npc.name} received $800 inheritance from a distant relative`,
        involvedNPCs: [npc.id],
        emotionalWeight: 7,
        tick: 0,
        isLongTerm: true,
      },
    }],
  },
  {
    id: 'lost_wallet',
    name: 'Lost Wallet',
    description: 'lost their wallet',
    probability: 0.006,
    conditions: (npc) => npc.stats.money > 50 && npc.currentLocation !== 'home',
    effects: (npc) => {
      const loss = Math.min(npc.stats.money, Math.round(npc.stats.money * 0.3));
      return [{
        targetNPCId: npc.id,
        statChanges: { money: npc.stats.money - loss, stress: Math.min(100, npc.stats.stress + 25) },
        moodChange: 'anxious',
        newMemory: {
          category: 'life_event',
          description: `${npc.name} lost $${loss} when their wallet went missing`,
          involvedNPCs: [npc.id],
          emotionalWeight: 6,
          tick: 0,
          isLongTerm: false,
        },
      }];
    },
  },
  {
    id: 'job_offer',
    name: 'Job Offer',
    description: 'received an unexpected job offer',
    probability: 0.003,
    conditions: (npc) => npc.occupation !== 'entrepreneur',
    effects: (npc) => [{
      targetNPCId: npc.id,
      moodChange: 'excited',
      newMemory: {
        category: 'life_event',
        description: `${npc.name} received an interesting job offer`,
        involvedNPCs: [npc.id],
        emotionalWeight: 7,
        tick: 0,
        isLongTerm: true,
      },
      newGoal: {
        description: 'Consider the new job offer',
        priority: 7,
        progress: 0,
        status: 'active',
        createdAtTick: 0,
        deadline: undefined,
      },
    }],
  },
  {
    id: 'meet_stranger',
    name: 'Interesting Encounter',
    description: 'had an interesting encounter with a stranger',
    probability: 0.01,
    conditions: (npc) => npc.currentLocation !== 'home' && npc.currentActivity === 'socializing',
    effects: (npc) => [{
      targetNPCId: npc.id,
      statChanges: { happiness: Math.min(100, npc.stats.happiness + 10) },
      moodChange: 'happy',
      newMemory: {
        category: 'social',
        description: `${npc.name} had a memorable conversation with a stranger`,
        involvedNPCs: [npc.id],
        emotionalWeight: 4,
        tick: 0,
        isLongTerm: false,
      },
    }],
  },
  {
    id: 'appliance_broke',
    name: 'Appliance Broke',
    description: 'had an appliance break down at home',
    probability: 0.007,
    conditions: () => true,
    effects: (npc) => [{
      targetNPCId: npc.id,
      statChanges: { money: Math.max(0, npc.stats.money - 100), stress: Math.min(100, npc.stats.stress + 15) },
      moodChange: 'stressed',
      newMemory: {
        category: 'life_event',
        description: `${npc.name}'s appliance broke, costing $100 to fix`,
        involvedNPCs: [npc.id],
        emotionalWeight: 3,
        tick: 0,
        isLongTerm: false,
      },
    }],
  },
  {
    id: 'creative_inspiration',
    name: 'Creative Inspiration',
    description: 'had a burst of creative inspiration',
    probability: 0.008,
    conditions: (npc) => npc.personality.includes('ambitious') || npc.occupation === 'artist',
    effects: (npc) => [{
      targetNPCId: npc.id,
      statChanges: { happiness: Math.min(100, npc.stats.happiness + 15) },
      moodChange: 'excited',
      newGoal: {
        description: 'Pursue creative project idea',
        priority: 6,
        progress: 0,
        status: 'active',
        createdAtTick: 0,
      },
      newMemory: {
        category: 'achievement',
        description: `${npc.name} had a brilliant creative idea`,
        involvedNPCs: [npc.id],
        emotionalWeight: 5,
        tick: 0,
        isLongTerm: false,
      },
    }],
  },
];

export function rollLifeEvents(npc: NPC, time: SimTime): LifeEventTemplate[] {
  return LIFE_EVENTS.filter(event => {
    if (Math.random() > event.probability) return false;
    return event.conditions(npc, time);
  });
}
