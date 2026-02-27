'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useAuthStore } from '@/store/useAuthStore';
import { JourneyPlayer } from '@/features/journey/components/JourneyPlayer';
import { Loader2 } from 'lucide-react';

export default function JourneyPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const journeyId = params.id as string;

  const { user } = useAuthStore();
  const { journeys, fetchJourneys, isLoading } = useJourneyStore();
  const [hasFetched, setHasFetched] = useState(false);

  const journey = journeys.find(j => j.id === journeyId);

  useEffect(() => {
    if (!journey && !hasFetched && user) {
      fetchJourneys(user.organizationId ?? undefined).then(() => setHasFetched(true));
    }
  }, [journey, hasFetched, user, fetchJourneys]);

  if (isLoading || (!journey && !hasFetched)) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">Journey no encontrado</p>
        <button
          onClick={() => router.push('/journey')}
          className="text-sky-600 hover:underline text-sm"
        >
          ← Volver a Mis Journeys
        </button>
      </div>
    );
  }

  return (
    <JourneyPlayer
      journey={journey}
      onBack={() => router.push('/journey')}
    />
  );
}
