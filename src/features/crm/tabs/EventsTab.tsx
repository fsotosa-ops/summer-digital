'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { eventService } from '@/services/event.service';
import { adminService } from '@/services/admin.service';
import {
  ApiEvent,
  ApiEventCreate,
  ApiEventStatus,
  ApiEventUpdate,
  ApiJourneyAdminRead,
  ApiLandingConfig,
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
import { Calendar, Globe, Plus, Loader2, Trash2, Pencil, Copy, Check } from 'lucide-react';

const EVENT_STATUSES = (Object.entries(EVENT_STATUS_CONFIG) as [ApiEventStatus, { label: string; badgeColor: string }][]).map(
  ([value, { label, badgeColor }]) => ({ value, label, color: badgeColor }),
);

const GRADIENT_DIRECTIONS = [
  { value: 'to-b',  label: '↓ Abajo' },
  { value: 'to-br', label: '↘ Diagonal' },
  { value: 'to-r',  label: '→ Derecha' },
  { value: 'to-bl', label: '↙ Diagonal inv.' },
];

const COLOR_PRESETS = [
  { name: 'Noche',     primary: '#3B82F6', bg: '#0F172A', bgEnd: null,      text: '#FFFFFF', dir: 'to-b'  },
  { name: 'Océano',    primary: '#06B6D4', bg: '#0E4F6E', bgEnd: '#164E63', text: '#F0FFFE', dir: 'to-br' },
  { name: 'Atardecer', primary: '#F97316', bg: '#7C2D12', bgEnd: '#9333EA', text: '#FFFFFF', dir: 'to-br' },
  { name: 'Mínimo',    primary: '#6366F1', bg: '#F8FAFC', bgEnd: null,      text: '#1E293B', dir: 'to-b'  },
] as const;

const defaultLanding: ApiLandingConfig = {
  title: '',
  welcome_message: '',
  primary_color: '#3B82F6',
  background_color: '#0F172A',
  background_end_color: null,
  gradient_direction: 'to-b',
  background_image_url: null,
  text_color: '#FFFFFF',
  show_qr: true,
  custom_logo_url: null,
};

const defaultForm: ApiEventCreate = {
  name: '',
  slug: '',
  description: '',
  start_date: null,
  end_date: null,
  location: '',
  status: 'upcoming',
  journey_ids: [],
  landing_config: { ...defaultLanding },
  notes: null,
  expected_participants: null,
};

// --- Inline live preview (not exported) ---
function buildBackground(config: ApiLandingConfig): React.CSSProperties {
  if (config.background_image_url) {
    return {
      backgroundImage: `url(${config.background_image_url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  if (config.background_end_color) {
    const dirMap: Record<string, string> = {
      'to-b': 'to bottom',
      'to-br': 'to bottom right',
      'to-r': 'to right',
      'to-bl': 'to bottom left',
    };
    const cssDir = dirMap[config.gradient_direction || 'to-b'] ?? 'to bottom';
    return { background: `linear-gradient(${cssDir}, ${config.background_color}, ${config.background_end_color})` };
  }
  return { backgroundColor: config.background_color };
}

function LandingPreview({
  config,
  eventName,
  expectedParticipants,
}: {
  config: ApiLandingConfig;
  eventName: string;
  expectedParticipants?: number | null;
}) {
  const textColor = config.text_color || '#FFFFFF';
  const primaryColor = config.primary_color || '#3B82F6';

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-slate-500 font-medium">Vista previa</p>
      <div
        className="w-[280px] h-[480px] rounded-xl overflow-hidden flex flex-col relative ring-1 ring-white/20"
        style={buildBackground(config)}
      >
        {/* Logo */}
        {config.custom_logo_url && (
          <div className="absolute top-4 left-0 right-0 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={config.custom_logo_url}
              alt="logo"
              className="h-10 object-contain"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex flex-col items-center justify-center flex-1 px-4 gap-4 pt-8">
          {/* Org name */}
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: primaryColor }}>
            Mi Organización
          </p>

          {/* QR placeholder */}
          <div className="w-20 h-20 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
            <div className="w-14 h-14 grid grid-cols-3 gap-0.5 opacity-60">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={`rounded-[2px] ${[0,2,6,8,4].includes(i) ? 'bg-white' : 'bg-white/30'}`} />
              ))}
            </div>
          </div>
          <p className="text-[9px] text-white/50">Escanea para compartir</p>

          {/* Title */}
          <h2
            className="text-base font-bold text-center leading-tight"
            style={{ color: textColor }}
          >
            {config.title || eventName || 'Título del evento'}
          </h2>

          {/* Welcome message */}
          {config.welcome_message && (
            <p className="text-[11px] text-center opacity-70" style={{ color: textColor }}>
              {config.welcome_message}
            </p>
          )}

          {/* Expected participants */}
          {expectedParticipants && expectedParticipants > 0 && (
            <p className="text-[10px] opacity-50" style={{ color: textColor }}>
              Participantes esperados: {expectedParticipants}
            </p>
          )}

          {/* CTA button preview */}
          <div
            className="mt-2 px-4 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ backgroundColor: primaryColor }}
          >
            Unirme al evento
          </div>
        </div>
      </div>
    </div>
  );
}

interface EventsTabProps {
  orgId: string;
  orgSlug: string;
}

export function EventsTab({ orgId, orgSlug }: EventsTabProps) {

  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [journeys, setJourneys] = useState<ApiJourneyAdminRead[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ApiEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ApiEventCreate>(defaultForm);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    setFormData(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (event: ApiEvent) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      slug: event.slug,
      description: event.description ?? '',
      start_date: event.start_date ?? null,
      end_date: event.end_date ?? null,
      location: event.location ?? '',
      status: event.status,
      journey_ids: event.journey_ids ?? [],
      landing_config: {
        ...defaultLanding,
        ...event.landing_config,
      },
      notes: event.notes ?? null,
      expected_participants: event.expected_participants ?? null,
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

  const setLanding = (patch: Partial<ApiLandingConfig>) =>
    setFormData((p) => ({ ...p, landing_config: { ...p.landing_config, ...patch } as ApiLandingConfig }));

  const applyPreset = (preset: typeof COLOR_PRESETS[number]) => {
    setLanding({
      primary_color: preset.primary,
      background_color: preset.bg,
      background_end_color: preset.bgEnd,
      text_color: preset.text,
      gradient_direction: preset.dir,
    });
  };

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
          journey_ids: formData.journey_ids ?? [],
          landing_config: formData.landing_config,
          notes: formData.notes || null,
          expected_participants: formData.expected_participants || null,
        };
        const updated = await eventService.updateEvent(orgId, editingEvent.id, updatePayload);
        setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        toast.success('Evento actualizado');
      } else {
        const newEvent = await eventService.createEvent(orgId, formData);
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
    const qrPath = `/events/${orgSlug}/${event.slug}`;
    const fullUrl = `${window.location.origin}${qrPath}`;
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

  const getQrUrl = (event: ApiEvent) => {
    return orgSlug ? `/events/${orgSlug}/${event.slug}` : null;
  };

  const journeyMap = useMemo(
    () => new Map(journeys.map((j) => [j.id, j])),
    [journeys],
  );

  const journeyOptions: MultiSelectOption[] = useMemo(
    () => journeys.map((j) => ({ value: j.id, label: j.title })),
    [journeys],
  );

  const gradientEnabled = !!(formData.landing_config?.background_end_color);

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

      {/* Create / Edit dialog with 2 tabs + live preview */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) { setEditingEvent(null); setFormData(defaultForm); }
        setDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Editar Evento' : 'Crear Evento'}</DialogTitle>
            <DialogDescription>
              {editingEvent
                ? 'Actualiza los datos del evento. El slug no se puede cambiar (es la URL del QR).'
                : 'El slug genera la URL permanente del QR. No lo cambies después de imprimir.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid lg:grid-cols-[1fr_280px] gap-6">
            {/* Left: tabbed form */}
            <Tabs defaultValue="evento" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="evento">📋 Configuración</TabsTrigger>
                <TabsTrigger value="landing">🎨 Landing</TabsTrigger>
              </TabsList>

              {/* Tab: Evento */}
              <TabsContent value="evento" className="space-y-4 mt-0">
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

                {/* Journeys (multi-select) */}
                <div className="space-y-2">
                  <Label>Journeys vinculados</Label>
                  <MultiSelect
                    options={journeyOptions}
                    selected={formData.journey_ids ?? []}
                    onChange={(ids) => setFormData((p) => ({ ...p, journey_ids: ids }))}
                    placeholder="Sin journey (solo informativo)"
                  />
                  <p className="text-xs text-slate-400">
                    Al escanear el QR, el usuario elegirá un journey para inscribirse.
                  </p>
                </div>

                {/* Dates + Location */}
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

                {/* Planning fields */}
                <div className="space-y-2">
                  <Label>Notas internas</Label>
                  <Textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value || null }))}
                    placeholder="Notas de planning, logística, etc. (no se muestran en la landing)"
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
              </TabsContent>

              {/* Tab: Landing */}
              <TabsContent value="landing" className="space-y-4 mt-0">
                {/* Color presets */}
                <div className="space-y-2">
                  <Label>Presets de color</Label>
                  <div className="flex gap-2">
                    {COLOR_PRESETS.map((preset) => {
                      const presetStyle = preset.bgEnd
                        ? { background: `linear-gradient(to bottom right, ${preset.bg}, ${preset.bgEnd})` }
                        : { backgroundColor: preset.bg };
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          title={preset.name}
                          className="flex-1 h-9 rounded-lg border-2 border-transparent hover:border-fuchsia-400 transition-all text-[10px] font-semibold text-white/80 shadow-sm"
                          style={presetStyle}
                        >
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Título proyectado</Label>
                  <Input
                    value={formData.landing_config?.title || ''}
                    onChange={(e) => setLanding({ title: e.target.value })}
                    placeholder="¡Bienvenidos al Taller!"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mensaje de bienvenida</Label>
                  <Input
                    value={formData.landing_config?.welcome_message || ''}
                    onChange={(e) => setLanding({ welcome_message: e.target.value })}
                    placeholder="Escanea el QR para unirte"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input
                    value={formData.landing_config?.custom_logo_url || ''}
                    onChange={(e) => setLanding({ custom_logo_url: e.target.value || null })}
                    placeholder="https://ejemplo.com/logo.png"
                  />
                </div>

                {/* Colors row 1: primary + text */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Color primario</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={formData.landing_config?.primary_color || '#3B82F6'}
                        onChange={(e) => setLanding({ primary_color: e.target.value })}
                        className="h-8 w-12 rounded cursor-pointer border border-slate-200"
                      />
                      <span className="text-xs text-slate-500">{formData.landing_config?.primary_color}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Color de texto</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={formData.landing_config?.text_color || '#FFFFFF'}
                        onChange={(e) => setLanding({ text_color: e.target.value })}
                        className="h-8 w-12 rounded cursor-pointer border border-slate-200"
                      />
                      <span className="text-xs text-slate-500">{formData.landing_config?.text_color}</span>
                    </div>
                  </div>
                </div>

                {/* Colors row 2: background + gradient toggle */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Color de fondo</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={formData.landing_config?.background_color || '#0F172A'}
                        onChange={(e) => setLanding({ background_color: e.target.value })}
                        className="h-8 w-12 rounded cursor-pointer border border-slate-200"
                      />
                      <span className="text-xs text-slate-500">{formData.landing_config?.background_color}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={gradientEnabled}
                        onChange={(e) => setLanding({ background_end_color: e.target.checked ? '#9333EA' : null })}
                        className="rounded"
                      />
                      Gradiente (color fin)
                    </Label>
                    {gradientEnabled && (
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={formData.landing_config?.background_end_color || '#9333EA'}
                          onChange={(e) => setLanding({ background_end_color: e.target.value })}
                          className="h-8 w-12 rounded cursor-pointer border border-slate-200"
                        />
                        <span className="text-xs text-slate-500">{formData.landing_config?.background_end_color}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Gradient direction (only when gradient enabled) */}
                {gradientEnabled && (
                  <div className="space-y-2">
                    <Label>Dirección del gradiente</Label>
                    <Select
                      value={formData.landing_config?.gradient_direction || 'to-b'}
                      onValueChange={(v) => setLanding({ gradient_direction: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADIENT_DIRECTIONS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Background image URL */}
                <div className="space-y-2">
                  <Label>Imagen de fondo (URL) — reemplaza colores</Label>
                  <Input
                    value={formData.landing_config?.background_image_url || ''}
                    onChange={(e) => setLanding({ background_image_url: e.target.value || null })}
                    placeholder="https://ejemplo.com/fondo.jpg"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Right: live preview (shared across both tabs) */}
            <div className="hidden lg:flex flex-col items-center pt-4">
              <LandingPreview
                config={formData.landing_config as ApiLandingConfig}
                eventName={formData.name}
                expectedParticipants={formData.expected_participants}
              />
            </div>
          </div>

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
            <p className="text-slate-500 mb-4">Crea tu primer evento para generar un QR permanente</p>
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
                <TableHead>URL / QR</TableHead>
                <TableHead>Fecha inicio</TableHead>
                <TableHead>Lugar</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Journeys</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const qrUrl = getQrUrl(event);
                const eventJourneys = (event.journey_ids ?? [])
                  .map((jid) => journeyMap.get(jid))
                  .filter(Boolean);
                const isCopied = copiedId === event.id;
                return (
                  <TableRow key={event.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-medium">{event.name}</TableCell>
                    <TableCell>
                      {qrUrl ? (
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded max-w-[120px] truncate block">
                            {qrUrl}
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
                        {qrUrl && (
                          <Button variant="ghost" size="sm" asChild
                            className="text-slate-500 hover:text-fuchsia-600 hover:bg-fuchsia-50"
                            title="Ver landing de convocatoria">
                            <a href={qrUrl} target="_blank" rel="noopener noreferrer">
                              <Globe className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
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