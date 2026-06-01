import { Relationship, RelationshipType, ReputationEntry, NPC } from './types';

export function createRelationship(
  targetId: string,
  type: RelationshipType = 'acquaintance',
  tick: number = 0,
): Relationship {
  const defaults: Record<RelationshipType, { trust: number; affection: number; respect: number }> = {
    acquaintance:  { trust: 10, affection: 5, respect: 10 },
    colleague:     { trust: 15, affection: 10, respect: 20 },
    friend:        { trust: 40, affection: 40, respect: 30 },
    close_friend:  { trust: 70, affection: 70, respect: 60 },
    romantic:      { trust: 60, affection: 80, respect: 50 },
    ex:            { trust: -10, affection: 10, respect: 20 },
    rival:         { trust: -20, affection: -30, respect: 30 },
    enemy:         { trust: -60, affection: -60, respect: -10 },
  };
  const d = defaults[type];
  return { targetId, type, ...d, lastInteraction: tick };
}

export function updateRelationshipType(rel: Relationship): Relationship {
  const { trust, affection, respect } = rel;
  let newType: RelationshipType = rel.type;

  // Don't auto-degrade romantic/ex — those need explicit events
  if (rel.type === 'romantic' || rel.type === 'ex') return rel;

  if (affection > 60 && trust > 50) {
    newType = 'close_friend';
  } else if (affection > 30 && trust > 20) {
    newType = 'friend';
  } else if (affection < -40 && trust < -30) {
    newType = 'enemy';
  } else if (affection < -15 && respect > 10) {
    newType = 'rival';
  } else if (trust > 10 && affection > 0) {
    newType = 'colleague';
  }

  return { ...rel, type: newType };
}

export function adjustRelationship(
  rel: Relationship,
  trustDelta: number,
  affectionDelta: number,
  respectDelta: number,
  tick: number,
): Relationship {
  const clamp = (v: number) => Math.max(-100, Math.min(100, v));
  const updated: Relationship = {
    ...rel,
    trust: clamp(rel.trust + trustDelta),
    affection: clamp(rel.affection + affectionDelta),
    respect: clamp(rel.respect + respectDelta),
    lastInteraction: tick,
  };
  return updateRelationshipType(updated);
}

export function getRelationship(
  relationships: Map<string, Relationship[]>,
  fromId: string,
  toId: string,
): Relationship | undefined {
  return relationships.get(fromId)?.find(r => r.targetId === toId);
}

export function setRelationship(
  relationships: Map<string, Relationship[]>,
  fromId: string,
  rel: Relationship,
): Map<string, Relationship[]> {
  const updated = new Map(relationships);
  const existing = updated.get(fromId) ?? [];
  const idx = existing.findIndex(r => r.targetId === rel.targetId);
  if (idx >= 0) {
    existing[idx] = rel;
  } else {
    existing.push(rel);
  }
  updated.set(fromId, existing);
  return updated;
}

// Reputation: each NPC has their own perception of every other NPC
export function getReputation(
  reputations: ReputationEntry[],
  observerId: string,
  subjectId: string,
): ReputationEntry | undefined {
  return reputations.find(r => r.observerId === observerId && r.subjectId === subjectId);
}

export function updateReputation(
  reputations: ReputationEntry[],
  observerId: string,
  subjectId: string,
  scoreDelta: number,
  newTrait?: string,
): ReputationEntry[] {
  const clamp = (v: number) => Math.max(-100, Math.min(100, v));
  const existing = reputations.find(
    r => r.observerId === observerId && r.subjectId === subjectId
  );

  if (existing) {
    return reputations.map(r => {
      if (r.observerId === observerId && r.subjectId === subjectId) {
        const traits = newTrait && !r.traits.includes(newTrait)
          ? [...r.traits, newTrait].slice(-5)
          : r.traits;
        return { ...r, score: clamp(r.score + scoreDelta), traits };
      }
      return r;
    });
  }

  return [
    ...reputations,
    {
      observerId,
      subjectId,
      score: clamp(scoreDelta),
      traits: newTrait ? [newTrait] : [],
    },
  ];
}
