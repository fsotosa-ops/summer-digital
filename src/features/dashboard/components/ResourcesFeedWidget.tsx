'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Headphones, FileText, Zap, CheckSquare, Lock, ArrowRight, BookOpen } from 'lucide-react';
import type { ElementType } from 'react';
import { resourceService } from '@/services/resource.service';
import { ApiResourceParticipantRead, ApiResourceType } from '@/types/api.types';

/* ─── Type config ────────────────────────────────────── */
interface TypeCfg { icon: ElementType; borderCls: string; iconGradient: string; label: string }

const TYPE_CFG: Record<ApiResourceType, TypeCfg> = {
  video:     { icon: Play,        borderCls: 'border-l-blue-400',   iconGradient: 'from-sky-400 to-blue-500',      label: 'Video'     },
  podcast:   { icon: Headphones,  borderCls: 'border-l-violet-400', iconGradient: 'from-violet-400 to-purple-500', label: 'Podcast'   },
  pdf:       { icon: FileText,    borderCls: 'border-l-amber-400',  iconGradient: 'from-amber-400 to-orange-500',  label: 'PDF'       },
  capsula:   { icon: Zap,         borderCls: 'border-l-violet-500', iconGradient: 'from-violet-400 to-indigo-500', label: 'Cápsula'   },
  actividad: { icon: CheckSquare, borderCls: 'border-l-teal-400',   iconGradient: 'from-teal-400 to-cyan-500',     label: 'Actividad' },
};

/* ─── Compact resource card ──────────────────────────── */
function ResourceCardCompact({ resource }: { resource: ApiResourceParticipantRead }) {
  const cfg      = TYPE_CFG[resource.type] ?? TYPE_CFG.actividad;
  const Icon     = cfg.icon;
  const unlocked = resource.is_unlocked;

  const card = (
    <div className={`bg-white border border-slate-100 border-l-4 ${cfg.borderCls}
                     rounded-2xl px-4 py-3 flex items-center gap-3 transition-all
                     ${unlocked
                       ? 'cursor-pointer hover:shadow-sm hover:border-slate-200'
                       : 'opacity-60'}`}>
      {/* Type icon */}
      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${cfg.iconGradient}
                       flex items-center justify-center shrink-0`}>
        <Icon size={14} className="text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
          {cfg.label}
        </p>
        <p className={`text-sm font-semibold leading-snug line-clamp-1
                       ${unlocked ? 'text-slate-800' : 'text-slate-400'}`}>
          {resource.title}
        </p>
      </div>

      {/* Right side */}
      <div className="shrink-0 flex items-center gap-2">
        {resource.points_on_completion > 0 && !resource.is_consumed && unlocked && (
          <span className="text-[10px] font-bold text-teal-600 bg-teal-50
                           border border-teal-100 px-1.5 py-0.5 rounded-full">
            +{resource.points_on_completion}pts
          </span>
        )}
        {unlocked
          ? <ArrowRight size={14} className="text-sky-500" />
          : <Lock size={13} className="text-slate-300" />}
      </div>
    </div>
  );

  return unlocked
    ? <Link href={`/resources/${resource.id}`} className="block">{card}</Link>
    : <div>{card}</div>;
}

/* ─── Section ────────────────────────────────────────── */
export function ResourcesFeedWidget() {
  const [resources, setResources] = useState<ApiResourceParticipantRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    resourceService
      .getMyResources()
      .then(d => setResources(d.slice(0, 4)))
      .catch(() => setResources([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

      {/* ── Accent stripe ─────────────────────────────── */}
      <div className="h-[2px] bg-gradient-to-r from-sky-500 via-teal-400 to-cyan-400" />

      {/* ── Header ────────────────────────────────────── */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500
                          flex items-center justify-center shadow-sm shrink-0">
            <BookOpen size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 leading-tight">Recursos disponibles</h2>
            <p className="text-xs text-slate-400 mt-0.5">Tu biblioteca de aprendizaje</p>
          </div>
        </div>
        <Link href="/resources">
          <button className="flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-teal-500
                             text-white text-xs font-bold px-3 py-1.5 rounded-xl
                             hover:opacity-90 transition-opacity shadow-sm shrink-0">
            Ver todos <ArrowRight size={11} />
          </button>
        </Link>
      </div>

      {/* ── Content ───────────────────────────────────── */}
      <div className="p-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 animate-pulse">
                <div className="h-8 w-8 rounded-xl bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 bg-slate-200 rounded w-1/4" />
                  <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen size={28} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No hay recursos disponibles aún.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {resources.map(r => <ResourceCardCompact key={r.id} resource={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}
