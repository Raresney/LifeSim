# Architecture

## System Overview

```
Browser (client-side simulation)
├── React Frontend
│   ├── Landing Page (globe.gl, light theme)
│   ├── Character Setup (avatar customization)
│   └── Simulation View
│       ├── Globe View (globe.gl, 3D earth)
│       ├── Map View (MapLibre GL, 3D buildings, OSRM routing)
│       ├── Sidebar (NPC list, stats)
│       ├── Timeline (event log)
│       └── NPC Detail (LLM narrative, PDF export)
│
├── Simulation Engine (runs in useRef, decoupled from React)
│   ├── Utility AI (action scoring)
│   ├── Event System (social, life events)
│   ├── Memory (short-term + long-term with decay)
│   ├── Social Graph (trust/affection/respect)
│   ├── Rumor Propagation (telephone-game distortion)
│   └── Economy (jobs, income, spending)
│
├── Map Layer
│   ├── MapLibre GL JS (WebGL renderer)
│   ├── 3D Buildings (OpenFreeMap fill-extrusion)
│   ├── OSRM Routing (cached road paths)
│   ├── Route Animation (rAF interpolation)
│   └── Day/Night Cycle (time-based visuals)
│
└── API Layer
    └── /api/narrative (LLM endpoint)
        ├── Zod validation
        ├── Rate limiting (10 req/min)
        ├── Response cache (200 entries, 10min TTL)
        └── Multi-model fallback chain
            └── Gemini Flash → GPT-4o Mini → Claude Haiku → Llama 3.3

Server
├── Next.js API Routes
├── OpenRouter (LLM proxy)
└── Neon PostgreSQL (persistence via Drizzle ORM)
```

## Decision Engine

### Utility AI — 6-Factor Weighted Scoring

Every tick (3 simulated hours), each NPC evaluates all possible actions:

```
totalScore = needs       × 0.30   // hunger → eating, low energy → sleeping
           + time        × 0.20   // 3AM → sleeping, 12PM → eating
           + personality × 0.20   // ambitious → working, lazy → relaxing
           + mood        × 0.15   // stressed → relaxing, happy → socializing
           + goals       × 0.10   // promotion → working
           + inertia     × 0.05   // continuity bonus for current activity
```

Top 3 scoring actions enter weighted random selection for natural unpredictability.

### Tick Pipeline

Heavy subsystems are staggered across ticks:

```
Phase 1: Utility AI        — every tick
Phase 2: Passive Stats     — every tick
Phase 3: Economy           — every tick
Phase 4: Memory Decay      — every 3rd tick
Phase 5: Social Events     — every 2nd tick
Phase 6: Life Events       — every 2nd tick
Phase 7: Rumor Pruning     — every 4th tick
Phase 8: Cleanup           — every tick (cap arrays)
```

All state updates are immutable — each phase returns a new world state.

### Time System

8 cadrane per day (3 hours each). Full week = 56 ticks.

## Memory System

```
Short-term (cap: 20, FIFO)
  │ Decay: 0.05/tick
  │ Auto-promote when emotionalWeight ≥ 7
  ▼
Long-term (unlimited)
  │ Decay: 0.01/tick (5× slower)
  │ Minimum weight: 1
```

## Social Graph

Three independent axes per relationship:

| Axis | Range | Drives |
|------|-------|--------|
| Trust | -100..100 | Secret sharing, rumor spread |
| Affection | -100..100 | Romance, help probability |
| Respect | -100..100 | Influence, advice-seeking |

Auto-upgrades: acquaintance → friend → close_friend, romantic (high affection + trust), rival/enemy (negative values).

## Rumor Propagation

```
NPC A: "Victor got a promotion"       (credibility: 1.0)
  → NPC B: "Victor got a promotion"   (credibility: 0.9)
  → NPC C: "Victor got a big raise"   (credibility: 0.7)  ← distortion
  → NPC D: "Victor is rich now"       (credibility: 0.4)  ← distortion
```

