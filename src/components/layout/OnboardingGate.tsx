'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useAuthStore } from '@/store/useAuthStore';
import { JourneyPlayer } from '@/features/journey/components/JourneyPlayer';
import { JourneyWizard } from '@/features/journey/components/JourneyWizard';
import { journeyService } from '@/services/journey.service';
import { SESSION_KEYS } from '@/lib/utils';
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
  const { journeys, fetchJourneys, selectJourney } = useJourneyStore();
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
          sessionStorage.setItem(SESSION_KEYS.ONBOARDING_CHECKED, 'true');
          onComplete();
          return;
        }

        setJourneyData(journey);
        selectJourney(journeyId);
        setPhase('journey');
      } catch (err) {
        // Any network/API error → silent escape
        console.error('[OnboardingGate] Failed to load onboarding journey, skipping.', err);
        sessionStorage.setItem(SESSION_KEYS.ONBOARDING_CHECKED, 'true');
        onComplete();
      }
    }, 2000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Shared completion handler — triggers confetti then redirects (QR or dashboard).
  const triggerCompletion = () => {
    setShowConfetti(true);
    setPhase('completed');
    setTimeout(() => {
      setShowConfetti(false);
      sessionStorage.setItem(SESSION_KEYS.ONBOARDING_CHECKED, 'true');
      const qrReturn = sessionStorage.getItem(SESSION_KEYS.QR_RETURN_URL);
      if (qrReturn) {
        sessionStorage.removeItem(SESSION_KEYS.QR_RETURN_URL);
        window.location.href = qrReturn;
      } else {
        onComplete();
      }
    }, 3000);
  };

  // Watch for journey completion (store-driven path)
  useEffect(() => {
    if (phase !== 'journey') return;
    const journey = journeys.find(j => j.id === journeyId);
    if (journey?.status === 'completed') {
      triggerCompletion();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeys, phase]);

  // Second completion path: if the player/wizard calls onBack after the last step,
  // verify authoritative store state before transitioning (anti-cheat: no-op if incomplete).
  const handlePlayerBack = () => {
    const j = useJourneyStore.getState().journeys.find(jj => jj.id === journeyId);
    if (j?.status === 'completed' || j?.progress === 100) {
      triggerCompletion();
    }
    // else: no-op — user cannot exit incomplete onboarding
  };

  const firstName = user?.name?.split(' ')[0] || 'Bienvenido';

  return (
    <div className="fixed inset-0 z-[9999]">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[10000]">
          <ReactConfetti width={width} height={height} recycle={false} numberOfPieces={600} />
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase === 'welcome' && (
          <motion.div
            key="welcome"
            className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center gap-6 text-center px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
            className="fixed inset-0 bg-gradient-to-br from-sky-50 via-white to-teal-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {!journeyData ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-slate-400">Cargando tu journey...</div>
              </div>
            ) : isOnboardingJourney(journeyData) ? (
              <JourneyWizard journey={journeyData} onBack={handlePlayerBack} />
            ) : (
              <JourneyPlayer journey={journeyData} onBack={handlePlayerBack} />
            )}
          </motion.div>
        )}

        {phase === 'completed' && (
          <motion.div
            key="completed"
            className="fixed inset-0 bg-gradient-to-br from-sky-50 via-white to-teal-50 flex flex-col items-center justify-center gap-6 text-center px-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg"
            >
              <span className="text-5xl">🏆</span>
            </motion.div>
            <h1 className="text-4xl font-bold text-slate-800">¡Nivel 1 Alcanzado!</h1>
            <p className="text-xl text-teal-600 font-semibold mt-2">Oasis desbloqueado</p>
            <p className="text-slate-500 text-lg mt-2">Estás listo para explorar la plataforma</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
