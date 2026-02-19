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
  ApiUserPointsSummary,
  ApiMemberRole,
} from '@/types/api.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  Shield,
  Loader2,
  Building2,
  Mail,
  User,
  StickyNote,
  Activity,
} from 'lucide-react';

import { STATUS_OPTIONS, STATUS_COLORS, NONE, getInitials } from './constants';
import { ProfileTab } from './ProfileTab';
import { OrganizationsTab } from './OrganizationsTab';
import { NotesTasksTab } from './NotesTasksTab';
import { ActivityTab } from './ActivityTab';

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
      crmService.listFieldOptions(undefined, false).catch((err) => {
        console.error('Error loading field options:', err);
        return [];
      }),
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
      .catch((err) => {
        console.error('Error loading contact data:', err);
        setError('Error al cargar datos del contacto');
      })
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

  return (
    <>
      {/* ===== FULL-SCREEN DIALOG ===== */}
      <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="!max-w-[calc(100vw-3rem)] !w-full !h-[calc(100vh-3rem)] !max-h-[calc(100vh-3rem)] p-0 flex flex-col overflow-hidden"
          showCloseButton={true}
        >
          <DialogTitle className="sr-only">
            Perfil de {user.full_name || user.email}
          </DialogTitle>
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

                  <TabsContent value="profile" className="mt-0">
                    <ProfileTab
                      user={user}
                      currentUser={currentUser}
                      isSuperAdmin={isSuperAdmin}
                      crmContact={crmContact}
                      crmLoading={crmLoading}
                      fieldOptions={fieldOptions}
                      editingCrm={editingCrm}
                      crmDraft={crmDraft}
                      savingCrm={savingCrm}
                      togglingAdmin={togglingAdmin}
                      onStartCrmEdit={startCrmEdit}
                      onCrmDraftChange={setCrmDraft}
                      onSelectOption={selectOption}
                      onSaveCrm={handleSaveCrm}
                      onCancelCrmEdit={() => setEditingCrm(false)}
                      onOpenEdit={handleOpenEdit}
                      onToggleAdmin={handleToggleAdmin}
                      onOpenDelete={() => setDeleteOpen(true)}
                    />
                  </TabsContent>

                  <TabsContent value="orgs" className="mt-0">
                    <OrganizationsTab
                      user={user}
                      isSuperAdmin={isSuperAdmin}
                      availableOrgs={availableOrgs}
                      showAddOrg={showAddOrg}
                      selectedOrgId={selectedOrgId}
                      selectedRole={selectedRole}
                      addingOrg={addingOrg}
                      removingOrgId={removingOrgId}
                      onShowAddOrg={setShowAddOrg}
                      onSelectedOrgIdChange={setSelectedOrgId}
                      onSelectedRoleChange={setSelectedRole}
                      onAddToOrg={handleAddToOrg}
                      onRemoveFromOrg={handleRemoveFromOrg}
                      onLoadAvailableOrgs={loadAvailableOrgs}
                    />
                  </TabsContent>

                  <TabsContent value="notes" className="mt-0">
                    <NotesTasksTab
                      notes={notes}
                      tasks={tasks}
                      notesLoading={notesLoading}
                      newNoteContent={newNoteContent}
                      savingNote={savingNote}
                      newTaskTitle={newTaskTitle}
                      newTaskPriority={newTaskPriority}
                      savingTask={savingTask}
                      onNewNoteContentChange={setNewNoteContent}
                      onCreateNote={handleCreateNote}
                      onDeleteNote={handleDeleteNote}
                      onNewTaskTitleChange={setNewTaskTitle}
                      onNewTaskPriorityChange={setNewTaskPriority}
                      onCreateTask={handleCreateTask}
                      onUpdateTaskStatus={handleUpdateTaskStatus}
                      onDeleteTask={handleDeleteTask}
                    />
                  </TabsContent>

                  <TabsContent value="activity" className="mt-0">
                    <ActivityTab
                      crmContact={crmContact}
                      enrollmentDetails={enrollmentDetails}
                      gamification={gamification}
                      activityLoading={activityLoading}
                      expandedEnrollment={expandedEnrollment}
                      onToggleExpanded={(id) =>
                        setExpandedEnrollment(expandedEnrollment === id ? null : id)
                      }
                    />
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
