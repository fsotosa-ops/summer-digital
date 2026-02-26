'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { resourceService } from '@/services/resource.service';
import { organizationService } from '@/services/organization.service';
import { ApiOrganization, ApiResourceParticipantRead, ApiResourceType } from '@/types/api.types';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Video,
  FileText,
  Headphones,
  Lightbulb,
  Zap,
  Lock,
  Check,
  Loader2,
  AlertCircle,
  RotateCcw,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const TYPE_CONFIG: Record<ApiResourceType, { label: string; icon: React.ElementType; color: string; activeBtn: string }> = {
  video:     { label: 'Video',     icon: Video,      color: 'text-blue-600 bg-blue-50 border-blue-100',   activeBtn: 'from-blue-500 to-blue-600'   },
  podcast:   { label: 'Podcast',   icon: Headphones, color: 'text-violet-600 bg-violet-50 border-violet-100', activeBtn: 'from-violet-500 to-violet-600' },
  pdf:       { label: 'PDF',       icon: FileText,   color: 'text-red-600 bg-red-50 border-red-100',      activeBtn: 'from-red-500 to-red-600'     },
  capsula:   { label: 'Cápsula',   icon: Lightbulb,  color: 'text-amber-600 bg-amber-50 border-amber-100', activeBtn: 'from-amber-500 to-amber-600' },
  actividad: { label: 'Actividad', icon: Zap,        color: 'text-emerald-600 bg-emerald-50 border-emerald-100', activeBtn: 'from-emerald-500 to-emerald-600' },
};

const ALL_TYPES: ApiResourceType[] = ['video', 'podcast', 'pdf', 'capsula', 'actividad'];

function getErrorMessage(err: unknown): string {
  const status = (err as { status?: number })?.status;
  if (status === 401) return 'Tu sesión expiró. Recarga la página.';
  if (status === 403) return 'No tienes permisos. Contacta a tu administrador.';
  return 'No se pudieron cargar los recursos. Verifica tu conexión.';
}

