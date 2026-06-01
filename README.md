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
│  ─ Multi-model fallback with retry logic             │
│  ─ Garbled output detection and auto-rejection       │
└─────────────────────────────────────────────────────┘
```

### Utility AI — How NPCs Decide

Each tick (1 simulated hour), every NPC evaluates all possible actions through weighted scoring:

| Factor | Weight | What it does | Example |
|--------|--------|-------------|---------|
| **needsScore** | 0.30 | Maps stats to actions | Hunger 80% → eating scores high |
| **timeScore** | 0.20 | Time-appropriate actions | 3 AM → sleeping scores high |
| **personalityScore** | 0.20 | Trait bonuses | `ambitious` → working bonus |
| **moodScore** | 0.15 | Emotional influence | `stressed` → relaxing bonus |
| **goalScore** | 0.10 | Goal-driven behavior | "get promotion" → working bonus |
| **inertiaScore** | 0.05 | Continuity preference | Already working → keep working |

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

## LLM Integration

### Multi-Model Fallback

The API route (`src/app/api/narrative/route.ts`) tries multiple free models in sequence:

1. **Llama 3.3 70B** (meta-llama)
2. **Gemma 4 26B** (Google)
3. **Llama 3.2 3B** (meta-llama)
4. **Qwen3 Coder** (Alibaba)
5. **Hermes 3 405B** (NousResearch)

Each model gets up to 2 retries with 3-second delays for rate limiting. If a model returns garbled output (>10% ampersand characters), it's automatically rejected and the next model is tried.

### Output Sanitization

LLM responses are sanitized before display:
- Garbled `&l&e&t&t&e&r&` patterns are detected and cleaned
- HTML entities are decoded
- Responses that can't be cleaned are rejected, triggering fallback to the next model

### PDF Export

Users can export any NPC's inner world narrative as a PDF report containing:
- NPC profile (name, occupation, personality, stats)
- Current goals and progress
- Relationship map with trust/affection/respect scores
- Recent memories
- Full LLM-generated inner monologue
- Model attribution and timestamp

## Security

### API Key Protection
- OpenRouter API key is stored in `.env.local` (gitignored, never committed)
- Key is only accessible server-side via Next.js API route (`/api/narrative`)
- Client-side code never sees or transmits the key
- API route includes `HTTP-Referer` and `X-Title` headers for OpenRouter tracking

### Input Validation
- LLM prompts are constructed server-side from validated NPC state
- No user-provided text is passed directly to the LLM
- Response content is sanitized before rendering

### Rate Limiting Considerations
- Free-tier models have built-in rate limits via OpenRouter
- Retry logic respects `Retry-After` headers
- Maximum 2 retries per model prevents infinite loops
- For production: add per-user rate limiting middleware

### Data Privacy
- All simulation data runs client-side in the browser
- No user data is stored on any server
- LLM calls send only NPC state (fictional data), never user information
- No cookies, no tracking, no analytics

## UI Components

| Component | Description |
|-----------|-------------|
| **CharacterSetup** | Pre-simulation avatar customization (skin, hair, eyes, face, accessories, clothing) |
| **SimulationView** | Main simulation screen with globe/map, sidebar, controls, smooth view transitions |
| **GlobeView** | 3D globe (globe.gl) with country borders, Romania highlighted, cinematic entry animation |
| **MapView** | Leaflet street map of Iasi, animated NPC markers, POI locations, zoom-out hint |
| **NPCDetail** | Modal with full NPC stats, personality, goals, relationships, memories, LLM + PDF export |
| **Avatar** | SVG-based avatar renderer with mood-dependent expressions |
| **Timeline** | Event log with type-based icons and colors |

### Globe ↔ Map Navigation

The app features a smooth hybrid navigation system with fade transitions:

- **Default view**: 3D globe showing Earth with Romania highlighted, NPC markers on Iasi
- **Click NPC** (sidebar or globe): Fade transition to Leaflet street map zoomed on that NPC
- **Zoom out** on street map (below level 10): Visual hint appears, then auto-transitions back to globe
- **Zoom in** on globe (past altitude threshold): Auto-transitions to street map
- **View mode indicator**: Badge in top-left shows current mode (Globe/Street)

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

## Scaling to Hundreds of NPCs

The current implementation handles 10 NPCs. Here's how the architecture would scale:

### Decision Layer — Three-Tier Approach

| Tier | NPC Count | Method | Compute Cost | When Used |
|------|-----------|--------|-------------|-----------|
| Background | 400+ | **Markov Chain** | Near zero — 1 random number + matrix lookup | NPCs nobody is watching |
| Foreground | 50-100 | **Utility AI** | Low — weighted scoring per tick | NPCs visible on screen |
| Detail | 1 | **LLM** | One API call on-demand | User clicks "Explore Inner World" |

### Markov Chains for Background NPCs

Each NPC gets a **transition matrix** derived from their personality traits — a table of probabilities mapping current state to next state:

```
Example: Dan (lazy personality)
                sleeping  working  eating  socializing  relaxing
