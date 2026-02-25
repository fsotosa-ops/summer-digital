'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Headphones, FileText, Zap, CheckSquare, Lock, ArrowRight } from 'lucide-react';
import type { ElementType } from 'react';
import { resourceService } from '@/services/resource.service';
import { ApiResourceParticipantRead, ApiResourceType } from '@/types/api.types';

/* ─── Type config ────────────────────────────────────── */
interface TypeCfg { icon: ElementType; gradient: string; label: string }

const TYPE_CFG: Record<ApiResourceType, TypeCfg> = {
  video:     { icon: Play,        gradient: 'from-sky-400 to-blue-500',       label: 'Video'     },
  podcast:   { icon: Headphones,  gradient: 'from-violet-400 to-purple-500',  label: 'Podcast'   },
  pdf:       { icon: FileText,    gradient: 'from-amber-400 to-orange-500',   label: 'PDF'       },
  capsula:   { icon: Zap,         gradient: 'from-fuchsia-500 to-pink-500',   label: 'Cápsula'   },
  actividad: { icon: CheckSquare, gradient: 'from-teal-400 to-cyan-500',      label: 'Actividad' },
};

/* ─── Resource card ──────────────────────────────────── */
function ResourceCard({ resource }: { resource: ApiResourceParticipantRead }) {
  const cfg     = TYPE_CFG[resource.type] ?? TYPE_CFG.actividad;
  const Icon    = cfg.icon;
  const unlocked = resource.is_unlocked;

  const card = (
    <motion.div
      whileHover={unlocked ? { y: -3, boxShadow: '0 8px 30px -6px rgba(0,0,0,0.10)' } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={`bg-white border rounded-2xl overflow-hidden flex flex-col h-full transition-all
        ${unlocked ? 'border-slate-100 cursor-pointer' : 'border-slate-100 opacity-65'}`}
    >
      {/* Gradient accent bar */}
      <div className={`h-1.5 bg-gradient-to-r ${cfg.gradient}`} />

      <div className="p-4 flex flex-col flex-1 gap-2.5">
        {/* Icon + type label */}
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${cfg.gradient}
                           flex items-center justify-center shrink-0`}>
            <Icon size={15} className="text-white" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {cfg.label}
          </span>
          {!unlocked && <Lock size={11} className="text-slate-300 ml-auto" />}
        </div>

        {/* Title */}
        <h3 className={`font-semibold text-sm leading-snug line-clamp-2
          ${unlocked ? 'text-slate-800' : 'text-slate-400'}`}>
          {resource.title}
        </h3>

        {/* Description */}
        {resource.description && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 flex-1">
            {resource.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-slate-50 text-xs">
          {unlocked ? (
            <span className="font-semibold text-fuchsia-600 flex items-center gap-1">
              Ver recurso <ArrowRight size={11} />
            </span>
          ) : (
            <span className="text-slate-400 truncate max-w-[60%]">
              {resource.lock_reasons[0] ?? 'Bloqueado'}
            </span>
          )}
          {resource.points_on_completion > 0 && (
            <span className="font-bold text-teal-600 shrink-0 ml-2">
              +{resource.points_on_completion} pts
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );

  return unlocked
    ? <Link href="/resources" className="block h-full">{card}</Link>
    : <div title={resource.lock_reasons[0]}>{card}</div>;
}

/* ─── Section ────────────────────────────────────────── */
export function ResourcesFeedWidget() {
  const [resources, setResources] = useState<ApiResourceParticipantRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    resourceService
      .getMyResources()
      .then(d => setResources(d.slice(0, 6)))
      .catch(() => setResources([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
        <h2 className="text-base font-semibold text-slate-700">Recursos disponibles</h2>
        <Link
          href="/resources"
          className="text-xs font-semibold text-fuchsia-600 hover:text-fuchsia-700 transition-colors"
        >
          Ver todos →
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border border-slate-100 overflow-hidden">
              <div className="h-1.5 bg-slate-100" />
              <div className="p-4 space-y-2">
                <div className="h-8 w-8 rounded-xl bg-slate-100 animate-pulse" />
                <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : resources.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No hay recursos disponibles aún.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {resources.map(r => <ResourceCard key={r.id} resource={r} />)}
        </div>
      )}
    </div>
  );
}
