'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { userService } from '@/services/user.service';
import { crmService } from '@/services/crm.service';
import {
  ApiUser,
  ApiAccountStatus,
  ApiCrmContact,
  ApiFieldOption,
} from '@/types/api.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LocationSelector, getCountryName, getStateName } from './LocationSelector';
import {
  Shield,
  ShieldOff,
  Pencil,
  Trash2,
  Loader2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Briefcase,
  User,
  Save,
  X,
} from 'lucide-react';

const STATUS_OPTIONS: { value: ApiAccountStatus; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'suspended', label: 'Suspendido' },
  { value: 'pending_verification', label: 'Pendiente' },
  { value: 'deleted', label: 'Eliminado' },
];

const STATUS_COLORS: Record<ApiAccountStatus, string> = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  pending_verification: 'bg-yellow-100 text-yellow-800',
  deleted: 'bg-slate-100 text-slate-800',
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  facilitador: 'Facilitador',
  participante: 'Participante',
};

const NONE = '__none__';

function getInitials(user: ApiUser) {
  if (user.full_name) {
    return user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return user.email[0].toUpperCase();
}

interface Props {
  user: ApiUser | null;
  onClose: () => void;
  onUserUpdated: (user: ApiUser) => void;
  onUserDeleted: (userId: string) => void;
}

export function ContactDetailSheet({ user, onClose, onUserUpdated, onUserDeleted }: Props) {
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === 'SuperAdmin';

  // CRM contact data
  const [crmContact, setCrmContact] = useState<ApiCrmContact | null>(null);
  const [crmLoading, setCrmLoading] = useState(false);

  // Field options
  const [fieldOptions, setFieldOptions] = useState<Record<string, ApiFieldOption[]>>({
    gender: [],
    education_level: [],
    occupation: [],
  });

  // Edit user profile dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<ApiAccountStatus>('active');
  const [saving, setSaving] = useState(false);

  // Edit CRM fields - inline editing
  const [editingCrm, setEditingCrm] = useState(false);
  const [crmDraft, setCrmDraft] = useState<Partial<ApiCrmContact>>({});
  const [savingCrm, setSavingCrm] = useState(false);

  // Toggle admin
  const [togglingAdmin, setTogglingAdmin] = useState(false);
  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Load CRM contact + field options when user changes
  useEffect(() => {
    if (!user) {
      setCrmContact(null);
      return;
    }
    setCrmLoading(true);
    Promise.all([
      crmService.getContact(user.id).catch(() => null),
      crmService.listFieldOptions(undefined, false),
    ])
      .then(([contact, options]) => {
        setCrmContact(contact);
        const grouped: Record<string, ApiFieldOption[]> = {
          gender: [],
          education_level: [],
          occupation: [],
        };
        for (const o of options) {
          if (grouped[o.field_name]) grouped[o.field_name].push(o);
        }
        setFieldOptions(grouped);
      })
      .catch(() => {})
      .finally(() => setCrmLoading(false));
  }, [user]);

  if (!user) return null;

  // --- Handlers ---

  const handleOpenEdit = () => {
    setEditName(user.full_name || '');
    setEditStatus(user.status || 'active');
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const updated = await userService.updateUser(user.id, {
        full_name: editName,
        status: editStatus,
      });
      onUserUpdated(updated);
      setEditOpen(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAdmin = async () => {
    setTogglingAdmin(true);
    try {
      const updated = await userService.togglePlatformAdmin(user.id, !user.is_platform_admin);
      onUserUpdated(updated);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar permisos');
    } finally {
      setTogglingAdmin(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await userService.deleteUser(user.id);
      onUserDeleted(user.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  // CRM edit handlers
  const startCrmEdit = () => {
    setCrmDraft({
      phone: crmContact?.phone || '',
      country: crmContact?.country || '',
      state: crmContact?.state || '',
      city: crmContact?.city || '',
      birth_date: crmContact?.birth_date || '',
      gender: crmContact?.gender || '',
      education_level: crmContact?.education_level || '',
      occupation: crmContact?.occupation || '',
    });
    setEditingCrm(true);
  };

  const handleSaveCrm = async () => {
    setSavingCrm(true);
    try {
      const updated = await crmService.updateContact(user.id, crmDraft);
      setCrmContact(updated);
      setEditingCrm(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar perfil CRM');
    } finally {
      setSavingCrm(false);
    }
  };

  const selectOption = (field: string, value: string) => {
    setCrmDraft((prev) => ({ ...prev, [field]: value === NONE ? '' : value }));
  };

  return (
    <>
      <Sheet open={!!user} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-[420px] sm:w-[580px] p-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-5">
              {/* Header */}
              <SheetHeader className="space-y-3">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 shrink-0">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="bg-slate-100 text-slate-600 text-lg">
                      {getInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <SheetTitle className="text-xl text-left truncate">
                      {user.full_name || 'Sin nombre'}
                    </SheetTitle>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={STATUS_COLORS[user.status || 'active']}
                  >
                    {STATUS_OPTIONS.find((s) => s.value === user.status)?.label || 'Activo'}
                  </Badge>
                  {user.is_platform_admin && (
                    <Badge className="bg-purple-100 text-purple-800">
                      <Shield className="h-3 w-3 mr-1" />
                      Platform Admin
                    </Badge>
                  )}
                </div>
              </SheetHeader>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  {error}
                </p>
              )}

              <Separator />

              {/* Tabs: Perfil / Organizaciones */}
              <Tabs defaultValue="profile">
                <TabsList className="w-full">
                  <TabsTrigger value="profile" className="flex-1">
                    <User className="h-4 w-4 mr-1.5" />
                    Perfil CRM
                  </TabsTrigger>
                  <TabsTrigger value="orgs" className="flex-1">
                    <Building2 className="h-4 w-4 mr-1.5" />
                    Organizaciones ({user.organizations.length})
                  </TabsTrigger>
                </TabsList>

                {/* Perfil CRM */}
                <TabsContent value="profile" className="mt-4 space-y-4">
                  {crmLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    </div>
                  ) : editingCrm ? (
                    /* ---- EDIT MODE ---- */
                    <div className="space-y-4">
                      {/* Phone */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Teléfono
                        </Label>
                        <Input
                          value={crmDraft.phone || ''}
                          onChange={(e) =>
                            setCrmDraft((p) => ({ ...p, phone: e.target.value }))
                          }
                          placeholder="+56 9 1234 5678"
                          className="h-9"
                        />
                      </div>

                      {/* Location */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Ubicación
                        </Label>
                        <LocationSelector
                          value={{
                            country: crmDraft.country || '',
                            state: crmDraft.state || '',
                            city: crmDraft.city || '',
                          }}
                          onChange={({ country, state, city }) =>
                            setCrmDraft((p) => ({ ...p, country, state, city }))
                          }
                        />
                      </div>

                      {/* Birth date */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Fecha de nacimiento
                        </Label>
                        <Input
                          type="date"
                          value={crmDraft.birth_date || ''}
                          onChange={(e) =>
                            setCrmDraft((p) => ({ ...p, birth_date: e.target.value }))
                          }
                          className="h-9"
                        />
                      </div>

                      {/* Gender */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Género</Label>
                        <Select
                          value={crmDraft.gender || NONE}
                          onValueChange={(v) => selectOption('gender', v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecciona" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>
                              <span className="text-slate-400">Sin especificar</span>
                            </SelectItem>
                            {fieldOptions.gender.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Education */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500 flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" /> Nivel Educativo
                        </Label>
                        <Select
                          value={crmDraft.education_level || NONE}
                          onValueChange={(v) => selectOption('education_level', v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecciona" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>
                              <span className="text-slate-400">Sin especificar</span>
                            </SelectItem>
                            {fieldOptions.education_level.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Occupation */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500 flex items-center gap-1">
                          <Briefcase className="h-3 w-3" /> Ocupación
                        </Label>
                        <Select
                          value={crmDraft.occupation || NONE}
                          onValueChange={(v) => selectOption('occupation', v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecciona" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>
                              <span className="text-slate-400">Sin especificar</span>
                            </SelectItem>
                            {fieldOptions.occupation.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Save / cancel */}
                      <div className="flex gap-2 pt-1">
                        <Button
                          onClick={handleSaveCrm}
                          disabled={savingCrm}
                          className="flex-1 bg-teal-600 hover:bg-teal-700 h-9"
                        >
                          {savingCrm ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Guardar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingCrm(false)}
                          className="h-9"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ---- VIEW MODE ---- */
                    <div className="space-y-3">
                      <ProfileField
                        icon={<Phone className="h-3.5 w-3.5" />}
                        label="Teléfono"
                        value={crmContact?.phone}
                      />
                      <ProfileField
                        icon={<MapPin className="h-3.5 w-3.5" />}
                        label="Ubicación"
                        value={
                          [
                            crmContact?.city,
                            crmContact?.state
                              ? getStateName(crmContact?.country || '', crmContact.state)
                              : null,
                            crmContact?.country ? getCountryName(crmContact.country) : null,
                          ]
                            .filter(Boolean)
                            .join(', ') || null
                        }
                      />
                      <ProfileField
                        icon={<Calendar className="h-3.5 w-3.5" />}
                        label="Fecha de nacimiento"
                        value={
                          crmContact?.birth_date
                            ? new Date(crmContact.birth_date + 'T00:00:00').toLocaleDateString(
                                'es-CL',
                                { year: 'numeric', month: 'long', day: 'numeric' },
                              )
                            : null
                        }
                      />
                      <ProfileField
                        icon={<User className="h-3.5 w-3.5" />}
                        label="Género"
                        value={
                          crmContact?.gender
                            ? fieldOptions.gender.find((o) => o.value === crmContact.gender)
                                ?.label || crmContact.gender
                            : null
                        }
                      />
                      <ProfileField
                        icon={<GraduationCap className="h-3.5 w-3.5" />}
                        label="Nivel Educativo"
                        value={
                          crmContact?.education_level
                            ? fieldOptions.education_level.find(
                                (o) => o.value === crmContact.education_level,
                              )?.label || crmContact.education_level
                            : null
                        }
                      />
                      <ProfileField
                        icon={<Briefcase className="h-3.5 w-3.5" />}
                        label="Ocupación"
                        value={
                          crmContact?.occupation
                            ? fieldOptions.occupation.find(
                                (o) => o.value === crmContact.occupation,
                              )?.label || crmContact.occupation
                            : null
                        }
                      />

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={startCrmEdit}
                        className="w-full mt-2"
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar Perfil CRM
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Organizaciones */}
                <TabsContent value="orgs" className="mt-4 space-y-2">
                  {user.organizations.length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center py-4">
                      Sin organizaciones
                    </p>
                  ) : (
                    user.organizations.map((org) => (
                      <div
                        key={org.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {org.organization_name || org.organization_slug}
                          </p>
                          <p className="text-xs text-slate-500">{org.organization_slug}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-xs">
                            {ROLE_LABELS[org.role] || org.role}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              org.status === 'active'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-slate-50 text-slate-500'
                            }
                          >
                            {org.status === 'active' ? 'Activo' : org.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>

              <Separator />

              {/* Actions */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Acciones de cuenta
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleOpenEdit}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar cuenta
                  </Button>
                  {isSuperAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleAdmin}
                      disabled={togglingAdmin || user.id === currentUser?.id}
                      className={user.is_platform_admin ? 'border-purple-200 text-purple-700' : ''}
                    >
                      {togglingAdmin ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : user.is_platform_admin ? (
                        <ShieldOff className="h-4 w-4 mr-2" />
                      ) : (
                        <Shield className="h-4 w-4 mr-2" />
                      )}
                      {user.is_platform_admin ? 'Quitar Admin' : 'Hacer Admin'}
                    </Button>
                  )}
                  {isSuperAdmin && user.id !== currentUser?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                <div>
                  <p className="font-medium text-slate-400 uppercase tracking-wider mb-0.5">
                    Creado
                  </p>
                  <p>
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString('es-CL', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-slate-400 uppercase tracking-wider mb-0.5">
                    Actualizado
                  </p>
                  <p>
                    {user.updated_at
                      ? new Date(user.updated_at).toLocaleDateString('es-CL', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Edit user dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => !open && setEditOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar cuenta</DialogTitle>
            <DialogDescription>{user.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre completo</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre del contacto"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select
                value={editStatus}
                onValueChange={(v: ApiAccountStatus) => setEditStatus(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={(open) => !open && setDeleteOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar contacto</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar a{' '}
              <strong>{user.full_name || user.email}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Small helper component for read view
function ProfileField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">{label}</p>
        <p className={`text-sm ${value ? 'text-slate-700' : 'text-slate-300 italic'}`}>
          {value || 'No especificado'}
        </p>
      </div>
    </div>
  );
}