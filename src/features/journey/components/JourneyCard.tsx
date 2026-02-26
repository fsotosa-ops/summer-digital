'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Journey } from '@/types';

/* ─── Category → gradient ────────────────────────────── */
export const CAT_GRADIENTS: Record<string, string> = {
  liderazgo:  'from-fuchsia-500 to-purple-600',
  bienestar:  'from-teal-400   to-cyan-500',
  innovacion: 'from-amber-400  to-orange-500',
  comunidad:  'from-sky-400    to-blue-500',
};

/** Participant-safe gradients — no fuchsia (admin colour) */
export const CAT_GRADIENTS_PARTICIPANT: Record<string, string> = {
  liderazgo:  'from-violet-500 to-indigo-600',
  bienestar:  'from-teal-400   to-cyan-500',
  innovacion: 'from-amber-400  to-orange-500',
  comunidad:  'from-sky-400    to-blue-500',
};

export const FALLBACKS = [
  'from-fuchsia-500 to-purple-600',
  'from-teal-400 to-cyan-500',
  'from-amber-400 to-orange-500',
  'from-sky-400 to-blue-500',
];

const FALLBACKS_PARTICIPANT = [
  'from-violet-500 to-indigo-600',
  'from-teal-400 to-cyan-500',
  'from-amber-400 to-orange-500',
  'from-sky-400 to-blue-500',
];

export function categoryGradient(category?: string, isParticipant = false): string {
  const map = isParticipant ? CAT_GRADIENTS_PARTICIPANT : CAT_GRADIENTS;
  const fallbacks = isParticipant ? FALLBACKS_PARTICIPANT : FALLBACKS;
  if (!category) return fallbacks[0];
  const key = category.toLowerCase();
  return map[key] ?? fallbacks[category.charCodeAt(0) % fallbacks.length];
}

/* ─── Category → left-border (compact cards) ─────────── */
export const CAT_BORDER_PARTICIPANT: Record<string, string> = {
  liderazgo:  'border-l-violet-500',
  bienestar:  'border-l-teal-400',
  innovacion: 'border-l-amber-400',
  comunidad:  'border-l-sky-400',
};

/* ─── Compact card (dashboard preview) ───────────────── */
export function JourneyCardCompact({
  journey,
  onContinue,
}: {
  journey: Journey;
  onContinue: () => void;
}) {
  const completed = journey.nodes.filter(n => n.status === 'completed').length;
  const total     = journey.nodes.length || 1;
  const progress  = Math.round((completed / total) * 100);
  const isDone    = journey.status === 'completed';
  const key       = journey.category?.toLowerCase() ?? '';
  const borderCls = CAT_BORDER_PARTICIPANT[key] ?? 'border-l-slate-200';

  return (
    <div className={`bg-white border border-slate-100 border-l-4 ${borderCls}
                     rounded-2xl p-4 flex items-center gap-4
                     hover:shadow-sm hover:border-slate-200 transition-all`}>
      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          {journey.category && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {journey.category}
            </span>
          )}
          {isDone && (
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50
                             border border-emerald-100 px-1.5 py-0.5 rounded-full">
              ✓ Completado
            </span>
          )}
        </div>
        <p className="font-semibold text-slate-800 text-sm leading-snug line-clamp-1">
          {journey.title}
        </p>
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>{completed}/{total} pasos</span>
            <span className="font-medium tabular-nums">{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-teal-500 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* CTA */}
      {isDone ? (
        <div className="shrink-0 text-xs font-semibold text-emerald-600
                        bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
          ✓ Listo
        </div>
      ) : (
        <button
          onClick={onContinue}
          className="shrink-0 flex items-center gap-1 text-xs font-bold
                     text-sky-600 bg-sky-50 border border-sky-100
                     px-3 py-1.5 rounded-xl hover:bg-sky-100 transition-colors"
        >
          Continuar <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

/* ─── Journey card ───────────────────────────────────── */
export function JourneyCard({
  journey,
  onContinue,
  isParticipantContext = false,
}: {
  journey: Journey;
  onContinue: () => void;
  isParticipantContext?: boolean;
}) {
  const completed = journey.nodes.filter(n => n.status === 'completed').length;
  const total     = journey.nodes.length || 1;
  const progress  = Math.round((completed / total) * 100);
  const isDone    = journey.status === 'completed';
  const gradient  = categoryGradient(journey.category, isParticipantContext);

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: '0 8px 30px -6px rgba(0,0,0,0.12)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="bg-white border border-slate-100 rounded-2xl overflow-hidden flex flex-col"
    >
      {/* Hero — image if available, gradient fallback */}
      {journey.thumbnail_url ? (
        <div className="h-28 relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={journey.thumbnail_url}
            alt={journey.title}
            className="w-full h-full object-cover"
          />
          {/* Overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            {journey.category && (
              <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold
                               uppercase tracking-widest px-2.5 py-1 rounded-full">
                {journey.category}
              </span>
            )}
            {isDone && (
              <span className="bg-white/25 backdrop-blur-sm text-white
                               text-[10px] font-bold px-2 py-0.5 rounded-full">
                ✓ Completado
              </span>
            )}
          </div>
        </div>
      ) : (
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
      )}

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
