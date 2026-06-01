import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';

export async function POST(req: NextRequest) {
  const { npc, memory, relationships } = await req.json();

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { narrative: 'OpenRouter API key not configured. Set OPENROUTER_API_KEY in .env.local' },
      { status: 200 },
    );
  }

  const relationshipSummary = relationships
    .map((r: { name: string; type: string; trust: number; affection: number }) =>
      `${r.name} (${r.type}, trust: ${r.trust}, affection: ${r.affection})`
    ).join(', ');

  const prompt = `You are narrating the inner world of an NPC in a life simulation. Write in first person as this character. Be vivid, specific, and emotionally authentic. Keep it under 150 words.

CHARACTER:
Name: ${npc.name}, Age: ${npc.age}, Occupation: ${npc.occupation}
Personality: ${npc.personality.join(', ')}
Mood: ${npc.currentMood}
Currently: ${npc.currentActivity} at ${npc.currentLocation}

STATS: Energy ${npc.stats.energy}%, Stress ${npc.stats.stress}%, Happiness ${npc.stats.happiness}%, Money $${npc.stats.money}, Health ${npc.stats.health}%

GOALS:
${npc.goals.map((g: { description: string; progress: number }) => `- ${g.description} (${g.progress}% done)`).join('\n')}

RELATIONSHIPS: ${relationshipSummary || 'None notable'}

${memory || 'No significant memories yet.'}

Write what this character has been doing recently, what they're thinking right now, their plans, and how they feel about the people around them.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.8,
      }),
    });

    const data = await response.json();
    const narrative = data.choices?.[0]?.message?.content ?? 'Could not generate narrative.';

    return NextResponse.json({ narrative });
  } catch {
    return NextResponse.json({ narrative: 'Error connecting to OpenRouter API.' }, { status: 500 });
  }
}
