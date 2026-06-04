import {
  NPC, Activity, Location, ActionOption, UtilityScore,
  SimTime, PersonalityTrait, Relationship, Mood,
} from './types';

const ACTIVITY_LOCATIONS: Record<Activity, Location[]> = {
  sleeping:      ['home'],
  working:       ['work'],
  eating:        ['home', 'restaurant', 'cafe'],
  traveling:     ['traveling'],
  relaxing:      ['home', 'park', 'cafe'],
  socializing:   ['cafe', 'park', 'bar', 'restaurant'],
  exercising:    ['gym', 'park'],
  shopping:      ['shop'],
  studying:      ['home', 'cafe'],
  entertaining:  ['home', 'bar', 'park'],
  arguing:       ['work', 'home', 'bar'],
  flirting:      ['cafe', 'bar', 'park'],
  scheming:      ['home', 'cafe'],
  helping:       ['work', 'home', 'hospital'],
  gossiping:     ['cafe', 'bar', 'park'],
};

const PERSONALITY_WEIGHTS: Record<PersonalityTrait, Partial<Record<Activity, number>>> = {
  ambitious:     { working: 25, studying: 15, scheming: 10 },
  lazy:          { relaxing: 30, sleeping: 20, entertaining: 15 },
  social:        { socializing: 30, gossiping: 15, flirting: 10 },
  introverted:   { relaxing: 20, studying: 15, working: 10, socializing: -20 },
  generous:      { helping: 25, socializing: 10 },
  greedy:        { working: 20, scheming: 15, shopping: 10 },
  honest:        { helping: 15, gossiping: -15, scheming: -20 },
  manipulative:  { scheming: 25, gossiping: 20, flirting: 10 },
  optimistic:    { socializing: 15, entertaining: 10, exercising: 10 },
  cynical:       { scheming: 10, arguing: 10, socializing: -10 },
  impulsive:     { shopping: 15, entertaining: 15, flirting: 15, arguing: 10 },
  cautious:      { studying: 15, working: 10, relaxing: 10, flirting: -10 },
};

function needsScore(npc: NPC): Partial<Record<Activity, number>> {
  const scores: Partial<Record<Activity, number>> = {};
  const { energy, hunger, stress, happiness, health } = npc.stats;

  // Exhaustion drives sleep
  if (energy < 20) scores.sleeping = 60;
  else if (energy < 40) scores.sleeping = 30;
  else if (energy < 60) scores.sleeping = 10;

  // Hunger drives eating
  if (hunger > 80) scores.eating = 50;
  else if (hunger > 50) scores.eating = 25;
  else if (hunger > 30) scores.eating = 10;

  // Stress drives relaxation/entertainment
  if (stress > 70) {
    scores.relaxing = 35;
    scores.entertaining = 25;
    scores.exercising = 20;
  } else if (stress > 40) {
    scores.relaxing = 15;
    scores.entertaining = 10;
  }

  // Low happiness drives socializing/entertainment
  if (happiness < 30) {
    scores.socializing = 25;
    scores.entertaining = 20;
  }

  // Low health
  if (health < 40) {
    scores.relaxing = 30;
    scores.sleeping = 20;
    scores.exercising = -20;
  }

  // Money pressure drives work
  if (npc.stats.money < 200) {
    scores.working = 35;
  } else if (npc.stats.money < 500) {
    scores.working = 15;
  }

  return scores;
}

function timeScore(time: SimTime): Partial<Record<Activity, number>> {
  const scores: Partial<Record<Activity, number>> = {};
  const { hour, day } = time;

  // Night time (23-6): heavy sleep bias
  if (hour >= 23 || hour < 6) {
    scores.sleeping = 50;
    scores.working = -40;
    scores.socializing = -20;
    scores.shopping = -30;
  }
  // Morning (6-9): wake up, eat, prepare
  else if (hour < 9) {
    scores.eating = 20;
    scores.sleeping = -10;
    scores.exercising = 15;
  }
  // Work hours (9-17)
  else if (hour < 17) {
    scores.working = 25;
    scores.sleeping = -30;
    scores.entertaining = -10;
  }
  // Evening (17-23)
  else {
    scores.socializing = 20;
    scores.entertaining = 15;
    scores.eating = 15;
    scores.relaxing = 10;
    scores.working = -15;
  }

  // Weekend bonus for leisure
  if (day >= 6) {
    scores.working = (scores.working ?? 0) - 20;
    scores.socializing = (scores.socializing ?? 0) + 15;
    scores.entertaining = (scores.entertaining ?? 0) + 15;
    scores.relaxing = (scores.relaxing ?? 0) + 10;
  }

  return scores;
}

function moodScore(mood: Mood): Partial<Record<Activity, number>> {
  const map: Record<Mood, Partial<Record<Activity, number>>> = {
    happy:     { socializing: 15, helping: 10, flirting: 10 },
    sad:       { relaxing: 15, sleeping: 10, socializing: -10 },
    angry:     { arguing: 20, exercising: 15, socializing: -15, helping: -10 },
    anxious:   { relaxing: 10, studying: 10, socializing: -10 },
    confident: { socializing: 15, flirting: 15, working: 10, scheming: 10 },
    bored:     { socializing: 20, entertaining: 20, shopping: 15 },
    excited:   { socializing: 20, entertaining: 15, flirting: 10 },
    stressed:  { relaxing: 20, exercising: 15, arguing: 10 },
    content:   { relaxing: 15, helping: 10 },
    jealous:   { scheming: 15, arguing: 10, gossiping: 15, shopping: 10 },
  };
  return map[mood] ?? {};
}

