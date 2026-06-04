# LifeSim

Autonomous NPC life simulator. 10 characters live their own week in Iași, Romania — every decision, relationship, and memory emerges from a Utility AI engine with zero scripting.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue) ![MapLibre](https://img.shields.io/badge/MapLibre_GL-3D_Map-orange) ![PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL-green)

## Quick Start

```bash
npm install

# .env.local
OPENROUTER_API_KEY=your-key
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

npm run db:push
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
│                                                     │
│  ┌─────────┐   ┌──────────┐   ┌────────────────┐  │
│  │ Landing  │──>│  Setup   │──>│  Simulation    │  │
│  │  Page    │   │ (Avatars)│   │                │  │
│  │ + Globe  │   │          │   │ Globe ←→ Map   │  │
│  └─────────┘   └──────────┘   │ Sidebar + Stats │  │
│                                │ Timeline        │  │
│                                │ NPC Detail      │  │
│                                └───────┬────────┘  │
│                                        │           │
│  ┌─────────────────────────────────────┤           │
│  │          Engine (useRef)            │           │
│  │                                     │           │
│  │  Utility AI ──> Events ──> Memory   │ 250ms     │
│  │  Economy ──> Social ──> Rumors      │──flush──> │ React
│  │                                     │           │
│  │  Runs at simulation speed           │           │
│  │  Zero React overhead                │           │
│  └─────────────────────────────────────┘           │
│                                                     │
│  ┌──────────────────┐  ┌────────────────────────┐  │
│  │  OSRM Routing    │  │  MapLibre GL JS        │  │
│  │  Cached routes   │  │  3D buildings          │  │
│  │  Interpolation   │  │  Day/night cycle       │  │
│  │  Real Iași roads  │  │  NPC markers + routes  │  │
│  └──────────────────┘  └────────────────────────┘  │
└──────────────────────────┬──────────────────────────┘
                           │ /api/narrative (on-demand)
                    ┌──────┴──────┐
                    │  Next.js    │
                    │  API Route  │
                    │             │
                    │  Zod valid. │
                    │  Rate limit │
                    │  LLM chain  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         OpenRouter    Neon PostgreSQL
         (LLM API)    (persistence)
```

### Decision Engine

Every tick (3 simulated hours), each NPC evaluates all possible actions:

```
Score = Needs(0.30) + Time(0.20) + Personality(0.20) + Mood(0.15) + Goals(0.10) + Inertia(0.05)
```

Top 3 scoring actions enter weighted random selection. NPCs don't always pick optimally.

### Tick Pipeline

| Phase | Frequency | System |
|-------|-----------|--------|
| 1 | Every tick | Utility AI — action selection |
| 2 | Every tick | Passive stats (energy, hunger, health) |
| 3 | Every tick | Economy (income, spending) |
| 4 | Every 3rd | Memory decay |
| 5 | Every 2nd | Social interactions |
| 6 | Every 2nd | Random life events |
| 7 | Every 4th | Rumor pruning |

### Map System

- **MapLibre GL JS** with 3D building extrusion from OpenFreeMap vector tiles
- **OSRM routing** — NPCs travel along real Iași streets, no teleportation
- **Route animation** — `requestAnimationFrame` loop interpolates position along road waypoints
- **Follow mode** — camera tracks selected NPC with ETA, distance, route visualization
- **Day/night cycle** — building colors, overlay tint, stars/moon, tied to simulation time
- **Event markers** — floating notifications for social events, conflicts, life events

### LLM Integration

Called only when user clicks "Explore Inner World" on an NPC:

```
Request → Zod → Rate Limit → Cache Lookup
                                   ↓
                          [miss] → Gemini Flash → GPT-4o Mini → Claude Haiku → Llama 3.3
                                   ↓
                          Cache (10min TTL, 200 entries) → Response
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Map | MapLibre GL JS (WebGL, 3D buildings) |
| Routing | OSRM (real road navigation) |
| Globe | globe.gl (Three.js) |
| Styling | Tailwind CSS 4 |
| Animations | Framer Motion + CSS transitions |
| Database | PostgreSQL (Neon serverless, Drizzle ORM) |
| LLM | OpenRouter (multi-model fallback) |
| Validation | Zod |

## NPCs

| Name | Occupation | Personality |
|------|-----------|-------------|
| Alex | Programmer | ambitious, social |
| Maria | Teacher | generous, optimistic |
| Elena | Doctor | cautious, honest |
| Victor | Entrepreneur | ambitious, manipulative |
| Radu | Freelancer | impulsive, social |
| Cristina | Programmer | ambitious, cynical |
| Dan | Chef | lazy, generous |
| Andrei | Artist | introverted, cautious |
| Ioana | Student | social, impulsive |
| Mihai | Mechanic | greedy, manipulative |

## Project Structure

```
src/
  app/
    api/narrative/        LLM endpoint (Zod, rate limiting, caching)
    page.tsx              3-screen router: Landing → Setup → Simulation
    globals.css           Design tokens (light landing + simulation theme)
    layout.tsx
  components/
    LandingPage.tsx       Hero + globe + How It Works + NPC carousel + CTA
    LandingGlobe.tsx      Decorative globe with zoom-in transition
    CharacterSetup.tsx    Avatar customization with randomize animation
    SimulationView.tsx    Main dashboard: sidebar, globe/map, controls
    GlobeView.tsx         Interactive 3D globe (simulation, NPC markers)
    MapView.tsx           MapLibre street map, 3D buildings, routing, day/night
    NPCDetail.tsx         Slide-in detail panel + LLM narrative + PDF export
    Avatar.tsx            Anime/chibi SVG avatar renderer
    Timeline.tsx          Event log
    NPCCard.tsx           Reusable NPC card
    PersonalityRadar.tsx  SVG radar chart
  engine/
    types.ts              TypeScript interfaces
    tick.ts               Main loop (8 cadrane, subsystem throttling)
    utility-ai.ts         6-factor action scoring
    events.ts             Social interactions, effect application
    memory.ts             Short/long-term memory with decay
    social.ts             Relationship graph (trust/affection/respect)
    rumors.ts             Rumor propagation with distortion
    economy.ts            Jobs, salaries, spending
    life-events.ts        Random life events
    world.ts              World initialization
    avatar.ts             Avatar config types
  db/
    schema.ts             PostgreSQL schema (8 tables, 16 indexes)
    index.ts              Neon serverless connection
  lib/
    routing.ts            OSRM route fetching, cache, interpolation
    rate-limit.ts         Sliding window rate limiter
    narrative-cache.ts    LLM response cache (state hash, LRU)
  data/
    npcs.ts               10 NPC definitions
    locations.ts          Iași coordinates, POIs, building metadata
  hooks/
    useSimulation.ts      Engine loop (useRef) + throttled UI sync
    useNPCRoutes.ts       NPC route state + animation loop
```

## Time System

8 cadrane per day, 3 hours each. Full week = 56 ticks.

```
00:00 Night → 03:00 Early Morning → 06:00 Morning → 09:00 Late Morning
12:00 Afternoon → 15:00 Late Afternoon → 18:00 Evening → 21:00 Night
```

## Database

PostgreSQL on Neon. 8 tables, 7 enums, 16 indexes.

```bash
npm run db:push      # Push schema
npm run db:generate  # Generate migrations
npm run db:studio    # Drizzle Studio
```

## Security

- API keys in `.env.local` (gitignored, server-side only)
- Zod input validation on API routes
- Rate limiting (10 req/min per IP)
- Security headers (X-Frame-Options, CSP, nosniff)
- Simulation runs client-side, no user data sent to LLM
