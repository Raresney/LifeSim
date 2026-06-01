import { WorldState, NPC, SimEvent, SimTime } from './types';
import { chooseAction } from './utility-ai';
import { createEvent, applyEffects, generateSocialEvents } from './events';
import { decayMemories } from './memory';
import { processWorkSession, processSpending } from './economy';
import { rollLifeEvents } from './life-events';
import { pruneOldRumors } from './rumors';

export function advanceTime(time: SimTime): SimTime {
  let { day, hour, tick } = time;
  tick += 1;
  hour += 1; // each tick = 1 hour simulated

  if (hour >= 24) {
    hour = 0;
    day += 1;
    if (day > 7) day = 1;
  }

  return { day, hour, tick };
}

function passiveStatUpdates(npc: NPC, time: SimTime): NPC {
  const { hour } = time;
  let { energy, hunger, stress, happiness, health } = npc.stats;

  // Hunger always increases
  hunger = Math.min(100, hunger + 3);

  // Sleeping restores energy, reduces stress
  if (npc.currentActivity === 'sleeping') {
    energy = Math.min(100, energy + 15);
    stress = Math.max(0, stress - 5);
    health = Math.min(100, health + 2);
  } else {
    // Awake activities drain energy
    energy = Math.max(0, energy - 3);
  }

  // Eating reduces hunger
  if (npc.currentActivity === 'eating') {
    hunger = Math.max(0, hunger - 40);
    happiness = Math.min(100, happiness + 3);
  }

  // Exercise boosts health, costs energy
  if (npc.currentActivity === 'exercising') {
    health = Math.min(100, health + 5);
    energy = Math.max(0, energy - 8);
    stress = Math.max(0, stress - 8);
  }

  // Socializing boosts happiness
  if (npc.currentActivity === 'socializing' || npc.currentActivity === 'entertaining') {
    happiness = Math.min(100, happiness + 5);
    stress = Math.max(0, stress - 3);
  }

  // High stress degrades health slowly
  if (stress > 70) {
    health = Math.max(0, health - 1);
  }

  // Very hungry = stress and unhappiness
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
  const allEvents: SimEvent[] = [];
  let npcs = new Map(world.npcs);

  // Phase 1: Each NPC chooses an action via Utility AI
  for (const [id, npc] of npcs) {
    const relationships = world.relationships.get(id) ?? [];
    const chosen = chooseAction(npc, newTime, relationships);

    let updated: NPC = {
      ...npc,
      currentActivity: chosen.action.activity,
      currentLocation: chosen.action.location,
    };

    // Phase 2: Apply passive stat changes
    updated = passiveStatUpdates(updated, newTime);

    // Phase 3: Economic effects
    if (chosen.action.activity === 'working') {
      const { npc: workedNPC, transaction } = processWorkSession(updated, newTime.tick);
      updated = workedNPC;
      if (transaction) {
        world.transactions.push(transaction);
      }
    }

    const { npc: spentNPC, transaction: spendTx } = processSpending(
      updated, chosen.action.activity, newTime.tick
    );
    updated = spentNPC;
    if (spendTx) {
      world.transactions.push(spendTx);
    }

    // Phase 4: Decay memories
    updated = { ...updated, memory: decayMemories(updated.memory, newTime.tick) };

    // Create action event
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
  };

  // Phase 5: Social interactions between NPCs at same location
  const socialEvents = generateSocialEvents(updatedWorld);
  for (const event of socialEvents) {
    updatedWorld = applyEffects(updatedWorld, event);
    allEvents.push(event);
  }

  // Phase 6: Random life events
  for (const [id, npc] of updatedWorld.npcs) {
    const lifeEvents = rollLifeEvents(npc, newTime);
    for (const le of lifeEvents) {
      const effects = le.effects(npc);
      // Fix tick in memories
      for (const eff of effects) {
        if (eff.newMemory) eff.newMemory.tick = newTime.tick;
        if (eff.newGoal) eff.newGoal.createdAtTick = newTime.tick;
      }
      const event = createEvent('life_event', newTime.tick, [id], `${npc.name} ${le.description}`, effects);
      updatedWorld = applyEffects(updatedWorld, event);
      allEvents.push(event);
    }
  }

  // Phase 7: Prune old rumors
  updatedWorld = {
    ...updatedWorld,
    rumors: pruneOldRumors(updatedWorld.rumors, newTime.tick),
    eventLog: [...updatedWorld.eventLog, ...allEvents].slice(-200), // keep last 200 events
  };

  return { world: updatedWorld, events: allEvents };
}

export function formatTime(time: SimTime): string {
  const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return `${days[time.day]} ${time.hour.toString().padStart(2, '0')}:00`;
}
