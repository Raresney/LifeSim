import { WorldState, NPC, SimEvent, SimTime } from './types';
import { chooseAction } from './utility-ai';
import { createEvent, applyEffects, generateSocialEvents } from './events';
import { decayMemories } from './memory';
import { processWorkSession, processSpending } from './economy';
import { rollLifeEvents } from './life-events';
import { pruneOldRumors } from './rumors';

const HOURS_PER_TICK = 3;

const SOCIAL_EVERY = 2;
const MEMORY_DECAY_EVERY = 3;
const LIFE_EVENTS_EVERY = 2;
const RUMOR_PRUNE_EVERY = 4;

export function advanceTime(time: SimTime): SimTime {
  let { day, hour, tick } = time;
  tick += 1;
  hour += HOURS_PER_TICK;

  if (hour >= 24) {
    hour = 0;
    day += 1;
  }

  if (day > 7) {
    return { day: 7, hour: 24, tick };
  }

  return { day, hour, tick };
}

function passiveStatUpdates(npc: NPC, time: SimTime): NPC {
  const { hour } = time;
  let { energy, hunger, stress, happiness, health } = npc.stats;

  hunger = Math.min(100, hunger + 3);

  if (npc.currentActivity === 'sleeping') {
    energy = Math.min(100, energy + 15);
    stress = Math.max(0, stress - 5);
    health = Math.min(100, health + 2);
  } else {
    energy = Math.max(0, energy - 3);
  }

  if (npc.currentActivity === 'eating') {
    hunger = Math.max(0, hunger - 40);
    happiness = Math.min(100, happiness + 3);
  }

  if (npc.currentActivity === 'exercising') {
    health = Math.min(100, health + 5);
    energy = Math.max(0, energy - 8);
    stress = Math.max(0, stress - 8);
  }

  if (npc.currentActivity === 'socializing' || npc.currentActivity === 'entertaining') {
    happiness = Math.min(100, happiness + 5);
    stress = Math.max(0, stress - 3);
  }

  if (stress > 70) {
    health = Math.max(0, health - 1);
  }

  if (hunger > 80) {
    stress = Math.min(100, stress + 5);
    happiness = Math.max(0, happiness - 3);
  }

  return {
    ...npc,
    stats: { ...npc.stats, energy, hunger, stress, happiness, health },
  };
}

export function processTick(world: WorldState): { world: WorldState; events: SimEvent[] } {
  const newTime = advanceTime(world.time);
  const tick = newTime.tick;
  const allEvents: SimEvent[] = [];
  const newTransactions: typeof world.transactions = [];
  let npcs = new Map(world.npcs);

  for (const [id, npc] of npcs) {
    const relationships = world.relationships.get(id) ?? [];
    const chosen = chooseAction(npc, newTime, relationships);

    let updated: NPC = {
      ...npc,
      currentActivity: chosen.action.activity,
      currentLocation: chosen.action.location,
    };

    updated = passiveStatUpdates(updated, newTime);

    if (chosen.action.activity === 'working') {
      const { npc: workedNPC, transaction } = processWorkSession(updated, newTime.tick);
      updated = workedNPC;
      if (transaction) newTransactions.push(transaction);
    }

    const { npc: spentNPC, transaction: spendTx } = processSpending(
      updated, chosen.action.activity, newTime.tick
    );
    updated = spentNPC;
    if (spendTx) newTransactions.push(spendTx);

    if (tick % MEMORY_DECAY_EVERY === 0) {
      updated = { ...updated, memory: decayMemories(updated.memory, newTime.tick) };
    }

    const actionEvent = createEvent(
      'action',
      newTime.tick,
      [id],
      `${updated.name} is ${updated.currentActivity} at ${updated.currentLocation}`,
      [{
        targetNPCId: id,
        newActivity: updated.currentActivity,
        newLocation: updated.currentLocation,
      }],
    );
    allEvents.push(actionEvent);

    npcs.set(id, updated);
  }

  let updatedWorld: WorldState = {
    ...world,
    time: newTime,
    npcs,
    transactions: newTransactions.length > 0
      ? [...world.transactions, ...newTransactions]
      : world.transactions,
  };

  if (tick % SOCIAL_EVERY === 0) {
    const socialEvents = generateSocialEvents(updatedWorld);
    for (const event of socialEvents) {
      updatedWorld = applyEffects(updatedWorld, event);
      allEvents.push(event);
    }
  }

  if (tick % LIFE_EVENTS_EVERY === 1) {
    for (const [id, npc] of updatedWorld.npcs) {
      const lifeEvents = rollLifeEvents(npc, newTime);
      for (const le of lifeEvents) {
        const effects = le.effects(npc);
        for (const eff of effects) {
          if (eff.newMemory) eff.newMemory.tick = newTime.tick;
          if (eff.newGoal) eff.newGoal.createdAtTick = newTime.tick;
        }
        const event = createEvent('life_event', newTime.tick, [id], `${npc.name} ${le.description}`, effects);
        updatedWorld = applyEffects(updatedWorld, event);
        allEvents.push(event);
      }
    }
  }

  const prunedRumors = tick % RUMOR_PRUNE_EVERY === 0
    ? pruneOldRumors(updatedWorld.rumors, newTime.tick)
    : updatedWorld.rumors;

  const newEventLog = allEvents.length > 0
    ? [...updatedWorld.eventLog, ...allEvents].slice(-200)
    : updatedWorld.eventLog.length > 200
    ? updatedWorld.eventLog.slice(-200)
    : updatedWorld.eventLog;

  const txs = updatedWorld.transactions;
  const finalTx = txs.length > 500 ? txs.slice(-500) : txs;

  updatedWorld = {
    ...updatedWorld,
    rumors: prunedRumors,
    eventLog: newEventLog,
    transactions: finalTx,
  };

  return { world: updatedWorld, events: allEvents };
}

const PERIOD_NAMES: Record<number, string> = {
  0: 'Night',
  3: 'Early Morning',
  6: 'Morning',
  9: 'Late Morning',
  12: 'Afternoon',
  15: 'Late Afternoon',
  18: 'Evening',
  21: 'Night',
};

export function formatTime(time: SimTime): string {
  const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const period = PERIOD_NAMES[time.hour] ?? '';
  return `${days[time.day]} ${time.hour.toString().padStart(2, '0')}:00 — ${period}`;
}
