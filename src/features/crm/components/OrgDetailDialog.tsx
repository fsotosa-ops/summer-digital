'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { organizationService } from '@/services/organization.service';
import { crmService } from '@/services/crm.service';
import { adminService } from '@/services/admin.service';
import { eventService } from '@/services/event.service';
import {
  ApiOrganization,
  ApiCrmOrgProfile,
  ApiFieldOption,
  ApiMemberResponse,
  ApiMemberRole,
  ApiMembershipStatus,
  ApiBulkMemberResultItem,
  ApiOrgTrackingResponse,
  ApiEventTrackingRead,
  ApiJourneyTrackingRead,
  ApiJourneyEnrolleeRead,
  ApiEvent,
} from '@/types/api.types';
import { EventsTab } from '@/features/crm/tabs/EventsTab';
import { MiniProgress } from '@/components/MiniProgress';
import {
  eventStatusLabel,
  eventStatusClasses,
  categoryBadgeClasses,
  formatDateRange,
} from '@/lib/journey-tracking-helpers';
import { cn } from '@/lib/utils';
import { ORG_TYPES } from '@/lib/constants/crm-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
import {
  Building2,
  Users,
  Loader2,
  Trash2,
  UserPlus2,
  Upload,
  Mail,
  Shield,
  ShieldOff,
  Globe,
  Phone,
  MapPin,
  Briefcase,
  User,
  Pencil,
  Check,
  X,
  Calendar,
  Route,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Search,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { ExportColumnsDialog } from './ExportColumnsDialog';

const ROLES: { value: ApiMemberRole; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'facilitador', label: 'Facilitador' },
  { value: 'participante', label: 'Participante' },
];

const STATUSES: { value: ApiMembershipStatus; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'invited', label: 'Invitado' },
  { value: 'suspended', label: 'Suspendido' },
  { value: 'inactive', label: 'Inactivo' },
];

const STATUS_COLORS: Record<ApiMembershipStatus, string> = {
  active: 'bg-green-100 text-green-700 border-green-200',
  invited: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  suspended: 'bg-red-100 text-red-700 border-red-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
};

// ── Editable text field (per-field inline editing) ────────────────────────────

interface EditableTextProps {
  icon?: React.ReactNode;
  label: string;
  value: string | null | undefined;
  placeholder?: string;
  onSave: (val: string | null) => Promise<void>;
  type?: 'text' | 'url' | 'tel';
}

function EditableField({ icon, label, value, placeholder, onSave, type = 'text' }: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const start = () => {
    setDraft(value ?? '');
    setEditing(true);
  };
  const cancel = () => setEditing(false);
  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft.trim() === '' ? null : draft.trim());
      setEditing(false);
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="group flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="shrink-0 mt-0.5 text-slate-400 w-4">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              type={type}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
              className="h-7 text-sm py-0 flex-1"
              placeholder={placeholder}
              autoFocus
            />
            <button onClick={save} disabled={saving} className="text-summer-teal hover:text-summer-teal disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button onClick={cancel} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className={`text-sm flex-1 ${value ? 'text-slate-800' : 'text-slate-400 italic'}`}>
              {value || placeholder || '—'}
            </span>
            <button
              onClick={start}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600"
            >
              <Pencil size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── EditableSelect (per-field, same pattern) ─────────────────────────────────

interface EditableSelectProps {
  icon?: React.ReactNode;
  label: string;
  value: string | null | undefined;
  options: { value: string; label: string }[];
  placeholder?: string;
  onSave: (val: string | null) => Promise<void>;
}

