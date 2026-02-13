'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { organizationService } from '@/services/organization.service';
import {
  ApiOrganization,
  ApiOrgCreate,
  ApiOrgType,
  ApiMemberResponse,
  ApiMemberRole,
  ApiMembershipStatus,
  ApiBulkMemberResultItem,
} from '@/types/api.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Plus,
  Users,
  Loader2,
  Trash2,
  UserPlus,
  UserPlus2,
  Upload,
  Mail,
  Shield,
  ShieldOff,
  FileText,
  CheckCircle2,
  XCircle,
  X,
  ArrowLeft,
} from 'lucide-react';

const ORG_TYPES: { value: ApiOrgType; label: string }[] = [
  { value: 'community', label: 'Comunidad' },
  { value: 'provider', label: 'Proveedor' },
  { value: 'sponsor', label: 'Patrocinador' },
  { value: 'enterprise', label: 'Empresa' },
];

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
  active: 'bg-green-100 text-green-700',
  invited: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
  inactive: 'bg-slate-100 text-slate-700',
};

const BULK_ERROR_LABELS: Record<string, string> = {
  user_not_found: 'Usuario no encontrado',
  already_member: 'Ya es miembro',
};

export function OrganizationsTab() {
  const { user } = useAuthStore();

  const [organizations, setOrganizations] = useState<ApiOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create org dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<ApiOrgCreate>({
    name: '',
    slug: '',
    description: '',
    type: 'community',
  });

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Detail sheet
  const [selectedOrg, setSelectedOrg] = useState<ApiOrganization | null>(null);
  const [members, setMembers] = useState<ApiMemberResponse[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Invite member
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ApiMemberRole>('participante');

  // Add member
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<ApiMemberRole>('participante');

  // Bulk add
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkRole, setBulkRole] = useState<ApiMemberRole>('participante');
  const [bulkResults, setBulkResults] = useState<ApiBulkMemberResultItem[] | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Member management
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [togglingAdminId, setTogglingAdminId] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'SuperAdmin';

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const orgs = await organizationService.listMyOrganizations();
      setOrganizations(orgs);
      setError(null);
    } catch (err) {
      console.error('Error loading organizations:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar organizaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const loadMembers = async (orgId: string) => {
    setMembersLoading(true);
    try {
      const membersList = await organizationService.listMembers(orgId);
      setMembers(membersList);
    } catch (err) {
      console.error('Error loading members:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar miembros');
    } finally {
      setMembersLoading(false);
    }
  };

  const handleSelectOrg = (org: ApiOrganization) => {
    setSelectedOrg(org);
    loadMembers(org.id);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({ ...prev, name, slug: generateSlug(name) }));
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.slug) return;
    setCreating(true);
    try {
      const newOrg = await organizationService.createOrganization(formData);
      setOrganizations((prev) => [...prev, newOrg]);
      setCreateDialogOpen(false);
      setFormData({ name: '', slug: '', description: '', type: 'community' });
      setError(null);
    } catch (err) {
      console.error('Error creating organization:', err);
      setError(err instanceof Error ? err.message : 'Error al crear organización');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (orgId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta organización? Esta acción no se puede deshacer.'))
      return;
    setDeletingId(orgId);
    try {
      await organizationService.deleteOrganization(orgId);
      setOrganizations((prev) => prev.filter((o) => o.id !== orgId));
      if (selectedOrg?.id === orgId) setSelectedOrg(null);
      setError(null);
    } catch (err) {
      console.error('Error deleting organization:', err);
      setError(err instanceof Error ? err.message : 'Error al eliminar organización');
    } finally {
      setDeletingId(null);
    }
  };

  // Member operations
  const handleInvite = async () => {
    if (!selectedOrg || !inviteEmail) return;
    setInviting(true);
    try {
      const newMember = await organizationService.inviteMember(selectedOrg.id, {
        email: inviteEmail,
        role: inviteRole,
      });
      setMembers((prev) => [...prev, newMember]);
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('participante');
    } catch (err) {
      console.error('Error inviting member:', err);
      setError(err instanceof Error ? err.message : 'Error al invitar miembro');
    } finally {
      setInviting(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedOrg || !addEmail) return;
    setAdding(true);
    try {
      const newMember = await organizationService.addMember(selectedOrg.id, {
        email: addEmail,
        role: addRole,
      });
      setMembers((prev) => [...prev, newMember]);
      setAddDialogOpen(false);
      setAddEmail('');
      setAddRole('participante');
    } catch (err) {
      console.error('Error adding member:', err);
      setError(err instanceof Error ? err.message : 'Error al agregar miembro');
    } finally {
      setAdding(false);
    }
  };

  const handleBulkFromText = async () => {
    if (!selectedOrg || !bulkEmails.trim()) return;
    const emails = bulkEmails
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.includes('@'));
    if (emails.length === 0) return;
    setBulkLoading(true);
    try {
      const response = await organizationService.bulkAddMembers(selectedOrg.id, {
        members: emails.map((email) => ({ email, role: bulkRole })),
      });
      setBulkResults(response.results);
      await loadMembers(selectedOrg.id);
    } catch (err) {
      console.error('Error bulk adding members:', err);
      setError(err instanceof Error ? err.message : 'Error en carga masiva');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkFromCSV = async (file: File) => {
    if (!selectedOrg) return;
    setBulkLoading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter((l) => l.trim());
      const parsedMembers = lines
        .map((line) => {
          const parts = line.split(',').map((p) => p.trim());
          const email = parts[0];
          if (!email || !email.includes('@')) return null;
          const role = (parts[1] as ApiMemberRole) || 'participante';
          const validRoles: ApiMemberRole[] = ['owner', 'admin', 'facilitador', 'participante'];
          return { email, role: validRoles.includes(role) ? role : ('participante' as ApiMemberRole) };
        })
        .filter((m): m is { email: string; role: ApiMemberRole } => m !== null);

      if (parsedMembers.length === 0) {
        setError('No se encontraron emails válidos en el archivo CSV');
        setBulkLoading(false);
        return;
      }
      const response = await organizationService.bulkAddMembers(selectedOrg.id, {
        members: parsedMembers,
      });
      setBulkResults(response.results);
      await loadMembers(selectedOrg.id);
    } catch (err) {
      console.error('Error processing CSV:', err);
      setError(err instanceof Error ? err.message : 'Error al procesar CSV');
    } finally {
      setBulkLoading(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: ApiMemberRole) => {
    if (!selectedOrg) return;
    try {
      const updated = await organizationService.updateMember(selectedOrg.id, memberId, {
        role: newRole,
      });
      setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
    } catch (err) {
      console.error('Error updating member:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar rol');
    }
  };

  const handleUpdateStatus = async (memberId: string, newStatus: ApiMembershipStatus) => {
    if (!selectedOrg) return;
    try {
      const updated = await organizationService.updateMember(selectedOrg.id, memberId, {
        status: newStatus,
      });
      setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
    } catch (err) {
      console.error('Error updating member:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar estado');
    }
  };

  const handleTogglePlatformAdmin = async (userId: string, currentIsAdmin: boolean) => {
    setTogglingAdminId(userId);
    try {
      await organizationService.setPlatformAdmin(userId, !currentIsAdmin);
      if (selectedOrg) await loadMembers(selectedOrg.id);
    } catch (err) {
      console.error('Error toggling platform admin:', err);
      setError(err instanceof Error ? err.message : 'Error al cambiar permisos');
    } finally {
      setTogglingAdminId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedOrg) return;
    if (!confirm('¿Estás seguro de remover este miembro?')) return;
    setRemovingId(memberId);
    try {
      await organizationService.removeMember(selectedOrg.id, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      console.error('Error removing member:', err);
      setError(err instanceof Error ? err.message : 'Error al remover miembro');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-100">
        <div className="text-sm text-slate-500">{organizations.length} organización(es)</div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Organización
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Crear Organización</DialogTitle>
              <DialogDescription>
                Crea una nueva organización. Los usuarios podrán ser invitados a ella.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Nombre *</Label>
                <Input
                  id="org-name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Mi Organización"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">Slug *</Label>
                <Input
                  id="org-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="mi-organizacion"
                />
                <p className="text-xs text-slate-500">Solo letras minúsculas, números y guiones</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: ApiOrgType) =>
                    setFormData((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORG_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-description">Descripción</Label>
                <Textarea
                  id="org-description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción opcional..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !formData.name || !formData.slug}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Organización'
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

      {/* Organizations Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : organizations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No hay organizaciones</h3>
            <p className="text-slate-500 mb-4">Crea tu primera organización para comenzar</p>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Organización
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead>Nombre</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow
                  key={org.id}
                  className="cursor-pointer hover:bg-slate-50/80"
                  onClick={() => handleSelectOrg(org)}
                >
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell className="text-slate-500">{org.slug}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ORG_TYPES.find((t) => t.value === org.type)?.label || org.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {org.created_at ? new Date(org.created_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(org.id)}
                        disabled={deletingId === org.id}
                      >
                        {deletingId === org.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
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

      {/* Organization Detail Sheet */}
      <Sheet open={!!selectedOrg} onOpenChange={(open) => !open && setSelectedOrg(null)}>
        <SheetContent className="w-[500px] sm:w-[700px] p-0">
          {selectedOrg && (
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Header */}
                <SheetHeader className="space-y-2">
                  <SheetTitle className="text-xl flex items-center gap-2 text-left">
                    <Building2 className="h-5 w-5 text-teal-600" />
                    {selectedOrg.name}
                  </SheetTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {ORG_TYPES.find((t) => t.value === selectedOrg.type)?.label || selectedOrg.type}
                    </Badge>
                    <span className="text-sm text-slate-500">{selectedOrg.slug}</span>
                  </div>
                  {selectedOrg.description && (
                    <p className="text-sm text-slate-600">{selectedOrg.description}</p>
                  )}
                </SheetHeader>

                <Separator />

                {/* Members Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Miembros ({members.length})
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddDialogOpen(true)}
                      >
                        <UserPlus2 className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBulkDialogOpen(true)}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Masivo
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInviteDialogOpen(true)}
                      >
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
                    <div className="text-center py-8 text-slate-500 text-sm">
                      No hay miembros en esta organización
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/50">
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
                                <div>
                                  <div className="font-medium text-sm">
                                    {member.user?.full_name || 'Sin nombre'}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {member.user?.email || member.user_id}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={member.role}
                                  onValueChange={(v: ApiMemberRole) =>
                                    handleUpdateRole(member.id, v)
                                  }
                                >
                                  <SelectTrigger className="w-[130px] h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ROLES.map((r) => (
                                      <SelectItem key={r.value} value={r.value}>
                                        {r.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={member.status}
                                  onValueChange={(v: ApiMembershipStatus) =>
                                    handleUpdateStatus(member.id, v)
                                  }
                                >
                                  <SelectTrigger className="w-[120px] h-8 text-xs">
                                    <SelectValue>
                                      <Badge className={`${STATUS_COLORS[member.status]} text-[10px]`}>
                                        {STATUSES.find((s) => s.value === member.status)?.label ||
                                          member.status}
                                      </Badge>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {STATUSES.map((s) => (
                                      <SelectItem key={s.value} value={s.value}>
                                        <Badge className={`${STATUS_COLORS[s.value]} text-xs`}>
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
                                      title={
                                        member.user?.is_platform_admin
                                          ? 'Quitar Platform Admin'
                                          : 'Hacer Platform Admin'
                                      }
                                      onClick={() =>
                                        handleTogglePlatformAdmin(
                                          member.user_id,
                                          !!member.user?.is_platform_admin,
                                        )
                                      }
                                      disabled={
                                        togglingAdminId === member.user_id ||
                                        member.user_id === user?.id
                                      }
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
                                    className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
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
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Member Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Miembro</DialogTitle>
            <DialogDescription>
              Agrega un usuario directamente como miembro activo de {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={addRole} onValueChange={(v: ApiMemberRole) => setAddRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={adding || !addEmail}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Agregando...
                </>
              ) : (
                'Agregar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar Miembro</DialogTitle>
            <DialogDescription>
              Invita a un usuario a unirse a {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={inviteRole} onValueChange={(v: ApiMemberRole) => setInviteRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {inviting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Invitando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar Invitación
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog
        open={bulkDialogOpen}
        onOpenChange={(open) => {
          setBulkDialogOpen(open);
          if (!open) {
            setBulkResults(null);
            setBulkEmails('');
            setBulkRole('participante');
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Carga Masiva de Miembros</DialogTitle>
            <DialogDescription>
              Agrega múltiples miembros a {selectedOrg?.name} de una vez
            </DialogDescription>
          </DialogHeader>

          {bulkResults ? (
            <div className="space-y-4 py-4">
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {bulkResults.filter((r) => r.success).length} exitosos
                </div>
                <div className="flex items-center gap-1 text-red-600">
                  <XCircle className="h-4 w-4" />
                  {bulkResults.filter((r) => !r.success).length} fallidos
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {bulkResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm px-2 py-1.5 rounded border"
                  >
                    <span className="truncate mr-2">{result.email}</span>
                    {result.success ? (
                      <Badge className="bg-green-100 text-green-700 shrink-0">Agregado</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 shrink-0">
                        {BULK_ERROR_LABELS[result.error || ''] || result.error}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setBulkResults(null);
                    setBulkEmails('');
                  }}
                >
                  Cargar más
                </Button>
                <Button
                  onClick={() => setBulkDialogOpen(false)}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <Tabs defaultValue="text" className="py-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">
                  <FileText className="h-4 w-4 mr-2" />
                  Pegar Emails
                </TabsTrigger>
                <TabsTrigger value="csv">
                  <Upload className="h-4 w-4 mr-2" />
                  Subir CSV
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4">
                <div className="space-y-2">
                  <Label>Emails (uno por línea)</Label>
                  <Textarea
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    placeholder={'usuario1@ejemplo.com\nusuario2@ejemplo.com\nusuario3@ejemplo.com'}
                    rows={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rol común</Label>
                  <Select value={bulkRole} onValueChange={(v: ApiMemberRole) => setBulkRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleBulkFromText}
                    disabled={bulkLoading || !bulkEmails.trim()}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {bulkLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Agregar Todos
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="csv" className="space-y-4">
                <div className="space-y-2">
                  <Label>Archivo CSV</Label>
                  <Input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBulkFromCSV(file);
                    }}
                    disabled={bulkLoading}
                  />
                  <p className="text-xs text-slate-500">
                    Formato: email,rol (una fila por línea). El rol es opcional, por defecto
                    &quot;participante&quot;.
                  </p>
                </div>
                {bulkLoading && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Procesando archivo...
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
                    Cancelar
                  </Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
