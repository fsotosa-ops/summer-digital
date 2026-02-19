'use client';

import { useJourneyStore } from '@/store/useJourneyStore';
import { Map, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function JourneyProgressWidget() {
  const { journeys } = useJourneyStore();

  return (
    <div className="bg-white rounded-3xl shadow-xl relative overflow-hidden">
      {/* Faded Map icon background */}
      <Map
        className="absolute -bottom-4 -right-4 w-32 h-32 text-slate-200 opacity-50 pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">Mi Progreso</h3>
          <Link
            href="/journey"
            className="flex items-center gap-1 text-xs text-fuchsia-600 hover:text-fuchsia-500 font-medium transition-colors"
          >
            Ver todo <ArrowRight size={12} />
          </Link>
        </div>

        {journeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
              <Map size={24} className="text-slate-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Sin journeys activos</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Cuando te inscribas a un Journey aparecerá aquí tu avance.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {journeys.slice(0, 3).map((journey) => (
              <motion.div
                key={journey.id}
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="group p-3 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer relative overflow-hidden"
              >
                {/* Progress bar gradient background */}
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-fuchsia-50 to-transparent rounded-2xl transition-all duration-500"
                  style={{ width: `${Math.max(journey.progress, 5)}%` }}
                />
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 truncate pr-2">{journey.title}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">{journey.progress}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