Personality affects spread (social → higher chance) and distortion (honest → lower).

## Map System

### MapLibre GL JS

WebGL-based map renderer with:
- CartoDB raster tiles (Voyager for day, Dark for night)
- 3D building extrusion from OpenFreeMap vector tiles
- Route visualization (GeoJSON line with glow + dash layers)
- DOM markers for NPCs and POIs
- Building interaction popups (click → name, type, NPCs inside)

### OSRM Routing

NPCs move along real Iași streets via the OSRM demo server:

```
Engine: NPC changes currentLocation (e.g. "home" → "work")
  → useNPCRoutes detects change
  → Fetches OSRM route (cached after first fetch)
  → rAF loop interpolates position along waypoints
  → MapLibre marker moves smoothly along the road
  → Follow mode: camera tracks with easeTo()
```

Route cache: in-memory Map, request deduplication, 200ms throttle.

### Day/Night Cycle

Tied to simulation time:

| Hour | Period | Tiles | Visuals |
|------|--------|-------|---------|
| 22-4 | Night | Dark | Blue overlay, stars, moon |
| 5-7 | Dawn | Voyager | Warm orange tint |
| 8-17 | Day | Voyager | Clear |
| 18-19 | Sunset | Voyager | Orange/red overlay |
| 20-21 | Dusk | Dark | Deep blue overlay |

Building colors update per period. Stars are deterministic SVG with opacity animation.

## LLM Integration

### API Route (`/api/narrative`)

```
Request → Zod Schema Validation → Rate Limit (10/min/IP)
  → Cache Lookup (state hash)
    → [hit] Return cached narrative
    → [miss] Try model chain:
        1. Gemini 2.0 Flash
        2. GPT-4o Mini
        3. Claude 3.5 Haiku
        4. Llama 3.3 70B
      → 30s timeout per model
      → Cache result → Return
```

State hash buckets stats into 10% increments for higher cache hit rates.

## Database Schema

PostgreSQL on Neon serverless via Drizzle ORM (HTTP driver, zero idle connections).

| Table | Purpose |
|-------|---------|
| simulations | User sessions, avatar config (JSONB) |
| npcs | NPC state (flat stat columns) |
| relationships | Social graph edges (bidirectional indexes) |
| memories | Short + long-term (indexed by weight for decay) |
| rumors | Active rumors (indexed by tick for pruning) |
| events | Append-only event log |
| transactions | Financial history (capped at 500) |
| narrative_cache | LLM responses (unique on state_hash) |

7 enums, 16 indexes. Cascade deletes on simulation FK.

## Performance

### Engine Decoupled from React

```
Engine (useRef)              React (throttled)
┌──────────────┐              ┌──────────┐
│ processTick()│──dirty flag──│ setState │──> render
│ runs in ref  │   (250ms)    │ max 4/s  │
│ zero React   │              └──────────┘
└──────────────┘
```

### Animation Strategy

| Element | Method |
|---------|--------|
| Stat bars | CSS `transition-[width]` (GPU-composited) |
| Button hover/active | CSS transforms |
| Panel slide-in/out | Framer Motion AnimatePresence |
| Map NPC positions | rAF + ref interpolation (15fps flush) |
| Globe data | Imperative calls, throttled 1000ms |

### React Optimization

- `React.memo()` on sidebar items, avatar, timeline, stat components
- `useCallback` with functional setState for stable references
- `useMemo` for computed arrays
- CSS transitions preferred over Framer Motion for live data

## Security

| Layer | Protection |
|-------|-----------|
| API Keys | `.env.local` (gitignored, server-only) |
| Input | Zod schemas on request body |
| Rate Limiting | Sliding window, 10 req/min per IP |
| HTTP Headers | X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| LLM Output | Timeout, garbled output detection |
| Data | Client-side simulation, no user data to LLM |
