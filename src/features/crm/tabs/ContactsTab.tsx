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
  ApiContactStatus,
  ApiOrganization,
} from '@/types/api.types';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Search,
  Shield,
  ShieldOff,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { ContactDetailSheet } from '../components/contact-detail';

const STATUS_OPTIONS: { value: ApiAccountStatus; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'suspended', label: 'Suspendido' },
  { value: 'pending_verification', label: 'Pendiente' },
  { value: 'deleted', label: 'Eliminado' },
];

const STATUS_COLORS: Record<ApiAccountStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100/50',
  suspended: 'bg-rose-50 text-rose-700 border-rose-100/50',
  pending_verification: 'bg-summer-yellow/10 text-summer-yellow border-summer-yellow/50',
  deleted: 'bg-slate-50 text-slate-700 border-slate-100/50',
};

const CRM_STATUS_COLORS: Record<ApiContactStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100/50',
  inactive: 'bg-slate-50 text-slate-700 border-slate-100/50',
  risk: 'bg-summer-yellow/10 text-summer-yellow border-summer-yellow/50',
};

const CRM_STATUS_LABELS: Record<ApiContactStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  risk: 'En Riesgo',
};

const PAGE_SIZE = 20;

interface ContactsTabProps {
  orgId?: string;
}

/** Build a minimal ApiUser stub from a CRM contact so ContactDetailSheet can load */
function crmContactToUserStub(contact: ApiCrmContact): ApiUser {
  const fullName = [contact.first_name, contact.last_name]
    .filter(Boolean)
    .join(' ') || null;
  return {
    id: contact.user_id,
    email: contact.email,
    full_name: fullName,
    avatar_url: contact.avatar_url ?? null,
    is_platform_admin: false,
    status: contact.status === 'active' ? 'active' : undefined,
    created_at: contact.created_at ?? null,
    organizations: [],
  };
}

