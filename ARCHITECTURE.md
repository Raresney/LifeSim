# LifeSim Architecture

Technical deep-dive into how the autonomous NPC simulator works.

## System Overview

```
                    User Browser
                        |
          +-------------+-------------+
          |                           |
    React Frontend              Next.js API
    (client-side sim)           (/api/narrative)
          |                           |
    +-----+------+             +------+------+
    |            |             |             |
  Utility AI   Event       OpenRouter    Neon PostgreSQL
  Engine       System      (LLM API)    (persistence)
    |            |
    +-----+------+
          |
    World State
    (in-memory Map)
```

## Decision Engine

### Utility AI — 6-Factor Weighted Scoring

Every tick (1 simulated hour), each NPC evaluates all possible actions:

```typescript
totalScore = needsScore   * 0.30   // Maps stats to actions (hunger -> eating)
           + timeScore    * 0.20   // Time-appropriate actions (3AM -> sleeping)
           + personalityScore * 0.20  // Trait bonuses (ambitious -> working)
           + moodScore    * 0.15   // Emotional influence (stressed -> relaxing)
           + goalScore    * 0.10   // Goal-driven behavior (promotion -> working)
           + inertiaScore * 0.05   // Continuity (already eating -> keep eating)
```

Top 3 scoring actions enter **weighted random selection** — NPCs don't always pick optimally, creating natural unpredictability.

### Tick Pipeline

Each tick executes 7 phases sequentially:

```
Phase 1: Utility AI    — Each NPC chooses action via weighted scoring
Phase 2: Passive Stats — Energy drain, hunger increase, activity bonuses
Phase 3: Economy       — Work income, spending on activities
Phase 4: Memory Decay  — Short-term 0.05/tick, long-term 0.01/tick
Phase 5: Social Events — Interactions between NPCs at same location
Phase 6: Life Events   — Random events (illness, inheritance, job offers)
Phase 7: Cleanup       — Prune old rumors, cap transactions (500), cap events (200)
```

All state updates are **immutable** — each phase returns a new world state object.

### Scaling: Three-Tier Architecture

```
+--------------------------------------------------+
| Tier 3: LLM Narrative        (1 NPC)             |
|   On-demand when user clicks "Explore Inner World"|
|   5-model fallback chain via OpenRouter           |
|   State-hash caching (~80% hit rate)              |
+--------------------------------------------------+
| Tier 2: Utility AI           (10-100 NPCs)       |
|   Full 6-factor scoring each tick                 |
|   Foreground/visible NPCs                         |
|   ~1ms per NPC                                    |
+--------------------------------------------------+
| Tier 1: Markov Chain         (100-1000+ NPCs)    |
|   Personality-modified transition matrices         |
|   Background/invisible NPCs                       |
|   ~0ms for 1000 NPCs (1 random + table lookup)   |
+--------------------------------------------------+
```

NPCs **promote** (Markov -> Utility AI) when they enter the viewport and **demote** back when they leave. The user never notices — Markov keeps them in a plausible state.

## Memory System

```
Short-term Memory (cap: 20)
  |-- FIFO eviction when full
  |-- Decay: 0.05 per tick
  |-- Auto-promote to long-term when emotionalWeight >= 7
  v
Long-term Memory (unlimited)
  |-- Decay: 0.01 per tick (5x slower)
  |-- Never evicted (minimum weight: 1)
```

Memory influences decisions through the Utility AI goal score and LLM narrative context.

## Social Graph

Each relationship has three independent axes:

| Axis | Range | Drives |
|------|-------|--------|
| Trust | -100 to 100 | Sharing secrets, rumor spread willingness |
| Affection | -100 to 100 | Romantic potential, help probability |
| Respect | -100 to 100 | Influence, advice-seeking |

Relationship types auto-upgrade based on thresholds:
- `acquaintance` -> `friend` -> `close_friend`
- `romantic` (high affection + trust)
- `rival` / `enemy` (negative values)

## Rumor Propagation

```
NPC A creates rumor: "Victor got a promotion"
  |
  v  (social interaction at same location)
NPC B hears it: "Victor got a promotion" (credibility: 0.9)
  |
  v  (distortion chance based on personality)
NPC C hears: "Victor got a big raise" (credibility: 0.7)
  |
  v
NPC D hears: "Victor is rich now" (credibility: 0.4)
```

- **Personality affects spread**: `social` trait -> higher spread chance, `honest` -> lower distortion
- **Credibility decays** with each distortion
- **Old rumors pruned** after N ticks

## LLM Integration

### API Route (`/api/narrative`)

```
Request -> Zod Validation -> Rate Limit Check -> Cache Lookup
                                                      |
                                              [cache hit] -> Return cached narrative
                                              [cache miss] -> Try Model Chain
                                                                    |
                                              Model 1 (Llama 3.3 70B) -> success? -> cache + return
                                              Model 2 (Gemma 4 26B)   -> success? -> cache + return
                                              Model 3 (Llama 3.2 3B)  -> success? -> cache + return
                                              Model 4 (Qwen3 Coder)   -> success? -> cache + return
                                              Model 5 (Hermes 3 405B) -> success? -> cache + return
                                                                    |
                                                              All failed -> 503 error
```

