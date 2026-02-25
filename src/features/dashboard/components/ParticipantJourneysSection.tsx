'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Map, ArrowRight } from 'lucide-react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { JourneyCard } from '@/features/journey/components/JourneyCard';

/* ─── Section ────────────────────────────────────────── */
export function ParticipantJourneysSection() {
  const { journeys, isLoading, fetchJourneys, selectJourney } = useJourneyStore();
  const router = useRouter();

  useEffect(() => {
    if (journeys.length === 0) fetchJourneys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCount = journeys.filter(j => j.status !== 'completed').length;
  const hasActive   = activeCount > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

      {/* ── Banner motivacional ─────────────────────────── */}
      <div className="bg-gradient-to-r from-sky-400 via-purple-400 to-amber-300 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-white text-base leading-tight">
              {hasActive
                ? 'Continúa tu journey de transformación'
                : '¡Explora nuevas experiencias de aprendizaje!'}
            </h2>
            <p className="text-white/80 text-sm mt-1">
              {hasActive
                ? `${activeCount} journey(s) en progreso`
                : 'Comienza tu camino hacia el siguiente nivel.'}
            </p>
          </div>
          <Link href="/journey" className="shrink-0">
            <button className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30
                               backdrop-blur-sm border border-white/30 text-white
                               text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
              Ver todo <ArrowRight size={12} />
            </button>
          </Link>
        </div>
      </div>

      {/* ── Title row ───────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Map size={15} className="text-fuchsia-500" /> Mi aprendizaje
        </h3>
        {!isLoading && journeys.length > 0 && (
          <span className="text-xs text-slate-400">{journeys.length} journey(s)</span>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────── */}
      <div className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-slate-100 overflow-hidden">
                <div className="h-24 bg-slate-100 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-full" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : journeys.length === 0 ? (
          <div className="text-center py-10">
            <Map size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium mb-1">Sin journeys asignados</p>
            <p className="text-xs text-slate-400 mb-4">Explora el catálogo para comenzar tu aprendizaje.</p>
            <button
              onClick={() => router.push('/journey')}
              className="text-xs text-fuchsia-600 font-semibold border border-fuchsia-200
                         px-4 py-2 rounded-xl hover:bg-fuchsia-50 transition-colors"
            >
              Explorar journeys
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {journeys.map(j => (
              <JourneyCard
                key={j.id}
                journey={j}
                onContinue={() => { selectJourney(j.id); router.push('/journey'); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
