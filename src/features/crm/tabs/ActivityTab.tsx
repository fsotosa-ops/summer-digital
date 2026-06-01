'use client';

import { useState, useEffect } from 'react';
import { crmService } from '@/services/crm.service';
import { adminService } from '@/services/admin.service';
import { resourceService } from '@/services/resource.service';
import { ApiCrmContact, ApiOrgTrackingResponse } from '@/types/api.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  HeartPulse,
  Users,
  UserCheck,
  UserMinus,
  UserX,
  TrendingUp,
  BookOpen,
  Activity,
  CheckCircle2,
  Clock,
  Flame,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MiniProgress } from '@/components/MiniProgress';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { eventStatusLabel, eventStatusClasses } from '@/lib/journey-tracking-helpers';
import { Badge } from '@/components/ui/badge';

function getInitials(name: string | null | undefined, email: string): string {
  if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return email[0].toUpperCase();
}

export function ActivityTab({
  orgId,
  onNavigateToRisk,
}: {
  orgId?: string;
  onNavigateToRisk?: () => void;
}) {
  const [total, setTotal]     = useState(0);
  const [tracking, setTracking] = useState<ApiOrgTrackingResponse | null>(null);
  const [contacts, setContacts] = useState<ApiCrmContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourceCount, setResourceCount] = useState<number | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [orgId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contactsRes, trackingRes, resourcesRes] = await Promise.allSettled([
        crmService.listContacts(0, 30, undefined, orgId),
        orgId ? adminService.listOrgTracking(orgId) : Promise.resolve(null),
        orgId ? resourceService.listResources(orgId, null) : Promise.resolve([]),
      ]);
      if (contactsRes.status === 'fulfilled') {
        setContacts(contactsRes.value.contacts);
        setTotal(contactsRes.value.count);
      }
      if (trackingRes.status === 'fulfilled' && trackingRes.value) {
        setTracking(trackingRes.value);
      }
      if (resourcesRes.status === 'fulfilled') {
        setResourceCount(Array.isArray(resourcesRes.value) ? resourcesRes.value.length : 0);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // ── Métricas derivadas de tracking ─────────────────────────────
  // enrolled = personas únicas inscritas en ≥1 journey
  const enrolled     = tracking?.total_unique_enrolled_users ?? 0;
  // notEnrolled = registrados en la plataforma que nunca iniciaron ningún journey → mayor riesgo
  const notEnrolled  = total > enrolled ? total - enrolled : 0;

  // Aggregate journey metrics (inscripciones, no personas únicas)
  const allJourneys = [
    ...(tracking?.events.flatMap((e) => e.journeys) ?? []),
    ...(tracking?.unassigned_journeys ?? []),
  ];
  const activeJourneyCount = allJourneys.filter((j) => j.is_active).length;
  const totalEnrollments    = allJourneys.reduce((s, j) => s + j.total_enrollments, 0);
  const completedEnrollments = allJourneys.reduce((s, j) => s + j.completed_enrollments, 0);
  const activeEnrollments   = allJourneys.reduce((s, j) => s + j.active_enrollments, 0);
  const notStartedEnrollments = allJourneys.reduce((s, j) => s + j.not_started_enrollments, 0);

  // Salud = % de la comunidad que participa en al menos 1 journey
  // Si total=487 y enrolled=211 → 43% de salud (no 100%)
  const healthPct   = total > 0 ? Math.round((enrolled / total) * 100) : 0;
  const enrolledPct = total > 0 ? (enrolled / total) * 100 : 0;
  const notEnrolledPct = total > 0 ? (notEnrolled / total) * 100 : 0;

  // Tasa de completación entre los que SÍ están inscritos
  const completionRate = totalEnrollments > 0
    ? Math.round((completedEnrollments / totalEnrollments) * 100)
    : 0;

  // Actividad reciente — sort por last_seen_at desc
  const recentlyActive = [...contacts]
    .filter((c) => c.last_seen_at)
    .sort((a, b) => new Date(b.last_seen_at!).getTime() - new Date(a.last_seen_at!).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-summer-pink" />
          Panel de Engagement
        </h3>
        <Button variant="ghost" size="sm" onClick={loadData}
          className="h-8 text-slate-500 hover:text-summer-pink">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Actualizar
        </Button>
      </div>

      {/* ── KPI bar (moved from AdminDashboardPanel) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Usuarios activos',
            sub: 'Total registrados',
            value: total,
            gradient: 'from-summer-pink to-summer-lavender',
            border: 'border-summer-pink/30',
          },
          {
            label: 'Journeys activos',
            sub: 'Publicados',
            value: activeJourneyCount,
            gradient: 'from-sky-400 to-cyan-500',
            border: 'border-sky-200',
          },
          {
            label: 'Recursos',
            sub: 'Disponibles',
            value: resourceCount,
            gradient: 'from-teal-400 to-emerald-500',
            border: 'border-teal-200',
          },
          {
            label: 'Completados',
            sub: 'Total acumulado',
            value: completedEnrollments,
            gradient: 'from-yellow-400 to-orange-500',
            border: 'border-yellow-200',
          },
        ].map(({ label, sub, value, gradient, border }) => (
          <div
            key={label}
            className={`bg-white rounded-2xl border ${border} shadow-sm p-4 flex flex-col gap-2`}
          >
            <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              {value === null ? (
                <div className="h-8 w-14 animate-pulse rounded bg-slate-100" />
              ) : (
                <p className="text-2xl font-bold tabular-nums text-slate-800 leading-none">
                  {value.toLocaleString()}
                </p>
              )}
              <p className="text-sm font-medium text-slate-600 mt-1">{label}</p>
              <p className="text-xs text-slate-400">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Widget 1: Salud del Engagement ── */}
      <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-summer-pink/10 to-summer-lavender/10">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-summer-pink uppercase tracking-wide mb-1">
                Adopción del Programa
              </p>
              <p className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-summer-pink to-summer-lavender leading-none">
                {healthPct}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {enrolled} de {total} miembros participan en al menos un journey
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-summer-pink/20 flex items-center justify-center">
              <HeartPulse className="h-6 w-6 text-summer-pink" />
            </div>
          </div>

          {/* Barra: verde = inscritos, gris = sin journey */}
          <div className="h-3 rounded-full overflow-hidden flex bg-slate-100">
            {enrolledPct > 0 && (
              <div className="h-full bg-emerald-400 transition-all"
                style={{ width: `${enrolledPct}%` }} />
            )}
            {notEnrolledPct > 0 && (
              <div className="h-full bg-slate-300 transition-all"
                style={{ width: `${notEnrolledPct}%` }} />
            )}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full inline-block bg-emerald-400" />
              Participando en journeys
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full inline-block bg-slate-300" />
              Sin journey asignado
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Widget 2: 4 cards de estado ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Comunidad',
            sublabel: 'Registrados en la plataforma',
            value: total,
            color: 'text-slate-700',
            border: 'border-slate-100',
            Icon: Users,
          },
          {
            label: 'Participando',
            sublabel: 'Inscritos en ≥1 journey',
            value: enrolled,
            color: 'text-emerald-600',
            border: 'border-emerald-100',
            Icon: UserCheck,
          },
          {
            label: 'Completaron',
            sublabel: 'Completaciones de journeys',
            value: completedEnrollments,
            color: 'text-blue-600',
            border: 'border-blue-100',
            Icon: CheckCircle2,
          },
          {
            label: 'Sin Journey',
            sublabel: 'Nunca iniciaron un programa',
            value: notEnrolled,
            color: 'text-amber-500',
            border: 'border-amber-100',
            Icon: UserX,
            action: onNavigateToRisk,
          },
        ].map(({ label, sublabel, value, color, border, Icon, action }) => (
          <div
            key={label}
            onClick={action}
            role={action ? 'button' : undefined}
            tabIndex={action ? 0 : undefined}
            onKeyDown={action ? (e) => { if (e.key === 'Enter') action(); } : undefined}
            className={cn(
              'bg-white rounded-xl p-3 border shadow-xs flex flex-col gap-0.5',
              border,
              action && 'cursor-pointer hover:shadow-md transition-all group',
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium text-slate-400 uppercase">{label}</p>
              <Icon className={cn('h-3.5 w-3.5 opacity-40', color)} />
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-400 leading-tight">{sublabel}</p>
          </div>
        ))}
      </div>

      {/* ── Alert: sin journey ── */}
      {notEnrolled > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm text-amber-800 font-semibold leading-none">
                {notEnrolled} miembro{notEnrolled !== 1 ? 's' : ''} sin journey asignado
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Están registrados pero nunca iniciaron un programa
              </p>
            </div>
          </div>
          {onNavigateToRisk && (
            <Button size="sm" variant="outline" onClick={onNavigateToRisk}
              className="shrink-0 h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100">
              Ver →
            </Button>
          )}
        </div>
      )}

      {/* ── Row: Salud de Programas + Funnel ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Widget 3: Salud de Programas */}
        <Card className="rounded-2xl border-slate-100 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-summer-teal" />
              Salud de Programas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {allJourneys.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Sin journeys activos</p>
            ) : (
              <div className="space-y-4">
                {allJourneys.slice(0, 5).map((journey) => {
                  const pct = Math.round(journey.completion_rate * 100);
                  const event = tracking?.events.find((e) =>
                    e.journeys.some((j) => j.id === journey.id),
                  );
                  return (
                    <div key={journey.id} className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate leading-tight">
                            {journey.title}
                          </p>
                          {event && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline"
                                className={cn('text-[9px] px-1 py-0 border leading-none',
                                  eventStatusClasses(event.event_status))}>
                                {eventStatusLabel(event.event_status)}
                              </Badge>
                              <span className="text-[10px] text-slate-400 truncate">
                                {event.event_name}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-600 shrink-0">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            pct >= 60 ? 'bg-summer-teal' : pct >= 30 ? 'bg-summer-yellow' : 'bg-slate-300',
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          {journey.completed_enrollments} completaron
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                          {journey.active_enrollments} en progreso
                        </span>
                        {journey.not_started_enrollments > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                            {journey.not_started_enrollments} sin iniciar
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Widget 4: Funnel de inscripciones */}
        <Card className="rounded-2xl border-slate-100 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-summer-lavender" />
              Funnel de Participación
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {totalEnrollments === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Sin inscripciones</p>
            ) : (
              <div className="space-y-3">
                {[
                  {
                    label: 'Sin iniciar',
                    count: notStartedEnrollments,
                    Icon: Clock,
                    barColor: 'bg-slate-300',
                    textColor: 'text-slate-500',
                    bgColor: 'bg-slate-50',
                  },
                  {
                    label: 'En progreso',
                    count: activeEnrollments,
                    Icon: Activity,
                    barColor: 'bg-blue-400',
                    textColor: 'text-blue-600',
                    bgColor: 'bg-blue-50',
                  },
                  {
                    label: 'Completados',
                    count: completedEnrollments,
                    Icon: CheckCircle2,
                    barColor: 'bg-emerald-400',
                    textColor: 'text-emerald-600',
                    bgColor: 'bg-emerald-50',
                  },
                ].map(({ label, count, Icon, barColor, textColor, bgColor }) => {
                  const pct = totalEnrollments > 0 ? Math.round((count / totalEnrollments) * 100) : 0;
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', bgColor)}>
                        <Icon className={cn('h-4 w-4', textColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-600">{label}</span>
                          <span className={cn('text-xs font-bold', textColor)}>{count}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all', barColor)}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 w-8 text-right shrink-0">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Tasa de completación
                  </span>
                  <span className="text-xs font-bold text-emerald-600">{completionRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Total inscripciones</span>
                  <span className="text-xs font-bold text-slate-600">{totalEnrollments}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row: Adopción del Programa + Actividad Reciente ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Widget 5: Adopción del programa */}
        <Card className="rounded-2xl border-slate-100 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-summer-pink" />
              Adopción del Programa
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-3">
              {[
                {
                  label: 'Participan en al menos 1 journey',
                  value: enrolled,
                  total: total,
                  barColor: 'bg-emerald-400',
                  textColor: 'text-emerald-600',
                },
                {
                  label: 'Sin journey asignado',
                  value: notEnrolled,
                  total: total,
                  barColor: 'bg-amber-300',
                  textColor: 'text-amber-600',
                },
                {
                  label: 'Completaron ≥1 journey',
                  value: Math.min(completedEnrollments, enrolled),
                  total: enrolled || 1,
                  barColor: 'bg-blue-400',
                  textColor: 'text-blue-600',
                },
              ].map(({ label, value, total: den, barColor, textColor }) => {
                const pct = den > 0 ? Math.round((value / den) * 100) : 0;
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">{label}</span>
                      <span className={cn('text-xs font-bold tabular-nums', textColor)}>
                        {value} <span className="text-slate-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', barColor)}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}

              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                <div className="text-center py-2 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-lg font-bold text-summer-teal">{completionRate}%</p>
                  <p className="text-[10px] text-slate-400">Tasa de completación</p>
                </div>
                <div className="text-center py-2 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-lg font-bold text-slate-700">{allJourneys.length}</p>
                  <p className="text-[10px] text-slate-400">Journeys activos</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Widget 6: Actividad Reciente */}
        <Card className="rounded-2xl border-slate-100 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Flame className="h-4 w-4 text-summer-pink" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {recentlyActive.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Sin actividad registrada</p>
            ) : (
              <div className="space-y-2.5">
                {recentlyActive.map((c) => {
                  const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email;
                  return (
                    <div key={c.user_id} className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={c.avatar_url || undefined} />
                        <AvatarFallback className="bg-slate-100 text-slate-600 text-[10px] font-bold">
                          {getInitials(name, c.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{name}</p>
                        <p className="text-[10px] text-slate-400">
                          {formatRelativeTime(c.last_seen_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
