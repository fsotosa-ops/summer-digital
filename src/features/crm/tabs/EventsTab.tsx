'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { eventService } from '@/services/event.service';
import { adminService } from '@/services/admin.service';
import { crmService } from '@/services/crm.service';
import {
  ApiEvent,
  ApiEventCreate,
  ApiEventCounterpartDetails,
  ApiEventVenueDetails,
  ApiEventDiagnosis,
  ApiEventStatus,
  ApiEventUpdate,
  ApiJourneyAdminRead,
} from '@/types/api.types';
import { generateSlug } from '@/lib/utils';
import { EVENT_STATUS_CONFIG } from '@/lib/constants/crm-data';
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Plus, Loader2, Trash2, Pencil, Copy, Check, LayoutList, MapPin, ClipboardList } from 'lucide-react';
import { Country, State, City } from 'country-state-city';

const EVENT_STATUSES = (Object.entries(EVENT_STATUS_CONFIG) as [ApiEventStatus, { label: string; badgeColor: string }][]).map(
  ([value, { label, badgeColor }]) => ({ value, label, color: badgeColor }),
);

const defaultCounterpart: ApiEventCounterpartDetails = {
  address: null,
  full_entity_name: null,
  entity_logo_url: null,
  counterpart_details: null,
  activity_schedule: null,
  expected_ages: null,
  expected_roles: null,
  activity_modality: null,
  specific_activity: null,
};

const defaultVenue: ApiEventVenueDetails = {
  has_internet: false,
  has_ac: false,
  has_lighting: false,
  has_technical_rider: false,
  notes: null,
};

const defaultDiagnosis: ApiEventDiagnosis = {
  objective: null,
  expectations: null,
  historical_activities: null,
  historical_incidents: null,
  myths_stigmas: null,
  community_leaders: null,
  main_obstacles: null,
};

/** Local form state extends ApiEventCreate with journey_ids for the MultiSelect UI */
type EventFormData = ApiEventCreate & { journey_ids: string[] };

const defaultForm: EventFormData = {
  name: '',
  slug: '',
  description: '',
  start_date: null,
  end_date: null,
  location: '',
  status: 'upcoming',
  journey_ids: [],
  notes: null,
  expected_participants: null,
  counterpart_details: { ...defaultCounterpart },
  venue_details: { ...defaultVenue },
  diagnosis: { ...defaultDiagnosis },
};

interface EventsTabProps {
  orgId: string;
  orgSlug: string;
}

