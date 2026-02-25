'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Map, ArrowRight } from 'lucide-react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { Journey } from '@/types';

/* ─── Category → gradient ────────────────────────────── */
const CAT_GRADIENTS: Record<string, string> = {
  liderazgo:  'from-fuchsia-500 to-purple-600',
  bienestar:  'from-teal-400   to-cyan-500',
  innovacion: 'from-amber-400  to-orange-500',
  comunidad:  'from-sky-400    to-blue-500',
};
const FALLBACKS = [
  'from-fuchsia-500 to-purple-600',
  'from-teal-400 to-cyan-500',
  'from-amber-400 to-orange-500',
  'from-sky-400 to-blue-500',
];
function categoryGradient(category?: string) {
  if (!category) return FALLBACKS[0];
  const key = category.toLowerCase();
  return CAT_GRADIENTS[key] ?? FALLBACKS[category.charCodeAt(0) % FALLBACKS.length];
}

/* ─── Journey card ───────────────────────────────────── */
function JourneyCard({ journey, onContinue }: { journey: Journey; onContinue: () => void }) {
  const completed = journey.nodes.filter(n => n.status === 'completed').length;
  const total     = journey.nodes.length || 1;
  const progress  = Math.round((completed / total) * 100);
  const isDone    = journey.status === 'completed';
  const gradient  = categoryGradient(journey.category);

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: '0 8px 30px -6px rgba(0,0,0,0.12)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="bg-white border border-slate-100 rounded-2xl overflow-hidden flex flex-col"
    >
      {/* Gradient header strip with category badge */}
      <div className={`bg-gradient-to-r ${gradient} h-24 relative flex items-end p-4`}>
        {journey.category && (
          <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold
                           uppercase tracking-widest px-2.5 py-1 rounded-full">
            {journey.category}
          </span>
        )}
        {isDone && (
          <span className="absolute top-3 right-3 bg-white/25 backdrop-blur-sm text-white
                           text-[10px] font-bold px-2 py-0.5 rounded-full">
            ✓ Completado
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Title */}
        <h3 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2">
          {journey.title}
        </h3>

        {/* Description */}
        {journey.description && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 flex-1">
            {journey.description}
          </p>
        )}

        {/* Progress */}
        <div className="mt-auto space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span className="font-medium text-slate-600">{completed}/{total} pasos</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-700`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        {isDone ? (
          <div className="text-center text-xs font-semibold text-teal-600 bg-teal-50
                          rounded-xl py-2 border border-teal-100">
            ✓ Journey completado
          </div>
        ) : (
          <button
            onClick={onContinue}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl
                        bg-gradient-to-r ${gradient} text-white text-xs font-semibold
                        hover:opacity-90 transition-opacity`}
          >
            Continuar <ArrowRight size={13} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Section ────────────────────────────────────────── */
export function ParticipantJourneysSection() {
  const { journeys, isLoading, fetchJourneys, selectJourney } = useJourneyStore();
  const router = useRouter();

  useEffect(() => {
    if (journeys.length === 0) fetchJourneys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
        <h2 className="text-base font-semibold text-slate-700">Mi aprendizaje</h2>
        <button
          onClick={() => router.push('/journey')}
          className="text-xs font-semibold text-fuchsia-600 hover:text-fuchsia-700 transition-colors"
        >
          Ver todo →
        </button>
      </div>

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
  );
}
