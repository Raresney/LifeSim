'use client';

import { useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { NPC, Relationship } from '../engine/types';
import { AvatarConfig } from '../engine/avatar';
import { summarizeMemoryForLLM } from '../engine/memory';
import Avatar from './Avatar';
import { Avatar3DInline } from './Character3D';

const MOOD_HEX: Record<string, string> = {
  happy: '#22c55e', sad: '#3b82f6', angry: '#ef4444',
  anxious: '#eab308', confident: '#a855f7', bored: '#9ca3af',
  excited: '#f97316', stressed: '#f87171', content: '#34d399',
  jealous: '#ca8a04',
};

const REL_STYLE: Record<string, string> = {
  romantic: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  enemy: 'bg-red-500/10 text-red-400 border-red-500/20',
  rival: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  close_friend: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  friend: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

const ACTIVITY_ICON: Record<string, string> = {
  sleeping: '🌙', working: '💼', eating: '🍽️', traveling: '🚶',
  relaxing: '🛋️', socializing: '💬', exercising: '🏃', shopping: '🛒',
  studying: '📚', entertaining: '🎮', arguing: '😡', flirting: '💕',
  scheming: '🤫', helping: '🤝', gossiping: '👀',
};

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

    const clean = (text: string) => {
      let cleaned = text;
      const ampCount = (cleaned.match(/&/g) || []).length;
      if (ampCount > cleaned.length * 0.1) {
        cleaned = cleaned.replace(/&(?=[a-zA-Z](?:&|$))/g, '');
      }
      return cleaned
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        .replace(/&[a-z]+;/g, '').trim();
    };

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

    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    addText('LifeSim — Inner World Report', 18, 'bold', [59, 130, 246]);
    y += 4;
    addText(`${npc.name}`, 22, 'bold');
    y += 2;
    addText(`${npc.occupation} · ${npc.age} years · Mood: ${npc.currentMood}`, 11, 'normal', [100, 116, 139]);
    y += 2;
    addText(`Personality: ${npc.personality.join(', ')}`, 10, 'italic', [100, 116, 139]);
    y += 6;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
    addText('STATS', 9, 'bold', [100, 116, 139]);
    y += 1;
    addText(`Energy: ${npc.stats.energy}%  |  Health: ${npc.stats.health}%  |  Happiness: ${npc.stats.happiness}%  |  Stress: ${npc.stats.stress}%  |  Money: $${npc.stats.money}`, 10, 'normal');
    y += 4;
    addText('CURRENTLY', 9, 'bold', [100, 116, 139]);
    y += 1;
    addText(`${npc.currentActivity} at ${npc.currentLocation}`, 10, 'normal');
    y += 4;
    const activeGoals = npc.goals.filter(g => g.status === 'active');
    if (activeGoals.length > 0) {
      addText('GOALS', 9, 'bold', [100, 116, 139]);
      y += 1;
      for (const g of activeGoals) addText(`• ${g.description} (${g.progress}%)`, 10, 'normal');
      y += 4;
    }
    const notableRelsForPDF = relationships.filter(r => r.type !== 'acquaintance');
    if (notableRelsForPDF.length > 0) {
      addText('RELATIONSHIPS', 9, 'bold', [100, 116, 139]);
      y += 1;
      for (const r of notableRelsForPDF) {
        const other = allNPCs.get(r.targetId)?.name ?? '?';
        addText(`• ${other} — ${r.type.replace('_', ' ')} (Trust: ${r.trust}, Affection: ${r.affection}, Respect: ${r.respect})`, 10, 'normal');
      }
      y += 4;
    }
    const memories = npc.memory.shortTerm.slice(0, 5);
    if (memories.length > 0) {
      addText('RECENT MEMORIES', 9, 'bold', [100, 116, 139]);
      y += 1;
      for (const m of memories) addText(`• ${m.description}`, 10, 'normal');
      y += 4;
    }
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    if (y > 260) { doc.addPage(); y = 20; }
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    addText('INNER MONOLOGUE', 10, 'bold', [59, 130, 246]);
    if (usedModel) addText(`Model: ${usedModel}`, 8, 'italic', [148, 163, 184]);
    y += 3;
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
    y += 8;
    if (y > 275) { doc.addPage(); y = 20; }
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    addText(`Generated by LifeSim — ${new Date().toLocaleString()}`, 8, 'normal', [148, 163, 184]);
    doc.save(`LifeSim_${npc.name}_InnerWorld.pdf`);
  }, [narrative, npc, relationships, allNPCs, usedModel]);

  const moodColor = MOOD_HEX[npc.currentMood] ?? '#9ca3af';
  const notableRels = relationships.filter(r => r.type !== 'acquaintance');

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 right-0 bottom-0 w-[400px] z-40"
      >
        <div className="h-full bg-zinc-950/95 backdrop-blur-xl border-l border-zinc-800/40 flex flex-col shadow-2xl shadow-black/40">

          {/* Header */}
          <div className="relative px-6 pt-6 pb-5">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-xl
                bg-zinc-800/40 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 transition-all duration-200"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>

            <div className="flex items-center gap-4">
              <div className="relative">
                <div
                  className="rounded-2xl p-1.5"
                  style={{
                    background: `linear-gradient(135deg, ${moodColor}30, ${moodColor}08)`,
                    border: `1.5px solid ${moodColor}40`,
                    boxShadow: `0 0 24px ${moodColor}15`,
                  }}
                >
                  <Avatar3DInline config={avatar} size={56} mood={npc.currentMood} occupation={npc.occupation} />
                </div>
                <div
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-950"
                  style={{ backgroundColor: moodColor, boxShadow: `0 0 8px ${moodColor}60` }}
                />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-100">{npc.name}</h2>
                <p className="text-[11px] text-zinc-500 uppercase tracking-[0.12em]">{npc.occupation} &middot; {npc.age}y</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: moodColor, boxShadow: `0 0 6px ${moodColor}` }} />
                  <span className="text-xs font-medium" style={{ color: moodColor }}>{npc.currentMood}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-1.5 mt-4 flex-wrap">
              {npc.personality.map(t => (
                <span key={t} className="px-2.5 py-0.5 bg-zinc-800/50 text-zinc-400 rounded-lg text-[10px] border border-zinc-700/30 hover:border-zinc-600/50 transition-colors cursor-default">{t}</span>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">

            <Section title="Stats">
              <div className="space-y-2.5">
                <StatBar label="Energy" value={npc.stats.energy} color="#eab308" />
                <StatBar label="Health" value={npc.stats.health} color="#ef4444" />
                <StatBar label="Happiness" value={npc.stats.happiness} color="#22c55e" />
                <StatBar label="Stress" value={npc.stats.stress} color="#f97316" />
                <StatBar label="Hunger" value={npc.stats.hunger} color="#a855f7" />
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/40">
                <span className="text-[11px] text-zinc-500">Money</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">${npc.stats.money}</span>
              </div>
            </Section>

            <Section title="Currently">
              <div className="flex items-center gap-3 bg-zinc-800/30 rounded-xl px-4 py-3 border border-zinc-700/20">
                <span className="text-xl">{ACTIVITY_ICON[npc.currentActivity] ?? '❓'}</span>
                <div>
                  <span className="text-sm text-zinc-200 capitalize font-medium">{npc.currentActivity}</span>
                  <span className="text-xs text-zinc-500 ml-2">@ {npc.currentLocation}</span>
                </div>
              </div>
            </Section>

            {npc.goals.filter(g => g.status === 'active').length > 0 && (
              <Section title="Goals">
                <div className="space-y-3">
                  {npc.goals.filter(g => g.status === 'active').map(g => (
                    <div key={g.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-zinc-300">{g.description}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{g.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-[width] duration-500 ease-out"
                          style={{ width: `${g.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {notableRels.length > 0 && (
              <Section title="Relationships">
                <div className="space-y-2">
                  {notableRels.map(r => {
                    const other = allNPCs.get(r.targetId);
                    const style = REL_STYLE[r.type] ?? 'bg-zinc-800/50 text-zinc-400 border-zinc-700/30';
                    return (
                      <div key={r.targetId} className="flex items-center gap-2 group">
                        <span className="text-[12px] text-zinc-300 flex-1 group-hover:text-zinc-100 transition-colors">{other?.name ?? '?'}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-lg border ${style} uppercase tracking-wider font-medium`}>
                          {r.type.replace('_', ' ')}
                        </span>
                        <div className="flex gap-2 text-[9px] text-zinc-600 font-mono">
                          <span>T:{r.trust}</span>
                          <span>A:{r.affection}</span>
                          <span>R:{r.respect}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            <Section title="Recent Memories">
              {npc.memory.shortTerm.length === 0 ? (
                <p className="text-[11px] text-zinc-600 italic">No memories yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {npc.memory.shortTerm.slice(0, 6).map(m => (
                    <div key={m.id} className="flex gap-2 text-[11px] group">
                      <span className="text-zinc-700 shrink-0 mt-0.5">•</span>
                      <span className="text-zinc-400 group-hover:text-zinc-300 transition-colors">{m.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* LLM + PDF */}
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={generateNarrative}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500
                  disabled:from-zinc-800 disabled:to-zinc-800 text-white text-sm font-semibold rounded-xl transition-all duration-300
                  shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 disabled:shadow-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Exploring inner world...
                  </span>
                ) : narrative ? '🔄 Regenerate Inner World' : '🧠 Explore Inner World'}
              </motion.button>

              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-4 bg-zinc-800/20 rounded-xl border border-zinc-700/20"
                >
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <span className="animate-pulse">💭</span>
                    <span>Connecting to LLM...</span>
                  </div>
                </motion.div>
              )}

              {narrative && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-3 p-5 bg-zinc-800/30 rounded-xl text-[12px] text-zinc-300 whitespace-pre-wrap leading-relaxed border border-zinc-700/20"
                >
                  <div className="flex items-center gap-1.5 mb-3 text-[9px] text-zinc-500 uppercase tracking-[0.15em]">
                    <span>💭</span>
                    <span className="font-medium">Inner Monologue</span>
                    {usedModel && (
                      <span className="ml-auto font-mono text-zinc-600">{usedModel.split('/').pop()?.replace(':free', '')}</span>
                    )}
                  </div>
                  {narrative}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={exportPDF}
                    className="mt-4 w-full py-2.5 bg-zinc-700/40 hover:bg-zinc-600/40 text-zinc-300
                      text-[11px] font-medium rounded-xl transition-all duration-200
                      flex items-center justify-center gap-2 border border-zinc-600/20 hover:border-zinc-500/30"
                  >
                    📄 Export as PDF
                  </motion.button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.15em] mb-2.5">{title}</h3>
      {children}
    </div>
  );
}

/**
 * PERF FIX: CSS transition instead of Framer motion.div animate.
 * Eliminates Framer layout recalculation per stat change.
 */
const StatBar = memo(function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] text-zinc-500 w-16">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800/60 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}40`, width: `${value}%` }}
        />
      </div>
      <span className="text-[11px] text-zinc-500 w-7 text-right font-mono">{value}</span>
    </div>
  );
});
