'use client';

import { useState } from 'react';
import { AvatarConfig } from '../engine/avatar';
import CharacterSetup from '../components/CharacterSetup';
import SimulationView from '../components/SimulationView';

export default function Home() {
  const [avatars, setAvatars] = useState<Record<string, AvatarConfig> | null>(null);

  if (!avatars) {
    return <CharacterSetup onStart={setAvatars} />;
  }

  return <SimulationView avatars={avatars} onBack={() => setAvatars(null)} />;
}