export function ContactsTab({ orgId }: ContactsTabProps) {
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === 'SuperAdmin';

  // --- Shared state ---
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);

  // --- SuperAdmin-only state ---
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [togglingAdmin, setTogglingAdmin] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState(0);

  // --- Org admin state ---
  const [crmContacts, setCrmContacts] = useState<ApiCrmContact[]>([]);

  // --- Export state ---
  const [exporting, setExporting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportOrgIds, setExportOrgIds] = useState<string[]>([]);
  const [exportCreatedFrom, setExportCreatedFrom] = useState('');
  const [exportCreatedTo, setExportCreatedTo] = useState('');
  const [orgs, setOrgs] = useState<ApiOrganization[]>([]);

  // ====== Data loading ======
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (isSuperAdmin) {
        const result = await userService.listUsers(
          page * PAGE_SIZE,
          PAGE_SIZE,
          searchQuery || undefined,
        );
        setUsers(result.users);
        setTotalCount(result.count);
      } else {
        const result = await crmService.listContacts(
          page * PAGE_SIZE,
          PAGE_SIZE,
          searchQuery || undefined,
          orgId,
        );
        setCrmContacts(result.contacts);
        setTotalCount(result.count);
      }
      setError(null);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Error al cargar contactos');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isSuperAdmin, page, searchQuery, orgId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 30s when tab is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadData(true);
    }, 30_000);
    const handleFocus = () => loadData(true);
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadData]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Clear selection on page/search change
  useEffect(() => { setSelectedIds(new Set()); }, [page, searchQuery]);

  // ====== SuperAdmin selection helpers ======
  const selectableUsers = users.filter((u) => u.id !== currentUser?.id);
  const allSelectableSelected =
    selectableUsers.length > 0 && selectableUsers.every((u) => selectedIds.has(u.id));
  const isIndeterminate = selectedIds.size > 0 && !allSelectableSelected;

  const handleToggleSelect = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (allSelectableSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(selectableUsers.map((u) => u.id)));
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    setBulkDeleteProgress(0);
    const ids = Array.from(selectedIds);
    const failedIds: string[] = [];
    for (let i = 0; i < ids.length; i++) {
      try { await userService.deleteUser(ids[i]); }
      catch { failedIds.push(ids[i]); }
      setBulkDeleteProgress(Math.round(((i + 1) / ids.length) * 100));
    }
    const deletedCount = ids.length - failedIds.length;
    if (failedIds.length === 0) {
      toast.success(`${deletedCount} contacto(s) eliminado(s)`);
      setSelectedIds(new Set());
    } else {
      toast.error(`${deletedCount} eliminado(s), ${failedIds.length} fallido(s)`);
      setSelectedIds(new Set(failedIds));
    }
    setUsers((prev) => prev.filter((u) => !ids.includes(u.id) || failedIds.includes(u.id)));
    setTotalCount((c) => c - deletedCount);
    setBulkDeleting(false);
    setBulkDeleteOpen(false);
  };

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

  // ====== Helpers ======
  const getInitials = (name: string | null | undefined, email: string) => {
    if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    return email[0].toUpperCase();
  };

  const openExportDialog = async () => {
    setExportOrgIds([]);
    setExportCreatedFrom('');
    setExportCreatedTo('');
    setExportDialogOpen(true);
    // Load orgs for multi-select (only needed for superadmin)
    if (isSuperAdmin && orgs.length === 0) {
      try {
        const data = await organizationService.listMyOrganizations();
        setOrgs(data);
      } catch { /* ignore */ }
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const filters: { organizationIds?: string[]; createdFrom?: string; createdTo?: string } = {};
      if (isSuperAdmin && exportOrgIds.length > 0) {
        filters.organizationIds = exportOrgIds;
      } else if (orgId) {
        filters.organizationIds = [orgId];
      }
      if (exportCreatedFrom) filters.createdFrom = exportCreatedFrom;
      if (exportCreatedTo) filters.createdTo = exportCreatedTo;

      const blob = await crmService.exportContactsCsv(
        Object.keys(filters).length > 0 ? filters : undefined,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts_brevo_${new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('CSV exportado correctamente');
      setExportDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al exportar CSV');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const isEmpty = isSuperAdmin ? users.length === 0 : crmContacts.length === 0;

  // ====== Render ======
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
        <Button
          variant="outline"
          size="sm"
          onClick={openExportDialog}
          disabled={totalCount === 0}
        >
          <Download className="h-4 w-4 mr-1" />
          Exportar CSV
        </Button>
      </div>

      {isSuperAdmin && selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-3 rounded-lg shadow-sm">
          <span className="text-sm">
            {selectedIds.size} contacto(s) seleccionado(s)
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-slate-800"
              onClick={() => setSelectedIds(new Set())}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Eliminar seleccionados
            </Button>
          </div>
        </div>
      )}

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
      ) : isEmpty ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No se encontraron contactos</h3>
            <p className="text-slate-500">
              {searchQuery ? 'Intenta con otro término' : 'No hay contactos registrados'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                {isSuperAdmin && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelectableSelected ? true : isIndeterminate ? 'indeterminate' : false}
                      onCheckedChange={handleToggleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead>Contacto</TableHead>
                {isSuperAdmin && <TableHead>Organizaciones</TableHead>}
                <TableHead>Estado</TableHead>
                {isSuperAdmin && <TableHead>Rol</TableHead>}
                <TableHead>Creado</TableHead>
                {isSuperAdmin && <TableHead className="text-right">Admin</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isSuperAdmin
                ? /* ===== SuperAdmin: render ApiUser rows ===== */
                  users.map((u) => (
                    <TableRow
                      key={u.id}
                      className="cursor-pointer hover:bg-slate-50/80"
                      onClick={() => setSelectedUser(u)}
                    >
                      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                        {u.id === currentUser?.id ? (
                          <div className="h-4 w-4" />
                        ) : (
                          <Checkbox
                            checked={selectedIds.has(u.id)}
                            onCheckedChange={() => handleToggleSelect(u.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                              {getInitials(u.full_name, u.email)}
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
                          <Badge className="bg-summer-lavender text-summer-lavender text-xs">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          title={u.is_platform_admin ? 'Quitar admin' : 'Hacer admin'}
                          onClick={(e) => handleToggleAdmin(u, e)}
                          disabled={togglingAdmin === u.id || u.id === currentUser?.id}
                          className={
                            u.is_platform_admin
                              ? 'text-summer-lavender hover:text-summer-lavender hover:bg-summer-lavender/10'
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
                    </TableRow>
                  ))
                : /* ===== Org admin: render ApiCrmContact rows ===== */
                  crmContacts.map((c) => {
                    const displayName = [c.first_name, c.last_name].filter(Boolean).join(' ') || null;
                    return (
                      <TableRow
                        key={c.user_id}
                        className="cursor-pointer hover:bg-slate-50/80"
                        onClick={() => setSelectedUser(crmContactToUserStub(c))}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={c.avatar_url || undefined} />
                              <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                                {getInitials(displayName, c.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">{displayName || 'Sin nombre'}</div>
                              <div className="text-xs text-slate-500">{c.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={CRM_STATUS_COLORS[c.status]}>
                            {CRM_STATUS_LABELS[c.status] || c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
          if (isSuperAdmin) {
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
          }
          setSelectedUser(updated);
        }}
        onUserDeleted={(id) => {
          if (isSuperAdmin) {
            setUsers((prev) => prev.filter((u) => u.id !== id));
          } else {
            setCrmContacts((prev) => prev.filter((c) => c.user_id !== id));
          }
          setTotalCount((c) => c - 1);
          setSelectedUser(null);
        }}
      />

      <Dialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!bulkDeleting) setBulkDeleteOpen(open);
        }}
      >
        <DialogContent
          onPointerDownOutside={(e) => { if (bulkDeleting) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (bulkDeleting) e.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle>Eliminar contactos</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar {selectedIds.size} contacto(s)?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          {bulkDeleting && (
            <div className="py-2">
              <Progress value={bulkDeleteProgress} className="h-2" />
              <p className="text-xs text-slate-500 mt-2 text-center">
                Eliminando… {bulkDeleteProgress}%
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteOpen(false)}
              disabled={bulkDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export CSV Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={(open) => { if (!exporting) setExportDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar contactos a CSV</DialogTitle>
            <DialogDescription>
              Selecciona filtros para la exportación. Deja vacío para exportar todos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {isSuperAdmin && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Organizaciones</label>
                <MultiSelect
                  options={orgs.map((o) => ({ value: o.id, label: o.name }))}
                  selected={exportOrgIds}
                  onChange={setExportOrgIds}
                  placeholder="Todas las organizaciones"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Creado desde</label>
                <Input
                  type="date"
                  value={exportCreatedFrom}
                  onChange={(e) => setExportCreatedFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Creado hasta</label>
                <Input
                  type="date"
                  value={exportCreatedTo}
                  onChange={(e) => setExportCreatedTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)} disabled={exporting}>
              Cancelar
            </Button>
            <Button onClick={handleExportCsv} disabled={exporting}>
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Descargar CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
