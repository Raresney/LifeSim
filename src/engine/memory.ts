import { Memory, NPCMemory, SimTime } from './types';

const SHORT_TERM_LIMIT = 20;
const DECAY_RATE = 0.05;
const LONG_TERM_THRESHOLD = 7;

let memoryIdCounter = 0;

export function createMemory(
  partial: Omit<Memory, 'id'>
): Memory {
  return { ...partial, id: `mem_${partial.tick}_${++memoryIdCounter}` };
}

export function addMemory(npcMemory: NPCMemory, memory: Memory): NPCMemory {
  const shortTerm = [memory, ...npcMemory.shortTerm];

  if (memory.emotionalWeight >= LONG_TERM_THRESHOLD || memory.isLongTerm) {
    return {
      shortTerm: shortTerm.slice(0, SHORT_TERM_LIMIT),
      longTerm: [{ ...memory, isLongTerm: true }, ...npcMemory.longTerm],
    };
  }

  return {
    shortTerm: shortTerm.slice(0, SHORT_TERM_LIMIT),
    longTerm: npcMemory.longTerm,
  };
}

export function decayMemories(npcMemory: NPCMemory, currentTick: number): NPCMemory {
  // PERF: Skip if no memories to decay
  if (npcMemory.shortTerm.length === 0 && npcMemory.longTerm.length === 0) {
    return npcMemory;
  }

  let shortChanged = false;
  const newShort: Memory[] = [];
  for (const m of npcMemory.shortTerm) {
    const age = currentTick - m.tick;
    const decayed = m.emotionalWeight - (age * DECAY_RATE);
    const clamped = Math.max(0, decayed);
    if (clamped <= 0) {
      shortChanged = true;
      continue; // filtered out
    }
    if (clamped !== m.emotionalWeight) {
      shortChanged = true;
      newShort.push({ ...m, emotionalWeight: clamped });
    } else {
      newShort.push(m);
    }
  }

  let longChanged = false;
  const newLong: Memory[] = [];
  for (const m of npcMemory.longTerm) {
    const age = currentTick - m.tick;
    const decayed = m.emotionalWeight - (age * DECAY_RATE * 0.2);
    const clamped = Math.max(1, decayed);
    if (clamped !== m.emotionalWeight) {
      longChanged = true;
      newLong.push({ ...m, emotionalWeight: clamped });
    } else {
      newLong.push(m);
    }
  }

  // PERF: Return same reference if nothing changed
  if (!shortChanged && !longChanged) return npcMemory;

  return {
    shortTerm: shortChanged ? newShort : npcMemory.shortTerm,
    longTerm: longChanged ? newLong : npcMemory.longTerm,
  };
}

export function getRelevantMemories(
  npcMemory: NPCMemory,
  aboutNPCId?: string,
  limit: number = 10,
): Memory[] {
  const all = [...npcMemory.longTerm, ...npcMemory.shortTerm];
  let filtered = aboutNPCId
    ? all.filter(m => m.involvedNPCs.includes(aboutNPCId))
    : all;

  return filtered
    .sort((a, b) => b.emotionalWeight - a.emotionalWeight)
    .slice(0, limit);
}

export function summarizeMemoryForLLM(npcMemory: NPCMemory): string {
  const important = [...npcMemory.longTerm]
    .sort((a, b) => b.emotionalWeight - a.emotionalWeight)
    .slice(0, 5);
  const recent = npcMemory.shortTerm.slice(0, 10);

  const lines: string[] = [];
  if (important.length > 0) {
    lines.push('Important memories:');
    for (const m of important) {
      lines.push(`- ${m.description} (emotional weight: ${m.emotionalWeight.toFixed(1)})`);
    }
  }
  if (recent.length > 0) {
    lines.push('Recent events:');
    for (const m of recent) {
      lines.push(`- ${m.description}`);
    }
  }
  return lines.join('\n');
}

export function createEmptyMemory(): NPCMemory {
  return { shortTerm: [], longTerm: [] };
}
