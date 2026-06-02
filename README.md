# LifeSim — Autonomous NPC Life Simulator

A web application that simulates 10 NPCs living an autonomous week in Iasi, Romania. Each NPC has a unique identity, personality, goals, relationships, and memory — all driven by a **Utility AI engine** that runs without any LLM calls. An LLM is used **only on-demand** when the user clicks on an NPC to explore their inner world.

## Quick Start

```bash
npm install

# Create .env.local
echo "OPENROUTER_API_KEY=your-key-here" > .env.local
echo "DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require" >> .env.local

# Push database schema to Neon
npm run db:push

# Start dev server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) — customize avatars with LoL-style champion select, then start the simulation.

## Features

- **10 Autonomous NPCs** — each with personality traits, goals, memory, and social relationships
- **Utility AI Engine** — 6-factor weighted scoring drives every decision (zero LLM cost)
- **3D Globe + Street Map** — cinematic globe.gl view with smooth transitions to Leaflet street map
- **LoL-Style Champion Select** — rolling randomize animation with staggered lock-in effects
- **LLM Narrative** — on-demand inner monologue via OpenRouter (5-model fallback chain)
- **Social Graph** — trust/affection/respect axes, auto-upgrading relationship types
- **Rumor Propagation** — telephone-game distortion as gossip spreads between NPCs
- **Memory System** — short-term (20 cap) + long-term with emotional weight decay
- **Economy** — jobs, salaries, spending, occupation-based income
- **PDF Export** — export any NPC's full profile + narrative as PDF
- **PostgreSQL Persistence** — Drizzle ORM + Neon serverless (8 tables, 16 indexes)
- **Production Hardened** — rate limiting, response caching, Zod validation, security headers

## Architecture Overview

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full technical deep-dive.

### Three-Layer Decision System

```
Layer 1: Utility AI Engine (every tick, ~0ms/NPC)
  Weighted scoring: needs + personality + mood + goals + time + inertia
  Top 3 actions -> weighted random selection

Layer 2: Event System (emergent behavior)
  Social interactions at shared locations
  Rumor propagation with distortion
  Random life events + memory formation

Layer 3: LLM Narrative (on-demand only)
  Called when user clicks "Explore Inner World"
  Multi-model fallback: Llama 3.3 -> Gemma 4 -> Llama 3.2 -> Qwen3 -> Hermes 3
  State-hash caching (~80% hit rate)
```

### Performance Optimizations

| Optimization | Impact |
|---|---|
| RAF animation throttled to ~15fps | 4x fewer React re-renders on map |
| Memoized sidebar items (`React.memo`) | Only changed NPCs re-render |
| Icon cache (`Map<string, L.DivIcon>`) | Avoids `renderToStaticMarkup` per frame |
| Globe HTML elements only on focus change | Eliminates expensive DOM recreation |
| Deterministic position offsets (hash-based) | Stable NPC positions, enables memoization |
| Immutable state updates in tick engine | Predictable renders, no stale closures |
| LLM response cache (10min TTL, 200 entries) | 600-3000x faster for cached responses |
| In-memory rate limiting (10 req/min/IP) | Prevents API key abuse |
| Min tick interval 200ms | Caps CPU at 5 ticks/sec even at 10x speed |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 |
| 3D Globe | globe.gl (Three.js) + topojson-client |
| Street Map | Leaflet + react-leaflet (CartoDB Voyager tiles) |
| Database | PostgreSQL (Neon serverless) |
| ORM | Drizzle ORM (HTTP driver, zero idle connections) |
| LLM | OpenRouter API (multi-model fallback) |
| Validation | Zod |
| PDF | jsPDF (client-side) |
| Avatars | Custom SVG rendering |

## NPCs

10 NPCs with Romanian names, living in Iasi:

| Name | Occupation | Personality | Starting Relationships |
|------|-----------|-------------|----------------------|
| Alex | Programmer | ambitious, social | Friends with Maria |
| Maria | Teacher | generous, optimistic | Friends with Alex |
| Elena | Doctor | cautious, honest | Romantic with Victor |
| Victor | Entrepreneur | ambitious, manipulative | Romantic with Elena |
| Radu | Freelancer | impulsive, social | Rivals with Cristina |
| Cristina | Programmer | ambitious, cynical | Rivals with Radu |
| Dan | Chef | lazy, generous | Close friends with Andrei |
| Andrei | Artist | introverted, cautious | Close friends with Dan |
| Ioana | Student | social, impulsive | — |
| Mihai | Mechanic | greedy, manipulative | — |

## Project Structure

```
src/
  app/
    api/narrative/       # LLM endpoint (Zod validation, rate limiting, caching)
    page.tsx             # Entry point (setup -> simulation)
    layout.tsx
  components/
    CharacterSetup.tsx   # LoL-style champion select with rolling randomize
    SimulationView.tsx   # Main UI: globe/map, sidebar, controls, transitions
    GlobeView.tsx        # 3D globe (globe.gl), Romania highlight, cinematic entry
    MapView.tsx          # Leaflet street map, animated NPC markers, POIs
    NPCDetail.tsx        # NPC detail modal + LLM narrative + PDF export
    Avatar.tsx           # SVG avatar renderer (React.memo)
    Timeline.tsx         # Event log with type-based icons
  engine/
    types.ts             # All TypeScript interfaces
    utility-ai.ts        # 6-factor action scoring
    memory.ts            # Short/long-term memory with emotional decay
    social.ts            # Relationship graph (trust/affection/respect)
    rumors.ts            # Rumor propagation with distortion
    economy.ts           # Jobs, salaries, spending
    life-events.ts       # Random life events
    events.ts            # Social interactions, effect application
    tick.ts              # Main loop orchestrator
    world.ts             # World initialization, NPC seeding
    avatar.ts            # Avatar types & defaults
  db/
    schema.ts            # PostgreSQL schema (8 tables, 7 enums, 16 indexes)
    index.ts             # Neon serverless connection (HTTP driver)
  lib/
    rate-limit.ts        # Sliding window rate limiter (per IP)
    narrative-cache.ts   # LLM response cache (state hash, LRU, 10min TTL)
  data/
    npcs.ts              # 10 NPC definitions
    locations.ts         # Iasi coordinates & POIs
  hooks/
    useSimulation.ts     # React simulation hook (single source of truth)
drizzle.config.ts        # Drizzle migration config
```

## Database

PostgreSQL on Neon (serverless). Schema pushed via Drizzle Kit.

```bash
npm run db:push     # Push schema to Neon
npm run db:generate # Generate migrations
npm run db:studio   # Open Drizzle Studio
```

**8 tables**: simulations, npcs, relationships, memories, rumors, events, transactions, narrative_cache

## Security

- API keys in `.env.local` (gitignored, server-side only)
- Zod input validation on API routes
- Rate limiting (10 req/min per IP)
- Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- No user data stored — simulation runs client-side
- LLM calls send only fictional NPC state, never user information

## Scaling Strategy

The architecture supports scaling to hundreds of NPCs via a three-tier approach:

| Tier | NPCs | Method | Cost |
|------|-------|--------|------|
| Background | 400+ | Markov Chain (personality-modified matrices) | ~0ms for 1000 NPCs |
| Foreground | 50-100 | Utility AI (full 6-factor scoring) | ~1ms per NPC |
| Detail | 1 | LLM (on-demand narrative) | 1 API call per click |

NPCs promote/demote between tiers based on viewport visibility. See [ARCHITECTURE.md](ARCHITECTURE.md) for details.
