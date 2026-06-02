import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '../../../lib/rate-limit';
import { hashNpcState, getCached, setCached } from '../../../lib/narrative-cache';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';

const FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-4-26b-a4b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'qwen/qwen3-coder:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
];

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;
const FETCH_TIMEOUT_MS = 15_000;

const NpcStatsSchema = z.object({
  energy: z.number().min(0).max(100),
  stress: z.number().min(0).max(100),
  happiness: z.number().min(0).max(100),
  money: z.number().min(0),
  health: z.number().min(0).max(100),
});

const GoalSchema = z.object({
  description: z.string().max(200),
  progress: z.number().min(0).max(100),
});

const NpcSchema = z.object({
  name: z.string().min(1).max(50),
  age: z.number().int().min(1).max(120),
  personality: z.array(z.string().max(20)).max(5),
  occupation: z.string().max(30),
  stats: NpcStatsSchema,
  currentActivity: z.string().max(30),
  currentLocation: z.string().max(30),
  currentMood: z.string().max(20),
  goals: z.array(GoalSchema).max(10),
});

const RelationshipSchema = z.object({
  name: z.string().max(50),
  type: z.string().max(20),
  trust: z.number(),
  affection: z.number(),
});

const RequestSchema = z.object({
  npc: NpcSchema,
  memory: z.string().max(2000).optional().default(''),
  relationships: z.array(RelationshipSchema).max(20).optional().default([]),
});

async function callOpenRouter(
  model: string,
  prompt: string,
  signal: AbortSignal,
): Promise<{ success: boolean; narrative?: string; retryable?: boolean }> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/Raresney/LifeSim',
        'X-Title': 'LifeSim NPC Simulator',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 350,
        temperature: 0.85,
      }),
      signal,
    });

    const data = await response.json();

    if (response.status === 429 || data.error?.code === 429) {
      return { success: false, retryable: true };
    }
    if (response.status === 404 || data.error?.code === 404) {
      return { success: false, retryable: false };
    }
    if (data.error) {
      return { success: false, retryable: true };
    }

    let narrative = data.choices?.[0]?.message?.content;
    if (narrative) {
      const ampCount = (narrative.match(/&/g) || []).length;
      if (ampCount > narrative.length * 0.1) {
        narrative = narrative.replace(/&(?=[a-zA-Z](?:&|$))/g, '');
        const stillGarbled = ((narrative.match(/&/g) || []).length) > narrative.length * 0.05;
        if (stillGarbled) return { success: false, retryable: true };
      }
      narrative = narrative
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');

      return { success: true, narrative };
    }

    return { success: false, retryable: true };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { success: false, retryable: true };
    }
    return { success: false, retryable: true };
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'anonymous';

  const rateLimit = checkRateLimit(ip, { limit: 10, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again in a moment.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.issues.slice(0, 3) },
      { status: 400 },
    );
  }

  const { npc, memory, relationships } = parsed.data;

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { narrative: 'OpenRouter API key not configured. Set OPENROUTER_API_KEY in .env.local' },
      { status: 200 },
    );
  }

  const stateHash = hashNpcState(npc as Parameters<typeof hashNpcState>[0]);
  const cached = getCached(stateHash);
  if (cached) {
    return NextResponse.json({
      narrative: cached.narrative,
      model: cached.model,
      cached: true,
    }, {
      headers: {
        'X-Cache': 'HIT',
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    });
  }

  const relationshipSummary = relationships
    .map(r => `${r.name} (${r.type}, trust: ${r.trust}, affection: ${r.affection})`)
    .join(', ');

  const prompt = `You are narrating the inner world of an NPC in a life simulation set in Iași, Romania. Write in first person as this character. Be vivid, specific, emotionally authentic, and include local Romanian cultural details. Keep it under 150 words.

CHARACTER:
Name: ${npc.name}, Age: ${npc.age}, Occupation: ${npc.occupation}
Personality: ${npc.personality.join(', ')}
Mood: ${npc.currentMood}
Currently: ${npc.currentActivity} at ${npc.currentLocation}

STATS: Energy ${npc.stats.energy}%, Stress ${npc.stats.stress}%, Happiness ${npc.stats.happiness}%, Money $${npc.stats.money}, Health ${npc.stats.health}%

GOALS:
${npc.goals.map(g => `- ${g.description} (${g.progress}% done)`).join('\n')}

RELATIONSHIPS: ${relationshipSummary || 'None notable'}

RECENT MEMORIES:
${memory || 'No significant memories yet.'}

Write what this character is thinking right now, their recent reflections, plans for the near future, and how they feel about the people in their life. Make it personal and emotional.`;

  for (const model of FREE_MODELS) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const result = await callOpenRouter(model, prompt, controller.signal);
      clearTimeout(timeout);

      if (result.success && result.narrative) {
        setCached(stateHash, result.narrative, model);

        return NextResponse.json(
          { narrative: result.narrative, model },
          {
            headers: {
              'X-Cache': 'MISS',
              'X-RateLimit-Remaining': String(rateLimit.remaining),
            },
          },
        );
      }

      if (!result.retryable) break;
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS);
    }
  }

  return NextResponse.json({
    narrative: 'All free LLM models are temporarily rate-limited. Try again in 10-15 seconds.',
    model: 'none',
  });
}
