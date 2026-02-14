'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { userService } from '@/services/user.service';
import { crmService } from '@/services/crm.service';
import { organizationService } from '@/services/organization.service';
import {
  ApiUser,
  ApiAccountStatus,
  ApiCrmContact,
  ApiFieldOption,
  ApiCrmNote,
  ApiCrmTask,
  ApiCrmTaskStatus,
  ApiCrmTaskPriority,
  ApiOrganization,
  ApiEnrollmentResponse,
  ApiUserPointsSummary,
  ApiMemberRole,
} from '@/types/api.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  StickyNote,
  CheckSquare,
  Plus,
  Clock,
  Trophy,
  Star,
  Activity,
  UserPlus,
  UserMinus,
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

const TASK_STATUS_LABELS: Record<ApiCrmTaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const TASK_STATUS_COLORS: Record<ApiCrmTaskStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-slate-100 text-slate-500',
};

const PRIORITY_LABELS: Record<ApiCrmTaskPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
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

  // Notes & Tasks
  const [notes, setNotes] = useState<ApiCrmNote[]>([]);
  const [tasks, setTasks] = useState<ApiCrmTask[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<ApiCrmTaskPriority>('medium');
  const [savingTask, setSavingTask] = useState(false);

  // Org management
  const [availableOrgs, setAvailableOrgs] = useState<ApiOrganization[]>([]);
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedRole, setSelectedRole] = useState<ApiMemberRole>('participante');
  const [addingOrg, setAddingOrg] = useState(false);
  const [removingOrgId, setRemovingOrgId] = useState<string | null>(null);

  // Activity tab (enrollments + gamification)
  const [enrollments, setEnrollments] = useState<ApiEnrollmentResponse[]>([]);
  const [gamification, setGamification] = useState<ApiUserPointsSummary | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Load CRM contact + field options when user changes
  useEffect(() => {
    if (!user) {
      setCrmContact(null);
      setNotes([]);
      setTasks([]);
      setEnrollments([]);
      setGamification(null);
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

  // Load notes & tasks
  const loadNotesAndTasks = useCallback(async (userId: string) => {
    setNotesLoading(true);
    try {
      const [n, t] = await Promise.all([
        crmService.getContactNotes(userId).catch(() => []),
        crmService.getContactTasks(userId).catch(() => []),
      ]);
      setNotes(n);
      setTasks(t);
    } finally {
      setNotesLoading(false);
    }
  }, []);

  // Load activity (enrollments + gamification)
  const loadActivity = useCallback(async (userId: string) => {
    setActivityLoading(true);
    try {
      const [enr, gam] = await Promise.all([
        crmService.getAdminUserEnrollments(userId).catch(() => []),
        crmService.getAdminUserGamificationSummary(userId).catch(() => null),
      ]);
      setEnrollments(enr);
      setGamification(gam);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  // Load available orgs for org management
  const loadAvailableOrgs = useCallback(async () => {
    try {
      const orgs = await organizationService.listMyOrganizations();
      setAvailableOrgs(orgs);
    } catch {
      // ignore
    }
  }, []);

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
      company: crmContact?.company || '',
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

  // Notes handlers
  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;
    setSavingNote(true);
    try {
      const note = await crmService.createNote(user.id, { content: newNoteContent.trim() });
      setNotes((prev) => [note, ...prev]);
      setNewNoteContent('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear nota');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await crmService.deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar nota');
    }
  };

  // Tasks handlers
  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    setSavingTask(true);
    try {
      const task = await crmService.createTask(user.id, {
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
      });
      setTasks((prev) => [task, ...prev]);
      setNewTaskTitle('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear tarea');
    } finally {
      setSavingTask(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: ApiCrmTaskStatus) => {
    try {
      const updated = await crmService.updateTask(taskId, { status });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar tarea');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await crmService.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar tarea');
    }
  };

  // Org management handlers
  const handleAddToOrg = async () => {
    if (!selectedOrgId || !user) return;
    setAddingOrg(true);
    try {
      await organizationService.addMember(selectedOrgId, {
        email: user.email,
        role: selectedRole,
      });
      // Refresh user data to get updated orgs
      const updatedUser = await userService.getUser(user.id);
      onUserUpdated(updatedUser);
      setShowAddOrg(false);
      setSelectedOrgId('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar a organización');
    } finally {
      setAddingOrg(false);
    }
  };

  const handleRemoveFromOrg = async (orgId: string, membershipId: string) => {
    setRemovingOrgId(membershipId);
    try {
      await organizationService.removeMember(orgId, membershipId);
      const updatedUser = await userService.getUser(user.id);
      onUserUpdated(updatedUser);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al quitar de organización');
    } finally {
      setRemovingOrgId(null);
    }
  };

  // Filter orgs user is NOT already in
  const orgsNotJoined = availableOrgs.filter(
    (org) => !user.organizations.some((m) => m.organization_id === org.id),
  );

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

              {/* Tabs */}
              <Tabs defaultValue="profile">
                <TabsList className="w-full">
                  <TabsTrigger value="profile" className="flex-1">
                    <User className="h-4 w-4 mr-1.5" />
                    Perfil
                  </TabsTrigger>
                  <TabsTrigger value="orgs" className="flex-1" onClick={() => loadAvailableOrgs()}>
                    <Building2 className="h-4 w-4 mr-1.5" />
                    Orgs ({user.organizations.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="notes"
                    className="flex-1"
                    onClick={() => loadNotesAndTasks(user.id)}
                  >
                    <StickyNote className="h-4 w-4 mr-1.5" />
                    Notas
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="flex-1"
                    onClick={() => loadActivity(user.id)}
                  >
                    <Activity className="h-4 w-4 mr-1.5" />
                    Actividad
                  </TabsTrigger>
                </TabsList>

                {/* ===== TAB: Perfil CRM ===== */}
                <TabsContent value="profile" className="mt-4 space-y-4">
                  {crmLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    </div>
                  ) : editingCrm ? (
                    /* ---- EDIT MODE ---- */
                    <div className="space-y-4">
                      {/* Company */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500 flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> Empresa
                        </Label>
                        <Input
                          value={crmDraft.company || ''}
                          onChange={(e) =>
                            setCrmDraft((p) => ({ ...p, company: e.target.value }))
                          }
                          placeholder="Nombre de la empresa"
                          className="h-9"
                        />
                      </div>

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
                        icon={<Building2 className="h-3.5 w-3.5" />}
                        label="Empresa"
                        value={crmContact?.company}
                      />
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

                      {/* Last seen */}
                      {crmContact?.last_seen_at && (
                        <ProfileField
                          icon={<Clock className="h-3.5 w-3.5" />}
                          label="Última conexión"
                          value={new Date(crmContact.last_seen_at).toLocaleDateString('es-CL', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        />
                      )}

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

                {/* ===== TAB: Organizaciones ===== */}
                <TabsContent value="orgs" className="mt-4 space-y-3">
                  {user.organizations.length === 0 && !showAddOrg ? (
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
                          {isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              disabled={removingOrgId === org.id}
                              onClick={() => handleRemoveFromOrg(org.organization_id, org.id)}
                            >
                              {removingOrgId === org.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <UserMinus className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Add to org form */}
                  {showAddOrg ? (
                    <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Organización</Label>
                        <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecciona organización" />
                          </SelectTrigger>
                          <SelectContent>
                            {orgsNotJoined.length === 0 ? (
                              <SelectItem value="__empty__" disabled>
                                Ya está en todas las organizaciones
                              </SelectItem>
                            ) : (
                              orgsNotJoined.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Rol</Label>
                        <Select
                          value={selectedRole}
                          onValueChange={(v) => setSelectedRole(v as ApiMemberRole)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="participante">Participante</SelectItem>
                            <SelectItem value="facilitador">Facilitador</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleAddToOrg}
                          disabled={addingOrg || !selectedOrgId}
                          className="bg-teal-600 hover:bg-teal-700 h-8"
                        >
                          {addingOrg && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                          Agregar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddOrg(false)}
                          className="h-8"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    isSuperAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          loadAvailableOrgs();
                          setShowAddOrg(true);
                        }}
                        className="w-full"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Agregar a organización
                      </Button>
                    )
                  )}
                </TabsContent>

                {/* ===== TAB: Notas & Tareas ===== */}
                <TabsContent value="notes" className="mt-4 space-y-5">
                  {notesLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    <>
                      {/* --- Notes section --- */}
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <StickyNote className="h-3.5 w-3.5" />
                          Notas ({notes.length})
                        </p>

                        {/* Create note */}
                        <div className="space-y-2">
                          <Textarea
                            value={newNoteContent}
                            onChange={(e) => setNewNoteContent(e.target.value)}
                            placeholder="Escribir una nota..."
                            className="min-h-[60px] text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={handleCreateNote}
                            disabled={savingNote || !newNoteContent.trim()}
                            className="bg-teal-600 hover:bg-teal-700 h-8"
                          >
                            {savingNote && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Agregar nota
                          </Button>
                        </div>

                        {/* Notes list */}
                        {notes.map((note) => (
                          <div
                            key={note.id}
                            className="p-3 bg-yellow-50 rounded-lg border border-yellow-100 group"
                          >
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">
                              {note.content}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-[11px] text-slate-400">
                                {new Date(note.created_at).toLocaleDateString('es-CL', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeleteNote(note.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {notes.length === 0 && (
                          <p className="text-xs text-slate-400 italic text-center py-2">
                            Sin notas
                          </p>
                        )}
                      </div>

                      <Separator />

                      {/* --- Tasks section --- */}
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckSquare className="h-3.5 w-3.5" />
                          Tareas ({tasks.length})
                        </p>

                        {/* Create task */}
                        <div className="flex gap-2">
                          <Input
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Nueva tarea..."
                            className="h-8 text-sm flex-1"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                          />
                          <Select
                            value={newTaskPriority}
                            onValueChange={(v) => setNewTaskPriority(v as ApiCrmTaskPriority)}
                          >
                            <SelectTrigger className="h-8 w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Baja</SelectItem>
                              <SelectItem value="medium">Media</SelectItem>
                              <SelectItem value="high">Alta</SelectItem>
                              <SelectItem value="urgent">Urgente</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={handleCreateTask}
                            disabled={savingTask || !newTaskTitle.trim()}
                            className="bg-teal-600 hover:bg-teal-700 h-8"
                          >
                            {savingTask ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>

                        {/* Tasks list */}
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-3 bg-slate-50 rounded-lg border border-slate-100 group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-sm font-medium ${
                                    task.status === 'completed'
                                      ? 'text-slate-400 line-through'
                                      : 'text-slate-700'
                                  }`}
                                >
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Select
                                value={task.status}
                                onValueChange={(v) =>
                                  handleUpdateTaskStatus(task.id, v as ApiCrmTaskStatus)
                                }
                              >
                                <SelectTrigger className="h-6 text-[11px] w-auto border-0 p-0 px-1.5">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${TASK_STATUS_COLORS[task.status]}`}
                                  >
                                    {TASK_STATUS_LABELS[task.status]}
                                  </Badge>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pendiente</SelectItem>
                                  <SelectItem value="in_progress">En progreso</SelectItem>
                                  <SelectItem value="completed">Completada</SelectItem>
                                  <SelectItem value="cancelled">Cancelada</SelectItem>
                                </SelectContent>
                              </Select>
                              <Badge
                                variant="outline"
                                className="text-[10px]"
                              >
                                {PRIORITY_LABELS[task.priority]}
                              </Badge>
                              {task.due_date && (
                                <span className="text-[10px] text-slate-400">
                                  {new Date(task.due_date).toLocaleDateString('es-CL', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {tasks.length === 0 && (
                          <p className="text-xs text-slate-400 italic text-center py-2">
                            Sin tareas
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* ===== TAB: Actividad (Journeys, Puntos, Recompensas) ===== */}
                <TabsContent value="activity" className="mt-4 space-y-5">
                  {activityLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    <>
                      {/* Last seen */}
                      {crmContact?.last_seen_at && (
                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                              Última conexión
                            </p>
                            <p className="text-sm text-slate-700">
                              {new Date(crmContact.last_seen_at).toLocaleDateString('es-CL', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Points summary */}
                      {gamification && (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Star className="h-3.5 w-3.5" />
                            Puntos & Nivel
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-center">
                              <p className="text-2xl font-bold text-amber-600">
                                {gamification.total_points}
                              </p>
                              <p className="text-[11px] text-amber-500 uppercase tracking-wider">
                                Puntos
                              </p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-center">
                              <p className="text-sm font-bold text-purple-600">
                                {gamification.current_level?.name || 'Sin nivel'}
                              </p>
                              <p className="text-[11px] text-purple-500 uppercase tracking-wider">
                                Nivel actual
                              </p>
                              {gamification.points_to_next_level != null && (
                                <p className="text-[10px] text-purple-400 mt-0.5">
                                  {gamification.points_to_next_level} pts al siguiente
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Rewards */}
                      {gamification && gamification.rewards.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Trophy className="h-3.5 w-3.5" />
                            Recompensas ({gamification.rewards.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {gamification.rewards.map((r) => (
                              <Badge
                                key={r.id}
                                variant="outline"
                                className="bg-teal-50 text-teal-700 border-teal-200"
                              >
                                {r.reward?.name || 'Reward'}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Enrollments */}
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="h-3.5 w-3.5" />
                          Journeys ({enrollments.length})
                        </p>
                        {enrollments.length === 0 ? (
                          <p className="text-xs text-slate-400 italic text-center py-2">
                            Sin inscripciones
                          </p>
                        ) : (
                          enrollments.map((e) => (
                            <div
                              key={e.id}
                              className="p-3 bg-slate-50 rounded-lg border border-slate-100"
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-700 truncate">
                                  Journey
                                </p>
                                <Badge
                                  variant="outline"
                                  className={
                                    e.status === 'completed'
                                      ? 'bg-green-50 text-green-700 border-green-200'
                                      : e.status === 'active'
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-slate-50 text-slate-500'
                                  }
                                >
                                  {e.status === 'active'
                                    ? 'Activo'
                                    : e.status === 'completed'
                                      ? 'Completado'
                                      : e.status === 'dropped'
                                        ? 'Abandonado'
                                        : e.status}
                                </Badge>
                              </div>
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                  <span>Progreso</span>
                                  <span>{Math.round(e.progress_percentage)}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-1.5">
                                  <div
                                    className="bg-teal-500 h-1.5 rounded-full transition-all"
                                    style={{ width: `${e.progress_percentage}%` }}
                                  />
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1.5">
                                Iniciado:{' '}
                                {new Date(e.started_at).toLocaleDateString('es-CL', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Empty state if no gamification data at all */}
                      {!gamification && enrollments.length === 0 && (
                        <p className="text-sm text-slate-400 italic text-center py-4">
                          Sin datos de actividad disponibles
                        </p>
                      )}
                    </>
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
