'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { organizationService } from '@/services/organization.service';
import { crmService } from '@/services/crm.service';
import {
  ApiOrganization,
  ApiCrmOrgProfile,
  ApiFieldOption,
  ApiMemberResponse,
  ApiMemberRole,
  ApiMembershipStatus,
  ApiBulkMemberResultItem,
} from '@/types/api.types';
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
} from 'lucide-react';
import { toast } from 'sonner';

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
            <button onClick={save} disabled={saving} className="text-teal-600 hover:text-teal-700 disabled:opacity-50">
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
            <button onClick={save} disabled={saving} className="text-teal-600 hover:text-teal-700 disabled:opacity-50">
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

  const [error, setError] = useState<string | null>(null);

  // Load CRM profile + members when org changes
  useEffect(() => {
    if (!org) {
      setCrmProfile(null);
      setMembers([]);
      return;
    }
    setProfileLoading(true);
    crmService.getOrgProfile(org.id)
      .then(setCrmProfile)
      .catch(() => setCrmProfile(null))
      .finally(() => setProfileLoading(false));
  }, [org]);

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

          {/* Header — mismo gradiente que ContactDetailSheet */}
          <div className="shrink-0 bg-gradient-to-r from-sky-50 via-purple-50 to-amber-50 border-b border-purple-100/50">
            <div className="flex items-center gap-4 px-6 pt-5 pb-4">
              {/* Logo / Avatar */}
              {org.logo_url ? (
                <img
                  src={org.logo_url}
                  alt={org.name}
                  className="h-14 w-14 shrink-0 rounded-xl object-cover ring-2 ring-white shadow-sm"
                />
              ) : (
                <div className="h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center ring-2 ring-white shadow-sm">
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
                <Badge variant="outline" className="border-teal-200 text-teal-700 bg-teal-50">
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
              if (v === 'miembros' && members.length === 0) loadMembers(org.id);
            }}
          >
            <TabsList className="mx-6 mt-3 shrink-0 bg-white border border-slate-200 shadow-sm p-1 rounded-xl h-auto w-fit">
              <TabsTrigger
                value="perfil"
                className="rounded-lg gap-1.5 px-3 py-1.5 text-sm
                  data-[state=active]:bg-gradient-to-r data-[state=active]:from-fuchsia-600 data-[state=active]:to-purple-600
                  data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-medium
                  text-slate-500 hover:text-slate-700"
              >
                <Building2 className="h-3.5 w-3.5" />
                Perfil
              </TabsTrigger>
              <TabsTrigger
                value="miembros"
                className="rounded-lg gap-1.5 px-3 py-1.5 text-sm
                  data-[state=active]:bg-gradient-to-r data-[state=active]:from-fuchsia-600 data-[state=active]:to-purple-600
                  data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-medium
                  text-slate-500 hover:text-slate-700"
              >
                <Users className="h-3.5 w-3.5" />
                Miembros {members.length > 0 && `(${members.length})`}
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
                      ) : members.length === 0 ? (
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
                                <TableHead className="text-right">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {members.map((member) => (
                                <TableRow key={member.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-fuchsia-400 to-purple-500 flex items-center justify-center shrink-0">
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
                                            <Shield className="h-3.5 w-3.5 text-teal-600" />
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
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                </div>
              </ScrollArea>
            </div>
          </Tabs>
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
            <Button onClick={handleAddMember} disabled={adding || !addEmail} className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white">
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
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail} className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white">
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
                <Button onClick={() => setBulkOpen(false)} className="bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white">Cerrar</Button>
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
                <Button onClick={handleBulkAdd} disabled={bulkLoading || !bulkEmails.trim()} className="bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white">
                  {bulkLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                  Agregar todos
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
