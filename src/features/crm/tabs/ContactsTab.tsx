'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { userService } from '@/services/user.service';
import { ApiUser, ApiAccountStatus } from '@/types/api.types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Shield,
  ShieldOff,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ContactDetailSheet } from '../components/ContactDetailSheet';

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

const PAGE_SIZE = 20;

export function ContactsTab() {
  const { user: currentUser } = useAuthStore();

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
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
      setError(err instanceof Error ? err.message : 'Error al cargar contactos');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const handleToggleAdmin = async (targetUser: ApiUser, e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingAdmin(targetUser.id);
    try {
      const updated = await userService.togglePlatformAdmin(
        targetUser.id,
        !targetUser.is_platform_admin,
      );
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? updated : u)));
      if (selectedUser?.id === targetUser.id) setSelectedUser(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar permisos');
    } finally {
      setTogglingAdmin(null);
    }
  };

  const getInitials = (user: ApiUser) => {
    if (user.full_name) {
      return user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.email[0].toUpperCase();
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Search bar */}
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
        <span className="text-sm text-slate-500">
          {totalCount} contacto(s){searchQuery && ` para "${searchQuery}"`}
        </span>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No se encontraron contactos</h3>
            <p className="text-slate-500">
              {searchQuery ? 'Intenta con otro término' : 'No hay usuarios registrados'}
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
                {isSuperAdmin && <TableHead className="text-right">Admin</TableHead>}
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
                        <div className="font-medium text-sm">{u.full_name || 'Sin nombre'}</div>
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
                        <Badge
                          variant="secondary"
                          className="bg-slate-100 text-slate-500 text-[10px]"
                        >
                          +{u.organizations.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[u.status || 'active']}>
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
                  {isSuperAdmin && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        title={u.is_platform_admin ? 'Quitar admin' : 'Hacer admin'}
                        onClick={(e) => handleToggleAdmin(u, e)}
                        disabled={togglingAdmin === u.id || u.id === currentUser?.id}
                        className={
                          u.is_platform_admin
                            ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                            : 'text-slate-400 hover:text-slate-600'
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
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

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

      <ContactDetailSheet
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onUserUpdated={(updated) => {
          setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
          setSelectedUser(updated);
        }}
        onUserDeleted={(id) => {
          setUsers((prev) => prev.filter((u) => u.id !== id));
          setTotalCount((c) => c - 1);
          setSelectedUser(null);
        }}
      />
    </div>
  );
}