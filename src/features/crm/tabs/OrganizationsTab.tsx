'use client';

import { useState, useCallback, useEffect } from 'react';
import { organizationService } from '@/services/organization.service';
import {
  ApiOrganization,
  ApiOrgCreate,
  ApiOrgType,
} from '@/types/api.types';
import { ORG_TYPES } from '@/lib/constants/crm-data';
import { OrgDetailDialog } from '@/features/crm/components/OrgDetailDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Building2,
  Plus,
  Loader2,
  Trash2,
} from 'lucide-react';

export function OrganizationsTab() {
  const [organizations, setOrganizations] = useState<ApiOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail dialog
  const [selectedOrg, setSelectedOrg] = useState<ApiOrganization | null>(null);

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

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

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

  const handleOrgUpdated = (updated: ApiOrganization) => {
    setOrganizations((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setSelectedOrg(updated);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-100">
        <div className="text-sm text-slate-500">{organizations.length} organización(es)</div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white shadow-sm">
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
                className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white shadow-sm disabled:opacity-50"
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
              className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white shadow-sm"
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
                  onClick={() => setSelectedOrg(org)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {org.logo_url ? (
                        <img
                          src={org.logo_url}
                          alt={org.name}
                          className="h-6 w-6 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded bg-teal-100 flex items-center justify-center shrink-0">
                          <Building2 className="h-3.5 w-3.5 text-teal-600" />
                        </div>
                      )}
                      {org.name}
                    </div>
                  </TableCell>
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

      {/* Organization Detail Dialog */}
      <OrgDetailDialog
        org={selectedOrg}
        onClose={() => setSelectedOrg(null)}
        onOrgUpdated={handleOrgUpdated}
      />
    </div>
  );
}