export default function ResourcesPage() {
  const router = useRouter();
  const [resources, setResources] = useState<ApiResourceParticipantRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<ApiResourceType | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [organizations, setOrganizations] = useState<ApiOrganization[]>([]);
  const [orgFilter, setOrgFilter] = useState<string | null>(null);

  useEffect(() => {
    organizationService.listMyOrganizations()
      .then(orgs => {
        const seen = new Set<string>();
        setOrganizations(orgs.filter(o => seen.has(o.id) ? false : (seen.add(o.id), true)));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await resourceService.getMyResources();
        // Deduplicate by id — same resource may appear from multiple org memberships
        const seen = new Set<string>();
        setResources(data.filter(r => seen.has(r.id) ? false : (seen.add(r.id), true)));
      } catch (err) {
        console.error('Error loading resources:', err);
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [retryCount]);

  const filtered = resources
    .filter(r => typeFilter === 'all' || r.type === typeFilter)
    .filter(r => !orgFilter || r.organization_id === orgFilter);

  const consumed = resources.filter(r => r.is_consumed).length;
  const unlocked = resources.filter(r => r.is_unlocked).length;

  // Banner: all loaded resources are locked
  const allLocked = !isLoading && !error && resources.length > 0 && resources.every(r => !r.is_unlocked);

  return (
    <div className="space-y-6">

      {/* ── Page hero ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-sky-500 via-teal-400 to-cyan-400" />
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500
                            flex items-center justify-center shadow-sm shrink-0">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Recursos</h1>
              <p className="text-xs text-slate-400 mt-0.5">Material de apoyo y contenido para tu desarrollo</p>
            </div>
          </div>
          {/* Progress pills */}
          {!isLoading && !error && resources.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full
                               bg-sky-50 border border-sky-100 text-sky-700">
                <BookOpen size={11} /> {unlocked} disponibles
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full
                               bg-emerald-50 border border-emerald-100 text-emerald-700">
                <Check size={11} /> {consumed} completados
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Org filter pills — multi-org users ─────────────── */}
      {!error && organizations.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium">Filtrar:</span>
          <button
            onClick={() => setOrgFilter(null)}
            className={cn(
              'text-xs font-medium px-3 py-1 rounded-full border transition-colors',
              !orgFilter
                ? 'bg-sky-500 border-sky-500 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            Todas
          </button>
          {organizations.map(org => (
            <button
              key={org.id}
              onClick={() => setOrgFilter(org.id)}
              className={cn(
                'text-xs font-medium px-3 py-1 rounded-full border transition-colors',
                orgFilter === org.id
                  ? 'bg-sky-500 border-sky-500 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {org.name}
            </button>
          ))}
        </div>
      )}

      {/* ── All-locked diagnostic banner ─────────────────── */}
      {allLocked && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Todos los recursos están bloqueados</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Completa las actividades requeridas para desbloquearlos, o contacta a tu administrador
              para confirmar que los recursos están asignados y publicados para tu organización.
            </p>
          </div>
        </div>
      )}

      {/* ── Type filter tabs ───────────────────────────────── */}
      {!error && (
        <div className="flex items-center gap-1 bg-white border border-slate-100 shadow-sm p-1 rounded-xl flex-wrap">
          <button
            onClick={() => setTypeFilter('all')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              typeFilter === 'all'
                ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            )}
          >
            Todos
            <span className={cn(
              'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
              typeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            )}>
              {resources.length}
            </span>
          </button>
          {ALL_TYPES.map((t) => {
            const cfg = TYPE_CONFIG[t];
            const count = resources.filter(r => r.type === t).length;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                  typeFilter === t
                    ? `bg-gradient-to-r ${cfg.activeBtn} text-white shadow-sm`
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                )}
              >
                <cfg.icon size={12} />
                {cfg.label}
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  typeFilter === t ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Content ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        </div>
      ) : error ? (
        /* ── Error state ───────────────────────────────────── */
        <div className="flex flex-col items-center justify-center py-16 px-6
                        bg-red-50 border border-red-200 rounded-2xl text-center">
          <div className="h-14 w-14 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <p className="text-base font-semibold text-red-700 mb-1">Error al cargar recursos</p>
          <p className="text-sm text-red-500 max-w-xs mb-5">{error}</p>
          <button
            onClick={() => setRetryCount(c => c + 1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                       bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            <RotateCcw size={14} /> Reintentar
          </button>
        </div>
      ) : filtered.length === 0 ? (
        /* ── Empty state ───────────────────────────────────── */
        <div className="flex flex-col items-center justify-center py-16 px-6
                        bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-sky-100 to-teal-100
                          flex items-center justify-center shadow-sm mb-4">
            <BookOpen size={24} className="text-sky-500" />
          </div>
          {typeFilter !== 'all' ? (
            <>
              <p className="text-base font-semibold text-slate-700 mb-1">
                Sin recursos de tipo &ldquo;{TYPE_CONFIG[typeFilter].label}&rdquo;
              </p>
              <p className="text-sm text-slate-400 max-w-xs mb-4">
                No hay recursos de este tipo disponibles para ti en este momento.
              </p>
              <button
                onClick={() => setTypeFilter('all')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                           bg-gradient-to-r from-sky-500 to-teal-500 text-white hover:opacity-90 transition-opacity"
              >
                Ver todos los recursos
              </button>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-slate-700 mb-1">
                No hay recursos disponibles
              </p>
              <p className="text-sm text-slate-400 max-w-sm mb-2">
                Los recursos aparecerán aquí cuando sean publicados para tu organización.
              </p>
              <p className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 max-w-sm">
                <strong className="text-slate-600">Tip:</strong> Contacta a tu administrador y confirma que los recursos
                estén publicados y asignados a tu organización.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((resource) => {
            const cfg = TYPE_CONFIG[resource.type] || TYPE_CONFIG.video;
            const TypeIcon = cfg.icon;
            const isLocked = !resource.is_unlocked;
            const isConsumed = resource.is_consumed;

            return (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow',
                  isLocked && 'opacity-75'
                )}
              >
                {/* Thumbnail / Type Icon Area */}
                <div className={cn(
                  'h-28 border-b border-slate-100 flex items-center justify-center relative',
                  isLocked ? 'bg-slate-100' : 'bg-slate-50'
                )}>
                  {resource.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resource.thumbnail_url}
                      alt={resource.title}
                      className={cn('w-full h-full object-cover', isLocked && 'grayscale')}
                    />
                  ) : (
                    <TypeIcon className="w-12 h-12 text-slate-200" />
                  )}
                  {isLocked && (
                    <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center">
                      <Lock className="h-8 w-8 text-slate-500" />
                    </div>
                  )}
                  {isConsumed && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-emerald-500 text-white text-xs shadow-sm">
                        <Check className="h-3 w-3 mr-1" />
                        Completado
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full border',
                      cfg.color
                    )}>
                      {cfg.label}
                    </span>
                    {resource.points_on_completion > 0 && !isConsumed && (
                      <span className="text-xs font-bold text-sky-600 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">
                        +{resource.points_on_completion} pts
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-800 leading-snug line-clamp-2">{resource.title}</h3>

                  {resource.description && (
                    <p className="text-sm text-slate-500 flex-1 line-clamp-2">{resource.description}</p>
                  )}

                  {/* Lock reasons */}
                  {isLocked && resource.lock_reasons.length > 0 && (
                    <div className="space-y-1">
                      {resource.lock_reasons.map((reason, i) => (
                        <p key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg flex items-center gap-1">
                          <Lock className="h-3 w-3 flex-shrink-0" />
                          {reason}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto">
                    {isLocked ? (
                      <button disabled
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl
                                   bg-slate-100 text-slate-400 text-sm font-medium cursor-not-allowed">
                        <Lock size={14} /> Bloqueado
                      </button>
                    ) : isConsumed ? (
                      <button
                        onClick={() => router.push(`/resources/${resource.id}`)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl
                                   bg-emerald-50 border border-emerald-200 text-emerald-700
                                   text-sm font-semibold hover:bg-emerald-100 transition-colors"
                      >
                        <Check size={14} /> Ver de nuevo
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push(`/resources/${resource.id}`)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl
                                   bg-gradient-to-r from-sky-500 to-teal-500 text-white
                                   text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
                      >
                        Acceder
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
