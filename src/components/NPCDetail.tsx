'use client';

import { useState, useCallback } from 'react';
import { NPC, Relationship } from '../engine/types';
import { AvatarConfig } from '../engine/avatar';
import { summarizeMemoryForLLM } from '../engine/memory';
import Avatar from './Avatar';

interface Props {
  npc: NPC;
  avatar: AvatarConfig;
  relationships: Relationship[];
  allNPCs: Map<string, NPC>;
  onClose: () => void;
}

export default function NPCDetail({ npc, avatar, relationships, allNPCs, onClose }: Props) {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usedModel, setUsedModel] = useState<string | null>(null);

  const generateNarrative = async () => {
    setLoading(true);
    setNarrative(null);
    setUsedModel(null);
    try {
      const res = await fetch('/api/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npc: {
            name: npc.name,
            age: npc.age,
            personality: npc.personality,
            occupation: npc.occupation,
            stats: npc.stats,
            currentActivity: npc.currentActivity,
            currentLocation: npc.currentLocation,
            currentMood: npc.currentMood,
            goals: npc.goals.filter(g => g.status === 'active'),
          },
          memory: summarizeMemoryForLLM(npc.memory),
          relationships: relationships.map(r => ({
            name: allNPCs.get(r.targetId)?.name ?? 'Unknown',
            type: r.type,
            trust: r.trust,
            affection: r.affection,
          })),
        }),
      });
      const data = await res.json();
      setNarrative(data.narrative);
      if (data.model && data.model !== 'none') setUsedModel(data.model);
    } catch {
      setNarrative('Failed to generate narrative. Check API configuration.');
    }
    setLoading(false);
  };

  const exportPDF = useCallback(async () => {
    if (!narrative) return;
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    // Clean text: fix garbled "&l&e&t&t&e&r&" patterns and HTML entities
    const clean = (text: string) => {
      let cleaned = text;
      // Fix garbled pattern: "&l&e&t&t&e&r&s&" → "letters"
      const ampCount = (cleaned.match(/&/g) || []).length;
      if (ampCount > cleaned.length * 0.1) {
        cleaned = cleaned.replace(/&(?=[a-zA-Z](?:&|$))/g, '');
      }
      return cleaned
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&[a-z]+;/g, '')
        .trim();
    };

    // Helper: add text with word wrap and auto page break
    const addText = (rawText: string, fontSize: number, style: 'normal' | 'bold' | 'italic' = 'normal', color: [number, number, number] = [30, 41, 59]) => {
      const text = clean(rawText);
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', style);
      doc.setTextColor(...color);
      const lineHeight = fontSize * 0.5;
      const lines = doc.splitTextToSize(text, maxWidth);
      for (const line of lines) {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += lineHeight;
      }
    };

    // Header line
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Title
    addText('LifeSim — Inner World Report', 18, 'bold', [59, 130, 246]);
    y += 4;

    // NPC name & info
    addText(`${npc.name}`, 22, 'bold');
    y += 2;
    addText(`${npc.occupation} · ${npc.age} years · Mood: ${npc.currentMood}`, 11, 'normal', [100, 116, 139]);
    y += 2;
    addText(`Personality: ${npc.personality.join(', ')}`, 10, 'italic', [100, 116, 139]);
    y += 6;

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Stats
    addText('STATS', 9, 'bold', [100, 116, 139]);
    y += 1;
    addText(`Energy: ${npc.stats.energy}%  |  Health: ${npc.stats.health}%  |  Happiness: ${npc.stats.happiness}%  |  Stress: ${npc.stats.stress}%  |  Money: $${npc.stats.money}`, 10, 'normal');
    y += 4;

    // Currently
    addText('CURRENTLY', 9, 'bold', [100, 116, 139]);
    y += 1;
    addText(`${npc.currentActivity} at ${npc.currentLocation}`, 10, 'normal');
    y += 4;

    // Goals
    const activeGoals = npc.goals.filter(g => g.status === 'active');
    if (activeGoals.length > 0) {
      addText('GOALS', 9, 'bold', [100, 116, 139]);
      y += 1;
      for (const g of activeGoals) {
        addText(`• ${g.description} (${g.progress}%)`, 10, 'normal');
      }
      y += 4;
    }

    // Relationships
    const notableRels = relationships.filter(r => r.type !== 'acquaintance');
    if (notableRels.length > 0) {
      addText('RELATIONSHIPS', 9, 'bold', [100, 116, 139]);
      y += 1;
      for (const r of notableRels) {
        const other = allNPCs.get(r.targetId)?.name ?? '?';
        addText(`• ${other} — ${r.type.replace('_', ' ')} (Trust: ${r.trust}, Affection: ${r.affection}, Respect: ${r.respect})`, 10, 'normal');
      }
      y += 4;
    }

    // Recent memories
    const memories = npc.memory.shortTerm.slice(0, 5);
    if (memories.length > 0) {
      addText('RECENT MEMORIES', 9, 'bold', [100, 116, 139]);
      y += 1;
      for (const m of memories) {
        addText(`• ${m.description}`, 10, 'normal');
      }
      y += 4;
    }

    // Divider before narrative
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    if (y > 260) { doc.addPage(); y = 20; }
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Inner Monologue
    addText('INNER MONOLOGUE', 10, 'bold', [59, 130, 246]);
    if (usedModel) {
      addText(`Model: ${usedModel}`, 8, 'italic', [148, 163, 184]);
    }
    y += 3;

    // Narrative text — larger, with more leading
    const cleanNarrative = clean(narrative);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(30, 41, 59);
    const narrativeLines = doc.splitTextToSize(cleanNarrative, maxWidth);
    for (const line of narrativeLines) {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += 5.5;
    }

    // Footer
    y += 8;
    if (y > 275) { doc.addPage(); y = 20; }
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    addText(`Generated by LifeSim — ${new Date().toLocaleString()}`, 8, 'normal', [148, 163, 184]);

    doc.save(`LifeSim_${npc.name}_InnerWorld.pdf`);
  }, [narrative, npc, relationships, allNPCs, usedModel]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-zinc-800 rounded-lg p-1.5">
              <Avatar config={avatar} size={64} mood={npc.currentMood} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-100">{npc.name}</h2>
              <p className="text-sm text-zinc-400">{npc.occupation} · {npc.age} years · {npc.currentMood}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 text-xl">×</button>
        </div>

        {/* Personality */}
        <div className="mb-4">
          <h3 className="text-xs font-medium text-zinc-500 uppercase mb-1">Personality</h3>
          <div className="flex gap-1.5">
            {npc.personality.map(t => (
              <span key={t} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs">{t}</span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-4">
          <h3 className="text-xs font-medium text-zinc-500 uppercase mb-1">Stats</h3>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <Stat label="Energy" value={npc.stats.energy} />
            <Stat label="Health" value={npc.stats.health} />
            <Stat label="Happiness" value={npc.stats.happiness} />
            <Stat label="Stress" value={npc.stats.stress} />
            <Stat label="Hunger" value={npc.stats.hunger} />
            <Stat label="Money" value={npc.stats.money} prefix="$" noBar />
          </div>
        </div>

        {/* Current state */}
        <div className="mb-4">
          <h3 className="text-xs font-medium text-zinc-500 uppercase mb-1">Currently</h3>
          <p className="text-sm text-zinc-300">{npc.currentActivity} at {npc.currentLocation}</p>
        </div>

        {/* Goals */}
        <div className="mb-4">
          <h3 className="text-xs font-medium text-zinc-500 uppercase mb-1">Goals</h3>
          <div className="space-y-1">
            {npc.goals.filter(g => g.status === 'active').map(g => (
              <div key={g.id} className="flex items-center gap-2 text-xs">
                <div className="flex-1 text-zinc-300">{g.description}</div>
                <span className="text-zinc-500">{g.progress}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Relationships */}
        <div className="mb-4">
          <h3 className="text-xs font-medium text-zinc-500 uppercase mb-1">Relationships</h3>
          <div className="space-y-1">
            {relationships.filter(r => r.type !== 'acquaintance').map(r => {
              const other = allNPCs.get(r.targetId);
              return (
                <div key={r.targetId} className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-300">{other?.name ?? '?'}</span>
                  <span className={`px-1.5 py-0.5 rounded ${
                    r.type === 'romantic' ? 'bg-pink-900 text-pink-300' :
                    r.type === 'enemy' ? 'bg-red-900 text-red-300' :
                    r.type === 'rival' ? 'bg-orange-900 text-orange-300' :
                    r.type === 'close_friend' ? 'bg-green-900 text-green-300' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>{r.type.replace('_', ' ')}</span>
                  <span className="text-zinc-500 ml-auto">T:{r.trust} A:{r.affection} R:{r.respect}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent memories */}
        <div className="mb-4">
          <h3 className="text-xs font-medium text-zinc-500 uppercase mb-1">Recent Memories</h3>
          <div className="space-y-1">
            {npc.memory.shortTerm.slice(0, 5).map(m => (
              <div key={m.id} className="text-xs text-zinc-400">• {m.description}</div>
            ))}
            {npc.memory.shortTerm.length === 0 && (
              <p className="text-xs text-zinc-500">No memories yet.</p>
            )}
          </div>
        </div>

        {/* LLM Narrative */}
        <div>
          <button
            onClick={generateNarrative}
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-zinc-700 disabled:to-zinc-700 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exploring inner world...
              </span>
            ) : narrative ? (
              '🔄 Regenerate Inner World'
            ) : (
              '🧠 Explore Inner World (LLM)'
            )}
          </button>
          {loading && (
            <div className="mt-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="animate-pulse">💭</span>
                <span>Connecting to LLM... Trying free models with retry...</span>
              </div>
            </div>
          )}
          {narrative && !loading && (
            <div className="mt-3 p-4 bg-zinc-800 rounded-lg text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed border border-zinc-700/50">
              <div className="flex items-center gap-1.5 mb-2 text-[10px] text-zinc-500 uppercase tracking-wider">
                <span>💭</span>
                <span>Inner Monologue</span>
                {usedModel && (
                  <span className="ml-auto font-mono text-zinc-600">{usedModel.split('/').pop()?.replace(':free', '')}</span>
                )}
              </div>
              {narrative}
              <button
                onClick={exportPDF}
                className="mt-3 w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                📄 Export as PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, prefix, noBar }: { label: string; value: number; prefix?: string; noBar?: boolean }) {
  return (
    <div>
      <div className="flex justify-between text-zinc-400 mb-0.5">
        <span>{label}</span>
        <span>{prefix ?? ''}{value}</span>
      </div>
      {!noBar && (
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              value > 60 ? 'bg-green-500' : value > 30 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${value}%` }}
          />
        </div>
      )}
    </div>
  );
}
