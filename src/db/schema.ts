import {
  pgTable, text, integer, real, boolean, timestamp,
  jsonb, varchar, serial, index, uniqueIndex, pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const moodEnum = pgEnum('mood', [
  'happy', 'sad', 'angry', 'anxious', 'confident',
  'bored', 'excited', 'stressed', 'content', 'jealous',
]);

export const activityEnum = pgEnum('activity', [
  'sleeping', 'working', 'eating', 'traveling', 'relaxing',
  'socializing', 'exercising', 'shopping', 'studying',
  'entertaining', 'arguing', 'flirting', 'scheming', 'helping', 'gossiping',
]);

export const locationEnum = pgEnum('location', [
  'home', 'work', 'cafe', 'park', 'gym',
  'restaurant', 'bar', 'shop', 'hospital', 'traveling',
]);

export const occupationEnum = pgEnum('occupation', [
  'programmer', 'teacher', 'doctor', 'artist', 'chef',
  'mechanic', 'freelancer', 'entrepreneur', 'student', 'unemployed',
]);

export const relationshipTypeEnum = pgEnum('relationship_type', [
  'friend', 'close_friend', 'rival', 'enemy',
  'romantic', 'ex', 'colleague', 'acquaintance',
]);

export const goalStatusEnum = pgEnum('goal_status', [
  'active', 'completed', 'failed', 'abandoned',
]);

export const memoryCategoryEnum = pgEnum('memory_category', [
  'social', 'work', 'conflict', 'romance',
  'achievement', 'failure', 'rumor', 'life_event',
]);

export const eventTypeEnum = pgEnum('event_type', [
  'action', 'social', 'economic', 'rumor',
  'life_event', 'goal', 'mood_change', 'conflict',
]);

export const simulations = pgTable('simulations', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  name: varchar('name', { length: 100 }).default('My Simulation'),
  day: integer('day').notNull().default(1),
  hour: integer('hour').notNull().default(8),
  tick: integer('tick').notNull().default(0),
  speed: integer('speed').notNull().default(1),
  isRunning: boolean('is_running').notNull().default(false),
  avatarConfig: jsonb('avatar_config'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('idx_sim_user').on(table.userId),
  index('idx_sim_updated').on(table.updatedAt),
]);

export const npcs = pgTable('npcs', {
  id: serial('id').primaryKey(),
  simId: text('sim_id').notNull().references(() => simulations.id, { onDelete: 'cascade' }),
  npcKey: varchar('npc_key', { length: 20 }).notNull(),
  name: varchar('name', { length: 50 }).notNull(),
  age: integer('age').notNull(),
  personality: jsonb('personality').notNull().$type<string[]>(),
  occupation: occupationEnum('occupation').notNull(),
  energy: integer('energy').notNull().default(80),
  stress: integer('stress').notNull().default(30),
  happiness: integer('happiness').notNull().default(65),
  hunger: integer('hunger').notNull().default(20),
  money: integer('money').notNull().default(1000),
  health: integer('health').notNull().default(85),
  currentActivity: activityEnum('current_activity').notNull().default('sleeping'),
  currentLocation: locationEnum('current_location').notNull().default('home'),
  currentMood: moodEnum('current_mood').notNull().default('content'),
  goals: jsonb('goals').notNull().default('[]'),
  schedule: jsonb('schedule').notNull().default('{}'),
}, (table) => [
  uniqueIndex('idx_npc_sim_key').on(table.simId, table.npcKey),
  index('idx_npc_sim').on(table.simId),
  index('idx_npc_location').on(table.simId, table.currentLocation),
]);

export const relationships = pgTable('relationships', {
  id: serial('id').primaryKey(),
  simId: text('sim_id').notNull().references(() => simulations.id, { onDelete: 'cascade' }),
  fromNpcKey: varchar('from_npc_key', { length: 20 }).notNull(),
  toNpcKey: varchar('to_npc_key', { length: 20 }).notNull(),
  type: relationshipTypeEnum('type').notNull().default('acquaintance'),
  trust: integer('trust').notNull().default(10),
  affection: integer('affection').notNull().default(5),
  respect: integer('respect').notNull().default(10),
  lastInteractionTick: integer('last_interaction_tick').notNull().default(0),
}, (table) => [
  uniqueIndex('idx_rel_unique').on(table.simId, table.fromNpcKey, table.toNpcKey),
  index('idx_rel_from').on(table.simId, table.fromNpcKey),
  index('idx_rel_to').on(table.simId, table.toNpcKey),
]);

export const memories = pgTable('memories', {
  id: serial('id').primaryKey(),
  simId: text('sim_id').notNull().references(() => simulations.id, { onDelete: 'cascade' }),
  npcKey: varchar('npc_key', { length: 20 }).notNull(),
  category: memoryCategoryEnum('category').notNull(),
  description: text('description').notNull(),
  involvedNpcs: jsonb('involved_npcs').notNull().$type<string[]>().default([]),
  emotionalWeight: real('emotional_weight').notNull().default(5),
  tick: integer('tick').notNull(),
  isLongTerm: boolean('is_long_term').notNull().default(false),
}, (table) => [
  index('idx_mem_npc').on(table.simId, table.npcKey),
  index('idx_mem_decay').on(table.simId, table.npcKey, table.isLongTerm, table.emotionalWeight),
  index('idx_mem_tick').on(table.simId, table.npcKey, table.tick),
]);

export const rumors = pgTable('rumors', {
  id: serial('id').primaryKey(),
  simId: text('sim_id').notNull().references(() => simulations.id, { onDelete: 'cascade' }),
  originalFact: text('original_fact').notNull(),
  currentVersion: text('current_version').notNull(),
  aboutNpcKey: varchar('about_npc_key', { length: 20 }).notNull(),
  spreadBy: jsonb('spread_by').notNull().$type<string[]>().default([]),
  distortionLevel: real('distortion_level').notNull().default(0),
  createdAtTick: integer('created_at_tick').notNull(),
  isTrue: boolean('is_true').notNull().default(true),
}, (table) => [
  index('idx_rumor_sim').on(table.simId),
  index('idx_rumor_age').on(table.simId, table.createdAtTick),
]);

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  simId: text('sim_id').notNull().references(() => simulations.id, { onDelete: 'cascade' }),
  type: eventTypeEnum('type').notNull(),
  tick: integer('tick').notNull(),
  involvedNpcs: jsonb('involved_npcs').notNull().$type<string[]>(),
  description: text('description').notNull(),
  effects: jsonb('effects').notNull().default('[]'),
}, (table) => [
  index('idx_event_sim_tick').on(table.simId, table.tick),
  index('idx_event_type').on(table.simId, table.type),
]);

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  simId: text('sim_id').notNull().references(() => simulations.id, { onDelete: 'cascade' }),
  fromId: varchar('from_id', { length: 20 }).notNull(),
  toId: varchar('to_id', { length: 20 }).notNull(),
  amount: integer('amount').notNull(),
  reason: varchar('reason', { length: 100 }).notNull(),
  tick: integer('tick').notNull(),
}, (table) => [
  index('idx_tx_sim').on(table.simId, table.tick),
]);

export const narrativeCache = pgTable('narrative_cache', {
  id: serial('id').primaryKey(),
  stateHash: varchar('state_hash', { length: 64 }).notNull(),
  narrative: text('narrative').notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  hitCount: integer('hit_count').notNull().default(1),
}, (table) => [
  uniqueIndex('idx_cache_hash').on(table.stateHash),
  index('idx_cache_created').on(table.createdAt),
]);

export const simulationsRelations = relations(simulations, ({ many }) => ({
  npcs: many(npcs),
  relationships: many(relationships),
  memories: many(memories),
  rumors: many(rumors),
  events: many(events),
  transactions: many(transactions),
}));

export const npcsRelations = relations(npcs, ({ one }) => ({
  simulation: one(simulations, {
    fields: [npcs.simId],
    references: [simulations.id],
  }),
}));

export const relationshipsRelations = relations(relationships, ({ one }) => ({
  simulation: one(simulations, {
    fields: [relationships.simId],
    references: [simulations.id],
  }),
}));

export const memoriesRelations = relations(memories, ({ one }) => ({
  simulation: one(simulations, {
    fields: [memories.simId],
    references: [simulations.id],
  }),
}));
