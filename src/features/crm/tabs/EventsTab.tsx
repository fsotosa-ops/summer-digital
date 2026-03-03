'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { eventService } from '@/services/event.service';
import { adminService } from '@/services/admin.service';
import {
  ApiEvent,
  ApiEventCreate,
  ApiEventStatus,
  ApiJourneyAdminRead,
} from '@/types/api.types';
import { generateSlug } from '@/lib/utils';
import { EVENT_STATUS_CONFIG } from '@/lib/constants/crm-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Calendar, Plus, Loader2, Trash2, ExternalLink } from 'lucide-react';

const EVENT_STATUSES = (Object.entries(EVENT_STATUS_CONFIG) as [ApiEventStatus, { label: string; badgeColor: string }][]).map(
  ([value, { label, badgeColor }]) => ({ value, label, color: badgeColor }),
);

const defaultForm: ApiEventCreate = {
  name: '',
  slug: '',
  description: '',
  start_date: null,
  end_date: null,
  location: '',
  status: 'upcoming',
  journey_id: null,
  landing_config: {
    title: '',
    welcome_message: '',
    primary_color: '#3B82F6',
    background_color: '#0F172A',
    show_qr: true,
    custom_logo_url: null,
  },
};

interface EventsTabProps {
  orgId: string;
  orgSlug: string;
}

export function EventsTab({ orgId, orgSlug }: EventsTabProps) {

  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [journeys, setJourneys] = useState<ApiJourneyAdminRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<ApiEventCreate>(defaultForm);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [evts, journeyList] = await Promise.all([
        eventService.listOrgEvents(orgId),
        adminService.listJourneys(orgId).catch(() => [] as ApiJourneyAdminRead[]),
      ]);
      setEvents(evts);
      setJourneys(journeyList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({ ...prev, name, slug: generateSlug(name) }));
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.slug || !orgId) return;
    setCreating(true);
    try {
      const payload: ApiEventCreate = {
        ...formData,
        journey_id: formData.journey_id || null,
      };
      const newEvent = await eventService.createEvent(orgId, payload);
      setEvents((prev) => [newEvent, ...prev]);
      setCreateDialogOpen(false);
      setFormData(defaultForm);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear evento');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('¿Eliminar este evento? Esta acción no se puede deshacer.')) return;
    setDeletingId(eventId);
    try {
      await eventService.deleteEvent(orgId, eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar evento');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: ApiEventStatus) => {
    const cfg = EVENT_STATUS_CONFIG[status];
    return cfg ? (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeColor}`}>
        {cfg.label}
      </span>
    ) : (
      <Badge variant="outline">{status}</Badge>
    );
  };

  const getQrUrl = (event: ApiEvent) => {
    return orgSlug ? `/j/${orgSlug}/${event.slug}` : null;
  };

  const journeyMap = useMemo(
    () => new Map(journeys.map((j) => [j.id, j])),
    [journeys],
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-100">
        <div className="text-sm text-slate-500">{events.length} evento(s)</div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Evento</DialogTitle>
              <DialogDescription>
                El slug genera la URL permanente del QR. No lo cambies después de imprimir.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Name + slug */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Taller React 2026"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug *</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                    placeholder="taller-react-2026"
                  />
                  <p className="text-xs text-slate-400">minúsculas, números y guiones</p>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v: ApiEventStatus) =>
                    setFormData((p) => ({ ...p, status: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Journey */}
              <div className="space-y-2">
                <Label>Journey vinculado</Label>
                <Select
                  value={formData.journey_id || 'none'}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, journey_id: v === 'none' ? null : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin journey (solo informativo)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin journey</SelectItem>
                    {journeys.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">
                  Al escanear el QR, el usuario se inscribirá en este journey.
                </p>
              </div>

              {/* Dates + Location */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha inicio</Label>
                  <Input
                    type="datetime-local"
                    value={formData.start_date?.slice(0, 16) || ''}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, start_date: e.target.value || null }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha fin</Label>
                  <Input
                    type="datetime-local"
                    value={formData.end_date?.slice(0, 16) || ''}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, end_date: e.target.value || null }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lugar</Label>
                <Input
                  value={formData.location || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                  placeholder="Ciudad de México, CDMX"
                />
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Descripción del evento..."
                  rows={2}
                />
              </div>

              {/* Landing config */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium text-slate-700">Configuración de proyección</p>

                <div className="space-y-2">
                  <Label>Título proyectado</Label>
                  <Input
                    value={formData.landing_config?.title || ''}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        landing_config: { ...p.landing_config, title: e.target.value },
                      }))
                    }
                    placeholder="¡Bienvenidos al Taller!"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mensaje de bienvenida</Label>
                  <Input
                    value={formData.landing_config?.welcome_message || ''}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        landing_config: { ...p.landing_config, welcome_message: e.target.value },
                      }))
                    }
                    placeholder="Escanea el QR para unirte"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Color primario</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={formData.landing_config?.primary_color || '#3B82F6'}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            landing_config: { ...p.landing_config, primary_color: e.target.value },
                          }))
                        }
                        className="h-8 w-12 rounded cursor-pointer border border-slate-200"
                      />
                      <span className="text-xs text-slate-500">
                        {formData.landing_config?.primary_color}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Color de fondo</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={formData.landing_config?.background_color || '#0F172A'}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            landing_config: {
                              ...p.landing_config,
                              background_color: e.target.value,
                            },
                          }))
                        }
                        className="h-8 w-12 rounded cursor-pointer border border-slate-200"
                      />
                      <span className="text-xs text-slate-500">
                        {formData.landing_config?.background_color}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !formData.name || !formData.slug}
                className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white shadow-sm disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Evento'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No hay eventos</h3>
            <p className="text-slate-500 mb-4">Crea tu primer evento para generar un QR permanente</p>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Evento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead>Nombre</TableHead>
                <TableHead>Slug / QR</TableHead>
                <TableHead>Fecha inicio</TableHead>
                <TableHead>Lugar</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Journey</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const qrUrl = getQrUrl(event);
                const journey = event.journey_id ? journeyMap.get(event.journey_id) : undefined;
                return (
                  <TableRow key={event.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-medium">{event.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="text-xs text-slate-500 bg-slate-50 px-1 py-0.5 rounded">
                          {event.slug}
                        </code>
                        {qrUrl && (
                          <a
                            href={qrUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-fuchsia-500 hover:text-fuchsia-700"
                            title="Abrir landing QR"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {event.start_date
                        ? new Date(event.start_date).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {event.location || '—'}
                    </TableCell>
                    <TableCell>{getStatusBadge(event.status)}</TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {journey ? journey.title : event.journey_id ? '…' : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {qrUrl && (
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={`/present${qrUrl.replace('/j/', '/')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Abrir pantalla de proyección"
                            >
                              <Calendar className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(event.id)}
                          disabled={deletingId === event.id}
                        >
                          {deletingId === event.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
