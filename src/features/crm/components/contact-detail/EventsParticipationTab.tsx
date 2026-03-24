'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { crmService } from '@/services/crm.service';
import { organizationService } from '@/services/organization.service';
import { eventService } from '@/services/event.service';
import {
  ApiContactEventParticipation,
  ApiEventStatus,
  ApiOrganization,
  ApiEvent,
} from '@/types/api.types';

interface GroupedEvent {
  attendance: ApiContactEventParticipation;
  enrollments: Array<{ id: string; status: string; journey_id: string }>;
}
import { EVENT_STATUS_CONFIG } from '@/lib/constants/crm-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Loader2, Plus, Trash2, X } from 'lucide-react';

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  registered: 'Registrado',
  attended: 'Asistio',
  no_show: 'No asistio',
  cancelled: 'Cancelado',
};

const MODALITY_LABELS: Record<string, string> = {
  presencial: 'Presencial',
  online: 'Online',
  hibrido: 'Hibrido',
};

const MODALITY_OPTIONS = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'online', label: 'Online' },
  { value: 'hibrido', label: 'Hibrido' },
];

const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  completed: 'Completado',
  dropped: 'Abandonado',
};

interface Props {
  userId: string;
  isSuperAdmin?: boolean;
}

export function EventsParticipationTab({ userId, isSuperAdmin }: Props) {
  const [events, setEvents] = useState<ApiContactEventParticipation[]>([]);
  const [loading, setLoading] = useState(true);

  // Assignment form state
  const [showForm, setShowForm] = useState(false);
  const [orgs, setOrgs] = useState<ApiOrganization[]>([]);
  const [orgEvents, setOrgEvents] = useState<ApiEvent[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedModality, setSelectedModality] = useState('presencial');
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(() => {
    setLoading(true);
    crmService.getContactEvents(userId)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Group raw rows by attendance_id (SQL fans out via LEFT JOIN on enrollments)
  const grouped = useMemo<GroupedEvent[]>(() => {
    const map = new Map<string, GroupedEvent>();
    for (const row of events) {
      if (!map.has(row.attendance_id)) {
        map.set(row.attendance_id, { attendance: row, enrollments: [] });
      }
      const entry = map.get(row.attendance_id)!;
      if (row.enrollment_id) {
        entry.enrollments.push({
          id: row.enrollment_id,
          status: row.enrollment_status!,
          journey_id: row.journey_id!,
        });
      }
    }
    return Array.from(map.values());
  }, [events]);

  // Load orgs when form opens
  const handleShowForm = async () => {
    setShowForm(true);
    setError(null);
    try {
      const allOrgs = await organizationService.listMyOrganizations();
      setOrgs(allOrgs);
    } catch {
      setOrgs([]);
    }
  };

  // Load events when org changes
  useEffect(() => {
    if (!selectedOrgId) {
      setOrgEvents([]);
      setSelectedEventId('');
      return;
    }
    setLoadingEvents(true);
    setSelectedEventId('');
    eventService.listOrgEvents(selectedOrgId)
      .then((allEvents) => {
        // Exclude events the contact is already assigned to
        const existingEventIds = new Set(events.map((e) => e.event_id));
        setOrgEvents(allEvents.filter((ev) => !existingEventIds.has(ev.id)));
      })
      .catch(() => setOrgEvents([]))
      .finally(() => setLoadingEvents(false));
  }, [selectedOrgId, events]);

  const handleSubmit = async () => {
    if (!selectedEventId) return;
    setSubmitting(true);
    setError(null);
    try {
      await crmService.assignContactEvent(userId, {
        event_id: selectedEventId,
        modality: selectedModality,
      });
      // Reset form and refresh
      setShowForm(false);
      setSelectedOrgId('');
      setSelectedEventId('');
      setSelectedModality('presencial');
      fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar evento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (attendanceId: string) => {
    setRemovingId(attendanceId);
    setError(null);
    try {
      await crmService.removeContactEvent(userId, attendanceId);
      fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar asistencia');
    } finally {
      setRemovingId(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedOrgId('');
    setSelectedEventId('');
    setSelectedModality('presencial');
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </p>
      )}

      {grouped.length === 0 && !showForm && (
        <div className="text-center py-12 text-slate-500 text-sm">
          <Calendar className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          Este contacto aun no ha participado en ningun evento
        </div>
      )}

      {grouped.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/60">
                <TableHead>Evento</TableHead>
                <TableHead>Organizacion</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado evento</TableHead>
                <TableHead>Asistencia</TableHead>
                <TableHead>Modalidad</TableHead>
                <TableHead>Journeys</TableHead>
                {isSuperAdmin && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.map(({ attendance: e, enrollments }) => {
                const statusCfg = EVENT_STATUS_CONFIG[e.event_status as ApiEventStatus];
                return (
                  <TableRow key={e.attendance_id}>
                    <TableCell className="font-medium">{e.event_name}</TableCell>
                    <TableCell className="text-slate-600 text-sm">{e.org_name}</TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {e.event_start_date
                        ? new Date(e.event_start_date).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '\u2014'}
                    </TableCell>
                    <TableCell>
                      {statusCfg ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.badgeColor}`}>
                          {statusCfg.label}
                        </span>
                      ) : (
                        <Badge variant="outline">{e.event_status}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {ATTENDANCE_STATUS_LABELS[e.attendance_status] || e.attendance_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {e.modality ? (MODALITY_LABELS[e.modality] || e.modality) : '\u2014'}
                    </TableCell>
                    <TableCell>
                      {enrollments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {enrollments.map((enr) => (
                            <Badge key={enr.id} variant="outline" className="text-xs">
                              {ENROLLMENT_STATUS_LABELS[enr.status] || enr.status}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">{'\u2014'}</span>
                      )}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-red-600"
                          disabled={removingId === e.attendance_id}
                          onClick={() => handleRemove(e.attendance_id)}
                        >
                          {removingId === e.attendance_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Assignment form (SuperAdmin only) */}
      {isSuperAdmin && showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-700">Asignar evento</h4>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Org select */}
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Organizacion</label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar org..." />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Event select */}
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Evento</label>
              <Select
                value={selectedEventId}
                onValueChange={setSelectedEventId}
                disabled={!selectedOrgId || loadingEvents}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingEvents ? 'Cargando...' : 'Seleccionar evento...'} />
                </SelectTrigger>
                <SelectContent>
                  {orgEvents.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>
                  ))}
                  {orgEvents.length === 0 && !loadingEvents && selectedOrgId && (
                    <div className="px-2 py-1.5 text-xs text-slate-400">Sin eventos disponibles</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Modality select */}
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Modalidad</label>
              <Select value={selectedModality} onValueChange={setSelectedModality}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODALITY_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!selectedEventId || submitting}
              onClick={handleSubmit}
              className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Agregar
            </Button>
          </div>
        </div>
      )}

      {isSuperAdmin && !showForm && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleShowForm}
        >
          <Plus className="h-4 w-4" />
          Agregar a evento
        </Button>
      )}
    </div>
  );
}
