import { JobMarket, Occupation, NPC, Transaction } from './types';

export const JOB_MARKET: JobMarket[] = [
  { occupation: 'programmer',    baseSalary: 200, energyCost: 25, stressGain: 15, availableSlots: 3 },
  { occupation: 'doctor',        baseSalary: 280, energyCost: 35, stressGain: 25, availableSlots: 2 },
  { occupation: 'teacher',       baseSalary: 130, energyCost: 20, stressGain: 15, availableSlots: 3 },
  { occupation: 'artist',        baseSalary: 80,  energyCost: 15, stressGain: 10, availableSlots: 4 },
  { occupation: 'chef',          baseSalary: 120, energyCost: 30, stressGain: 20, availableSlots: 3 },
  { occupation: 'mechanic',      baseSalary: 140, energyCost: 35, stressGain: 15, availableSlots: 2 },
  { occupation: 'freelancer',    baseSalary: 150, energyCost: 20, stressGain: 20, availableSlots: 5 },
  { occupation: 'entrepreneur',  baseSalary: 250, energyCost: 30, stressGain: 30, availableSlots: 2 },
  { occupation: 'student',       baseSalary: 0,   energyCost: 15, stressGain: 10, availableSlots: 10 },
  { occupation: 'unemployed',    baseSalary: 0,   energyCost: 0,  stressGain: 5,  availableSlots: 99 },
];

export function getJobInfo(occupation: Occupation): JobMarket {
  return JOB_MARKET.find(j => j.occupation === occupation) ?? JOB_MARKET[JOB_MARKET.length - 1];
}

export function processWorkSession(npc: NPC, tick: number): { npc: NPC; transaction: Transaction | null } {
  const job = getJobInfo(npc.occupation);

  if (npc.occupation === 'unemployed' || npc.occupation === 'student') {
    return { npc, transaction: null };
  }

  // Salary varies ±20% based on mood/energy
  const performanceMultiplier = 0.8 + (npc.stats.energy / 100) * 0.2 + (npc.stats.happiness / 100) * 0.2;
  const salary = Math.round(job.baseSalary * performanceMultiplier);

  const updatedNPC: NPC = {
    ...npc,
    stats: {
      ...npc.stats,
      money: npc.stats.money + salary,
      energy: Math.max(0, npc.stats.energy - job.energyCost),
      stress: Math.min(100, npc.stats.stress + job.stressGain),
    },
  };

  const transaction: Transaction = {
    fromId: 'system',
    toId: npc.id,
    amount: salary,
    reason: `salary (${npc.occupation})`,
    tick,
  };

  return { npc: updatedNPC, transaction };
}

export function processSpending(npc: NPC, activity: string, tick: number): { npc: NPC; transaction: Transaction | null } {
  const costs: Record<string, number> = {
    eating: 15,
    shopping: 50,
    entertaining: 30,
    exercising: 10,
  };

  const cost = costs[activity];
  if (!cost || npc.stats.money < cost) return { npc, transaction: null };

  const updatedNPC: NPC = {
    ...npc,
    stats: { ...npc.stats, money: npc.stats.money - cost },
  };

  const transaction: Transaction = {
    fromId: npc.id,
    toId: 'system',
    amount: cost,
    reason: activity,
    tick,
  };

  return { npc: updatedNPC, transaction };
}