Each model call has:
- 15-second AbortController timeout
- Garbled output detection (>10% ampersand chars -> reject)
- HTML entity decoding
- 2 retries with 3s delay for rate limiting

### Response Caching

Two layers:
1. **In-memory cache** (`src/lib/narrative-cache.ts`) — 200 entries, 10min TTL, LRU eviction
2. **Database cache** (`narrative_cache` table) — persistent, state hash indexed

State hash buckets stats into 10% increments for higher hit rates:
```
"Alex|happy|working|work|80|30|70|90|1000" -> cached narrative
```

## Database Schema

PostgreSQL on Neon serverless via Drizzle ORM.

### Tables

| Table | Purpose | Key Design Decisions |
|-------|---------|---------------------|
| `simulations` | User play sessions | UUID PK, stores avatar config as JSONB |
| `npcs` | NPC state per simulation | **Flat stat columns** (energy, stress, etc.) for fast WHERE queries |
| `relationships` | Social graph edges | Composite unique on (sim_id, from, to), bidirectional indexes |
| `memories` | Short + long-term memories | Indexed by (sim, npc, is_long_term, weight) for decay queries |
| `rumors` | Active rumors | Indexed by tick for age-based pruning |
| `events` | Append-only event log | Indexed by (sim, tick) and (sim, type) |
| `transactions` | Financial history | Capped at 500 per simulation |
| `narrative_cache` | LLM response cache | Unique on state_hash, indexed by created_at for pruning |

### Enums (7)

`mood`, `activity`, `location`, `occupation`, `relationship_type`, `goal_status`, `memory_category`, `event_type`

### Indexes (16)

Designed for the 3 hot query patterns:
1. **Load simulation**: All NPCs + relationships for a sim_id (composite indexes)
2. **Social interactions**: NPCs at same location (sim_id + current_location)
3. **Memory/event queries**: By NPC, by tick, by type (multi-column indexes)

### Connection Strategy

```typescript
// HTTP driver — 0 idle connections, pay-per-query
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });
```

- **HTTP mode** (not WebSocket) — stateless, ideal for serverless
- `fetchConnectionCache = true` — reuses TCP connections between requests
- Lazy singleton — connection only created on first query
- Cascade deletes on `sim_id` FK — delete simulation = delete all related data

## Frontend Performance

### React Optimization

| Component | Optimization | Why |
|-----------|-------------|-----|
| `NPCSidebarItem` | `React.memo()` | 30+ items re-rendered every tick -> only changed ones now |
| `Avatar` | `React.memo()` | Pure SVG, called 30+ times per render |
| `Timeline` | `memo()` + `useMemo` filter | Event list doesn't change between ticks |
| `StatPill` | `memo()` | Static display components |
| `MiniBar` | `memo()` | Stat bars in sidebar |
| `BottomButton` | `memo()` | Toolbar buttons |
| `POIMarkers` | `memo()` | POI locations never change |

### Animation Performance

**MapView (Leaflet)**:
- RAF loop throttled to ~15fps (66ms flush interval)
- Positions interpolated in refs, not state
- `mountedRef` guard prevents updates after unmount (fixes `_leaflet_pos` TypeError)
- Icon cache (`Map<string, L.DivIcon>`) avoids `renderToStaticMarkup` per frame
- Deterministic position offsets via character-code hashing (no `Math.random()` jitter)

**GlobeView (globe.gl)**:
- Point data updates throttled to 1000ms
- HTML elements (expensive DOM) only recreated on focus change
- Auto-rotate disabled after cinematic entry to reduce GPU load

### Simulation Hook

- Tick interval: `Math.max(200ms, 1000/speed)` — caps at 5 ticks/sec even at 10x
- `formattedTime` via `useMemo` (recalculates only on day/hour change)
- Events dispatched via `queueMicrotask` to avoid nested state updates

## Security

| Layer | Protection |
|-------|-----------|
| API Keys | `.env.local` (gitignored), server-side only |
| Input Validation | Zod schemas on `/api/narrative` request body |
| Rate Limiting | Sliding window, 10 req/min per IP |
| HTTP Headers | X-Frame-Options: DENY, X-Content-Type-Options: nosniff |
| LLM Output | Garbled output detection, HTML entity sanitization |
| Data Privacy | Simulation runs client-side, no user data sent to LLM |
| CORS | Next.js default same-origin policy |

## Config Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Turbopack, security headers, image optimization |
| `drizzle.config.ts` | Database migration config (Neon connection) |
| `.env.local` | API keys + database URL (gitignored) |
| `tsconfig.json` | TypeScript strict mode |
| `tailwind.config.ts` | Tailwind CSS configuration |
