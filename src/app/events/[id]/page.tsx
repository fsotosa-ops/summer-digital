'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { eventService } from '@/services/event.service';
import { journeyService } from '@/services/journey.service';
import { OnboardingGate } from '@/components/layout/OnboardingGate';
import { Loader2 } from 'lucide-react';
import { SESSION_KEYS } from '@/lib/utils';

type Phase = 'idle' | 'joining' | 'onboarding' | 'done';

export default function EventGatewayPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const { user, logout, setUser } = useAuthStore();

  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [onboardingJourneyId, setOnboardingJourneyId] = useState<string | null>(null);
  const isProcessingRef = useRef(false);

  // Efecto 1: Hidratación segura
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
      return unsub;
    }
  }, []);

  // Efecto 2: Motor de asignación
  useEffect(() => {
    if (!hydrated || !eventId || phase !== 'idle') return;

    // Usuario no autenticado → login con intención de evento
    if (!user) {
      setPhase('done');
      router.replace(`/login?join=${encodeURIComponent(eventId)}`);
      return;
    }

    // Usuario autenticado → unified join
    const processJoin = async () => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      setPhase('joining');

      try {
        const result = await eventService.joinEvent(eventId);

        // Update org context so onboarding-check targets the event's org
        const orgId = result?.organization_id;
        if (orgId && user) {
          setUser({ ...user, organizationId: orgId });
        }

        // Inline onboarding check — only for Participants
        if (user.role === 'Participant' && orgId) {
          try {
            const check = await journeyService.checkOnboarding(orgId);
            if (check.should_show && check.journey_id) {
              setOnboardingJourneyId(check.journey_id);
              setPhase('onboarding');
              return;
            }
          } catch (e) {
            console.warn('[EventGateway] checkOnboarding failed, skipping:', e);
          }
        }

        // No onboarding needed → go to dashboard
        sessionStorage.setItem(SESSION_KEYS.ONBOARDING_CHECKED, 'true');
        setPhase('done');
        router.replace('/dashboard');
      } catch (error: any) {
        console.error('[EventGateway] Error:', error);

        const isUnauthorized =
          error?.status === 401 ||
          error?.response?.status === 401 ||
          error?.message?.includes('401');

        if (isUnauthorized) {
          await logout();
          setPhase('done');
          router.replace(`/login?join=${encodeURIComponent(eventId)}`);
          return;
        }

        // Non-critical error → still go to dashboard
        setPhase('done');
        router.replace('/dashboard');
      }
    };

    processJoin();
  }, [hydrated, user, router, eventId, logout, setUser, phase]);

  // Render OnboardingGate inline when onboarding is needed
  if (phase === 'onboarding' && onboardingJourneyId) {
    return (
      <OnboardingGate
        journeyId={onboardingJourneyId}
        onComplete={() => router.replace('/dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-fuchsia-600" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-800">
            {!user ? 'Preparando tu acceso...' : 'Vinculando tu evento...'}
          </h1>
          <p className="text-slate-500 max-w-sm mx-auto text-sm">
            {!user
              ? 'Te estamos redirigiendo de forma segura para verificar tu cuenta.'
              : 'Estamos asignando los contenidos correspondientes a tu perfil.'}
          </p>
        </div>
      </div>
    </div>
  );
}
