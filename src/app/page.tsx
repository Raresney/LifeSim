'use client';

import { useState } from 'react';
import { AvatarConfig } from '../engine/avatar';
import LandingPage from '../components/LandingPage';
import CharacterSetup from '../components/CharacterSetup';
import SimulationView from '../components/SimulationView';

type Screen = 'landing' | 'setup' | 'simulation';

export default function Home() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [avatars, setAvatars] = useState<Record<string, AvatarConfig> | null>(null);

  if (screen === 'landing') {
    return <LandingPage onStartSetup={() => setScreen('setup')} />;
  }

  if (screen === 'setup' || !avatars) {
    return (
      <CharacterSetup
        onStart={(a) => { setAvatars(a); setScreen('simulation'); }}
        onBack={() => setScreen('landing')}
      />
    );
  }

  return <SimulationView avatars={avatars} onBack={() => { setAvatars(null); setScreen('setup'); }} />;
}
