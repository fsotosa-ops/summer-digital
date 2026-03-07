'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { eventService } from '@/services/event.service';
import { journeyService } from '@/services/journey.service';
import { Loader2 } from 'lucide-react';

export default function EventGatewayPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const { user, logout } = useAuthStore();

  const [hydrated, setHydrated] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
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
    if (!hydrated || !eventId || isRouting) return;

    // Usuario no autenticado → login con intención de evento
    if (!user) {
      setIsRouting(true);
      router.replace(`/login?join=${encodeURIComponent(eventId)}`);
      return;
    }

    // Usuario autenticado → enrollment
    const processEnrollment = async () => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      try {
        // 1. Obtener el evento para saber su journey asociado
        const event = await eventService.getEventById(eventId);
        const journeyId = event.journey_ids?.[0];

        if (journeyId) {
          // 2. Inscribir al usuario en el journey, registrando el evento de origen
          await journeyService.enrollInJourneyWithEvent(journeyId, eventId);
        }

        setIsRouting(true);
        router.replace('/dashboard');
      } catch (error: any) {
        console.error('[EventGateway] Error:', error);

        const isUnauthorized =
          error?.status === 401 ||
          error?.response?.status === 401 ||
          error?.message?.includes('401');

        if (isUnauthorized) {
          await logout();
          setIsRouting(true);
          router.replace(`/login?join=${encodeURIComponent(eventId)}`);
          return;
        }

        // Ya inscrito u otro error no crítico → igual va al dashboard
        setIsRouting(true);
        router.replace('/dashboard');
      }
    };

    processEnrollment();
  }, [hydrated, user, router, eventId, logout, isRouting]);

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
