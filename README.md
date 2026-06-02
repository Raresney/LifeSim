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

Open [http://localhost:3001](http://localhost:3001) — explore the landing page, customize anime avatars with LoL-style champion select, then start the simulation.

## Features

- **Apple/Linear Landing Page** — hero with 3D globe, NPC carousel, live timeline preview, relationship network SVG
- **10 Autonomous NPCs** — each with personality traits, goals, memory, and social relationships
- **Anime/Chibi Avatars** — custom SVG renderer with big eyes, expressive faces, gradient shading, sparkle highlights
- **Utility AI Engine** — 6-factor weighted scoring drives every decision (zero LLM cost)
- **8-Cadran Day System** — each tick advances 3 hours (Night → Early Morning → Morning → ... → Evening → Night)
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

### Three-Screen Flow

```
Landing Page  →  Character Setup  →  Simulation
(light theme)    (light theme)       (dark theme)
Hero + Globe     LoL champion        Globe/Map +
How It Works     select with         Sidebar +
NPC Carousel     anime avatars       Timeline +
Timeline                             Controls
Relationships
```

### Three-Layer Decision System

```
Layer 1: Utility AI Engine (every tick, ~0ms/NPC)
  Weighted scoring: needs + personality + mood + goals + time + inertia
  Top 3 actions -> weighted random selection

Layer 2: Event System (emergent behavior, staggered subsystems)
  Social interactions at shared locations (every 2nd tick)
  Rumor propagation with distortion
  Random life events + memory formation (every 2nd tick)
  Memory decay (every 3rd tick)

Layer 3: LLM Narrative (on-demand only)
  Called when user clicks "Explore Inner World"
  Multi-model fallback: Llama 3.3 -> Gemma 4 -> Llama 3.2 -> Qwen3 -> Hermes 3
  State-hash caching (~80% hit rate)
```

### Performance Architecture

The simulation engine is **decoupled from React rendering**:

```
Engine Loop (useRef)          UI Sync (throttled)
  ┌──────────────┐              ┌──────────┐
  │ processTick()│──dirty flag──│ flush to │──> React renders
  │ runs in ref  │   (250ms)    │ setState │    (max 4 FPS)
  │ zero React   │              └──────────┘
  │ overhead     │
  └──────────────┘
```

| Optimization | Impact |
|---|---|
| Engine in `useRef`, UI sync at 250ms | ~80% fewer React re-renders |
| Subsystem throttling (social/memory/life/rumors) | ~40% less compute per tick |
| CSS transitions instead of Framer Motion on stat bars | GPU-composited, zero JS |
| CSS hover/active instead of Framer `whileHover`/`whileTap` | Eliminated ~8 motion instances |
| Stable callbacks via functional `setState` | Prevents unnecessary child re-renders |
| RAF animation throttled to ~15fps on map | 4x fewer React re-renders |
| Icon cache (`Map<string, L.DivIcon>`) | Avoids `renderToStaticMarkup` per frame |
| Globe data updates throttled to 1000ms | Eliminates expensive DOM recreation |
| LLM response cache (10min TTL, 200 entries) | 600-3000x faster for cached responses |
| In-memory rate limiting (10 req/min/IP) | Prevents API key abuse |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 |
| Animations | Framer Motion (panels/modals only) + CSS transitions (live data) |
| 3D Globe | globe.gl (Three.js) + topojson-client |
| Street Map | Leaflet + react-leaflet (CartoDB Voyager tiles) |
| Database | PostgreSQL (Neon serverless) |
| ORM | Drizzle ORM (HTTP driver, zero idle connections) |
| LLM | OpenRouter API (multi-model fallback) |
| Validation | Zod |
| PDF | jsPDF (client-side) |
| Avatars | Custom anime/chibi SVG renderer |

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
    page.tsx             # 3-screen router: Landing → Setup → Simulation
    globals.css          # Design system (light landing + dark simulation)
    layout.tsx
  components/
    LandingPage.tsx      # Hero + 3D globe + How It Works + NPC carousel + CTA
    HeroGlobe.tsx        # Decorative auto-rotating globe.gl (landing page)
    CharacterSetup.tsx   # LoL-style champion select with rolling randomize
    SimulationView.tsx   # Main dashboard: sidebar, globe/map, controls, timeline
    GlobeView.tsx        # Interactive 3D globe (simulation, NPC markers)
    MapView.tsx          # Leaflet street map, animated NPC markers, POIs
    NPCDetail.tsx        # Slide-in detail panel + LLM narrative + PDF export
    Avatar.tsx           # Anime/chibi SVG avatar renderer (gradient shading, sparkles)
    Timeline.tsx         # Event log with type-based colored icons
    NPCCard.tsx          # Reusable NPC card component
    WorldStats.tsx       # Global statistics display
  engine/
    types.ts             # All TypeScript interfaces
    tick.ts              # Main loop orchestrator (8 cadrane, subsystem throttling)
    utility-ai.ts        # 6-factor action scoring
    events.ts            # Social interactions, effect application
    memory.ts            # Short/long-term memory with emotional decay
    social.ts            # Relationship graph (trust/affection/respect)
    rumors.ts            # Rumor propagation with distortion
    economy.ts           # Jobs, salaries, spending
    life-events.ts       # Random life events
    world.ts             # World initialization, NPC seeding
    avatar.ts            # Avatar config types & defaults
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
    useSimulation.ts     # Decoupled engine (useRef) + throttled UI sync
drizzle.config.ts        # Drizzle migration config
```

## Time System

The simulation day is divided into **8 cadrane** (3 hours each):

| Hour | Period |
|------|--------|
| 00:00 | Night |
| 03:00 | Early Morning |
| 06:00 | Morning |
| 09:00 | Late Morning |
| 12:00 | Afternoon |
| 15:00 | Late Afternoon |
| 18:00 | Evening |
| 21:00 | Night |

Each tick advances 3 simulated hours. A full in-game week = 56 ticks.

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
