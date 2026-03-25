'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Map, ArrowRight, Compass, Plus, Loader2 } from 'lucide-react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useAuthStore } from '@/store/useAuthStore';
import { journeyService } from '@/services/journey.service';
import { organizationService } from '@/services/organization.service';
import { ApiJourneyRead } from '@/types/api.types';
import { JourneyCardCompact } from '@/features/journey/components/JourneyCard';
import { categoryGradient } from '@/features/journey/components/JourneyCard';
import { Skeleton } from '@/components/ui/skeleton';

/* ─── Section ────────────────────────────────────────── */
export function ParticipantJourneysSection() {
  const { journeys, isLoading, fetchJourneys } = useJourneyStore();
  const { user } = useAuthStore();
  const router = useRouter();
  const [availableJourneys, setAvailableJourneys] = useState<ApiJourneyRead[]>([]);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    if (journeys.length === 0) fetchJourneys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load available journeys once enrolled journeys are known
  useEffect(() => {
    if (isLoading || !user) return;
    const load = async () => {
      try {
        const orgs = await organizationService.listMyOrganizations();
        if (orgs.length === 0) return;
        const orgIds = orgs.map(o => o.id);
        const all = await journeyService.listAvailableJourneysMultiOrg(orgIds);
        const enrolledIds = new Set(journeys.map(j => j.id));
        setAvailableJourneys(all.filter(j => !enrolledIds.has(j.id) && j.is_active).slice(0, 3));
      } catch { /* silent */ }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, journeys.length, user?.id]);

  const handleEnroll = async (journeyId: string) => {
    setEnrollingId(journeyId);
    try {
      await journeyService.enrollInJourney(journeyId);
      router.push('/journey/' + journeyId);
    } catch {
      setEnrollingId(null);
    }
  };

  const activeJourneys  = journeys.filter(j => j.status !== 'completed');
  const hasActive       = activeJourneys.length > 0;
  const displayJourneys = activeJourneys.slice(0, 2);
  const extraCount      = Math.max(0, activeJourneys.length - 2);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

      {/* ── Banner motivacional ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-summer-yellow via-summer-orange to-orange-500 px-5 py-4"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-white text-sm leading-tight">
              {hasActive
                ? 'Continúa tu journey de transformación'
                : '¡Explora nuevas experiencias!'}
            </h2>
            <p className="text-white/80 text-xs mt-0.5">
              {hasActive
                ? `${activeJourneys.length} journey${activeJourneys.length > 1 ? 's' : ''} en progreso`
                : 'Comienza tu camino hacia el siguiente nivel.'}
            </p>
          </div>
          <Link href="/journey" className="shrink-0">
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.9)' }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 bg-white text-summer-orange
                               hover:bg-summer-yellow/20 shadow-sm border border-white/60
                               text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
            >
              Ver todo <ArrowRight size={12} />
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* ── Title row ───────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Map size={14} className="text-summer-orange" /> Mi aprendizaje
        </h3>
        {!isLoading && activeJourneys.length > 0 && (
          <div className="flex items-center gap-2">
            {extraCount > 0 && (
              <span className="text-[11px] font-bold text-summer-orange bg-summer-yellow/10
                               border border-summer-yellow px-2 py-0.5 rounded-full">
                +{extraCount} más
              </span>
            )}
            <span className="text-xs text-slate-400">
              {activeJourneys.length} activo{activeJourneys.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────── */}
      <div className="p-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-slate-50/50 rounded-2xl p-4 flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-2 w-full" />
                </div>
                <Skeleton className="h-8 w-20 rounded-xl shrink-0" />
              </div>
            ))}
          </div>
        ) : displayJourneys.length === 0 ? (
          <div className="text-center py-8">
            <Map size={28} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-500 font-medium mb-1">Sin journeys en progreso</p>
            <p className="text-xs text-slate-400 mb-4">Explora el catálogo para comenzar.</p>
            <button
              onClick={() => router.push('/journey')}
              className="text-xs text-summer-orange font-semibold border border-summer-yellow
                         px-4 py-2 rounded-xl hover:bg-summer-yellow/10 transition-colors"
            >
              Explorar journeys
            </button>
          </div>
        ) : (
          <motion.div layout className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {displayJourneys.map(j => (
                <motion.div
                  key={j.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  layout
                >
                  <JourneyCardCompact
                    journey={j}
                    onContinue={() => router.push('/journey/' + j.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {extraCount > 0 && (
              <Link href="/journey">
                <motion.div
                  whileHover={{ x: 5 }}
                  className="text-center py-2 text-xs font-semibold text-summer-orange
                                  hover:text-summer-orange transition-colors cursor-pointer"
                >
                  Ver {extraCount} journey{extraCount > 1 ? 's' : ''} más →
                </motion.div>
              </Link>
            )}
          </motion.div>
        )}

        {/* ── Disponibles para ti ──────────────────────── */}
        {!isLoading && availableJourneys.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Compass size={12} className="text-summer-yellow" /> Disponibles para ti
              </p>
              <Link href="/journey" className="text-[10px] text-summer-orange hover:underline">
                Ver todos
              </Link>
            </div>
            {availableJourneys.map(j => {
              const gradient = categoryGradient(j.category ?? undefined);
              return (
                <div key={j.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100
                             bg-slate-50/60 hover:bg-white hover:border-slate-200 transition-all">
                  <div className={`bg-gradient-to-br ${gradient} h-9 w-9 rounded-lg shrink-0
                                  flex items-center justify-center`}>
                    <Map size={14} className="text-white/80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{j.title}</p>
                    {j.category && (
                      <p className="text-[10px] text-slate-400 truncate">{j.category}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleEnroll(j.id)}
                    disabled={enrollingId === j.id}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold
                               bg-gradient-to-r from-summer-yellow to-orange-500 text-white
                               hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {enrollingId === j.id
                      ? <Loader2 size={10} className="animate-spin" />
                      : <><Plus size={10} /> Unirme</>
                    }
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
