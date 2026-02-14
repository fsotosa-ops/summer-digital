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
  ApiEnrollmentDetailResponse,
  ApiStepProgressRead,
  ApiUserPointsSummary,
  ApiMemberRole,
} from '@/types/api.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Activity,
  UserPlus,
  UserMinus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lock,
  Circle,
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

const STEP_TYPE_LABELS: Record<string, string> = {
  survey: 'Encuesta',
  event_attendance: 'Asistencia',
  content_view: 'Contenido',
  milestone: 'Hito',
  social_interaction: 'Social',
  resource_consumption: 'Recurso',
};

const NONE = '__none__';

function getInitials(user: ApiUser) {
  if (user.full_name) {
    return user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return user.email[0].toUpperCase();
}

/** Resolve a field value to its display label using field options */
function resolveLabel(
  value: string | null | undefined,
  options: ApiFieldOption[] | undefined,
): string | null {
  if (!value) return null;
  const match = (options || []).find((o) => o.value === value);
  return match ? match.label : value;
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
  const [fieldOptions, setFieldOptions] = useState<Record<string, ApiFieldOption[]>>({});

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

  // Activity tab (enrollment details + gamification)
  const [enrollmentDetails, setEnrollmentDetails] = useState<ApiEnrollmentDetailResponse[]>([]);
  const [gamification, setGamification] = useState<ApiUserPointsSummary | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [expandedEnrollment, setExpandedEnrollment] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Load CRM contact + field options when user changes
  useEffect(() => {
    if (!user) {
      setCrmContact(null);
      setNotes([]);
      setTasks([]);
      setEnrollmentDetails([]);
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
        const grouped: Record<string, ApiFieldOption[]> = {};
        for (const o of options) {
          if (!grouped[o.field_name]) grouped[o.field_name] = [];
          grouped[o.field_name].push(o);
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

  // Load activity (enrollment details + gamification)
  const loadActivity = useCallback(async (userId: string) => {
    setActivityLoading(true);
    try {
      const [enr, gam] = await Promise.all([
        crmService.getAdminUserEnrollmentDetails(userId).catch(() =>
          // Fallback to basic enrollments if detail endpoint not available
          crmService.getAdminUserEnrollments(userId).then((enrollments) =>
            enrollments.map((e) => ({
              ...e,
              steps_progress: [],
              completed_steps: 0,
              total_steps: 0,
              journey: null,
            })),
          ).catch(() => []),
        ),
        crmService.getAdminUserGamificationSummary(userId).catch(() => null),
      ]);
      setEnrollmentDetails(enr);
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
      // Clean up draft: convert empty strings to null for optional fields
      const cleanDraft: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(crmDraft)) {
        cleanDraft[key] = value === '' ? null : value;
      }
      const updated = await crmService.updateContact(user.id, cleanDraft as Partial<ApiCrmContact>);
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
      {/* ===== FULL-SCREEN DIALOG ===== */}
      <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="!max-w-[calc(100vw-3rem)] !w-full !h-[calc(100vh-3rem)] !max-h-[calc(100vh-3rem)] p-0 flex flex-col overflow-hidden"
          showCloseButton={true}
        >
          {/* Header */}
          <div className="flex items-center gap-4 px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <Avatar className="h-14 w-14 shrink-0">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="bg-slate-100 text-slate-600 text-lg">
                {getInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-slate-800 truncate">
                {user.full_name || 'Sin nombre'}
              </h2>
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
            </div>
            <div className="flex gap-2 flex-wrap shrink-0">
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
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mx-6">
              {error}
            </p>
          )}

          {/* Content with Tabs */}
          <Tabs defaultValue="profile" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 shrink-0">
              <TabsTrigger value="profile">
                <User className="h-4 w-4 mr-1.5" />
                Perfil
              </TabsTrigger>
              <TabsTrigger value="orgs" onClick={() => loadAvailableOrgs()}>
                <Building2 className="h-4 w-4 mr-1.5" />
                Organizaciones ({user.organizations.length})
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                onClick={() => loadNotesAndTasks(user.id)}
              >
                <StickyNote className="h-4 w-4 mr-1.5" />
                Notas & Tareas
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                onClick={() => loadActivity(user.id)}
              >
                <Activity className="h-4 w-4 mr-1.5" />
                Actividad
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="px-6 py-4">

                  {/* ===== TAB: Perfil CRM ===== */}
                  <TabsContent value="profile" className="mt-0">
                    {crmLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      </div>
                    ) : editingCrm ? (
                      /* ---- EDIT MODE ---- */
                      <div className="max-w-2xl space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                                {(fieldOptions.gender || []).map((o) => (
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
                                {(fieldOptions.education_level || []).map((o) => (
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
                                {(fieldOptions.occupation || []).map((o) => (
                                  <SelectItem key={o.value} value={o.value}>
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
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

                        {/* Save / cancel */}
                        <div className="flex gap-2 pt-1">
                          <Button
                            onClick={handleSaveCrm}
                            disabled={savingCrm}
                            className="bg-teal-600 hover:bg-teal-700 h-9"
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
                            <X className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* ---- VIEW MODE ---- */
                      <div className="max-w-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
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
                            value={resolveLabel(crmContact?.gender, fieldOptions.gender)}
                          />
                          <ProfileField
                            icon={<GraduationCap className="h-3.5 w-3.5" />}
                            label="Nivel Educativo"
                            value={resolveLabel(crmContact?.education_level, fieldOptions.education_level)}
                          />
                          <ProfileField
                            icon={<Briefcase className="h-3.5 w-3.5" />}
                            label="Ocupación"
                            value={resolveLabel(crmContact?.occupation, fieldOptions.occupation)}
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
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={startCrmEdit}
                          className="mt-5"
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar Perfil CRM
                        </Button>

                        <Separator className="my-5" />

                        {/* Account Actions */}
                        <div className="space-y-3">
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

                        <Separator className="my-5" />

                        {/* Metadata */}
                        <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
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
                    )}
                  </TabsContent>

                  {/* ===== TAB: Organizaciones ===== */}
                  <TabsContent value="orgs" className="mt-0">
                    <div className="max-w-2xl space-y-3">
                      {user.organizations.length === 0 && !showAddOrg ? (
                        <p className="text-sm text-slate-400 italic text-center py-6">
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
                    </div>
                  </TabsContent>

                  {/* ===== TAB: Notas & Tareas ===== */}
                  <TabsContent value="notes" className="mt-0">
                    {notesLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      </div>
                    ) : (
                      <div className="max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      </div>
                    )}
                  </TabsContent>

                  {/* ===== TAB: Actividad (Journeys con Steps, Puntos, Recompensas) ===== */}
                  <TabsContent value="activity" className="mt-0">
                    {activityLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      </div>
                    ) : (
                      <div className="max-w-4xl space-y-6">
                        {/* Top row: Last seen + gamification summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Last seen */}
                          {crmContact?.last_seen_at && (
                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                              <Clock className="h-5 w-5 text-slate-400" />
                              <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                                  Última conexión
                                </p>
                                <p className="text-sm font-medium text-slate-700">
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

                          {/* Points */}
                          {gamification && (
                            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 text-center">
                              <p className="text-2xl font-bold text-amber-600">
                                {gamification.total_points}
                              </p>
                              <p className="text-[11px] text-amber-500 uppercase tracking-wider">
                                Puntos totales
                              </p>
                            </div>
                          )}

                          {/* Level */}
                          {gamification && (
                            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 text-center">
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
                          )}
                        </div>

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

                        {/* Journeys with step-by-step activity */}
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Activity className="h-3.5 w-3.5" />
                            Actividad en Journeys ({enrollmentDetails.length})
                          </p>

                          {enrollmentDetails.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-4">
                              Sin inscripciones en journeys
                            </p>
                          ) : (
                            enrollmentDetails.map((enrollment) => {
                              const isExpanded = expandedEnrollment === enrollment.id;
                              const journeyTitle = enrollment.journey?.title || 'Journey';
                              const completedSteps = enrollment.completed_steps || enrollment.steps_progress.filter((s: ApiStepProgressRead) => s.status === 'completed').length;
                              const totalSteps = enrollment.total_steps || enrollment.steps_progress.length;

                              return (
                                <div
                                  key={enrollment.id}
                                  className="rounded-lg border border-slate-200 overflow-hidden"
                                >
                                  {/* Journey card header */}
                                  <button
                                    className="w-full flex items-center gap-3 p-4 bg-white hover:bg-slate-50 transition-colors text-left"
                                    onClick={() =>
                                      setExpandedEnrollment(isExpanded ? null : enrollment.id)
                                    }
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-slate-800 truncate">
                                          {journeyTitle}
                                        </p>
                                        <Badge
                                          variant="outline"
                                          className={
                                            enrollment.status === 'completed'
                                              ? 'bg-green-50 text-green-700 border-green-200'
                                              : enrollment.status === 'active'
                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                : 'bg-slate-50 text-slate-500'
                                          }
                                        >
                                          {enrollment.status === 'active'
                                            ? 'Activo'
                                            : enrollment.status === 'completed'
                                              ? 'Completado'
                                              : enrollment.status === 'dropped'
                                                ? 'Abandonado'
                                                : enrollment.status}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-4 mt-1.5">
                                        <div className="flex items-center gap-2 flex-1 max-w-xs">
                                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                                            <div
                                              className="bg-teal-500 h-1.5 rounded-full transition-all"
                                              style={{ width: `${enrollment.progress_percentage}%` }}
                                            />
                                          </div>
                                          <span className="text-xs text-slate-500 shrink-0">
                                            {Math.round(enrollment.progress_percentage)}%
                                          </span>
                                        </div>
                                        <span className="text-xs text-slate-400">
                                          {completedSteps}/{totalSteps} pasos
                                        </span>
                                        <span className="text-xs text-slate-400">
                                          Inicio:{' '}
                                          {new Date(enrollment.started_at).toLocaleDateString('es-CL', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                    {enrollment.steps_progress.length > 0 && (
                                      isExpanded ? (
                                        <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                                      )
                                    )}
                                  </button>

                                  {/* Step-by-step progress (expandable) */}
                                  {isExpanded && enrollment.steps_progress.length > 0 && (
                                    <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                                        Detalle de pasos
                                      </p>
                                      <div className="space-y-1">
                                        {enrollment.steps_progress.map((step: ApiStepProgressRead, idx: number) => (
                                          <div
                                            key={step.step_id}
                                            className="flex items-center gap-3 py-2 px-3 rounded-md bg-white border border-slate-100"
                                          >
                                            {/* Step status icon */}
                                            <div className="shrink-0">
                                              {step.status === 'completed' ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                              ) : step.status === 'available' ? (
                                                <Circle className="h-4 w-4 text-blue-400" />
                                              ) : (
                                                <Lock className="h-4 w-4 text-slate-300" />
                                              )}
                                            </div>

                                            {/* Step number */}
                                            <span className="text-xs text-slate-400 font-mono w-6 shrink-0">
                                              {idx + 1}.
                                            </span>

                                            {/* Step info */}
                                            <div className="flex-1 min-w-0">
                                              <p
                                                className={`text-sm ${
                                                  step.status === 'completed'
                                                    ? 'text-slate-700'
                                                    : step.status === 'available'
                                                      ? 'text-slate-600'
                                                      : 'text-slate-400'
                                                }`}
                                              >
                                                {step.title}
                                              </p>
                                            </div>

                                            {/* Step type */}
                                            <Badge
                                              variant="outline"
                                              className="text-[10px] shrink-0"
                                            >
                                              {STEP_TYPE_LABELS[step.type] || step.type}
                                            </Badge>

                                            {/* Points */}
                                            {step.points_earned > 0 && (
                                              <span className="text-xs text-amber-600 font-medium shrink-0">
                                                +{step.points_earned} pts
                                              </span>
                                            )}

                                            {/* Completed date */}
                                            {step.completed_at && (
                                              <span className="text-[10px] text-slate-400 shrink-0">
                                                {new Date(step.completed_at).toLocaleDateString(
                                                  'es-CL',
                                                  {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                  },
                                                )}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Empty state if no data at all */}
                        {!gamification && enrollmentDetails.length === 0 && (
                          <p className="text-sm text-slate-400 italic text-center py-4">
                            Sin datos de actividad disponibles
                          </p>
                        )}
                      </div>
                    )}
                  </TabsContent>

                </div>
              </ScrollArea>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

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