function goalScore(npc: NPC): Partial<Record<Activity, number>> {
  const scores: Partial<Record<Activity, number>> = {};
  for (const goal of npc.goals) {
    if (goal.status !== 'active') continue;
    const weight = goal.priority * (1 - goal.progress / 100) * 3;
    // PERF: Single toLowerCase() call instead of 7
    const desc = goal.description.toLowerCase();
    // Goals about career/money push work
    if (desc.includes('promot') || desc.includes('money') || desc.includes('career')) {
      scores.working = (scores.working ?? 0) + weight;
      scores.studying = (scores.studying ?? 0) + weight * 0.5;
    }
    // Social goals
    if (desc.includes('friend') || desc.includes('relationship')) {
      scores.socializing = (scores.socializing ?? 0) + weight;
      scores.flirting = (scores.flirting ?? 0) + weight * 0.5;
    }
    // Health goals
    if (desc.includes('health') || desc.includes('fit')) {
      scores.exercising = (scores.exercising ?? 0) + weight;
    }
  }
  return scores;
}

function inertiaScore(npc: NPC): Partial<Record<Activity, number>> {
  // Slight preference to continue current activity (avoid frantic switching)
  return { [npc.currentActivity]: 8 };
}

function mergeScores(...maps: Partial<Record<Activity, number>>[]): Map<Activity, number> {
  const result = new Map<Activity, number>();
  for (const map of maps) {
    for (const [activity, score] of Object.entries(map)) {
      const current = result.get(activity as Activity) ?? 0;
      result.set(activity as Activity, current + (score ?? 0));
    }
  }
  return result;
}

function personalityScore(npc: NPC): Partial<Record<Activity, number>> {
  const scores: Partial<Record<Activity, number>> = {};
  for (const trait of npc.personality) {
    const weights = PERSONALITY_WEIGHTS[trait];
    if (!weights) continue;
    for (const [activity, weight] of Object.entries(weights)) {
      scores[activity as Activity] = (scores[activity as Activity] ?? 0) + (weight ?? 0);
    }
  }
  return scores;
}

export function scoreActions(
  npc: NPC,
  time: SimTime,
  relationships: Relationship[],
): UtilityScore[] {
  const merged = mergeScores(
    needsScore(npc),
    timeScore(time),
    personalityScore(npc),
    moodScore(npc.currentMood),
    goalScore(npc),
    inertiaScore(npc),
  );

  // Social bonus: if NPC has friends nearby, socializing scores higher
  const friendCount = relationships.filter(
    r => r.affection > 30 && r.type !== 'enemy' && r.type !== 'rival'
  ).length;
  if (friendCount > 0) {
    merged.set('socializing', (merged.get('socializing') ?? 0) + friendCount * 5);
    merged.set('gossiping', (merged.get('gossiping') ?? 0) + friendCount * 3);
  }

  const hasRival = relationships.some(r => r.type === 'rival' || r.type === 'enemy');
  if (hasRival) {
    merged.set('scheming', (merged.get('scheming') ?? 0) + 10);
  }

  const hasRomantic = relationships.some(r => r.type === 'romantic');
  if (hasRomantic) {
    merged.set('socializing', (merged.get('socializing') ?? 0) + 10);
  }

  // Build action options with locations
  const options: UtilityScore[] = [];
  for (const [activity, score] of merged.entries()) {
    const locations = ACTIVITY_LOCATIONS[activity];
    if (!locations || locations.length === 0) continue;

    // Pick best location (prefer current to avoid unnecessary travel)
    const location = locations.includes(npc.currentLocation)
      ? npc.currentLocation
      : locations[0];

    const travelPenalty = location !== npc.currentLocation ? 5 : 0;
    const finalScore = Math.max(0, score - travelPenalty);

    const reasons: string[] = [];
    if (npc.stats.energy < 30) reasons.push('exhausted');
    if (npc.stats.hunger > 60) reasons.push('hungry');
    if (npc.stats.stress > 60) reasons.push('stressed');
    if (npc.stats.money < 300) reasons.push('low on money');

    options.push({
      action: { activity, location, baseUtility: score },
      score: finalScore,
      reasons,
    });
  }

  return options.sort((a, b) => b.score - a.score);
}

export function chooseAction(
  npc: NPC,
  time: SimTime,
  relationships: Relationship[],
): UtilityScore {
  const scored = scoreActions(npc, time, relationships);

  if (scored.length === 0) {
    return {
      action: { activity: 'relaxing', location: 'home', baseUtility: 0 },
      score: 0,
      reasons: ['nothing better to do'],
    };
  }

  // Weighted random from top 3 — prevents robotic "always pick #1"
  const top = scored.slice(0, Math.min(3, scored.length));
  const totalWeight = top.reduce((sum, s) => sum + Math.max(1, s.score), 0);
  let roll = Math.random() * totalWeight;

  for (const option of top) {
    roll -= Math.max(1, option.score);
    if (roll <= 0) return option;
  }

  return top[0];
}
