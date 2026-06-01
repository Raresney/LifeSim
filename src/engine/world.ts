import { WorldState, SimTime } from './types';
import { INITIAL_NPCS } from '../data/npcs';
import { JOB_MARKET } from './economy';
import { createRelationship } from './social';

export function createWorld(): WorldState {
  const npcs = new Map(INITIAL_NPCS.map(npc => [npc.id, npc]));
  const relationships = new Map<string, ReturnType<typeof createRelationship>[]>();

  // Initialize relationships between all NPCs
  const ids = Array.from(npcs.keys());
  for (const id of ids) {
    const rels = [];
    for (const otherId of ids) {
      if (otherId === id) continue;
      rels.push(createRelationship(otherId, 'acquaintance', 0));
    }
    relationships.set(id, rels);
  }

  // Seed some pre-existing relationships for drama
  const seedRelationship = (fromId: string, toId: string, type: Parameters<typeof createRelationship>[1]) => {
    const rels = relationships.get(fromId) ?? [];
    const idx = rels.findIndex(r => r.targetId === toId);
    if (idx >= 0) {
      rels[idx] = createRelationship(toId, type, 0);
    }
    relationships.set(fromId, rels);
  };

  // Alex and Maria are friends
  seedRelationship('npc_1', 'npc_2', 'friend');
  seedRelationship('npc_2', 'npc_1', 'friend');

  // Elena and Victor are romantic
  seedRelationship('npc_3', 'npc_4', 'romantic');
  seedRelationship('npc_4', 'npc_3', 'romantic');

  // Radu and Cristina are rivals
  seedRelationship('npc_5', 'npc_6', 'rival');
  seedRelationship('npc_6', 'npc_5', 'rival');

  // Dan and Andrei are close friends
  seedRelationship('npc_7', 'npc_8', 'close_friend');
  seedRelationship('npc_8', 'npc_7', 'close_friend');

  const time: SimTime = { day: 1, hour: 8, tick: 0 };

  return {
    time,
    npcs,
    relationships,
    reputation: [],
    rumors: [],
    economy: [...JOB_MARKET],
    transactions: [],
    eventLog: [],
    isRunning: false,
    speed: 1,
  };
}
