'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { adminService } from '@/services/admin.service';
import { organizationService } from '@/services/organization.service';
import {
  ApiOrgTrackingResponse,
  ApiEventTrackingRead,
  ApiOrganization,
} from '@/types/api.types';
import {
  eventStatusLabel,
  eventStatusClasses,
  categoryBadgeClasses,
  formatDateRange,
} from '@/lib/journey-tracking-helpers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity, Building2, Calendar, Loader2, MapPin, ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MiniProgress } from '@/components/MiniProgress';

export default function JourneyTrackingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [data, setData] = useState<ApiOrgTrackingResponse | null>(null);
  const [organizations, setOrganizations] = useState<ApiOrganization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'SuperAdmin';
  const orgId = isSuperAdmin ? selectedOrgId : user?.organizationId ?? null;

  // Load organizations for SuperAdmin
  useEffect(() => {
    const loadOrgs = async () => {
      if (!isSuperAdmin) {
        setIsLoadingOrgs(false);
        return;
      }
      try {
        const orgs = await organizationService.listMyOrganizations();
        const sorted = [...orgs].sort((a, b) => {
          if (a.slug === 'fundacion-summer') return -1;
          if (b.slug === 'fundacion-summer') return 1;
          return 0;
        });
        setOrganizations(sorted);
      } catch (err) {
        console.error('Error loading organizations:', err);
      } finally {
        setIsLoadingOrgs(false);
      }
    };
    loadOrgs();
  }, [isSuperAdmin]);

  // Load tracking data when org changes
  useEffect(() => {
    if (!orgId) {
      setData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    adminService
      .listOrgTracking(orgId)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar seguimiento'))
      .finally(() => setIsLoading(false));
  }, [orgId]);

  if (!user || (user.role !== 'SuperAdmin' && user.role !== 'Admin')) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-red-600">Acceso denegado</h1>
        <p className="text-slate-500">No tienes permisos para acceder a esta página.</p>
      </div>
    );
  }

  // ── Derived totals across all events ──────────────────
  const totalEvents = data?.events.length ?? 0;
  const totalJourneyAssignments = data?.events.reduce((s, e) => s + e.journeys.length, 0) ?? 0;
  const totalEnrollments = data?.events.reduce(
    (s, e) => s + e.journeys.reduce((js, j) => js + j.total_enrollments, 0),
    0,
  ) ?? 0;
  const totalCompleted = data?.events.reduce(
    (s, e) => s + e.journeys.reduce((js, j) => js + j.completed_enrollments, 0),
    0,
  ) ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-summer-pink via-summer-lavender to-summer-teal" />
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-summer-lavender to-summer-teal
                            flex items-center justify-center shadow-sm shrink-0">
              <Activity size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Seguimiento de Journeys</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Inscripciones y completados por evento de cada organización
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/admin/journeys')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                       bg-white border border-slate-200 text-slate-700
                       hover:border-summer-pink hover:text-summer-pink hover:bg-summer-pink/5
                       transition-colors shrink-0"
          >
            <ArrowLeft size={15} /> Volver a Journeys
          </button>
        </div>
      </div>

      {/* ── SuperAdmin org selector ─────────────────────── */}
      {isSuperAdmin && organizations.length > 0 && (
        <div className="bg-white rounded-2xl border border-summer-lavender shadow-sm p-4
                        flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-summer-lavender/10 border border-summer-lavender
                            flex items-center justify-center shrink-0">
              <Building2 size={15} className="text-summer-lavender" />
            </div>
            <span className="text-sm font-medium text-slate-700">Organización</span>
          </div>
          <Select
            value={selectedOrgId ?? ''}
            onValueChange={(v) => setSelectedOrgId(v || null)}
          >
            <SelectTrigger className="w-full sm:w-[260px] border-summer-lavender focus:ring-summer-lavender text-sm">
              <SelectValue placeholder="Selecciona una organización" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Stats ────────────────────────────────────────── */}
      {data && data.events.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Eventos', value: totalEvents, color: 'fuchsia' },
            { label: 'Journeys asignados', value: totalJourneyAssignments, color: 'lavender' },
            { label: 'Inscripciones', value: totalEnrollments, color: 'amber' },
            { label: 'Completados', value: totalCompleted, color: 'teal' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className={cn(
                'bg-white rounded-2xl border shadow-sm p-4',
                color === 'fuchsia' && 'border-summer-pink',
                color === 'lavender' && 'border-summer-lavender',
                color === 'amber' && 'border-summer-yellow',
                color === 'teal' && 'border-summer-teal',
              )}
            >
              <p className="text-xl font-bold text-slate-800 leading-none">{value}</p>
              <p className="text-xs text-slate-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Loading / error / empty states ───────────────── */}
      {isLoadingOrgs || (isLoading && !data) ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-summer-lavender" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
          {error}
        </div>
      ) : !orgId ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Selecciona una organización para ver el seguimiento.</p>
        </div>
      ) : data && data.events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Esta organización aún no tiene eventos.</p>
        </div>
      ) : data ? (
        <div className="space-y-4">
          {data.events.map((event) => (
            <EventCard key={event.event_id} event={event} onJourneyClick={(id) => router.push(`/admin/journeys/${id}`)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ─── Event card subcomponent ────────────────────────── */
function EventCard({
  event,
  onJourneyClick,
}: {
  event: ApiEventTrackingRead;
  onJourneyClick: (journeyId: string) => void;
}) {
  const dateRange = formatDateRange(event.start_date, event.end_date);
  return (
    <Card className="border-slate-100 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50/60 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <CardTitle className="text-base font-semibold text-slate-800 truncate">
              {event.event_name}
            </CardTitle>
            <Badge
              variant="outline"
              className={cn('text-[10px] font-semibold', eventStatusClasses(event.event_status))}
            >
              {eventStatusLabel(event.event_status)}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {dateRange && (
              <span className="flex items-center gap-1">
                <Calendar size={12} /> {dateRange}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {event.location}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {event.journeys.length === 0 ? (
          <p className="text-xs text-slate-400 italic px-6 py-6 text-center">
            Sin journeys asignados a este evento
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Journey</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-center">Steps</TableHead>
                <TableHead className="text-center">Inscritos</TableHead>
                <TableHead className="text-center pr-6">Completados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {event.journeys.map((j) => {
                const pct = j.total_enrollments > 0
                  ? Math.round(j.completion_rate * 100)
                  : 0;
                return (
                  <TableRow
                    key={j.id}
                    className="cursor-pointer hover:bg-summer-pink/5 transition-colors"
                    onClick={() => onJourneyClick(j.id)}
                  >
                    <TableCell className="pl-6">
                      <p className="font-medium text-slate-800">{j.title}</p>
                      <p className="text-xs text-slate-400">/{j.slug}</p>
                    </TableCell>
                    <TableCell>
                      {j.category ? (
                        <Badge
                          variant="outline"
                          className={cn('text-xs', categoryBadgeClasses(j.category))}
                        >
                          {j.category}
                        </Badge>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm text-slate-600">
                      {j.total_steps}
                    </TableCell>
                    <TableCell className="text-center text-sm text-slate-600">
                      {j.total_enrollments}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm text-slate-600">{j.completed_enrollments}</span>
                        {j.total_enrollments > 0 && <MiniProgress pct={pct} />}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
