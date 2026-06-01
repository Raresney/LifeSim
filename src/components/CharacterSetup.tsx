'use client';

import { useState } from 'react';
import {
  AvatarConfig, DEFAULT_AVATARS, randomAvatar,
  SKIN_TONES, HAIR_STYLES, HAIR_COLORS, EYE_STYLES,
  FACE_SHAPES, ACCESSORIES, CLOTHING_COLORS, CLOTHING_STYLES,
  SkinTone, HairStyle, HairColor, EyeStyle, FaceShape, Accessory, ClothingColor, ClothingStyle,
} from '../engine/avatar';
import { INITIAL_NPCS } from '../data/npcs';
import Avatar from './Avatar';

interface Props {
  onStart: (avatars: Record<string, AvatarConfig>) => void;
}

export default function CharacterSetup({ onStart }: Props) {
  const [avatars, setAvatars] = useState<Record<string, AvatarConfig>>({ ...DEFAULT_AVATARS });
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateAvatar = (npcId: string, patch: Partial<AvatarConfig>) => {
    setAvatars(prev => ({ ...prev, [npcId]: { ...prev[npcId], ...patch } }));
  };

  const randomizeAll = () => {
    const next: Record<string, AvatarConfig> = {};
    for (const npc of INITIAL_NPCS) {
      next[npc.id] = randomAvatar();
    }
    setAvatars(next);
  };

  const editingNPC = editingId ? INITIAL_NPCS.find(n => n.id === editingId) : null;
  const editingAvatar = editingId ? avatars[editingId] : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">LifeSim</h1>
          <p className="text-zinc-400">Create your characters before the simulation begins</p>
        </div>

        {!editingId ? (
          <>
            {/* NPC Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
              {INITIAL_NPCS.map(npc => (
                <button
                  key={npc.id}
                  onClick={() => setEditingId(npc.id)}
                  className="flex flex-col items-center p-3 bg-zinc-900 border border-zinc-700 rounded-xl hover:border-zinc-500 transition-all hover:scale-105"
                >
                  <Avatar config={avatars[npc.id]} size={90} mood={npc.currentMood} />
                  <span className="mt-2 text-sm font-medium">{npc.name}</span>
                  <span className="text-xs text-zinc-500">{npc.occupation}</span>
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-3">
              <button
                onClick={randomizeAll}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
              >
                Randomize All
              </button>
              <button
                onClick={() => onStart(avatars)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
              >
                Start Simulation
              </button>
            </div>
          </>
        ) : editingNPC && editingAvatar ? (
          /* Editor */
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setEditingId(null)}
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                &larr; Back to all
              </button>
              <h2 className="text-lg font-bold">{editingNPC.name}</h2>
              <button
                onClick={() => updateAvatar(editingId, randomAvatar())}
                className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Randomize
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Preview */}
              <div className="flex flex-col items-center gap-3">
                <div className="bg-zinc-800 rounded-xl p-6">
                  <Avatar config={editingAvatar} size={180} mood={editingNPC.currentMood} />
                </div>
                <div className="text-center">
                  <p className="text-sm text-zinc-400">{editingNPC.occupation} · {editingNPC.age}y</p>
                  <p className="text-xs text-zinc-500">{editingNPC.personality.join(', ')}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex-1 space-y-4 overflow-y-auto max-h-[60vh]">
                <OptionRow label="Skin Tone">
                  {SKIN_TONES.map(t => (
                    <ColorSwatch key={t} color={t} active={editingAvatar.skinTone === t}
                      onClick={() => updateAvatar(editingId, { skinTone: t })} />
                  ))}
                </OptionRow>

                <OptionRow label="Hair Style">
                  {HAIR_STYLES.map(s => (
                    <TextOption key={s} label={s} active={editingAvatar.hairStyle === s}
                      onClick={() => updateAvatar(editingId, { hairStyle: s })} />
                  ))}
                </OptionRow>

                <OptionRow label="Hair Color">
                  {HAIR_COLORS.map(c => (
                    <ColorSwatch key={c} color={c} active={editingAvatar.hairColor === c}
                      onClick={() => updateAvatar(editingId, { hairColor: c })} />
                  ))}
                </OptionRow>

                <OptionRow label="Eyes">
                  {EYE_STYLES.map(s => (
                    <TextOption key={s} label={s} active={editingAvatar.eyeStyle === s}
                      onClick={() => updateAvatar(editingId, { eyeStyle: s })} />
                  ))}
                </OptionRow>

                <OptionRow label="Face Shape">
                  {FACE_SHAPES.map(s => (
                    <TextOption key={s} label={s} active={editingAvatar.faceShape === s}
                      onClick={() => updateAvatar(editingId, { faceShape: s })} />
                  ))}
                </OptionRow>

                <OptionRow label="Accessory">
                  {ACCESSORIES.map(a => (
                    <TextOption key={a} label={a} active={editingAvatar.accessory === a}
                      onClick={() => updateAvatar(editingId, { accessory: a })} />
                  ))}
                </OptionRow>

                <OptionRow label="Clothing Style">
                  {CLOTHING_STYLES.map(s => (
                    <TextOption key={s} label={s} active={editingAvatar.clothingStyle === s}
                      onClick={() => updateAvatar(editingId, { clothingStyle: s })} />
                  ))}
                </OptionRow>

                <OptionRow label="Clothing Color">
                  {CLOTHING_COLORS.map(c => (
                    <ColorSwatch key={c} color={c} active={editingAvatar.clothingColor === c}
                      onClick={() => updateAvatar(editingId, { clothingColor: c })} />
                  ))}
                </OptionRow>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setEditingId(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5 block">{label}</label>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function ColorSwatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded-lg border-2 transition-all ${
        active ? 'border-blue-500 scale-110' : 'border-zinc-700 hover:border-zinc-500'
      }`}
      style={{ backgroundColor: color }}
    />
  );
}

function TextOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-lg text-xs transition-all ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
      }`}
    >
      {label}
    </button>
  );
}
