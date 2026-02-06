'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { organizationService } from '@/services/organization.service';
import { ApiOrganization, ApiMemberResponse, ApiMemberRole, ApiMembershipStatus } from '@/types/api.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { ArrowLeft, Users, UserPlus, Loader2, Trash2, Mail, Shield, ShieldOff } from 'lucide-react';

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
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700">
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
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
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