export function EventsTab({ orgId, orgSlug }: EventsTabProps) {

  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [journeys, setJourneys] = useState<ApiJourneyAdminRead[]>([]);
  const [ageOptions, setAgeOptions] = useState<MultiSelectOption[]>([]);
  const [roleOptions, setRoleOptions] = useState<MultiSelectOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ApiEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<EventFormData>(defaultForm);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Location cascading selects state
  const [locCountry, setLocCountry] = useState('CL');
  const [locState, setLocState] = useState('');
  const [locCity, setLocCity] = useState('');
  const [locLocality, setLocLocality] = useState('');

  const composeLocation = (country: string, state: string, city: string, locality: string) => {
    const parts = [
      locality,
      city,
      state ? State.getStatesOfCountry(country).find(s => s.isoCode === state)?.name : '',
      country ? Country.getAllCountries().find(c => c.isoCode === country)?.name : '',
    ].filter(Boolean);
    return parts.join(', ');
  };

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [evts, journeyList, ages, roles] = await Promise.all([
        eventService.listOrgEvents(orgId),
        adminService.listJourneys(orgId).catch(() => [] as ApiJourneyAdminRead[]),
        crmService.listFieldOptions('event_expected_ages'),
        crmService.listFieldOptions('event_expected_roles'),
      ]);
      setEvents(evts);
      setJourneys(journeyList);
      setAgeOptions(ages.filter(o => o.is_active).map(o => ({ value: o.value, label: o.label })));
      setRoleOptions(roles.filter(o => o.is_active).map(o => ({ value: o.value, label: o.label })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingEvent(null);
    setLocCountry('CL');
    setLocState('');
    setLocCity('');
    setLocLocality('');
    setFormData({ ...defaultForm, location: composeLocation('CL', '', '', '') });
    setDialogOpen(true);
  };

  const openEdit = (event: ApiEvent) => {
    setEditingEvent(event);
    setLocCountry('');
    setLocState('');
    setLocCity('');
    setLocLocality('');
    setFormData({
      name: event.name,
      slug: event.slug,
      description: event.description ?? '',
      start_date: event.start_date ?? null,
      end_date: event.end_date ?? null,
      location: event.location ?? '',
      status: event.status,
      journey_ids: event.journey_ids ?? [],
      notes: event.notes ?? null,
      expected_participants: event.expected_participants ?? null,
      counterpart_details: { ...defaultCounterpart, ...event.counterpart_details },
      venue_details: { ...defaultVenue, ...event.venue_details },
      diagnosis: { ...defaultDiagnosis, ...event.diagnosis },
    });
    setDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    if (editingEvent) {
      setFormData((prev) => ({ ...prev, name }));
    } else {
      setFormData((prev) => ({ ...prev, name, slug: generateSlug(name) }));
    }
  };

  const setCounterpart = (patch: Partial<ApiEventCounterpartDetails>) =>
    setFormData((p) => ({ ...p, counterpart_details: { ...p.counterpart_details, ...patch } as ApiEventCounterpartDetails }));

  const setVenue = (patch: Partial<ApiEventVenueDetails>) =>
    setFormData((p) => ({ ...p, venue_details: { ...p.venue_details, ...patch } as ApiEventVenueDetails }));

  const setDiagnosis = (patch: Partial<ApiEventDiagnosis>) =>
    setFormData((p) => ({ ...p, diagnosis: { ...p.diagnosis, ...patch } as ApiEventDiagnosis }));

  const handleSave = async () => {
    if (!formData.name || !formData.slug || !orgId) return;
    setSaving(true);
    try {
      if (editingEvent) {
        const updatePayload: ApiEventUpdate = {
          name: formData.name,
          description: formData.description || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          location: formData.location || null,
          status: formData.status,
          notes: formData.notes || null,
          expected_participants: formData.expected_participants || null,
          counterpart_details: formData.counterpart_details,
          venue_details: formData.venue_details,
          diagnosis: formData.diagnosis,
        };
        const updated = await eventService.updateEvent(orgId, editingEvent.id, updatePayload);

        // Sync journey assignments (diff current vs selected)
        const currentJourneyIds = editingEvent.journey_ids ?? [];
        const selectedJourneyIds = formData.journey_ids ?? [];
        const toAdd = selectedJourneyIds.filter(id => !currentJourneyIds.includes(id));
        const toRemove = currentJourneyIds.filter(id => !selectedJourneyIds.includes(id));
        for (const jId of toAdd) await eventService.addJourneyToEvent(orgId, editingEvent.id, jId);
        for (const jId of toRemove) await eventService.removeJourneyFromEvent(orgId, editingEvent.id, jId);
        updated.journey_ids = selectedJourneyIds;

        setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        toast.success('Evento actualizado');
      } else {
        const { journey_ids: _jids, ...createPayload } = formData;
        const newEvent = await eventService.createEvent(orgId, createPayload);

        // Assign selected journeys to the new event
        for (const jId of formData.journey_ids) {
          await eventService.addJourneyToEvent(orgId, newEvent.id, jId);
        }
        newEvent.journey_ids = formData.journey_ids;

        setEvents((prev) => [newEvent, ...prev]);
        toast.success('Evento creado');
      }
      setDialogOpen(false);
      setFormData(defaultForm);
      setEditingEvent(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Error al ${editingEvent ? 'actualizar' : 'crear'} evento`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('¿Eliminar este evento? Esta acción no se puede deshacer.')) return;
    setDeletingId(eventId);
    try {
      await eventService.deleteEvent(orgId, eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar evento');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyUrl = async (event: ApiEvent) => {
    const fullUrl = `${window.location.origin}/login?join=${encodeURIComponent(event.id)}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopiedId(event.id);
    setTimeout(() => setCopiedId(null), 2000);
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

  const getEventPath = (event: ApiEvent) =>
    orgSlug ? `/events/${orgSlug}/${event.slug}` : null;

  const journeyMap = useMemo(
    () => new Map(journeys.map((j) => [j.id, j])),
    [journeys],
  );

  const journeyOptions: MultiSelectOption[] = useMemo(
    () => journeys.map((j) => ({ value: j.id, label: j.title })),
    [journeys],
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-100">
        <div className="text-sm text-slate-500">{events.length} evento(s)</div>
        <Button
          onClick={openCreate}
          className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Evento
        </Button>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) { setEditingEvent(null); setFormData(defaultForm); }
        setDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Editar Evento' : 'Crear Evento'}</DialogTitle>
            <DialogDescription>
              {editingEvent
                ? 'Actualiza los datos del evento. El slug no se puede cambiar.'
                : 'Completa los datos del evento. El slug genera la URL de seguimiento.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-4 grid grid-cols-3 w-full">
              <TabsTrigger value="general" className="flex items-center gap-1.5 text-xs">
                <LayoutList className="h-3.5 w-3.5" /> General
              </TabsTrigger>
              <TabsTrigger value="lugar" className="flex items-center gap-1.5 text-xs">
                <MapPin className="h-3.5 w-3.5" /> Lugar
              </TabsTrigger>
              <TabsTrigger value="diagnostico" className="flex items-center gap-1.5 text-xs">
                <ClipboardList className="h-3.5 w-3.5" /> Diagnóstico
              </TabsTrigger>
            </TabsList>

            {/* Tab: General */}
            <TabsContent value="general" className="space-y-4 mt-0">
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
                    disabled={!!editingEvent}
                  />
                  <p className="text-xs text-slate-400">
                    {editingEvent ? 'URL permanente (no editable)' : 'minúsculas, números y guiones'}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v: ApiEventStatus) => setFormData((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Journeys */}
              <div className="space-y-2">
                <Label>Journeys vinculados</Label>
                <MultiSelect
                  options={journeyOptions}
                  selected={formData.journey_ids ?? []}
                  onChange={(ids) => setFormData((p) => ({ ...p, journey_ids: ids }))}
                  placeholder="Sin journey"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha inicio</Label>
                  <Input
                    type="datetime-local"
                    value={formData.start_date?.slice(0, 16) || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, start_date: e.target.value || null }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha fin</Label>
                  <Input
                    type="datetime-local"
                    value={formData.end_date?.slice(0, 16) || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, end_date: e.target.value || null }))}
                  />
                </div>
              </div>

              {/* País */}
              <div className="space-y-2">
                <Label>País</Label>
                <Select
                  value={locCountry}
                  onValueChange={(v) => {
                    setLocCountry(v);
                    setLocState('');
                    setLocCity('');
                    setFormData(p => ({ ...p, location: composeLocation(v, '', '', locLocality) }));
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecciona un país" /></SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {Country.getAllCountries().map(c => (
                      <SelectItem key={c.isoCode} value={c.isoCode}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Región + Ciudad */}
              {locCountry && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Región / Provincia</Label>
                    <Select
                      value={locState}
                      onValueChange={(v) => {
                        setLocState(v);
                        setLocCity('');
                        setFormData(p => ({ ...p, location: composeLocation(locCountry, v, '', locLocality) }));
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecciona un estado" /></SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {State.getStatesOfCountry(locCountry).map(s => (
                          <SelectItem key={s.isoCode} value={s.isoCode}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Ciudad / Municipio</Label>
                    <Select
                      value={locCity}
                      disabled={!locState}
                      onValueChange={(v) => {
                        setLocCity(v);
                        setFormData(p => ({ ...p, location: composeLocation(locCountry, locState, v, locLocality) }));
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder={locState ? 'Selecciona una ciudad' : 'Primero selecciona región'} /></SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {City.getCitiesOfState(locCountry, locState).map(c => (
                          <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Localidad */}
              <div className="space-y-2">
                <Label>Localidad</Label>
                <Input
                  value={locLocality}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLocLocality(v);
                    setFormData(p => ({ ...p, location: composeLocation(locCountry, locState, locCity, v) }));
                  }}
                  placeholder="Colonia, barrio, localidad o referencia adicional"
                />
                <p className="text-xs text-slate-400">
                  {formData.location
                    ? `Ubicación: ${formData.location}`
                    : 'Selecciona país, estado y ciudad para componer la ubicación'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Descripción del evento..."
                  rows={2}
                />
                <p className="text-xs text-slate-400">Resumen general del evento (uso público)</p>
              </div>

              <div className="space-y-2">
                <Label>Notas internas</Label>
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value || null }))}
                  placeholder="Notas de planning, logística, etc."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Participantes esperados</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.expected_participants ?? ''}
                  onChange={(e) => setFormData((p) => ({
                    ...p,
                    expected_participants: e.target.value ? parseInt(e.target.value, 10) : null,
                  }))}
                  placeholder="Ej. 50"
                />
              </div>

              <hr className="border-slate-100" />

              <div className="space-y-2">
                <Label>Nombre completo de la entidad</Label>
                <Input
                  value={formData.counterpart_details?.full_entity_name || ''}
                  onChange={(e) => setCounterpart({ full_entity_name: e.target.value || null })}
                  placeholder="Nombre oficial de la organización/escuela/empresa"
                />
              </div>

              <div className="space-y-2">
                <Label>URL del logo de la entidad</Label>
                <Input
                  value={formData.counterpart_details?.entity_logo_url || ''}
                  onChange={(e) => setCounterpart({ entity_logo_url: e.target.value || null })}
                  placeholder="https://ejemplo.com/logo.png"
                />
              </div>

              <div className="space-y-2">
                <Label>Dirección exacta de la sede</Label>
                <Input
                  value={formData.counterpart_details?.address || ''}
                  onChange={(e) => setCounterpart({ address: e.target.value || null })}
                  placeholder="Calle, número, colonia, ciudad"
                />
                <p className="text-xs text-slate-400">Calle, número, colonia y código postal</p>
              </div>

              <div className="space-y-2">
                <Label>Contraparte y persona de respaldo</Label>
                <Textarea
                  value={formData.counterpart_details?.counterpart_details || ''}
                  onChange={(e) => setCounterpart({ counterpart_details: e.target.value || null })}
                  placeholder="Nombre, cargo y contacto de la contraparte y su persona de respaldo"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Edades esperadas</Label>
                  <MultiSelect
                    options={ageOptions}
                    selected={formData.counterpart_details?.expected_ages ?? []}
                    onChange={(vals) => setCounterpart({ expected_ages: vals.length ? vals : null })}
                    placeholder="Selecciona rangos de edad"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Roles esperados</Label>
                  <MultiSelect
                    options={roleOptions}
                    selected={formData.counterpart_details?.expected_roles ?? []}
                    onChange={(vals) => setCounterpart({ expected_roles: vals.length ? vals : null })}
                    placeholder="Selecciona roles"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Actividad específica a realizar</Label>
                <Textarea
                  value={formData.counterpart_details?.specific_activity || ''}
                  onChange={(e) => setCounterpart({ specific_activity: e.target.value || null })}
                  placeholder="Descripción detallada de la actividad"
                  rows={3}
                />
                <p className="text-xs text-slate-400">Descripción detallada de la dinámica (uso interno)</p>
              </div>
            </TabsContent>

            {/* Tab: Lugar */}
            <TabsContent value="lugar" className="space-y-6 mt-0">
              <div className="space-y-2">
                <Label>Modalidad de la actividad</Label>
                <Select
                  value={formData.counterpart_details?.activity_modality || ''}
                  onValueChange={(v) => setCounterpart({ activity_modality: v || null })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecciona la modalidad" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Presencial">Presencial</SelectItem>
                    <SelectItem value="Virtual">Virtual</SelectItem>
                    <SelectItem value="Híbrido">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-500">Condiciones del lugar donde se realizará la actividad</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="has_internet"
                      checked={!!formData.venue_details?.has_internet}
                      onCheckedChange={(checked) => setVenue({ has_internet: !!checked })}
                    />
                    <Label htmlFor="has_internet">Internet disponible</Label>
                  </div>

                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="has_ac"
                      checked={!!formData.venue_details?.has_ac}
                      onCheckedChange={(checked) => setVenue({ has_ac: !!checked })}
                    />
                    <Label htmlFor="has_ac">Aire acondicionado / clima</Label>
                  </div>

                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="has_lighting"
                      checked={!!formData.venue_details?.has_lighting}
                      onCheckedChange={(checked) => setVenue({ has_lighting: !!checked })}
                    />
                    <Label htmlFor="has_lighting">Iluminación adecuada</Label>
                  </div>

                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="has_technical_rider"
                      checked={!!formData.venue_details?.has_technical_rider}
                      onCheckedChange={(checked) => setVenue({ has_technical_rider: !!checked })}
                    />
                    <Label htmlFor="has_technical_rider">Rider técnico (para Mac)</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas adicionales del lugar</Label>
                <Textarea
                  value={formData.venue_details?.notes || ''}
                  onChange={(e) => setVenue({ notes: e.target.value || null })}
                  placeholder="Observaciones sobre el espacio, acceso, restricciones, etc."
                  rows={4}
                />
              </div>
            </TabsContent>

            {/* Tab: Diagnóstico */}
            <TabsContent value="diagnostico" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Objetivo de la actividad</Label>
                <Textarea
                  value={formData.diagnosis?.objective || ''}
                  onChange={(e) => setDiagnosis({ objective: e.target.value || null })}
                  placeholder="¿Qué se quiere lograr con esta actividad?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Expectativas</Label>
                <Textarea
                  value={formData.diagnosis?.expectations || ''}
                  onChange={(e) => setDiagnosis({ expectations: e.target.value || null })}
                  placeholder="¿Qué espera la contraparte de la actividad?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Actividades históricas en la comunidad</Label>
                <Textarea
                  value={formData.diagnosis?.historical_activities || ''}
                  onChange={(e) => setDiagnosis({ historical_activities: e.target.value || null })}
                  placeholder="Actividades previas de salud mental o bienestar realizadas en esta comunidad"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Incidentes históricos relevantes</Label>
                <Textarea
                  value={formData.diagnosis?.historical_incidents || ''}
                  onChange={(e) => setDiagnosis({ historical_incidents: e.target.value || null })}
                  placeholder="Fallecimientos, intentos, casos de acoso, incidentes relacionados a salud mental"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Mitos, estigmas y sensibilidad del público</Label>
                <Textarea
                  value={formData.diagnosis?.myths_stigmas || ''}
                  onChange={(e) => setDiagnosis({ myths_stigmas: e.target.value || null })}
                  placeholder="¿Qué creencias o tabúes existen sobre salud mental en esta comunidad?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Líderes o embajadores en la comunidad</Label>
                <Textarea
                  value={formData.diagnosis?.community_leaders || ''}
                  onChange={(e) => setDiagnosis({ community_leaders: e.target.value || null })}
                  placeholder="¿Hay personas influyentes que apoyen o puedan apoyar estos temas?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Principales obstáculos en la comunidad</Label>
                <Textarea
                  value={formData.diagnosis?.main_obstacles || ''}
                  onChange={(e) => setDiagnosis({ main_obstacles: e.target.value || null })}
                  placeholder="¿Cuáles han sido los mayores obstáculos para lograr los objetivos?"
                  rows={2}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name || !formData.slug}
              className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white shadow-sm disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingEvent ? 'Guardando...' : 'Creando...'}
                </>
              ) : (
                editingEvent ? 'Guardar cambios' : 'Crear Evento'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No hay eventos</h3>
            <p className="text-slate-500 mb-4">Crea tu primer evento para comenzar a gestionar actividades</p>
            <Button
              onClick={openCreate}
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
                <TableHead>URL</TableHead>
                <TableHead>Fecha inicio</TableHead>
                <TableHead>Lugar</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Journeys</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const eventPath = getEventPath(event);
                const eventJourneys = (event.journey_ids ?? [])
                  .map((jid) => journeyMap.get(jid))
                  .filter(Boolean);
                const isCopied = copiedId === event.id;
                return (
                  <TableRow key={event.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-medium">{event.name}</TableCell>
                    <TableCell>
                      {eventPath ? (
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded max-w-[120px] truncate block">
                            {eventPath}
                          </code>
                          <button
                            onClick={() => handleCopyUrl(event)}
                            title="Copiar URL completa"
                            className="text-slate-400 hover:text-fuchsia-600 transition-colors"
                          >
                            {isCopied
                              ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                              : <Copy className="h-3.5 w-3.5" />
                            }
                          </button>
                        </div>
                      ) : '—'}
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
                      {eventJourneys.length > 0
                        ? eventJourneys.map((j) => j!.title).join(', ')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(event)}
                          title="Editar evento"
                          className="text-slate-500 hover:text-fuchsia-600 hover:bg-fuchsia-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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
