// ============================================================
// LifeSim — Core Type Definitions
// ============================================================

// --- Time ---

export interface SimTime {
  day: number;    // 1-7 (Monday-Sunday)
  hour: number;   // 0-23
  tick: number;   // absolute tick count since sim start
}

// --- NPC Identity & Stats ---

export type PersonalityTrait =
  | 'ambitious' | 'lazy' | 'social' | 'introverted'
  | 'generous' | 'greedy' | 'honest' | 'manipulative'
  | 'optimistic' | 'cynical' | 'impulsive' | 'cautious';

export type Occupation =
  | 'programmer' | 'teacher' | 'doctor' | 'artist'
  | 'chef' | 'mechanic' | 'freelancer' | 'entrepreneur'
  | 'student' | 'unemployed';

export type Location =
  | 'home' | 'work' | 'cafe' | 'park' | 'gym'
  | 'restaurant' | 'bar' | 'shop' | 'hospital' | 'traveling';

export type Activity =
  | 'sleeping' | 'working' | 'eating' | 'traveling'
  | 'relaxing' | 'socializing' | 'exercising' | 'shopping'
  | 'studying' | 'entertaining' | 'arguing' | 'flirting'
  | 'scheming' | 'helping' | 'gossiping';

export type Mood =
  | 'happy' | 'sad' | 'angry' | 'anxious'
  | 'confident' | 'bored' | 'excited' | 'stressed'
  | 'content' | 'jealous';

export interface NPCStats {
  energy: number;      // 0-100
  stress: number;      // 0-100
  happiness: number;   // 0-100
  hunger: number;      // 0-100 (100 = starving)
  money: number;
  health: number;      // 0-100
}

export interface NPC {
  id: string;
  name: string;
  age: number;
  personality: PersonalityTrait[];  // 2-3 traits
  occupation: Occupation;
  stats: NPCStats;
  currentActivity: Activity;
  currentLocation: Location;
  currentMood: Mood;
  goals: Goal[];
  memory: NPCMemory;
  schedule: WeeklySchedule;
}

// --- Goals ---

export type GoalStatus = 'active' | 'completed' | 'failed' | 'abandoned';

export interface Goal {
  id: string;
  description: string;
  priority: number;        // 1-10
  progress: number;        // 0-100
  status: GoalStatus;
  createdAtTick: number;
  deadline?: number;       // tick number
}

// --- Memory ---

export type MemoryCategory =
  | 'social' | 'work' | 'conflict' | 'romance'
  | 'achievement' | 'failure' | 'rumor' | 'life_event';

export interface Memory {
  id: string;
  category: MemoryCategory;
  description: string;
  involvedNPCs: string[];     // NPC ids
  emotionalWeight: number;    // 1-10 (decays over time for non-critical)
  tick: number;               // when it happened
  isLongTerm: boolean;        // survives pruning
}

export interface NPCMemory {
  shortTerm: Memory[];   // last ~20, auto-pruned
  longTerm: Memory[];    // important events, persist
}

// --- Relationships & Social Graph ---

export type RelationshipType =
  | 'friend' | 'close_friend' | 'rival' | 'enemy'
  | 'romantic' | 'ex' | 'colleague' | 'acquaintance';

export interface Relationship {
  targetId: string;
  type: RelationshipType;
  trust: number;          // -100 to 100
  affection: number;      // -100 to 100
  respect: number;        // -100 to 100
  lastInteraction: number; // tick
}

export interface ReputationEntry {
  observerId: string;
  subjectId: string;
  score: number;          // -100 to 100
  traits: string[];       // perceived traits: "reliable", "liar", "generous"
}

// --- Rumors ---

export interface Rumor {
  id: string;
  originalFact: string;
  currentVersion: string;     // distorts as it spreads
  aboutNPCId: string;
  spreadBy: string[];         // chain of NPC ids
  distortionLevel: number;    // 0-1, increases per hop
  createdAtTick: number;
  isTrue: boolean;
}

// --- Economy ---

export interface JobMarket {
  occupation: Occupation;
  baseSalary: number;        // per work session
  energyCost: number;        // per work session
  stressGain: number;        // per work session
  availableSlots: number;
}

export interface Transaction {
  fromId: string;
  toId: string | 'system';
  amount: number;
  reason: string;
  tick: number;
}

// --- Events ---

export type EventType =
  | 'action' | 'social' | 'economic' | 'rumor'
  | 'life_event' | 'goal' | 'mood_change' | 'conflict';

export interface SimEvent {
  id: string;
  type: EventType;
  tick: number;
  involvedNPCs: string[];
  description: string;
  effects: EventEffect[];
}

export interface EventEffect {
  targetNPCId: string;
  statChanges?: Partial<NPCStats>;
  moodChange?: Mood;
  newActivity?: Activity;
  newLocation?: Location;
  relationshipChange?: {
    targetId: string;
    trustDelta?: number;
    affectionDelta?: number;
    respectDelta?: number;
  };
  newMemory?: Omit<Memory, 'id'>;
  newGoal?: Omit<Goal, 'id'>;
  newRumor?: Omit<Rumor, 'id'>;
}

// --- Life Events (random occurrences) ---

export interface LifeEventTemplate {
  id: string;
  name: string;
  description: string;
  probability: number;       // per tick, 0-1
  conditions: (npc: NPC, time: SimTime) => boolean;
  effects: (npc: NPC) => EventEffect[];
}

// --- Weekly Schedule ---

export interface ScheduleBlock {
  activity: Activity;
  location: Location;
  startHour: number;
  endHour: number;
}

export type WeeklySchedule = {
  [day: number]: ScheduleBlock[];  // 1-7
};

// --- Utility AI ---

export interface ActionOption {
  activity: Activity;
  location: Location;
  targetNPCId?: string;       // for social actions
  baseUtility: number;
}

export interface UtilityScore {
  action: ActionOption;
  score: number;
  reasons: string[];          // why this scored high/low
}

// --- World State ---

export interface WorldState {
  time: SimTime;
  npcs: Map<string, NPC>;
  relationships: Map<string, Relationship[]>;  // key = npc id
  reputation: ReputationEntry[];
  rumors: Rumor[];
  economy: JobMarket[];
  transactions: Transaction[];
  eventLog: SimEvent[];
  isRunning: boolean;
  speed: number;  // ticks per second
}
