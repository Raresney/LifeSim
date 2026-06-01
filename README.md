# LifeSim — Autonomous NPC Life Simulator

A web application that simulates 10 NPCs living an autonomous week in Iași, Romania. Each NPC has a unique identity, personality, goals, relationships, and memory — all driven by a **Utility AI engine** that runs without any LLM calls. An LLM is used **only on-demand** when the user clicks on an NPC to explore their inner world.

## Architecture

### Three-Layer Decision System

The core challenge: make NPCs feel alive without running an LLM for each one constantly.

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: Utility AI Engine (runs every tick)        │
│  ─ Weighted scoring: needs + personality + mood +    │
│    goals + time + inertia + relationships            │
│  ─ Top 3 actions → weighted random selection         │
│  ─ Cost: ~0ms per NPC (pure math)                    │
├─────────────────────────────────────────────────────┤
│  Layer 2: Event System (emergent behavior)           │
│  ─ Social interactions when NPCs share location      │
│  ─ Rumor propagation with "telephone game" distortion│
│  ─ Random life events (illness, inheritance, etc.)   │
│  ─ Memory formation with emotional weight decay      │
├─────────────────────────────────────────────────────┤
│  Layer 3: LLM Narrative (on-demand only)             │
│  ─ Called ONLY when user clicks "Explore Inner World"│
│  ─ Receives NPC state, memories, relationships       │
│  ─ Returns first-person narration (~150 words)       │
│  ─ Model: Llama 3.1 8B via OpenRouter (free tier)    │
└─────────────────────────────────────────────────────┘
```

### Utility AI — How NPCs Decide

Each tick (1 simulated hour), every NPC evaluates all possible actions through weighted scoring:

| Factor | What it does | Example |
|--------|-------------|---------|
| **needsScore** | Maps stats to actions | Hunger 80% → eating scores high |
| **timeScore** | Time-appropriate actions | 3 AM → sleeping scores high |
| **personalityScore** | Trait bonuses | `ambitious` → working bonus |
| **moodScore** | Emotional influence | `stressed` → relaxing bonus |
| **goalScore** | Goal-driven behavior | "get promotion" → working bonus |
| **inertiaScore** | Continuity preference | Already working → keep working |

The top 3 scoring actions enter a **weighted random selection** — NPCs don't always pick the optimal choice, making behavior feel natural and unpredictable.

### Engine Modules

| Module | File | Purpose |
|--------|------|---------|
| **Types** | `src/engine/types.ts` | All TypeScript interfaces (NPC, Memory, Relationship, Rumor, etc.) |
| **Utility AI** | `src/engine/utility-ai.ts` | Action scoring and selection |
| **Memory** | `src/engine/memory.ts` | Short-term (20 cap) + long-term promotion, emotional weight decay |
| **Social** | `src/engine/social.ts` | Relationships (trust/affection/respect), auto-type-upgrade |
| **Rumors** | `src/engine/rumors.ts` | Rumor creation, propagation with distortion, personality-based spread |
| **Economy** | `src/engine/economy.ts` | Jobs, salaries, spending, performance based on energy+mood |
| **Life Events** | `src/engine/life-events.ts` | Random events (illness, inheritance, job offers, etc.) |
| **Events** | `src/engine/events.ts` | Social interactions, event creation, effect application |
| **Tick** | `src/engine/tick.ts` | Main loop orchestrator |
| **World** | `src/engine/world.ts` | World initialization, NPC creation, relationship seeding |

### Memory System

- **Short-term memory**: Cap of 20, FIFO eviction
- **Long-term memory**: Auto-promoted when emotional weight >= 7
- **Decay**: 0.05/tick for short-term, 0.01/tick for long-term
- **Emotional weight**: Events that cause strong emotions (arguments, romantic moments) persist longer

### Social Graph

Each relationship has three axes:
- **Trust** (-100 to 100) — reliability, honesty
- **Affection** (-100 to 100) — emotional closeness
- **Respect** (-100 to 100) — admiration, competence

Relationship types auto-upgrade based on thresholds:
- `acquaintance` → `friend` → `close_friend`
- `romantic` (high affection + trust)
- `rival` / `enemy` (negative values)

### Rumor Propagation

Rumors spread through social interactions with a "telephone game" mechanic:
- Each spread has a chance to **distort** the rumor
- Personality affects spread probability (`social` spreads more, `honest` spreads less)
- Rumors have a credibility score that decays with distortion
- Old rumors are automatically pruned

## UI Components

| Component | Description |
|-----------|-------------|
| **CharacterSetup** | Pre-simulation avatar customization (skin, hair, eyes, face, accessories, clothing) |
| **SimulationView** | Main simulation screen with globe/map, sidebar, controls |
| **GlobeView** | 3D globe (globe.gl) with country borders, NPC markers, auto-rotate |
| **MapView** | Leaflet street map of Iași, animated NPC markers, POI locations |
| **NPCDetail** | Modal with full NPC stats, personality, goals, relationships, memories, LLM button |
| **Avatar** | SVG-based avatar renderer with mood-dependent expressions |
| **Timeline** | Event log with type-based icons and colors |

### Globe ↔ Map Navigation

- **Default view**: 3D globe showing Earth with NPC markers on Iași
- **Click NPC** (sidebar or globe): Transitions to Leaflet street map zoomed on that NPC
- **Zoom out** on street map (below level 10): Automatically transitions back to 3D globe
- **Zoom in** on globe (past threshold): Automatically transitions to street map

## NPCs

10 NPCs with Romanian names, living in Iași:

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

## Scaling to Hundreds of NPCs

The current implementation handles 10 NPCs. Here's how the architecture would scale:

### Decision Layer — Tiered Approach

| NPC Count | Method | When Used | Compute Cost |
|-----------|--------|-----------|-------------|
| Background (900+) | **Markov Chain** | NPCs nobody is watching | Near zero — one random number + matrix lookup |
| Foreground (50-100) | **Utility AI** | NPCs visible on screen | Low — weighted scoring per tick |
| Detail (1) | **LLM** | User clicks to explore | High — API call |

**Markov Chains** for background NPCs: each NPC has a transition matrix (state → next state probabilities) derived from their personality traits. A `lazy` NPC's matrix has higher `relaxing → relaxing` probability. Ultra-fast but less nuanced.

**Utility AI** for visible NPCs: full scoring with all factors. More expensive but produces richer behavior.

### LLM Scaling

- **Cache layer** (Redis): Store narrative per NPC + state hash. Same state = serve from cache
- **Pre-generation**: Background worker generates narratives on major state changes (mood shift, conflict, job change)
- **Queue with priority**: Active/watched NPCs get priority, idle NPCs wait
- **Tiered models**: Important NPCs → larger model, minor NPCs → small model or template fallback
- **Rate limiting**: Prevent spam clicks from burning API quota

### Behavioral Divergence

Even with identical starting parameters, NPCs diverge rapidly through:
1. **Random seed per instance** — same algorithm, different random sequences
2. **Personality-modified matrices** — each NPC gets unique transition probabilities
3. **Memory accumulation** — different experiences create different decision contexts
4. **Event cascade** — one random event changes relationships, which changes future decisions (butterfly effect)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **3D Globe**: globe.gl (Three.js)
- **Street Map**: Leaflet + react-leaflet (CartoDB Voyager tiles)
- **LLM**: OpenRouter API (Llama 3.1 8B Instruct, free tier)
- **Avatars**: Custom SVG rendering

## Getting Started

```bash
# Install dependencies
npm install

