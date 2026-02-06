'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { organizationService } from '@/services/organization.service';
import {
  ApiOrganization,
  ApiMemberResponse,
  ApiMemberRole,
  ApiMembershipStatus,
  ApiBulkMemberResultItem,
} from '@/types/api.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  ArrowLeft,
  Users,
  UserPlus,
  Loader2,
  Trash2,
  Mail,
  Shield,
  ShieldOff,
  Upload,
  UserPlus2,
  FileText,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

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

export default function OrganizationMembersPage() {
  const { id: orgId } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const router = useRouter();

  const [organization, setOrganization] = useState<ApiOrganization | null>(null);
  const [members, setMembers] = useState<ApiMemberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [togglingAdminId, setTogglingAdminId] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ApiMemberRole>('participante');

  // Add member form
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<ApiMemberRole>('participante');

  // Bulk add form
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkRole, setBulkRole] = useState<ApiMemberRole>('participante');
  const [bulkResults, setBulkResults] = useState<ApiBulkMemberResultItem[] | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = user?.role === 'SuperAdmin';

  useEffect(() => {
    if (!isSuperAdmin) {
      router.push('/dashboard');
      return;
    }
    loadData();
  }, [orgId, isSuperAdmin, router]);

  const loadData = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [org, membersList] = await Promise.all([
        organizationService.getOrganization(orgId),
        organizationService.listMembers(orgId),
      ]);
      setOrganization(org);
      setMembers(membersList);
      setError(null);
    } catch (err) {
      console.error('Error loading organization data:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!orgId || !inviteEmail) return;

    setInviting(true);
    try {
      const newMember = await organizationService.inviteMember(orgId, {
        email: inviteEmail,
        role: inviteRole,
      });
      setMembers(prev => [...prev, newMember]);
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('participante');
      setError(null);
    } catch (err) {
      console.error('Error inviting member:', err);
      setError(err instanceof Error ? err.message : 'Error al invitar miembro');
    } finally {
      setInviting(false);
    }
  };

  const handleAddMember = async () => {
    if (!orgId || !addEmail) return;

    setAdding(true);
    try {
      const newMember = await organizationService.addMember(orgId, {
        email: addEmail,
        role: addRole,
      });
      setMembers(prev => [...prev, newMember]);
      setAddDialogOpen(false);
      setAddEmail('');
      setAddRole('participante');
      setError(null);
    } catch (err) {
      console.error('Error adding member:', err);
      setError(err instanceof Error ? err.message : 'Error al agregar miembro');
    } finally {
      setAdding(false);
    }
  };

  const handleBulkFromText = async () => {
    if (!orgId || !bulkEmails.trim()) return;

    const emails = bulkEmails
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.includes('@'));

    if (emails.length === 0) return;

    setBulkLoading(true);
    try {
      const response = await organizationService.bulkAddMembers(orgId, {
        members: emails.map(email => ({ email, role: bulkRole })),
      });
      setBulkResults(response.results);
      await loadData();
    } catch (err) {
      console.error('Error bulk adding members:', err);
      setError(err instanceof Error ? err.message : 'Error en carga masiva');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkFromCSV = async (file: File) => {
    if (!orgId) return;

    setBulkLoading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());

      const members = lines
        .map(line => {
          const parts = line.split(',').map(p => p.trim());
          const email = parts[0];
          if (!email || !email.includes('@')) return null;
          const role = (parts[1] as ApiMemberRole) || 'participante';
          const validRoles: ApiMemberRole[] = ['owner', 'admin', 'facilitador', 'participante'];
          return { email, role: validRoles.includes(role) ? role : 'participante' as ApiMemberRole };
        })
        .filter((m): m is { email: string; role: ApiMemberRole } => m !== null);

      if (members.length === 0) {
        setError('No se encontraron emails validos en el archivo CSV');
        setBulkLoading(false);
        return;
      }

      const response = await organizationService.bulkAddMembers(orgId, { members });
      setBulkResults(response.results);
      await loadData();
    } catch (err) {
      console.error('Error processing CSV:', err);
      setError(err instanceof Error ? err.message : 'Error al procesar CSV');
    } finally {
      setBulkLoading(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: ApiMemberRole) => {
    if (!orgId) return;
    try {
      const updated = await organizationService.updateMember(orgId, memberId, { role: newRole });
      setMembers(prev => prev.map(m => m.id === memberId ? updated : m));
    } catch (err) {
      console.error('Error updating member:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar rol');
    }
  };

  const handleUpdateStatus = async (memberId: string, newStatus: ApiMembershipStatus) => {
    if (!orgId) return;
    try {
      const updated = await organizationService.updateMember(orgId, memberId, { status: newStatus });
      setMembers(prev => prev.map(m => m.id === memberId ? updated : m));
    } catch (err) {
      console.error('Error updating member:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar estado');
    }
  };

  const handleTogglePlatformAdmin = async (userId: string, currentIsAdmin: boolean) => {
    setTogglingAdminId(userId);
    try {
      await organizationService.setPlatformAdmin(userId, !currentIsAdmin);
      await loadData();
    } catch (err) {
      console.error('Error toggling platform admin:', err);
      setError(err instanceof Error ? err.message : 'Error al cambiar permisos de admin');
    } finally {
      setTogglingAdminId(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!orgId) return;
    if (!confirm('Esta seguro de remover este miembro de la organizacion?')) return;

    setRemovingId(memberId);
    try {
      await organizationService.removeMember(orgId, memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err) {
      console.error('Error removing member:', err);
      setError(err instanceof Error ? err.message : 'Error al remover miembro');
    } finally {
      setRemovingId(null);
    }
  };

  if (!isSuperAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Organizacion no encontrada</p>
        <Button variant="link" onClick={() => router.push('/admin/organizations')}>
          Volver a organizaciones
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/organizations')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-teal-600" />
            {organization.name}
          </h1>
          <p className="text-slate-500">{organization.slug} - Gestion de miembros</p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Miembros</CardTitle>
            <CardDescription>{members.length} miembro(s) en esta organizacion</CardDescription>
          </div>
          <div className="flex gap-2">
            {/* Agregar Miembro Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <UserPlus2 className="h-4 w-4 mr-2" />
                  Agregar Miembro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar Miembro</DialogTitle>
                  <DialogDescription>
                    Agrega un usuario directamente como miembro activo de {organization.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-email">Email *</Label>
                    <Input
                      id="add-email"
                      type="email"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      placeholder="usuario@ejemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-role">Rol</Label>
                    <Select value={addRole} onValueChange={(v: ApiMemberRole) => setAddRole(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
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
                      <>
                        <UserPlus2 className="h-4 w-4 mr-2" />
                        Agregar
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Carga Masiva Dialog */}
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
              <DialogTrigger asChild>
                <Button variant="outline" className="border-teal-600 text-teal-600 hover:bg-teal-50">
                  <Upload className="h-4 w-4 mr-2" />
                  Carga Masiva
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Carga Masiva de Miembros</DialogTitle>
                  <DialogDescription>
                    Agrega multiples miembros a {organization.name} de una vez
                  </DialogDescription>
                </DialogHeader>

                {bulkResults ? (
                  <div className="space-y-4 py-4">
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        {bulkResults.filter(r => r.success).length} exitosos
                      </div>
                      <div className="flex items-center gap-1 text-red-600">
                        <XCircle className="h-4 w-4" />
                        {bulkResults.filter(r => !r.success).length} fallidos
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {bulkResults.map((result, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm px-2 py-1.5 rounded border">
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
                        Cargar mas
                      </Button>
                      <Button onClick={() => setBulkDialogOpen(false)} className="bg-teal-600 hover:bg-teal-700">
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
                        <Label>Emails (uno por linea)</Label>
                        <Textarea
                          value={bulkEmails}
                          onChange={(e) => setBulkEmails(e.target.value)}
                          placeholder={'usuario1@ejemplo.com\nusuario2@ejemplo.com\nusuario3@ejemplo.com'}
                          rows={6}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Rol comun</Label>
                        <Select value={bulkRole} onValueChange={(v: ApiMemberRole) => setBulkRole(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map(r => (
                              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
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
                          Formato: email,rol (una fila por linea). El rol es opcional, por defecto &quot;participante&quot;.
                          <br />
                          Ejemplo: usuario@ejemplo.com,admin
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

            {/* Invitar Miembro Dialog */}
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invitar Miembro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invitar Miembro</DialogTitle>
                  <DialogDescription>
                    Invita a un usuario a unirse a {organization.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email *</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="usuario@ejemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Rol</Label>
                    <Select value={inviteRole} onValueChange={(v: ApiMemberRole) => setInviteRole(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
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
                        Enviar Invitacion
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No hay miembros en esta organizacion aun
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de ingreso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{member.user?.full_name || 'Sin nombre'}</div>
                        <div className="text-sm text-slate-500">{member.user?.email || member.user_id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={member.role}
                        onValueChange={(v: ApiMemberRole) => handleUpdateRole(member.id, v)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => (
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
                        <SelectTrigger className="w-[140px]">
                          <SelectValue>
                            <Badge className={STATUS_COLORS[member.status]}>
                              {STATUSES.find(s => s.value === member.status)?.label || member.status}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => (
                            <SelectItem key={s.value} value={s.value}>
                              <Badge className={STATUS_COLORS[s.value]}>{s.label}</Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {member.joined_at
                        ? new Date(member.joined_at).toLocaleDateString()
                        : 'Pendiente'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={
                            member.user_id === user?.id
                              ? 'No puedes cambiarte a ti mismo'
                              : member.user?.is_platform_admin
                                ? 'Quitar Platform Admin'
                                : 'Hacer Platform Admin'
                          }
                          onClick={() => handleTogglePlatformAdmin(member.user_id, !!member.user?.is_platform_admin)}
                          disabled={togglingAdminId === member.user_id || member.user_id === user?.id}
                        >
                          {togglingAdminId === member.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : member.user?.is_platform_admin ? (
                            <Shield className="h-4 w-4 text-teal-600" />
                          ) : (
                            <ShieldOff className="h-4 w-4 text-slate-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemove(member.id)}
                          disabled={removingId === member.id}
                        >
                          {removingId === member.id ? (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
