'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useAuthStore } from '@/store/useAuthStore';
import { JourneyPlayer } from '@/features/journey/components/JourneyPlayer';
import { JourneyWizard } from '@/features/journey/components/JourneyWizard';
import { journeyService } from '@/services/journey.service';
import { Journey } from '@/types';
import ReactConfetti from 'react-confetti';

interface OnboardingGateProps {
  journeyId: string;
  onComplete: () => void;
}

type Phase = 'welcome' | 'journey' | 'completed';

function useWindowDimensions() {
  const [dims, setDims] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const handle = () => setDims({ width: window.innerWidth, height: window.innerHeight });
    handle();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return dims;
}

function isOnboardingJourney(journey: Journey): boolean {
  if (journey.metadata?.is_onboarding === true) return true;
  if (journey.nodes.length > 0 && journey.nodes.some(n => n.type === 'profile')) return true;
  return false;
}

export function OnboardingGate({ journeyId, onComplete }: OnboardingGateProps) {
  const { user } = useAuthStore();
  const { journeys, fetchJourneys, selectJourney, isLoading } = useJourneyStore();
  const [phase, setPhase] = useState<Phase>('welcome');
  const [showConfetti, setShowConfetti] = useState(false);
  const [journeyData, setJourneyData] = useState<Journey | null>(null);
  const { width, height } = useWindowDimensions();

  // Phase 1 → Phase 2: after 2s welcome, load journey (with auto-enrollment) and transition
  useEffect(() => {
    if (phase !== 'welcome') return;
    const timer = setTimeout(async () => {
      try {
        const orgId = user?.organizationId;
        await fetchJourneys(orgId);

        let journey = useJourneyStore.getState().journeys.find(j => j.id === journeyId);

        // Auto-enroll if the user is not yet enrolled in this journey
        if (!journey) {
          await journeyService.enrollInJourney(journeyId);
          await fetchJourneys(orgId);
          journey = useJourneyStore.getState().journeys.find(j => j.id === journeyId);
        }

        if (!journey) {
          // Journey still not found after enroll → silent escape to avoid blocking user
          console.warn('[OnboardingGate] Journey not found after enroll, skipping onboarding.');
          sessionStorage.setItem('onboarding_checked', 'true');
          onComplete();
          return;
        }

        setJourneyData(journey);
        selectJourney(journeyId);
        setPhase('journey');
      } catch (err) {
        // Any network/API error → silent escape
        console.error('[OnboardingGate] Failed to load onboarding journey, skipping.', err);
        sessionStorage.setItem('onboarding_checked', 'true');
        onComplete();
      }
    }, 2000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Watch for journey completion
  useEffect(() => {
    if (phase !== 'journey') return;
    const journey = journeys.find(j => j.id === journeyId);
    if (journey?.status === 'completed') {
      setShowConfetti(true);
      setPhase('completed');
      // After confetti (3s) → notify parent (MainLayout will redirect to /dashboard)
      setTimeout(() => {
        setShowConfetti(false);
        sessionStorage.setItem('onboarding_checked', 'true');
        onComplete();
      }, 3000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeys, phase]);

  // Second completion path: if the player/wizard calls onBack after the last step,
  // verify authoritative store state before transitioning (anti-cheat: no-op if incomplete).
  const handlePlayerBack = () => {
    const j = useJourneyStore.getState().journeys.find(jj => jj.id === journeyId);
    if (j?.status === 'completed' || j?.progress === 100) {
      setShowConfetti(true);
      setPhase('completed');
      setTimeout(() => {
        setShowConfetti(false);
        sessionStorage.setItem('onboarding_checked', 'true');
        onComplete();
      }, 3000);
    }
    // else: no-op — user cannot exit incomplete onboarding
  };

  const firstName = user?.name?.split(' ')[0] || 'Bienvenido';

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[10000]">
          <ReactConfetti width={width} height={height} recycle={false} numberOfPieces={600} />
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase === 'welcome' && (
          <motion.div
            key="welcome"
            className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            {/* Logo / Brand */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-2xl"
            >
              <span className="text-4xl font-bold text-white">O</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h1 className="text-4xl font-bold text-white mb-2">
                Bienvenido, {firstName}
              </h1>
              <p className="text-slate-400 text-lg">
                Completa tu journey de bienvenida para comenzar
              </p>
            </motion.div>

            <motion.div
              className="flex gap-2 mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-fuchsia-400"
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}

        {phase === 'journey' && (
          <motion.div
            key="journey"
            className="flex-1 flex flex-col overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex-1 p-4 overflow-hidden">
              {isLoading || !journeyData ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-slate-400">Cargando tu journey...</div>
                </div>
              ) : isOnboardingJourney(journeyData) ? (
                <JourneyWizard journey={journeyData} onBack={handlePlayerBack} />
              ) : (
                <JourneyPlayer journey={journeyData} onBack={handlePlayerBack} />
              )}
            </div>
          </motion.div>
        )}

        {phase === 'completed' && (
          <motion.div
            key="completed"
            className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-7xl mb-4">🏆</div>
            <h1 className="text-4xl font-bold text-white">¡Nivel 1 Alcanzado!</h1>
            <p className="text-xl text-fuchsia-300 font-semibold mt-2">Oasis desbloqueado</p>
            <p className="text-slate-400 text-lg mt-2">Estás listo para explorar la plataforma</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
