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
  Users,
} from 'lucide-react';
import { ContactDetailSheet } from '../components/contact-detail';

const STATUS_OPTIONS: { value: ApiAccountStatus; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'suspended', label: 'Suspendido' },
  { value: 'pending_verification', label: 'Pendiente' },
  { value: 'deleted', label: 'Eliminado' },
];

const STATUS_DOT: Record<ApiAccountStatus, string> = {
  active: 'bg-emerald-500',
  suspended: 'bg-red-500',
  pending_verification: 'bg-amber-400',
  deleted: 'bg-slate-400',
};

const STATUS_TEXT: Record<ApiAccountStatus, string> = {
  active: 'text-emerald-700',
  suspended: 'text-red-700',
  pending_verification: 'text-amber-700',
  deleted: 'text-slate-500',
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
      {/* Search + count bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10 rounded-xl border-slate-200 focus:border-fuchsia-300 focus:ring-fuchsia-200"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Users className="h-4 w-4 text-slate-400" />
          <span className="font-medium">{totalCount}</span>
          <span>contacto{totalCount !== 1 ? 's' : ''}</span>
          {searchQuery && (
            <span className="text-slate-400 ml-1">
              &middot; &ldquo;{searchQuery}&rdquo;
            </span>
          )}
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 rounded-2xl">
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
        <Card className="rounded-2xl">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-600 mb-1">Sin resultados</h3>
            <p className="text-sm text-slate-500">
              {searchQuery ? 'Intenta con otro término de búsqueda' : 'No hay usuarios registrados'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-b border-slate-100">
                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contacto</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Organizaciones</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Estado</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Rol</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Registrado</TableHead>
                {isSuperAdmin && <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Admin</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const status = u.status || 'active';
                return (
                  <TableRow
                    key={u.id}
                    className="cursor-pointer hover:bg-fuchsia-50/30 transition-colors group"
                    onClick={() => setSelectedUser(u)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-fuchsia-400 to-purple-500 text-white text-xs font-semibold">
                              {getInitials(u)}
                            </AvatarFallback>
                          </Avatar>
                          {/* Status dot on avatar */}
                          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${STATUS_DOT[status]}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate group-hover:text-fuchsia-700 transition-colors">
                            {u.full_name || 'Sin nombre'}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.organizations.length > 0 ? (
                          u.organizations.slice(0, 2).map((org) => (
                            <span
                              key={org.id}
                              className="inline-flex items-center text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full"
                            >
                              {org.organization_name || org.organization_slug}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-300 italic">Sin org</span>
                        )}
                        {u.organizations.length > 2 && (
                          <span className="inline-flex items-center text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full">
                            +{u.organizations.length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
                        <span className={`text-xs font-medium ${STATUS_TEXT[status]}`}>
                          {STATUS_OPTIONS.find((s) => s.value === status)?.label || 'Activo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.is_platform_admin ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                          <Shield className="h-3 w-3" />
                          Admin
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Usuario</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          title={u.is_platform_admin ? 'Quitar admin' : 'Hacer admin'}
                          onClick={(e) => handleToggleAdmin(u, e)}
                          disabled={togglingAdmin === u.id || u.id === currentUser?.id}
                          className={`h-7 w-7 p-0 rounded-lg ${
                            u.is_platform_admin
                              ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
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
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/30">
              <p className="text-xs text-slate-500">
                Página <span className="font-semibold text-slate-700">{page + 1}</span> de{' '}
                <span className="font-semibold text-slate-700">{totalPages}</span>
              </p>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="h-8 rounded-lg"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="h-8 rounded-lg"
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
