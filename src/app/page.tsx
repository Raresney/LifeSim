'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AvatarConfig } from '../engine/avatar';
import LandingPage from '../components/LandingPage';
import CharacterSetup from '../components/CharacterSetup';
import SimulationView from '../components/SimulationView';

type Screen = 'landing' | 'setup' | 'simulation';

const pageVariants = {
  initial: { opacity: 0, scale: 0.97, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit: { opacity: 0, scale: 1.08, y: -20, transition: { duration: 0.6, ease: [0.4, 0, 1, 1] as [number, number, number, number] } },
};

const simVariants = {
  initial: { opacity: 0, scale: 1.05 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3 } },
};

export default function Home() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [avatars, setAvatars] = useState<Record<string, AvatarConfig> | null>(null);

  const goToSetup = useCallback(() => setScreen('setup'), []);
  const goToLanding = useCallback(() => setScreen('landing'), []);
  const goToSim = useCallback((a: Record<string, AvatarConfig>) => {
    setAvatars(a);
    setScreen('simulation');
  }, []);
  const goBackFromSim = useCallback(() => {
    setAvatars(null);
    setScreen('setup');
  }, []);

  return (
    <AnimatePresence mode="wait">
      {screen === 'landing' && (
        <motion.div key="landing" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="min-h-screen">
          <LandingPage onStartSetup={goToSetup} />
        </motion.div>
      )}

      {(screen === 'setup' || (screen !== 'landing' && screen !== 'simulation' && !avatars)) && (
        <motion.div key="setup" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="min-h-screen">
          <CharacterSetup
            onStart={goToSim}
            onBack={goToLanding}
          />
        </motion.div>
      )}

      {screen === 'simulation' && avatars && (
        <motion.div key="simulation" variants={simVariants} initial="initial" animate="animate" exit="exit" style={{ position: 'fixed', inset: 0 }}>
          <SimulationView avatars={avatars} onBack={goBackFromSim} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