function EditableSelect({ icon, label, value, options, placeholder, onSave }: EditableSelectProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const NONE_VAL = '__none__';

  const start = () => {
    setDraft(value ?? NONE_VAL);
    setEditing(true);
  };
  const cancel = () => setEditing(false);
  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft === NONE_VAL ? null : draft);
      setEditing(false);
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const displayLabel = value ? (options.find((o) => o.value === value)?.label ?? value) : null;

  return (
    <div className="group flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="shrink-0 mt-0.5 text-slate-400 w-4">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
        {editing ? (
          <div className="flex items-center gap-2">
            <Select value={draft} onValueChange={setDraft}>
              <SelectTrigger className="h-7 text-sm flex-1">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                <SelectItem value={NONE_VAL}><span className="text-slate-400 italic">{placeholder || 'Sin selección'}</span></SelectItem>
                {options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button onClick={save} disabled={saving} className="text-summer-teal hover:text-summer-teal disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button onClick={cancel} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className={`text-sm flex-1 ${displayLabel ? 'text-slate-800' : 'text-slate-400 italic'}`}>
              {displayLabel || placeholder || '—'}
            </span>
            <button
              onClick={start}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600"
            >
              <Pencil size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main OrgDetailDialog ──────────────────────────────────────────────────────

interface Props {
  org: ApiOrganization | null;
  onClose: () => void;
  onOrgUpdated: (org: ApiOrganization) => void;
}

export function OrgDetailDialog({ org, onClose, onOrgUpdated }: Props) {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SuperAdmin';

  // Field options (global, loaded once)
  const [industryOptions, setIndustryOptions] = useState<ApiFieldOption[]>([]);
  const [companySizeOptions, setCompanySizeOptions] = useState<ApiFieldOption[]>([]);

  useEffect(() => {
    crmService.listFieldOptions('org_industry').then(setIndustryOptions).catch(() => {});
    crmService.listFieldOptions('org_company_size').then(setCompanySizeOptions).catch(() => {});
  }, []);

  // CRM profile
  const [crmProfile, setCrmProfile] = useState<ApiCrmOrgProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Members
  const [members, setMembers] = useState<ApiMemberResponse[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Eventos por miembro: mapa user_id → [{event_id, event_name, attendance_id, status}]
  // Se carga junto con `members` para mostrar la columna "Eventos" inline.
  type MemberEventEntry = {
    event_id: string;
    event_name: string;
    attendance_id: string;
    status: string;
  };
  const [orgEvents, setOrgEvents] = useState<ApiEvent[]>([]);
  const [eventsByMember, setEventsByMember] = useState<Record<string, MemberEventEntry[]>>({});
  const [attendeeProfiles, setAttendeeProfiles] = useState<
    Record<string, { full_name: string | null; email: string | null }>
  >({});
  const [memberEventsLoading, setMemberEventsLoading] = useState(false);
  const [promotingUserId, setPromotingUserId] = useState<string | null>(null);

  // Assign event dialog (desde el row de un miembro sin eventos)
  const [assignEventOpen, setAssignEventOpen] = useState(false);
  const [assignEventMember, setAssignEventMember] = useState<ApiMemberResponse | null>(null);
  const [assignEventId, setAssignEventId] = useState<string>('');
  const [assigningEvent, setAssigningEvent] = useState(false);

  // Member management
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [togglingAdminId, setTogglingAdminId] = useState<string | null>(null);

  // Add member dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<ApiMemberRole>('participante');
  const [adding, setAdding] = useState(false);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ApiMemberRole>('participante');
  const [inviting, setInviting] = useState(false);

  // Bulk dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkRole, setBulkRole] = useState<ApiMemberRole>('participante');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<ApiBulkMemberResultItem[] | null>(null);

  // Events tab lazy-load
  const [eventsLoaded, setEventsLoaded] = useState(false);

  // Journeys tab — usa el endpoint de tracking jerárquico (Org → Evento → Journeys)
  const [tracking, setTracking] = useState<ApiOrgTrackingResponse | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingLoaded, setTrackingLoaded] = useState(false);

  // Drilldown a inscritos: contexto activo del EnrolleesDialog (null = cerrado)
  const [enrolleesCtx, setEnrolleesCtx] = useState<EnrolleesContext | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Reset all org-scoped state on every org change (incluso de orgA → orgB
  // sin pasar por null), luego dispara la carga del perfil CRM.
  useEffect(() => {
    setCrmProfile(null);
    setMembers([]);
    setOrgEvents([]);
    setEventsByMember({});
    setAttendeeProfiles({});
    setEventsLoaded(false);
    setTracking(null);
    setTrackingLoaded(false);
    setEnrolleesCtx(null);
    setError(null);

    if (!org) return;

    setProfileLoading(true);
    crmService.getOrgProfile(org.id)
      .then(setCrmProfile)
      .catch(() => setCrmProfile(null))
      .finally(() => setProfileLoading(false));
  }, [org]);

  const loadTracking = useCallback(async (orgId: string) => {
    setTrackingLoading(true);
    try {
      const data = await adminService.listOrgTracking(orgId);
      setTracking(data);
    } catch {
      // non-critical
    } finally {
      setTrackingLoading(false);
    }
  }, []);

  const loadMembers = useCallback(async (orgId: string) => {
    setMembersLoading(true);
    try {
      const list = await organizationService.listMembers(orgId);
      setMembers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar miembros');
    } finally {
      setMembersLoading(false);
    }
  }, []);

  // Carga eventos de la org + asistencias para construir el mapa user_id → events.
  // Se preloadea on-mount junto con loadMembers cuando cambia el `org`. Las
  // queries de attendances corren en paralelo (Promise.all) para no bloquear.
  const loadMemberEvents = useCallback(async (orgId: string) => {
    setMemberEventsLoading(true);
    try {
      const events = await eventService.listOrgEvents(orgId);
      setOrgEvents(events);
      if (events.length === 0) {
        setEventsByMember({});
        setAttendeeProfiles({});
        return;
      }
      let failedCount = 0;
      const attResults = await Promise.all(
        events.map((ev) =>
          eventService
            .listAttendances(orgId, ev.id)
            .then((rows) => ({ event: ev, rows }))
            .catch((err) => {
              console.error(`listAttendances failed for event ${ev.id}:`, err);
              failedCount += 1;
              return { event: ev, rows: [] as Awaited<ReturnType<typeof eventService.listAttendances>> };
            }),
        ),
      );
      if (failedCount > 0) {
        toast.error(
          `No se pudo cargar la asistencia de ${failedCount} evento${failedCount !== 1 ? 's' : ''}`,
        );
      }
      const map: Record<string, MemberEventEntry[]> = {};
      const profiles: Record<string, { full_name: string | null; email: string | null }> = {};
      for (const { event, rows } of attResults) {
        for (const a of rows) {
          if (!map[a.user_id]) map[a.user_id] = [];
          map[a.user_id].push({
            event_id: event.id,
            event_name: event.name,
            attendance_id: a.id,
            status: a.status,
          });
          // Capture profile for non-member attendees (so they appear in the unified list)
          if (!profiles[a.user_id]) {
            profiles[a.user_id] = {
              full_name: a.user_full_name ?? null,
              email: a.user_email ?? null,
            };
          }
        }
      }
      setEventsByMember(map);
      setAttendeeProfiles(profiles);
    } catch (err) {
      console.error('loadMemberEvents fatal error:', err);
      setEventsByMember({});
      setAttendeeProfiles({});
    } finally {
      setMemberEventsLoading(false);
    }
  }, []);

  // Preload de members + events on-mount (y en cada cambio de org). Antes
  // estaba en `onValueChange` del tab Miembros, pero Radix sólo dispara
  // ese callback al CAMBIAR de tab — no en mount ni al cambiar de org sin
  // cerrar el diálogo. Resultado: al ir de orgA → orgB la columna Eventos
  // quedaba vacía porque nadie volvía a llamar a loadMemberEvents.
  useEffect(() => {
    if (!org) return;
    loadMembers(org.id);
    loadMemberEvents(org.id);
  }, [org, loadMembers, loadMemberEvents]);

  // Asignar un evento a un miembro desde la fila (registra una attendance).
  const handleAssignEvent = async () => {
    if (!org || !assignEventMember || !assignEventId) return;
    setAssigningEvent(true);
    try {
      const att = await eventService.registerAttendance(org.id, assignEventId, {
        user_id: assignEventMember.user_id,
      });
      const ev = orgEvents.find((e) => e.id === assignEventId);
      if (ev) {
        setEventsByMember((prev) => ({
          ...prev,
          [assignEventMember.user_id]: [
            ...(prev[assignEventMember.user_id] || []),
            { event_id: ev.id, event_name: ev.name, attendance_id: att.id, status: att.status },
          ],
        }));
      }
      toast.success(`Asignado a ${ev?.name || 'evento'}`);
      setAssignEventOpen(false);
      setAssignEventMember(null);
      setAssignEventId('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al asignar evento');
    } finally {
      setAssigningEvent(false);
    }
  };

  const openAssignEvent = (member: ApiMemberResponse) => {
    setAssignEventMember(member);
    setAssignEventId('');
    setAssignEventOpen(true);
  };

  // Promueve un asistente no-miembro a miembro de la org (rol participante por defecto).
  const handlePromoteAttendee = async (userId: string, email: string | null) => {
    if (!org || !email) {
      toast.error('No se puede agregar: el asistente no tiene email asociado');
      return;
    }
    setPromotingUserId(userId);
    try {
      const m = await organizationService.addMember(org.id, { email, role: 'participante' });
      setMembers((prev) => [...prev, m]);
      toast.success(`${email} agregado como miembro`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al agregar miembro');
    } finally {
      setPromotingUserId(null);
    }
  };

  // CRM profile field saver (upsert a single field)
  const saveProfileField = async (field: keyof ApiCrmOrgProfile, val: string | null) => {
    if (!org) return;
    const updated = await crmService.updateOrgProfile(org.id, { [field]: val });
    setCrmProfile(updated);
  };

  // Org base info saver (name, description, logo_url)
  const saveOrgField = async (field: keyof ApiOrganization, val: string | null) => {
    if (!org) return;
    const updated = await organizationService.updateOrganization(org.id, { [field]: val } as never);
    onOrgUpdated(updated);
  };

  // Member handlers
  const handleAddMember = async () => {
    if (!org || !addEmail) return;
    setAdding(true);
    try {
      const m = await organizationService.addMember(org.id, { email: addEmail, role: addRole });
      setMembers((prev) => [...prev, m]);
      setAddOpen(false);
      setAddEmail('');
      setAddRole('participante');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar miembro');
    } finally {
      setAdding(false);
    }
  };

  const handleInvite = async () => {
    if (!org || !inviteEmail) return;
    setInviting(true);
    try {
      const m = await organizationService.inviteMember(org.id, { email: inviteEmail, role: inviteRole });
      setMembers((prev) => [...prev, m]);
      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('participante');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al invitar miembro');
    } finally {
      setInviting(false);
    }
  };

  const handleBulkAdd = async () => {
    if (!org || !bulkEmails.trim()) return;
    const emails = bulkEmails.split('\n').map((l) => l.trim()).filter((l) => l.includes('@'));
    if (emails.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await organizationService.bulkAddMembers(org.id, {
        members: emails.map((email) => ({ email, role: bulkRole })),
      });
      setBulkResults(res.results);
      await loadMembers(org.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en carga masiva');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleUpdateRole = async (memberId: string, role: ApiMemberRole) => {
    if (!org) return;
    try {
      const updated = await organizationService.updateMember(org.id, memberId, { role });
      setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar rol');
    }
  };

  const handleUpdateStatus = async (memberId: string, status: ApiMembershipStatus) => {
    if (!org) return;
    try {
      const updated = await organizationService.updateMember(org.id, memberId, { status });
      setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar estado');
    }
  };

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    setTogglingAdminId(userId);
    try {
      await organizationService.setPlatformAdmin(userId, !currentIsAdmin);
      if (org) await loadMembers(org.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar permisos');
    } finally {
      setTogglingAdminId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!org || !confirm('¿Estás seguro de remover este miembro?')) return;
    setRemovingId(memberId);
    try {
      await organizationService.removeMember(org.id, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al remover miembro');
    } finally {
      setRemovingId(null);
    }
  };

  // Lista unificada de "personas" — miembros de la org + asistentes que aún no
  // son miembros. Esto resuelve la inconsistencia con el tab Journeys (cuyo
  // funnel cuenta TODOS los asistentes al evento, sean o no miembros).
  type PersonRow =
    | { kind: 'member'; member: ApiMemberResponse; userId: string }
    | {
        kind: 'attendee';
        userId: string;
        fullName: string | null;
        email: string | null;
      };

  const peopleRows = useMemo<PersonRow[]>(() => {
    const memberIds = new Set(members.map((m) => m.user_id));
    const memberRows: PersonRow[] = members.map((m) => ({
      kind: 'member',
      member: m,
      userId: m.user_id,
    }));
    const attendeeRows: PersonRow[] = [];
    for (const [userId, profile] of Object.entries(attendeeProfiles)) {
      if (memberIds.has(userId)) continue;
      attendeeRows.push({
        kind: 'attendee',
        userId,
        fullName: profile.full_name,
        email: profile.email,
      });
    }
    return [...memberRows, ...attendeeRows];
  }, [members, attendeeProfiles]);

  const nonMemberAttendeeCount = peopleRows.filter((p) => p.kind === 'attendee').length;

  if (!org) return null;

  const orgTypeLabel = ORG_TYPES.find((t) => t.value === org.type)?.label || org.type;

  return (
    <>
      {/* ===== FULL-SCREEN DIALOG (mismo que ContactDetailSheet) ===== */}
      <Dialog open={!!org} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="!max-w-[calc(100vw-3rem)] !w-full !h-[calc(100vh-3rem)] !max-h-[calc(100vh-3rem)] p-0 flex flex-col overflow-hidden"
          showCloseButton={true}
        >
          <DialogTitle className="sr-only">Perfil de {org.name}</DialogTitle>

          {/* ── Drilldown: Enrollees View (reemplaza el contenido del dialog) ── */}
          {enrolleesCtx ? (
            <EnrolleesView
              orgId={org.id}
              context={enrolleesCtx}
              onBack={() => setEnrolleesCtx(null)}
            />
          ) : (
          <>
          {/* Header — mismo gradiente que ContactDetailSheet */}
          <div className="shrink-0 bg-gradient-to-r from-summer-sky/10 via-summer-lavender/10 to-summer-yellow/10 border-b border-summer-lavender/50">
            <div className="flex items-center gap-4 px-6 pt-5 pb-4">
              {/* Logo / Avatar */}
              {org.logo_url ? (
                <img
                  src={org.logo_url}
                  alt={org.name}
                  className="h-14 w-14 shrink-0 rounded-xl object-cover ring-2 ring-white shadow-sm"
                />
              ) : (
                <div className="h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br from-summer-teal to-summer-teal flex items-center justify-center ring-2 ring-white shadow-sm">
                  <Building2 className="h-7 w-7 text-white" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-slate-800 truncate">{org.name}</h2>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                  {org.slug}
                </p>
              </div>

              <div className="flex gap-2 flex-wrap shrink-0">
                <Badge variant="outline" className="border-summer-teal text-summer-teal bg-summer-teal/10">
                  {orgTypeLabel}
                </Badge>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mx-6">
              {error}
            </p>
          )}

          {/* Tabs — mismo estilo que ContactDetailSheet */}
          <Tabs
            defaultValue="perfil"
            className="flex-1 flex flex-col overflow-hidden"
            onValueChange={(v) => {
              if (v === 'eventos' && !eventsLoaded) setEventsLoaded(true);
              if (v === 'journeys' && !trackingLoaded) {
                setTrackingLoaded(true);
                loadTracking(org.id);
              }
            }}
          >
            <TabsList className="mx-6 mt-3 shrink-0 bg-white border border-slate-200 shadow-sm p-1 rounded-xl h-auto w-fit">
              <TabsTrigger
                value="perfil"
                className="rounded-lg gap-1.5 px-3 py-1.5 text-sm
                  data-[state=active]:bg-gradient-to-r data-[state=active]:from-summer-pink data-[state=active]:to-summer-lavender
                  data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-medium
                  text-slate-500 hover:text-slate-700"
              >
                <Building2 className="h-3.5 w-3.5" />
                Perfil
              </TabsTrigger>
              <TabsTrigger
                value="miembros"
                className="rounded-lg gap-1.5 px-3 py-1.5 text-sm
                  data-[state=active]:bg-gradient-to-r data-[state=active]:from-summer-pink data-[state=active]:to-summer-lavender
                  data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-medium
                  text-slate-500 hover:text-slate-700"
              >
                <Users className="h-3.5 w-3.5" />
                Miembros {members.length > 0 && `(${members.length})`}
              </TabsTrigger>
              <TabsTrigger
                value="eventos"
                className="rounded-lg gap-1.5 px-3 py-1.5 text-sm
                  data-[state=active]:bg-gradient-to-r data-[state=active]:from-summer-pink data-[state=active]:to-summer-lavender
                  data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-medium
                  text-slate-500 hover:text-slate-700"
              >
                <Calendar className="h-3.5 w-3.5" />
                Eventos
              </TabsTrigger>
              <TabsTrigger
                value="journeys"
                className="rounded-lg gap-1.5 px-3 py-1.5 text-sm
                  data-[state=active]:bg-gradient-to-r data-[state=active]:from-summer-pink data-[state=active]:to-summer-lavender
                  data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-medium
                  text-slate-500 hover:text-slate-700"
              >
                <Route className="h-3.5 w-3.5" />
                Monitoreo
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="px-6 py-4">

                  {/* ───── Tab: Perfil ───── */}
                  <TabsContent value="perfil" className="mt-0">
                    {profileLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Columna izquierda: Información de la organización */}
                        <div>
                          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                            Información
                          </h3>
                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 px-4">
                            <EditableField
                              icon={<Building2 size={14} />}
                              label="Nombre"
                              value={org.name}
                              placeholder="Nombre de la organización"
                              onSave={(v) => saveOrgField('name', v)}
                            />
                            <EditableField
                              icon={<User size={14} />}
                              label="Descripción"
                              value={org.description}
                              placeholder="Sin descripción"
                              onSave={(v) => saveOrgField('description', v)}
                            />
                            <EditableField
                              icon={<Globe size={14} />}
                              label="Logo URL"
                              value={org.logo_url}
                              placeholder="https://..."
                              type="url"
                              onSave={(v) => saveOrgField('logo_url', v)}
                            />
                          </div>

                          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-6">
                            Contacto
                          </h3>
                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 px-4">
                            <EditableField
                              icon={<Globe size={14} />}
                              label="Website"
                              value={crmProfile?.website}
                              placeholder="https://ejemplo.com"
                              type="url"
                              onSave={(v) => saveProfileField('website', v)}
                            />
                            <EditableField
                              icon={<Phone size={14} />}
                              label="Teléfono"
                              value={crmProfile?.phone}
                              placeholder="+52 55 1234 5678"
                              type="tel"
                              onSave={(v) => saveProfileField('phone', v)}
                            />
                            <EditableField
                              icon={<MapPin size={14} />}
                              label="Dirección"
                              value={crmProfile?.address}
                              placeholder="Calle, Ciudad, País"
                              onSave={(v) => saveProfileField('address', v)}
                            />
                          </div>
                        </div>

                        {/* Columna derecha: Empresa */}
                        <div>
                          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                            Empresa
                          </h3>
                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 px-4">
                            <EditableSelect
                              icon={<Briefcase size={14} />}
                              label="Industria"
                              value={crmProfile?.industry}
                              options={industryOptions.map((o) => ({ value: o.value, label: o.label }))}
                              placeholder="Selecciona industria..."
                              onSave={(v) => saveProfileField('industry', v)}
                            />
                            <EditableSelect
                              icon={<Users size={14} />}
                              label="Tamaño de empresa"
                              value={crmProfile?.company_size}
                              options={companySizeOptions.map((o) => ({ value: o.value, label: o.label }))}
                              placeholder="Selecciona tamaño..."
                              onSave={(v) => saveProfileField('company_size', v)}
                            />
                          </div>

                          {/* Metadata */}
                          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-6">
                            Metadata
                          </h3>
                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Slug</span>
                              <span className="font-mono text-slate-600">{org.slug}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tipo</span>
                              <span className="text-slate-700">{orgTypeLabel}</span>
                            </div>
                            {org.created_at && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Creada</span>
                                <span className="text-slate-600">
                                  {new Date(org.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    )}
                  </TabsContent>

                  {/* ───── Tab: Miembros ───── */}
                  <TabsContent value="miembros" className="mt-0">
                    <div className="space-y-4">
                      {/* Member action buttons */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {members.length} miembro{members.length !== 1 ? 's' : ''}
                          {nonMemberAttendeeCount > 0 && (
                            <span className="text-xs font-normal text-slate-400">
                              · {nonMemberAttendeeCount} asistente{nonMemberAttendeeCount !== 1 ? 's' : ''} sin membresía
                            </span>
                          )}
                        </h3>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                            <UserPlus2 className="h-4 w-4 mr-1" />
                            Agregar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
                            <Upload className="h-4 w-4 mr-1" />
                            Masivo
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
                            <Mail className="h-4 w-4 mr-1" />
                            Invitar
                          </Button>
                        </div>
                      </div>

                      {membersLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                      ) : peopleRows.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-sm">
                          <Users className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                          No hay miembros en esta organización
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50/60">
                                <TableHead>Usuario</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Eventos</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {peopleRows.map((person) => person.kind === 'attendee' ? (
                                <TableRow key={`att-${person.userId}`} className="bg-summer-yellow/5">
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-summer-yellow to-summer-pink/70 flex items-center justify-center shrink-0">
                                        <span className="text-white text-[10px] font-semibold">
                                          {(person.fullName || person.email || '?')
                                            .split(' ')
                                            .slice(0, 2)
                                            .map((n) => n[0])
                                            .join('')
                                            .toUpperCase()}
                                        </span>
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-medium text-sm flex items-center gap-1.5">
                                          <span className="truncate">{person.fullName || 'Sin nombre'}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 truncate">
                                          {person.email || person.userId}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell colSpan={2}>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] bg-summer-yellow/10 border-summer-yellow text-amber-700"
                                    >
                                      No es miembro · sólo asistencia
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {(eventsByMember[person.userId]?.length ?? 0) > 0 && (
                                      <div className="flex flex-wrap gap-1 max-w-[260px]">
                                        {eventsByMember[person.userId].slice(0, 3).map((ev) => (
                                          <Badge
                                            key={ev.attendance_id}
                                            variant="outline"
                                            className="text-[10px] bg-summer-lavender/5 border-summer-lavender/30 text-summer-lavender max-w-[140px] truncate"
                                            title={`${ev.event_name} · ${ev.status}`}
                                          >
                                            <span className="truncate">{ev.event_name}</span>
                                          </Badge>
                                        ))}
                                        {eventsByMember[person.userId].length > 3 && (
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] bg-slate-50 border-slate-200 text-slate-500"
                                          >
                                            +{eventsByMember[person.userId].length - 3}
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-[11px] gap-1 border-dashed border-summer-pink/40 text-summer-pink hover:bg-summer-pink/5 hover:border-summer-pink"
                                      onClick={() => handlePromoteAttendee(person.userId, person.email)}
                                      disabled={!person.email || promotingUserId === person.userId}
                                      title={person.email ? 'Agregar a la organización' : 'Sin email — no se puede agregar'}
                                    >
                                      {promotingUserId === person.userId ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <UserPlus2 className="h-3 w-3" />
                                      )}
                                      Agregar
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ) : (() => { const member = person.member; return (
                                <TableRow key={member.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-summer-pink to-summer-lavender flex items-center justify-center shrink-0">
                                        <span className="text-white text-[10px] font-semibold">
                                          {(member.user?.full_name || member.user?.email || '?')
                                            .split(' ')
                                            .slice(0, 2)
                                            .map((n) => n[0])
                                            .join('')
                                            .toUpperCase()}
                                        </span>
                                      </div>
                                      <div>
                                        <div className="font-medium text-sm">
                                          {member.user?.full_name || 'Sin nombre'}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                          {member.user?.email || member.user_id}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      value={member.role}
                                      onValueChange={(v: ApiMemberRole) => handleUpdateRole(member.id, v)}
                                    >
                                      <SelectTrigger className="w-[130px] h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ROLES.map((r) => (
                                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      value={member.status}
                                      onValueChange={(v: ApiMembershipStatus) => handleUpdateStatus(member.id, v)}
                                    >
                                      <SelectTrigger className="w-[120px] h-8 text-xs">
                                        <SelectValue>
                                          <Badge variant="outline" className={`${STATUS_COLORS[member.status]} text-[10px]`}>
                                            {STATUSES.find((s) => s.value === member.status)?.label || member.status}
                                          </Badge>
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        {STATUSES.map((s) => (
                                          <SelectItem key={s.value} value={s.value}>
                                            <Badge variant="outline" className={`${STATUS_COLORS[s.value]} text-xs`}>
                                              {s.label}
                                            </Badge>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    {memberEventsLoading ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-300" />
                                    ) : (eventsByMember[member.user_id]?.length ?? 0) > 0 ? (
                                      <div className="flex flex-wrap gap-1 max-w-[260px]">
                                        {eventsByMember[member.user_id].slice(0, 3).map((ev) => (
                                          <Badge
                                            key={ev.attendance_id}
                                            variant="outline"
                                            className="text-[10px] bg-summer-lavender/5 border-summer-lavender/30 text-summer-lavender max-w-[140px] truncate"
                                            title={`${ev.event_name} · ${ev.status}`}
                                          >
                                            <span className="truncate">{ev.event_name}</span>
                                          </Badge>
                                        ))}
                                        {eventsByMember[member.user_id].length > 3 && (
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] bg-slate-50 border-slate-200 text-slate-500"
                                          >
                                            +{eventsByMember[member.user_id].length - 3}
                                          </Badge>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 px-1.5 text-[10px] text-slate-400 hover:text-summer-pink"
                                          onClick={() => openAssignEvent(member)}
                                          disabled={orgEvents.length === 0}
                                          title="Asignar otro evento"
                                        >
                                          + evento
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[11px] gap-1 border-dashed text-slate-500 hover:text-summer-pink hover:border-summer-pink"
                                        onClick={() => openAssignEvent(member)}
                                        disabled={orgEvents.length === 0}
                                      >
                                        <Calendar className="h-3 w-3" />
                                        {orgEvents.length === 0 ? 'Sin eventos en la org' : 'Asignar evento'}
                                      </Button>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      {isSuperAdmin && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          title={member.user?.is_platform_admin ? 'Quitar Platform Admin' : 'Hacer Platform Admin'}
                                          onClick={() => handleToggleAdmin(member.user_id, !!member.user?.is_platform_admin)}
                                          disabled={togglingAdminId === member.user_id || member.user_id === user?.id}
                                        >
                                          {togglingAdminId === member.user_id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : member.user?.is_platform_admin ? (
                                            <Shield className="h-3.5 w-3.5 text-summer-teal" />
                                          ) : (
                                            <ShieldOff className="h-3.5 w-3.5 text-slate-400" />
                                          )}
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleRemoveMember(member.id)}
                                        disabled={removingId === member.id}
                                      >
                                        {removingId === member.id ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ); })())}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* ───── Tab: Eventos ───── */}
                  <TabsContent value="eventos" className="mt-0">
                    {eventsLoaded ? (
                      <EventsTab orgId={org.id} orgSlug={org.slug} />
                    ) : (
                      <div className="flex justify-center py-12">
                        <p className="text-sm text-slate-400">Haz clic en la pestaña para cargar eventos</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* ───── Tab: Journeys ───── */}
                  <TabsContent value="journeys" className="mt-0">
                    {trackingLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      </div>
                    ) : !tracking ? (
                      <div className="text-center py-12 text-slate-500 text-sm">
                        <Route className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                        No se pudo cargar el seguimiento
                      </div>
                    ) : (
                      <JourneyTrackingView
                        tracking={tracking}
                        onEnrolleesClick={(journey, eventId, eventName, mode) =>
                          setEnrolleesCtx({ journey, eventId, eventName, mode })
                        }
                      />
                    )}
                  </TabsContent>

                </div>
              </ScrollArea>
            </div>
          </Tabs>
          </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Agregar miembro</DialogTitle>
            <DialogDescription>Agregar usuario a {org.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="usuario@ejemplo.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={addRole} onValueChange={(v: ApiMemberRole) => setAddRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddMember} disabled={adding || !addEmail} className="bg-gradient-to-r from-summer-pink to-summer-lavender hover:from-summer-pink hover:to-summer-lavender text-white">
              {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Invitar miembro</DialogTitle>
            <DialogDescription>Invitar a {org.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="usuario@ejemplo.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={inviteRole} onValueChange={(v: ApiMemberRole) => setInviteRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail} className="bg-gradient-to-r from-summer-pink to-summer-lavender hover:from-summer-pink hover:to-summer-lavender text-white">
              {inviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              <Mail className="h-4 w-4 mr-1" />
              Enviar invitación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Dialog */}
      <Dialog open={bulkOpen} onOpenChange={(o) => { setBulkOpen(o); if (!o) { setBulkResults(null); setBulkEmails(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Carga masiva</DialogTitle>
            <DialogDescription>Agregar múltiples miembros a {org.name}</DialogDescription>
          </DialogHeader>
          {bulkResults ? (
            <div className="space-y-3 py-2">
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">{bulkResults.filter((r) => r.success).length} exitosos</span>
                <span className="text-red-600">{bulkResults.filter((r) => !r.success).length} fallidos</span>
              </div>
              <div className="max-h-52 overflow-y-auto space-y-1">
                {bulkResults.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm px-2 py-1 rounded border">
                    <span className="truncate mr-2">{r.email}</span>
                    <Badge className={r.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {r.success ? 'Agregado' : (r.error || 'Error')}
                    </Badge>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setBulkResults(null); setBulkEmails(''); }}>Cargar más</Button>
                <Button onClick={() => setBulkOpen(false)} className="bg-gradient-to-r from-summer-pink to-summer-lavender text-white">Cerrar</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Emails (uno por línea)</Label>
                <Textarea value={bulkEmails} onChange={(e) => setBulkEmails(e.target.value)} rows={5} placeholder="usuario1@ejemplo.com&#10;usuario2@ejemplo.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Rol común</Label>
                <Select value={bulkRole} onValueChange={(v: ApiMemberRole) => setBulkRole(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancelar</Button>
                <Button onClick={handleBulkAdd} disabled={bulkLoading || !bulkEmails.trim()} className="bg-gradient-to-r from-summer-pink to-summer-lavender text-white">
                  {bulkLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                  Agregar todos
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign event to member */}
      <Dialog
        open={assignEventOpen}
        onOpenChange={(o) => {
          setAssignEventOpen(o);
          if (!o) {
            setAssignEventMember(null);
            setAssignEventId('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar evento</DialogTitle>
            <DialogDescription>
              {assignEventMember
                ? `Selecciona un evento para ${assignEventMember.user?.full_name || assignEventMember.user?.email || 'este miembro'}`
                : 'Selecciona un evento'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {(() => {
              const taken = new Set(
                (assignEventMember && eventsByMember[assignEventMember.user_id]?.map((e) => e.event_id)) || [],
              );
              const available = orgEvents.filter((e) => !taken.has(e.id));
              if (available.length === 0) {
                return (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                    {orgEvents.length === 0
                      ? 'Esta organización no tiene eventos creados.'
                      : 'Este usuario ya está asignado a todos los eventos disponibles.'}
                  </div>
                );
              }
              return (
                <div className="space-y-1.5">
                  <Label>Evento</Label>
                  <Select value={assignEventId} onValueChange={setAssignEventId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un evento" />
                    </SelectTrigger>
                    <SelectContent>
                      {available.map((ev) => (
                        <SelectItem key={ev.id} value={ev.id}>
                          {ev.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignEventOpen(false)} disabled={assigningEvent}>
              Cancelar
            </Button>
            <Button
              onClick={handleAssignEvent}
              disabled={!assignEventId || assigningEvent}
              className="bg-gradient-to-r from-summer-pink to-summer-lavender text-white"
            >
              {assigningEvent ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calendar className="h-4 w-4 mr-1" />}
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── JourneyTrackingView ──────────────────────────────────────────────────────
// Vista del tab Journeys del CRM dialog. Muestra la jerarquía Org → Evento →
// Journeys con stats scoped a los miembros activos de la org. Las tarjetas de
// evento son colapsables (default cerradas) y las celdas Inscritos/Completados
// son botones que abren el EnrolleesDialog con el drilldown a usuarios.

type EnrolleesMode = 'all' | 'not_started' | 'active' | 'completed';

type EnrolleesContext = {
  journey: ApiJourneyTrackingRead;
  eventId: string | null;
  eventName: string | null;
  mode: EnrolleesMode;
};

type OnEnrolleesClick = (
  journey: ApiJourneyTrackingRead,
  eventId: string | null,
  eventName: string | null,
  mode: EnrolleesMode,
) => void;

function JourneyTrackingView({
  tracking,
  onEnrolleesClick,
}: {
  tracking: ApiOrgTrackingResponse;
  onEnrolleesClick: OnEnrolleesClick;
}) {
  const eventsWithJourneys = tracking.events.filter((e) => e.journeys.length > 0);
  const hasContent = eventsWithJourneys.length > 0 || tracking.unassigned_journeys.length > 0;

  const stats: { label: string; value: number; color: 'fuchsia' | 'lavender' | 'amber' | 'teal'; hint?: string }[] = [
    { label: 'Miembros activos', value: tracking.total_members, color: 'fuchsia' },
    {
      label: 'Asistentes con journeys',
      value: tracking.total_unique_enrolled_users,
      color: 'lavender',
      hint: 'Usuarios únicos asistentes a eventos que tienen journeys asignados',
    },
    {
      label: 'Asignaciones potenciales',
      value: tracking.total_enrollments,
      color: 'amber',
      hint: 'Suma de (asistentes × journeys del evento) — la base máxima del funnel',
    },
    { label: 'Eventos con journeys', value: eventsWithJourneys.length, color: 'teal' },
  ];

  return (
    <div className="space-y-4">
      {/* Header de stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {stats.map(({ label, value, color, hint }) => (
          <div
            key={label}
            title={hint}
            className={cn(
              'bg-white rounded-xl border shadow-sm p-3',
              color === 'fuchsia' && 'border-summer-pink',
              color === 'lavender' && 'border-summer-lavender',
              color === 'amber' && 'border-summer-yellow',
              color === 'teal' && 'border-summer-teal',
            )}
          >
            <p className="text-lg font-bold text-slate-800 leading-none">{value}</p>
            <p className="text-[11px] text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {!hasContent ? (
        <div className="text-center py-12 text-slate-500 text-sm bg-white rounded-xl border border-slate-100 shadow-sm">
          <Route className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          Esta organización no tiene journeys asignados
        </div>
      ) : (
        <>
          {eventsWithJourneys.map((event) => (
            <TrackingEventCard
              key={event.event_id}
              event={event}
              onEnrolleesClick={onEnrolleesClick}
            />
          ))}

          {tracking.unassigned_journeys.length > 0 && (
            <UnassignedJourneysCard
              journeys={tracking.unassigned_journeys}
              onEnrolleesClick={onEnrolleesClick}
            />
          )}
        </>
      )}
    </div>
  );
}

// Header colapsable reutilizable: chevron + título + badge opcional + resumen
function CollapsibleHeader({
  open,
  onToggle,
  icon,
  title,
  badge,
  meta,
  summary,
}: {
  open: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
  summary: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="w-full bg-slate-50/60 border-b border-slate-100 px-4 py-3 text-left
                 hover:bg-slate-100/70 transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {open ? (
            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
          )}
          {icon}
          <h4 className="text-sm font-semibold text-slate-800 truncate">{title}</h4>
          {badge}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500 sm:justify-end">
          {meta}
          <span className="text-slate-400 whitespace-nowrap">{summary}</span>
        </div>
      </div>
    </button>
  );
}

function TrackingEventCard({
  event,
  onEnrolleesClick,
}: {
  event: ApiEventTrackingRead;
  onEnrolleesClick: OnEnrolleesClick;
}) {
  const [open, setOpen] = useState(false);
  const dateRange = formatDateRange(event.start_date, event.end_date);
  // Bajo la nueva semántica: total_enrollments = asistentes del evento, idéntico
  // para todos los journeys del mismo evento (por construcción del backend).
  const attendeeCount = event.journeys[0]?.total_enrollments ?? 0;
  const totalCompleted = event.journeys.reduce((s, j) => s + j.completed_enrollments, 0);
  const summary = `${event.journeys.length} journeys · ${attendeeCount} asistentes · ${totalCompleted} completados`;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <CollapsibleHeader
        open={open}
        onToggle={() => setOpen((o) => !o)}
        icon={<Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
        title={event.event_name}
        badge={
          <Badge
            variant="outline"
            className={cn('text-[10px] font-semibold', eventStatusClasses(event.event_status))}
          >
            {eventStatusLabel(event.event_status)}
          </Badge>
        }
        meta={
          <>
            {dateRange && <span>{dateRange}</span>}
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin size={10} /> {event.location}
              </span>
            )}
          </>
        }
        summary={summary}
      />
      {open && (
        <JourneysTable
          journeys={event.journeys}
          eventId={event.event_id}
          eventName={event.event_name}
          onEnrolleesClick={onEnrolleesClick}
        />
      )}
    </div>
  );
}

function UnassignedJourneysCard({
  journeys,
  onEnrolleesClick,
}: {
  journeys: ApiJourneyTrackingRead[];
  onEnrolleesClick: OnEnrolleesClick;
}) {
  const [open, setOpen] = useState(false);
  const totalEnrolled = journeys.reduce((s, j) => s + j.total_enrollments, 0);
  const totalCompleted = journeys.reduce((s, j) => s + j.completed_enrollments, 0);
  const summary = `${journeys.length} journeys · ${totalEnrolled} inscritos · ${totalCompleted} completados`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <CollapsibleHeader
        open={open}
        onToggle={() => setOpen((o) => !o)}
        icon={<AlertCircle className="h-4 w-4 text-slate-400 shrink-0" />}
        title="Sin evento asignado"
        summary={summary}
      />
      {open && (
        <JourneysTable
          journeys={journeys}
          eventId={null}
          eventName={null}
          onEnrolleesClick={onEnrolleesClick}
        />
      )}
    </div>
  );
}

function JourneysTable({
  journeys,
  eventId,
  eventName,
  onEnrolleesClick,
}: {
  journeys: ApiJourneyTrackingRead[];
  eventId: string | null;
  eventName: string | null;
  onEnrolleesClick: OnEnrolleesClick;
}) {
  if (journeys.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic px-4 py-4 text-center">
        Sin journeys
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Journey</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead className="text-center">Steps</TableHead>
          <TableHead className="text-center">Inscritos</TableHead>
          <TableHead className="text-center pr-4">Completados</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {journeys.map((j) => {
          const pct = j.total_enrollments > 0 ? Math.round(j.completion_rate * 100) : 0;
          return (
            <TableRow key={j.id} className="hover:bg-transparent">
              <TableCell className="pl-4">
                <p className="font-medium text-sm text-slate-800">{j.title}</p>
                <p className="text-[11px] text-slate-400">/{j.slug}</p>
              </TableCell>
              <TableCell>
                {j.category ? (
                  <Badge
                    variant="outline"
                    className={cn('text-[11px]', categoryBadgeClasses(j.category))}
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
              <TableCell className="text-center">
                <button
                  type="button"
                  disabled={j.total_enrollments === 0}
                  onClick={() => onEnrolleesClick(j, eventId, eventName, 'all')}
                  className="text-sm font-medium text-summer-lavender hover:text-summer-pink hover:underline
                             disabled:text-slate-400 disabled:no-underline disabled:cursor-default"
                >
                  {j.total_enrollments}
                </button>
                {j.total_enrollments > 0 && (
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                    {j.not_started_enrollments} sin iniciar · {j.active_enrollments} en curso
                  </p>
                )}
              </TableCell>
              <TableCell className="pr-4">
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    disabled={j.completed_enrollments === 0}
                    onClick={() => onEnrolleesClick(j, eventId, eventName, 'completed')}
                    className="text-sm font-medium text-summer-lavender hover:text-summer-pink hover:underline
                               disabled:text-slate-600 disabled:no-underline disabled:cursor-default"
                  >
                    {j.completed_enrollments}
                  </button>
                  {j.total_enrollments > 0 && <MiniProgress pct={pct} />}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ── EnrolleesView (drill-down inline, sin Dialog wrapper) ────────────────────
// Sub-dialog que muestra los asistentes/inscritos de un journey en el contexto
// de un evento (o "sin evento" para los unassigned). Una sola fetch al backend;
// tabs, búsqueda y export CSV operan client-side sobre los datos cargados.
//
// Modelo de buckets (consistente con backend `list_org_tracking`):
//   asistentes (todos)  = base del funnel: filas en crm.event_attendances
//                         con status registered/attended para el evento.
//   inscritos           = asistentes con fila en journeys.enrollments
//                       = en_progreso + completados
//   no_iniciados        = asistentes - inscritos (= sin enrollment row)
//   en_progreso         = enrollment.status='active'
//   completados         = enrollment.status='completed'

function EnrolleesView({
  orgId,
  context,
  onBack,
}: {
  orgId: string;
  context: EnrolleesContext;
  onBack: () => void;
}) {
  const { journey, eventId, eventName, mode } = context;
  type Tab = 'all' | 'not_started' | 'active' | 'completed';
  const [tab, setTab] = useState<Tab>(mode === 'all' ? 'all' : (mode as Tab));
  const [enrollees, setEnrollees] = useState<ApiJourneyEnrolleeRead[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminService
      .listJourneyEnrollees(orgId, journey.id, { eventId: eventId ?? undefined })
      .then((data) => {
        if (!cancelled) setEnrollees(data);
      })
      .catch(() => {
        if (!cancelled) setEnrollees([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, journey.id, eventId]);

  // Conteos por bucket — derivados del set completo (no afectados por search)
  const counts = useMemo(() => {
    const all = enrollees?.length ?? 0;
    const not_started = enrollees?.filter((e) => e.status === 'not_started').length ?? 0;
    const active = enrollees?.filter((e) => e.status === 'active').length ?? 0;
    const completed = enrollees?.filter((e) => e.status === 'completed').length ?? 0;
    return { all, enrolled: active + completed, not_started, active, completed };
  }, [enrollees]);

  // Lista visible: filtro por tab + búsqueda + ordenamiento
  const filtered = useMemo(() => {
    if (!enrollees) return [];
    let base = tab === 'all' ? enrollees : enrollees.filter((e) => e.status === tab);

    const q = search.trim().toLowerCase();
    if (q) {
      base = base.filter(
        (e) =>
          (e.full_name || '').toLowerCase().includes(q) ||
          (e.email || '').toLowerCase().includes(q),
      );
    }

    // Sort: completed > active > not_started; dentro del bucket por progress desc.
    const rank: Record<string, number> = { completed: 0, active: 1, not_started: 2 };
    return [...base].sort((a, b) => {
      const ra = rank[a.status] ?? 3;
      const rb = rank[b.status] ?? 3;
      if (ra !== rb) return ra - rb;
      return (b.progress_percentage || 0) - (a.progress_percentage || 0);
    });
  }, [enrollees, tab, search]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Back + Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-slate-100 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-2 -ml-0.5"
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          Volver a Monitoreo
        </button>
        <h2 className="text-base sm:text-lg font-semibold text-slate-800 truncate">
          {journey.title}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          {eventName ? `Asistentes de ${eventName}` : 'Inscritos (sin evento asignado)'}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 mt-2.5">
          <span className="font-semibold text-slate-700 tabular-nums">{counts.all}</span>
          <span className="text-slate-400">asistentes</span>
          <span className="text-slate-300">·</span>
          <span className="font-semibold text-slate-700 tabular-nums">{counts.enrolled}</span>
          <span className="text-slate-400">inscritos</span>
          <span className="text-slate-300">·</span>
          <span className="font-semibold text-slate-700 tabular-nums">{counts.not_started}</span>
          <span className="text-slate-400">sin enrollment</span>
        </div>
      </div>

        {/* Toolbar: tabs + search + export */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 space-y-3 shrink-0">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="inline-flex h-10 sm:h-11 w-full justify-start gap-1 sm:gap-1.5 bg-slate-100/70 p-1 sm:p-1.5 rounded-lg overflow-x-auto">
              <TabsTrigger
                value="all"
                className="flex-1 h-7 sm:h-8 px-2 sm:px-4 text-[11px] sm:text-xs font-medium rounded-md whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-800"
              >
                Todos
                <span className="ml-1 text-[10px] text-slate-400 tabular-nums">({counts.all})</span>
              </TabsTrigger>
              <TabsTrigger
                value="not_started"
                className="flex-1 h-7 sm:h-8 px-2 sm:px-4 text-[11px] sm:text-xs font-medium rounded-md whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-800"
              >
                <span className="hidden sm:inline">No iniciados</span>
                <span className="sm:hidden">Sin iniciar</span>
                <span className="ml-1 text-[10px] text-slate-400 tabular-nums">({counts.not_started})</span>
              </TabsTrigger>
              <TabsTrigger
                value="active"
                className="flex-1 h-7 sm:h-8 px-2 sm:px-4 text-[11px] sm:text-xs font-medium rounded-md whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-800"
              >
                <span className="hidden sm:inline">En progreso</span>
                <span className="sm:hidden">Activos</span>
                <span className="ml-1 text-[10px] text-slate-400 tabular-nums">({counts.active})</span>
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="flex-1 h-7 sm:h-8 px-2 sm:px-4 text-[11px] sm:text-xs font-medium rounded-md whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-800"
              >
                <span className="hidden sm:inline">Completados</span>
                <span className="sm:hidden">Listos</span>
                <span className="ml-1 text-[10px] text-slate-400 tabular-nums">({counts.completed})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowExportDialog(true)}
              disabled={filtered.length === 0}
              className="h-9 gap-1.5 shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exportar CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
          </div>
        </div>

        {/* Lista de usuarios — cards en móvil, tabla en desktop */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 sm:px-6 py-3 sm:py-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400">
              <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              {search.trim() ? 'Sin resultados para esta búsqueda' : 'No hay usuarios en esta vista'}
            </div>
          ) : (
            <>
              {/* Desktop: tabla */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">
                        Usuario
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">
                        Estado
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wide text-slate-400 font-medium w-[200px]">
                        Progreso
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wide text-slate-400 font-medium text-right whitespace-nowrap">
                        Inicio
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((e) => (
                      <EnrolleeRow key={e.user_id} enrollee={e} />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: card list */}
              <div className="md:hidden space-y-2">
                {filtered.map((e) => (
                  <EnrolleeCard key={e.user_id} enrollee={e} />
                ))}
              </div>
            </>
          )}
          </div>
        </ScrollArea>

      {showExportDialog && (
        <ExportColumnsDialog
          open={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          data={filtered}
          journeySlug={journey.slug}
          statusFilter={tab === 'all' ? 'todos' : tab}
        />
      )}
    </div>
  );
}

function EnrolleeRow({ enrollee }: { enrollee: ApiJourneyEnrolleeRead }) {
  const initial = (enrollee.full_name || enrollee.email || '?').charAt(0).toUpperCase();
  // progress_percentage ya viene en rango 0-100 desde el backend.
  const pct = Math.round(enrollee.progress_percentage || 0);
  const statusBadge =
    enrollee.status === 'completed'
      ? 'bg-green-100 text-green-700 border-green-200'
      : enrollee.status === 'active'
      ? 'bg-summer-lavender/10 text-summer-lavender border-summer-lavender'
      : 'bg-slate-100 text-slate-500 border-slate-200';
  const statusLabel =
    enrollee.status === 'active'
      ? 'En progreso'
      : enrollee.status === 'completed'
      ? 'Completado'
      : 'No iniciado';
  const startedAt = enrollee.started_at
    ? new Date(enrollee.started_at).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  return (
    <TableRow className="hover:bg-slate-50/40 border-slate-100">
      <TableCell className="py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-summer-pink to-summer-lavender
                          text-white flex items-center justify-center text-xs font-semibold shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">
              {enrollee.full_name || '—'}
            </p>
            <p className="text-xs text-slate-400 truncate">{enrollee.email || '—'}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn('text-[10px] whitespace-nowrap', statusBadge)}>
          {statusLabel}
        </Badge>
      </TableCell>
      <TableCell>
        {enrollee.status === 'not_started' ? (
          <span className="text-xs text-slate-300 italic">sin actividad</span>
        ) : (
          <div className="flex items-center gap-2">
            <MiniProgress pct={pct} />
            <span className="text-xs text-slate-500 tabular-nums w-9 text-right shrink-0">
              {pct}%
            </span>
          </div>
        )}
      </TableCell>
      <TableCell className="text-right text-xs text-slate-500 whitespace-nowrap">
        {startedAt}
      </TableCell>
    </TableRow>
  );
}

function EnrolleeCard({ enrollee }: { enrollee: ApiJourneyEnrolleeRead }) {
  const initial = (enrollee.full_name || enrollee.email || '?').charAt(0).toUpperCase();
  const pct = Math.round(enrollee.progress_percentage || 0);
  const statusBadge =
    enrollee.status === 'completed'
      ? 'bg-green-100 text-green-700 border-green-200'
      : enrollee.status === 'active'
      ? 'bg-summer-lavender/10 text-summer-lavender border-summer-lavender'
      : 'bg-slate-100 text-slate-500 border-slate-200';
  const statusLabel =
    enrollee.status === 'active'
      ? 'En progreso'
      : enrollee.status === 'completed'
      ? 'Completado'
      : 'No iniciado';

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white">
      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-summer-pink to-summer-lavender
                      text-white flex items-center justify-center text-xs font-semibold shrink-0">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">
          {enrollee.full_name || '—'}
        </p>
        <p className="text-[11px] text-slate-400 truncate">{enrollee.email || '—'}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant="outline" className={cn('text-[10px]', statusBadge)}>
            {statusLabel}
          </Badge>
          {enrollee.status !== 'not_started' && (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <MiniProgress pct={pct} />
              <span className="text-[11px] text-slate-500 tabular-nums shrink-0">{pct}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}