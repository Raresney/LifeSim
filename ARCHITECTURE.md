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
    (in-memory useRef)
```

## Application Flow

```
Landing Page (light theme)
  ├── Hero section (text + decorative 3D globe)
  ├── How It Works (3 cards)
  ├── NPC Carousel (horizontal scroll)
  ├── Live Timeline Preview (mock events)
  ├── Relationship Network (interactive SVG)
  └── CTA → Character Setup

Character Setup (light theme)
  ├── 10 NPC grid with anime/chibi avatars
  ├── LoL-style randomize (staggered lock-in)
  ├── Per-NPC editor (skin, hair, eyes, clothes, accessories)
  └── Start → Simulation

Simulation (dark theme, sim-dark class)
  ├── Globe View (globe.gl, auto-rotate, NPC markers)
  ├── Map View (Leaflet, animated markers, POIs)
  ├── NPC Sidebar (population list, expandable stats)
  ├── Timeline Panel (event log with icons)
  ├── NPC Detail (slide-in, LLM narrative, PDF export)
  └── Bottom Controls (play/pause, speed, step, time display)
```

## Decision Engine

### Utility AI — 6-Factor Weighted Scoring

Every tick (3 simulated hours), each NPC evaluates all possible actions:

```typescript
totalScore = needsScore   * 0.30   // Maps stats to actions (hunger -> eating)
           + timeScore    * 0.20   // Time-appropriate actions (3AM -> sleeping)
           + personalityScore * 0.20  // Trait bonuses (ambitious -> working)
           + moodScore    * 0.15   // Emotional influence (stressed -> relaxing)
           + goalScore    * 0.10   // Goal-driven behavior (promotion -> working)
           + inertiaScore * 0.05   // Continuity (already eating -> keep eating)
```

Top 3 scoring actions enter **weighted random selection** — NPCs don't always pick optimally, creating natural unpredictability.

### Time System — 8 Cadrane

The simulation day is divided into 8 periods of 3 hours each (`HOURS_PER_TICK = 3`):

```
00:00 Night → 03:00 Early Morning → 06:00 Morning → 09:00 Late Morning
12:00 Afternoon → 15:00 Late Afternoon → 18:00 Evening → 21:00 Night
```

A full in-game week = 56 ticks (8 ticks/day × 7 days).

### Tick Pipeline with Subsystem Throttling

Not all systems run every tick. Heavy subsystems are staggered to reduce per-tick compute:

```
Phase 1: Utility AI       — EVERY tick   — Each NPC chooses action via weighted scoring
Phase 2: Passive Stats    — EVERY tick   — Energy drain, hunger increase, activity bonuses
Phase 3: Economy          — EVERY tick   — Work income, spending on activities
Phase 4: Memory Decay     — Every 3rd    — Short-term 0.05/tick, long-term 0.01/tick
Phase 5: Social Events    — Every 2nd    — Interactions between NPCs at same location
Phase 6: Life Events      — Every 2nd    — Random events (illness, inheritance, job offers)
Phase 7: Rumor Pruning    — Every 4th    — Remove expired rumors
Phase 8: Cleanup          — EVERY tick   — Cap transactions (500), cap events (200)
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
- **Old rumors pruned** every 4th tick

## Avatar System — Anime/Chibi SVG

Custom procedural SVG renderer with chibi proportions:

- **Head**: Large (60% of SVG), with radial gradient shading
- **Eyes**: Anime-style with iris, pupil, sparkle highlights, lid line
- **Mouth**: Cat-mouth `:3` on neutral, expressive on moods
- **Hair**: 7 styles (short/long/curly/buzz/ponytail/mohawk/bald) with gradient fills and spiky/flowing shapes
- **Blush marks**: Subtle pink ellipses on cheeks
- **Accessories**: Glasses, sunglasses (with shine), earrings, hat (with band), bandana (with dots)
- **Clothing**: 4 styles with details (hoodie pocket, shirt collar, t-shirt neckline)
- **Customization**: 8 categories × multiple options = thousands of combinations

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

### Simulation Loop — Engine Decoupled from React

The core performance architecture separates the simulation engine from React rendering:

```
Engine (runs in useRef)              React (throttled flush)
┌───────────────────┐                ┌──────────────────┐
│ setInterval(tick)  │  dirty flag   │ setSnapshot()    │
│ worldRef.current = │──(250ms)───>  │ triggers render  │
│   processTick()    │               │ max 4x/sec       │
│                    │               └──────────────────┘
│ Zero React calls   │
│ Pure computation   │
└───────────────────┘
```

**Before**: `setState()` called every tick → 10-20 full React re-renders/sec at 10x speed  
**After**: Engine in `useRef`, UI sync at 250ms → max 4 React renders/sec regardless of speed

### Animation Strategy

| What | Method | Why |
|------|--------|-----|
| Stat bars (MiniBar, StatBar) | CSS `transition-[width]` | GPU-composited, zero JS |
| Goal progress bars | CSS `transition-[width]` | Same — no Framer overhead |
| Sidebar expand/collapse | CSS `max-height` + `opacity` transition | Cheaper than AnimatePresence |
| Button hover/active | CSS `hover:scale-[]` + `active:scale-[]` | No Framer Motion instances |
| Panel slide-in/out | Framer Motion `AnimatePresence` | Complex enter/exit needs JS |
| Modal backdrop | Framer Motion `motion.div` | Opacity + blur transition |
| Map NPC positions | `requestAnimationFrame` + ref interpolation | 15fps flush to React |
| Globe data | Imperative `pointsData()` calls, throttled 1000ms | Avoids React re-render |

### React Optimization

| Component | Optimization | Why |
|-----------|-------------|-----|
| `NPCSidebarItem` | `React.memo()` | 10 items re-rendered every UI sync |
| `Avatar` | `React.memo()` | Pure SVG, called 10+ times per render |
| `Timeline` | `memo()` + `useMemo` filter | Event list doesn't change between ticks |
| `StatPill` | `memo()` | Static display components |
| `MiniBar` | `memo()` + CSS transition | Stat bars in sidebar |
| `BottomButton` | `memo()` + CSS hover | Toolbar buttons |
| `POIMarkers` | `memo()` | POI locations never change |
| Callbacks | `useCallback` with functional setState | Prevents child prop changes |

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