# Create .env.local with your OpenRouter API key
echo "OPENROUTER_API_KEY=your-key-here" > .env.local

# Run development server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) — customize avatars, then start the simulation.

## Project Structure

```
src/
├── app/
│   ├── api/narrative/    # LLM endpoint (OpenRouter)
│   ├── page.tsx          # Entry point (setup → simulation)
│   └── layout.tsx
├── components/
│   ├── GlobeView.tsx     # 3D globe with globe.gl
│   ├── MapView.tsx       # Leaflet street map
│   ├── SimulationView.tsx # Main simulation UI
│   ├── CharacterSetup.tsx # Avatar customization
│   ├── NPCDetail.tsx     # NPC detail modal + LLM
│   ├── Avatar.tsx        # SVG avatar renderer
│   └── Timeline.tsx      # Event log
├── engine/
│   ├── types.ts          # All interfaces
│   ├── utility-ai.ts     # Action scoring
│   ├── memory.ts         # Memory system
│   ├── social.ts         # Relationships
│   ├── rumors.ts         # Rumor propagation
│   ├── economy.ts        # Jobs & spending
│   ├── life-events.ts    # Random events
│   ├── events.ts         # Social interactions
│   ├── tick.ts           # Main loop
│   ├── world.ts          # World init
│   └── avatar.ts         # Avatar types & defaults
├── data/
│   ├── npcs.ts           # 10 NPC definitions
│   └── locations.ts      # Iași coordinates & POIs
└── hooks/
    └── useSimulation.ts  # React simulation hook
```
