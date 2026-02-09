'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { userService } from '@/services/user.service';
import { ApiUser, ApiAccountStatus } from '@/types/api.types';
import { Card, CardContent } from '@/components/ui/card';
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
  Users,
  Search,
  Shield,
  ShieldOff,
  Pencil,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Building2
} from 'lucide-react';

const STATUS_OPTIONS: { value: ApiAccountStatus; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'suspended', label: 'Suspendido' },
  { value: 'pending_verification', label: 'Pendiente' },
  { value: 'deleted', label: 'Eliminado' },
];

const STATUS_COLORS: Record<ApiAccountStatus, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  suspended: 'bg-red-100 text-red-800 border-red-200',
  pending_verification: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  deleted: 'bg-slate-100 text-slate-800 border-slate-200',
};

const PAGE_SIZE = 20;

export function UsersTab() {
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
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
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
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? updated : u)),
      );
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
      setUsers((prev) =>
        prev.map((u) => (u.id === editUser.id ? updated : u)),
      );
      setEditUser(null);
      setError(null);
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar usuario');
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
      setDeleteTarget(null);
      setError(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err instanceof Error ? err.message : 'Error al eliminar usuario');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-brand" />
            Usuarios
          </h2>
           <p className="text-slate-500 text-sm mt-1">
             {totalCount} usuario(s) en total {searchQuery && ` — Resultados para "${searchQuery}"`}
           </p>
        </div>

        <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
            placeholder="Buscar por nombre o email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
            />
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : users.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">
              No se encontraron usuarios
            </h3>
            <p className="text-slate-500">
              {searchQuery
                ? 'Intenta con otro término de búsqueda'
                : 'No hay usuarios registrados'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm border-slate-200 overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Usuario</TableHead>
                  <TableHead className="font-semibold text-slate-700">Estado</TableHead>
                  <TableHead className="font-semibold text-slate-700">Organización</TableHead>
                  <TableHead className="font-semibold text-slate-700">Roles</TableHead>
                  <TableHead className="font-semibold text-slate-700">Creado</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{u.full_name || '—'}</span>
                        <span className="text-xs text-slate-500">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STATUS_COLORS[u.status || 'active']}
                      >
                        {STATUS_OPTIONS.find((s) => s.value === u.status)
                          ?.label || u.status}
                      </Badge>
                    </TableCell>
                    
                    {/* Organization Membership Column */}
                    <TableCell>
                        {u.organizations && u.organizations.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                                {u.organizations.map((membership) => (
                                    <Badge key={membership.id} variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 items-center gap-1">
                                        <Building2 size={10} />
                                        {membership.organization_name || 'Org'}
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
                                OASIS Community
                            </Badge>
                        )}
                    </TableCell>

                    <TableCell>
                      {u.is_platform_admin && (
                        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200">
                          <Shield className="h-3 w-3 mr-1" />
                          Super Admin
                        </Badge>
                      )}
                      {!u.is_platform_admin && <span className="text-slate-400 text-sm">—</span>}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {/* Toggle Admin */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title={
                            u.is_platform_admin
                              ? 'Quitar admin'
                              : 'Hacer admin'
                          }
                          onClick={() => handleToggleAdmin(u)}
                          disabled={
                            togglingAdmin === u.id ||
                            u.id === currentUser?.id
                          }
                          className={
                            u.is_platform_admin
                              ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                              : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
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

                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Editar usuario"
                          onClick={() => openEditDialog(u)}
                          className="text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Eliminar usuario"
                          onClick={() => setDeleteTarget(u)}
                          disabled={u.id === currentUser?.id}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          
            {/* Pagination */}
            {totalPages > 1 && (
               <div className="p-4 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
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
                    onClick={() =>
                       setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                   >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                   </Button>
                </div>
               </div>
            )}
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Editando a {editUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre completo</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre del usuario"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Estado</Label>
              <Select
                value={editStatus}
                onValueChange={(v: ApiAccountStatus) => setEditStatus(v)}
              >
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
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              className="bg-brand hover:bg-brand/90 text-white"
            >
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
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Eliminar Usuario</DialogTitle>
            <DialogDescription>
              ¿Está seguro de eliminar a{' '}
              <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong>?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar Usuario'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
