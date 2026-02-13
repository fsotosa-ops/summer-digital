'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { userService } from '@/services/user.service';
import { ApiUser, ApiAccountStatus } from '@/types/api.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Shield,
  ShieldOff,
  Pencil,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Building2,
  Mail,
  Clock,
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

const PAGE_SIZE = 20;

export function ContactsTab() {
  const { user: currentUser } = useAuthStore();

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(0);

  // Detail sheet
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);

  // Edit dialog
  const [editUser, setEditUser] = useState<ApiUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<ApiAccountStatus>('active');
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<ApiUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toggle admin loading
  const [togglingAdmin, setTogglingAdmin] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.role === 'SuperAdmin';

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await userService.listUsers(
        page * PAGE_SIZE,
        PAGE_SIZE,
        searchQuery || undefined,
      );
      setUsers(result.users);
      setTotalCount(result.count);
      setError(null);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar contactos');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const handleToggleAdmin = async (targetUser: ApiUser) => {
    setTogglingAdmin(targetUser.id);
    try {
      const updated = await userService.togglePlatformAdmin(
        targetUser.id,
        !targetUser.is_platform_admin,
      );
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? updated : u)));
      if (selectedUser?.id === targetUser.id) setSelectedUser(updated);
      setError(null);
    } catch (err) {
      console.error('Error toggling admin:', err);
      setError(err instanceof Error ? err.message : 'Error al cambiar permisos');
    } finally {
      setTogglingAdmin(null);
    }
  };

  const openEditDialog = (targetUser: ApiUser) => {
    setEditUser(targetUser);
    setEditName(targetUser.full_name || '');
    setEditStatus(targetUser.status || 'active');
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const updated = await userService.updateUser(editUser.id, {
        full_name: editName,
        status: editStatus,
      });
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? updated : u)));
      if (selectedUser?.id === editUser.id) setSelectedUser(updated);
      setEditUser(null);
      setError(null);
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar contacto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await userService.deleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setTotalCount((prev) => prev - 1);
      if (selectedUser?.id === deleteTarget.id) setSelectedUser(null);
      setDeleteTarget(null);
      setError(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err instanceof Error ? err.message : 'Error al eliminar contacto');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getInitials = (user: ApiUser) => {
    if (user.full_name) {
      return user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email[0].toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white p-4 rounded-lg shadow-sm border border-slate-100">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-slate-500">
          {totalCount} contacto(s)
          {searchQuery && ` para "${searchQuery}"`}
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">
              No se encontraron contactos
            </h3>
            <p className="text-slate-500">
              {searchQuery ? 'Intenta con otro término de búsqueda' : 'No hay usuarios registrados'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead>Contacto</TableHead>
                <TableHead>Organizaciones</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow
                  key={u.id}
                  className="cursor-pointer hover:bg-slate-50/80"
                  onClick={() => setSelectedUser(u)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                          {getInitials(u)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">
                          {u.full_name || 'Sin nombre'}
                        </div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.organizations.length > 0 ? (
                        u.organizations.slice(0, 2).map((org) => (
                          <Badge
                            key={org.id}
                            variant="secondary"
                            className="bg-slate-100 text-slate-600 text-[10px] font-normal"
                          >
                            {org.organization_name || org.organization_slug}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs">Sin org</span>
                      )}
                      {u.organizations.length > 2 && (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[10px]">
                          +{u.organizations.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={STATUS_COLORS[u.status || 'active']}
                    >
                      {STATUS_OPTIONS.find((s) => s.value === u.status)?.label || 'Activo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.is_platform_admin ? (
                      <Badge className="bg-purple-100 text-purple-800 text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    ) : (
                      <span className="text-slate-400 text-xs">Usuario</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {isSuperAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title={u.is_platform_admin ? 'Quitar admin' : 'Hacer admin'}
                          onClick={() => handleToggleAdmin(u)}
                          disabled={togglingAdmin === u.id || u.id === currentUser?.id}
                          className={
                            u.is_platform_admin
                              ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                              : 'text-slate-500 hover:text-slate-700'
                          }
                        >
                          {togglingAdmin === u.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : u.is_platform_admin ? (
                            <ShieldOff className="h-4 w-4" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Editar"
                        onClick={() => openEditDialog(u)}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {isSuperAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Eliminar"
                          onClick={() => setDeleteTarget(u)}
                          disabled={u.id === currentUser?.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-slate-500">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contact Detail Sheet (Drawer) */}
      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] p-0">
          {selectedUser && (
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Header */}
                <SheetHeader className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={selectedUser.avatar_url || undefined} />
                        <AvatarFallback className="bg-slate-100 text-slate-600 text-lg">
                          {getInitials(selectedUser)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <SheetTitle className="text-xl text-left">
                          {selectedUser.full_name || 'Sin nombre'}
                        </SheetTitle>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {selectedUser.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex gap-2">
                    <Badge
                      variant="outline"
                      className={STATUS_COLORS[selectedUser.status || 'active']}
                    >
                      {STATUS_OPTIONS.find((s) => s.value === selectedUser.status)?.label || 'Activo'}
                    </Badge>
                    {selectedUser.is_platform_admin && (
                      <Badge className="bg-purple-100 text-purple-800">
                        <Shield className="h-3 w-3 mr-1" />
                        Platform Admin
                      </Badge>
                    )}
                  </div>
                </SheetHeader>

                <Separator />

                {/* Quick Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Creado</p>
                    <p className="text-sm text-slate-700">
                      {selectedUser.created_at
                        ? new Date(selectedUser.created_at).toLocaleDateString('es-CL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : '—'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Actualizado</p>
                    <p className="text-sm text-slate-700">
                      {selectedUser.updated_at
                        ? new Date(selectedUser.updated_at).toLocaleDateString('es-CL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : '—'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Organizations */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Organizaciones ({selectedUser.organizations.length})
                  </h3>
                  {selectedUser.organizations.length > 0 ? (
                    <div className="space-y-2">
                      {selectedUser.organizations.map((org) => (
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
                          <div className="flex items-center gap-2">
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
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      Este contacto no pertenece a ninguna organización.
                    </p>
                  )}
                </div>

                <Separator />

                {/* Actions */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Acciones
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(selectedUser)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    {isSuperAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleAdmin(selectedUser)}
                        disabled={
                          togglingAdmin === selectedUser.id ||
                          selectedUser.id === currentUser?.id
                        }
                        className={
                          selectedUser.is_platform_admin
                            ? 'border-purple-200 text-purple-700 hover:bg-purple-50'
                            : ''
                        }
                      >
                        {togglingAdmin === selectedUser.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : selectedUser.is_platform_admin ? (
                          <ShieldOff className="h-4 w-4 mr-2" />
                        ) : (
                          <Shield className="h-4 w-4 mr-2" />
                        )}
                        {selectedUser.is_platform_admin ? 'Quitar Admin' : 'Hacer Admin'}
                      </Button>
                    )}
                    {isSuperAdmin && selectedUser.id !== currentUser?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setDeleteTarget(selectedUser)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Contacto</DialogTitle>
            <DialogDescription>Editando a {editUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre completo</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre del contacto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Estado</Label>
              <Select value={editStatus} onValueChange={(v: ApiAccountStatus) => setEditStatus(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
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
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Eliminar Contacto</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar a{' '}
              <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong>?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar Contacto'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