If sleeping:      0.70     0.10    0.15      0.02        0.03
If working:       0.10     0.30    0.20      0.10        0.30
If relaxing:      0.15     0.05    0.15      0.05        0.60  ← stays relaxing
```

A `lazy` NPC has high `relaxing → relaxing` probability. An `ambitious` NPC has high `working → working`. The math is trivial: generate one random number, look up the next state. **1000 NPCs in under 1ms.**

### Promotion & Demotion

When the user zooms into a neighborhood:
- Visible NPCs get **promoted** from Markov → Utility AI (richer behavior)
- NPCs the user leaves behind get **demoted** back to Markov
- The player never notices — Markov kept them in a plausible state

### LLM Scaling — Four Strategies

1. **State-hash caching** (Redis): Hash NPC key state (mood + activity + top memory + relationships). Same state = serve from cache. Covers ~80% of clicks.
2. **Pre-generation**: Background worker generates narratives on major state changes (mood shift, conflict, new relationship). Narrative is ready before the user clicks.
3. **Priority queue**: Currently viewed NPC = priority 1, visible NPCs = priority 2, everyone else waits.
4. **Tiered models**: Important NPCs → 70B model, minor NPCs → 3B model or template fallback, background NPCs → no LLM.

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
- **3D Globe**: globe.gl (Three.js) with topojson-client for country borders
- **Street Map**: Leaflet + react-leaflet (CartoDB Voyager tiles)
- **LLM**: OpenRouter API (multi-model fallback: Llama 3.3, Gemma 4, Qwen3)
- **PDF Export**: jsPDF (client-side generation)
- **Avatars**: Custom SVG rendering
- **State Management**: React hooks (no Redux needed)

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
│   ├── api/narrative/    # LLM endpoint (multi-model fallback + sanitization)
│   ├── page.tsx          # Entry point (setup → simulation)
│   └── layout.tsx
├── components/
│   ├── GlobeView.tsx     # 3D globe with globe.gl, Romania highlight, cinematic zoom
│   ├── MapView.tsx       # Leaflet street map, animated markers, zoom-out detection
│   ├── SimulationView.tsx # Main UI, hybrid globe/map with fade transitions
│   ├── CharacterSetup.tsx # Avatar customization
│   ├── NPCDetail.tsx     # NPC detail modal + LLM narrative + PDF export
│   ├── Avatar.tsx        # SVG avatar renderer
│   └── Timeline.tsx      # Event log
├── engine/
│   ├── types.ts          # All interfaces
│   ├── utility-ai.ts     # Action scoring (6-factor weighted system)
│   ├── memory.ts         # Short/long-term memory with emotional decay
│   ├── social.ts         # Relationship graph (trust/affection/respect)
│   ├── rumors.ts         # Rumor propagation with distortion
│   ├── economy.ts        # Jobs, salaries & spending
│   ├── life-events.ts    # Random life events
│   ├── events.ts         # Social interactions
│   ├── tick.ts           # Main loop orchestrator
│   ├── world.ts          # World initialization
│   └── avatar.ts         # Avatar types & defaults
├── data/
│   ├── npcs.ts           # 10 NPC definitions
│   └── locations.ts      # Iasi coordinates & POIs
└── hooks/
    └── useSimulation.ts  # React simulation hook (single source of truth)
```
