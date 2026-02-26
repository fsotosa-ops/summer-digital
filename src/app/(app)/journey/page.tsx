'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useAuthStore } from '@/store/useAuthStore';
import { journeyService } from '@/services/journey.service';
import { organizationService } from '@/services/organization.service';
import { ApiJourneyRead, ApiOrganization } from '@/types/api.types';
import { JourneyMap } from '@/features/journey/components/JourneyMap';
import { JourneyCard, categoryGradient } from '@/features/journey/components/JourneyCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Map,
  Play,
  CheckCircle,
  Compass,
  Loader2,
  Plus,
  Building2,
  AlertCircle,
  Star,
  History,
} from 'lucide-react';
import ReactConfetti from 'react-confetti';
import { cn } from '@/lib/utils';

/* ─── Empty state helper ──────────────────────────────── */
function EmptySection({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl
                    border border-dashed border-slate-200 bg-slate-50/60 text-center">
      <div className="mb-3 text-slate-300">{icon}</div>
      <p className="text-sm font-semibold text-slate-600 mb-1">{title}</p>
      <p className="text-xs text-slate-400 max-w-xs">{description}</p>
    </div>
  );
}

function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });
  useEffect(() => {
    function handleResize() { setWindowDimensions({ width: window.innerWidth, height: window.innerHeight }); }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return windowDimensions;
}

type Tab = 'progress' | 'available' | 'history';

export default function JourneyPage() {
  const router = useRouter();
  const { user, viewMode } = useAuthStore();
  const { journeys, fetchJourneys, fetchJourneysForAdmin, selectedJourneyId, selectJourney, isLoading } = useJourneyStore();
  const { width, height } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<Tab>('progress');
  const [availableJourneys, setAvailableJourneys] = useState<ApiJourneyRead[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // For SuperAdmin: org selector
  const [organizations, setOrganizations] = useState<ApiOrganization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  const isAdminUser = user?.role === 'Admin' || user?.role === 'SuperAdmin';
  const isAdminMode = isAdminUser && viewMode === 'admin';
  const orgId = selectedOrgId || user?.organizationId;

  // Admins in admin mode belong on /admin/journeys — redirect immediately
  useEffect(() => {
    if (isAdminMode) {
      router.replace('/admin/journeys');
    }
  }, [isAdminMode, router]);

  // Load organizations
  useEffect(() => {
    const loadOrgs = async () => {
      if (!user) return;
      setLoadingOrgs(true);
      try {
        const orgs = await organizationService.listMyOrganizations();
        setOrganizations(orgs);
        if (isAdminMode && orgs.length > 0 && !selectedOrgId) {
          setSelectedOrgId(orgs[0].id);
        }
      } catch (err) {
        console.error('Error loading organizations:', err);
      } finally {
        setLoadingOrgs(false);
      }
    };
    loadOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdminMode]);

  // Fetch journeys based on role
  useEffect(() => {
    if (isAdminMode) {
      if (!orgId) return;
      fetchJourneysForAdmin(orgId);
    } else {
      fetchJourneys(orgId);
    }
  }, [fetchJourneys, fetchJourneysForAdmin, orgId, isAdminMode]);

  // Load available journeys for enrollment
  useEffect(() => {
    const loadAvailable = async () => {
      if (isAdminMode || organizations.length === 0 || isLoading) return;
      setLoadingAvailable(true);
      try {
        const orgIds = organizations.map(o => o.id);
        const all = await journeyService.listAvailableJourneysMultiOrg(orgIds);
        const enrolledIds = new Set(journeys.map(j => j.id));
        const notEnrolled = all.filter(j => !enrolledIds.has(j.id) && j.is_active);
        setAvailableJourneys(notEnrolled);
      } catch (err) {
        console.error('Error loading available journeys:', err);
      } finally {
        setLoadingAvailable(false);
      }
    };
    loadAvailable();
  }, [organizations, journeys, isAdminMode, isLoading]);

  const handleEnroll = async (journeyId: string) => {
    setEnrollingId(journeyId);
    setEnrollError(null);
    try {
      await journeyService.enrollInJourney(journeyId);
      await fetchJourneys(orgId);
      setAvailableJourneys(prev => prev.filter(j => j.id !== journeyId));
      setActiveTab('progress');
    } catch (err) {
      console.error('Error enrolling:', err);
      setEnrollError('No se pudo inscribir. Verifica que seas miembro de la organizacion.');
    } finally {
      setEnrollingId(null);
    }
  };

  // Hoist before loading guard (needed for hero stat-pills)
  const activeJourneys    = journeys.filter(j => j.status === 'active');
  const completedJourneys = journeys.filter(j => j.status === 'completed');

  // ── Guard: no org ─────────────────────────────────────
  if (!orgId && !isAdminMode && !loadingOrgs && organizations.length === 0) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Sin organizacion asignada</h2>
        <p className="text-slate-500">
          Necesitas pertenecer a una organizacion para ver los journeys disponibles.
          Contacta a tu administrador.
        </p>
      </div>
    );
  }

  // ── Guard: loading ────────────────────────────────────
  if (isLoading || loadingOrgs) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Hero skeleton */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-sky-500 via-teal-400 to-cyan-400" />
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-7 w-28 rounded-full" />
            </div>
          </div>
        </div>
        {/* Journey cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border border-slate-100 overflow-hidden">
              <Skeleton className="h-24 w-full rounded-none" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-8 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Selected journey: show map ─────────────────────────
  if (selectedJourneyId) {
    const activeJourney  = journeys.find(j => j.id === selectedJourneyId);
    const completedSteps = activeJourney?.nodes.filter(n => n.status === 'completed').length ?? 0;
    const totalSteps     = activeJourney?.nodes.length ?? 0;
    const xpEarned       = activeJourney?.nodes
      .filter(n => n.status === 'completed')
      .reduce((sum, n) => sum + (n.points || 0), 0) ?? 0;

    return (
      <div className="space-y-4">
        {activeJourney?.status === 'completed' && activeJourney.progress === 100 && (
          <div className="fixed inset-0 pointer-events-none z-50">
            <ReactConfetti width={width} height={height} recycle={false} numberOfPieces={500} />
          </div>
        )}
        <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-slate-800 truncate">{activeJourney?.title}</h2>
              <span className="text-sm font-semibold text-teal-600 ml-3 flex-shrink-0">
                Paso {completedSteps} / {totalSteps}
              </span>
            </div>
            <Progress value={activeJourney?.progress ?? 0} className="h-2 bg-slate-100" indicatorClassName="bg-teal-500" />
          </div>
          {xpEarned > 0 && (
            <div className="flex-shrink-0 flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-full px-3 py-1">
              <Star className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-bold text-teal-700">{xpEarned} XP</span>
            </div>
          )}
          {activeJourney?.status === 'completed' && (
            <Badge className="bg-teal-500 text-white flex-shrink-0">Completado</Badge>
          )}
        </div>
        <JourneyMap />
      </div>
    );
  }

  // ── Main page ─────────────────────────────────────────
  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number; visible: boolean }[] = [
    {
      key: 'progress' as Tab,
      label: 'En progreso',
      icon: <Play size={12} />,
      count: isAdminMode ? journeys.length : activeJourneys.length,
      visible: true,
    },
    {
      key: 'available' as Tab,
      label: 'Disponibles',
      icon: <Compass size={12} />,
      count: availableJourneys.length,
      visible: !isAdminMode,
    },
    {
      key: 'history' as Tab,
      label: 'Historial',
      icon: <History size={12} />,
      count: completedJourneys.length,
      visible: !isAdminMode,
    },
  ].filter(t => t.visible);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ── Page hero ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-sky-500 via-teal-400 to-cyan-400" />
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500
                            flex items-center justify-center shadow-sm shrink-0">
              <Map size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">
                {isAdminMode ? 'Journeys de la Organización' : 'Mi Viaje'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAdminMode
                  ? 'Vista de journeys asignados a la org seleccionada'
                  : 'Tu progreso de aprendizaje'}
              </p>
            </div>
          </div>
          {/* Stat pills — only for non-admin mode */}
          {!isAdminMode && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab('progress')}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors',
                  activeTab === 'progress'
                    ? 'bg-teal-500 border-teal-500 text-white'
                    : 'bg-teal-50 border-teal-100 text-teal-700 hover:bg-teal-100'
                )}
              >
                <Play size={11} /> {activeJourneys.length} En progreso
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors',
                  activeTab === 'history'
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
                )}
              >
                <CheckCircle size={11} /> {completedJourneys.length} Completados
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── SuperAdmin org selector ─────────────────────── */}
      {isAdminMode && organizations.length > 1 && (
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4
                        flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-purple-50 border border-purple-200
                            flex items-center justify-center shrink-0">
              <Building2 size={15} className="text-purple-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">Vista de organización</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={selectedOrgId || ''} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="w-full sm:w-[220px] border-purple-200 focus:ring-purple-400 text-sm">
                <SelectValue placeholder="Selecciona organización" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs shrink-0">
              Vista Previa
            </Badge>
          </div>
        </div>
      )}

      {/* ── Error de inscripción ─────────────────────────── */}
      {enrollError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 flex items-center gap-2 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {enrollError}
        </div>
      )}

      {/* ── Tab bar ─────────────────────────────────────── */}
      {!isAdminMode && (
        <div className="flex items-center gap-1 bg-white border border-slate-100 shadow-sm p-1 rounded-xl w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Tab content ─────────────────────────────────── */}

      {/* En progreso / SuperAdmin overview */}
      {(activeTab === 'progress' || isAdminMode) && (
        <section>
          {(isAdminMode ? journeys : activeJourneys).length > 0 ? (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {(isAdminMode ? journeys : activeJourneys).map(journey => (
                <JourneyCard
                  key={journey.id}
                  journey={journey}
                  isParticipantContext={!isAdminMode}
                  onContinue={() => selectJourney(journey.id)}
                />
              ))}
            </motion.div>
          ) : (
            <EmptySection
              icon={<Play size={36} />}
              title="Sin journeys en progreso"
              description={isAdminMode
                ? 'No hay journeys en esta organización. Crea uno desde el menú Journeys.'
                : 'No tienes viajes activos. Explora los disponibles para comenzar.'}
            />
          )}
        </section>
      )}

      {/* Disponibles para inscripción */}
      {activeTab === 'available' && !isAdminMode && (
        <section>
          <motion.div
            key="available"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {loadingAvailable ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-2xl border border-slate-100 overflow-hidden">
                    <Skeleton className="h-24 w-full rounded-none" />
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-8 w-full rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : availableJourneys.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {availableJourneys.map(journey => {
                  const gradient = categoryGradient(journey.category ?? undefined);
                  return (
                    <div
                      key={journey.id}
                      className="bg-white border border-slate-100 rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className={`bg-gradient-to-r ${gradient} h-20 relative flex items-end p-4`}>
                        {journey.category && (
                          <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold
                                           uppercase tracking-widest px-2.5 py-1 rounded-full">
                            {journey.category}
                          </span>
                        )}
                        <span className="absolute top-3 right-3 text-white/80 text-[10px]">
                          {journey.total_steps} pasos
                        </span>
                      </div>
                      <div className="p-4 flex flex-col flex-1 gap-3">
                        <h3 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2">
                          {journey.title}
                        </h3>
                        {journey.description && (
                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 flex-1">
                            {journey.description}
                          </p>
                        )}
                        <button
                          onClick={() => handleEnroll(journey.id)}
                          disabled={enrollingId === journey.id}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl
                                     bg-gradient-to-r from-amber-400 to-orange-500 text-white
                                     text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                          {enrollingId === journey.id
                            ? <><Loader2 size={12} className="animate-spin" /> Inscribiendo...</>
                            : <><Plus size={12} /> Inscribirme</>
                          }
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptySection
                icon={<Compass size={36} />}
                title="Sin journeys disponibles"
                description="No hay más journeys disponibles en este momento."
              />
            )}
          </motion.div>
        </section>
      )}

      {/* Historial */}
      {activeTab === 'history' && !isAdminMode && (
        <section>
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {completedJourneys.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedJourneys.map(journey => (
                  <motion.div
                    key={journey.id}
                    whileHover={{ y: -2 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    className="bg-white border border-slate-100 rounded-2xl overflow-hidden
                               flex flex-col shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => selectJourney(journey.id)}
                  >
                    {journey.thumbnail_url ? (
                      <div className="h-24 relative overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={journey.thumbnail_url} alt={journey.title}
                          className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <div className="absolute bottom-2 right-2">
                          <CheckCircle size={16} className="text-white drop-shadow" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-[1.5px] bg-teal-400" />
                    )}
                    <div className="p-4 flex flex-col gap-3 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-slate-700 text-sm leading-snug line-clamp-2 flex-1">
                          {journey.title}
                        </h3>
                        {!journey.thumbnail_url && (
                          <CheckCircle size={16} className="text-teal-500 shrink-0 mt-0.5" />
                        )}
                      </div>
                      {journey.category && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600
                                         bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full w-fit">
                          {journey.category}
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); selectJourney(journey.id); }}
                        className="mt-auto text-xs font-semibold text-slate-500 hover:text-teal-600
                                   border border-slate-200 hover:border-teal-200 rounded-xl py-2 transition-colors"
                      >
                        Ver certificado / Repasar
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptySection
                icon={<History size={36} />}
                title="Sin journeys completados"
                description="Aún no has completado ningún journey. ¡Sigue adelante!"
              />
            )}
          </motion.div>
        </section>
      )}
    </div>
  );
}
