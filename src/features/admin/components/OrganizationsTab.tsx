'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { organizationService } from '@/services/organization.service';
import { ApiOrganization, ApiOrgCreate, ApiOrgType } from '@/types/api.types';
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
import { Building2, Plus, Users, Loader2, Trash2 } from 'lucide-react';
import { AnimatedButton } from '@/components/ui/animated-button';

const ORG_TYPES: { value: ApiOrgType; label: string }[] = [
  { value: 'community', label: 'Comunidad' },
  { value: 'provider', label: 'Proveedor' },
  { value: 'sponsor', label: 'Patrocinador' },
  { value: 'enterprise', label: 'Empresa' },
];

export function OrganizationsTab() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<ApiOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<ApiOrgCreate>({
    name: '',
    slug: '',
    description: '',
    type: 'community',
  });

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
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
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.slug) return;

    setCreating(true);
    try {
      const newOrg = await organizationService.createOrganization(formData);
      setOrganizations(prev => [...prev, newOrg]);
      setCreateDialogOpen(false);
      setFormData({ name: '', slug: '', description: '', type: 'community' });
      setError(null);
    } catch (err) {
      console.error('Error creating organization:', err);
      setError(err instanceof Error ? err.message : 'Error al crear organizacion');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (orgId: string) => {
    if (!confirm('Esta seguro de eliminar esta organizacion? Esta accion no se puede deshacer.')) {
      return;
    }

    setDeletingId(orgId);
    try {
      await organizationService.deleteOrganization(orgId);
      setOrganizations(prev => prev.filter(o => o.id !== orgId));
      setError(null);
    } catch (err) {
      console.error('Error deleting organization:', err);
      setError(err instanceof Error ? err.message : 'Error al eliminar organizacion');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand" />
            Organizaciones
          </h2>
          <p className="text-slate-500 text-sm mt-1">Gestiona las organizaciones de la plataforma</p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <AnimatedButton className="bg-brand hover:bg-brand/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Organización
            </AnimatedButton>
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
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Mi Organización"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="mi-organizacion"
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                />
                <p className="text-xs text-slate-500">Solo letras minúsculas, números y guiones</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: ApiOrgType) => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORG_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción opcional de la organización..."
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
                className="bg-brand hover:bg-brand/90 text-white"
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
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : organizations.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No hay organizaciones</h3>
            <p className="text-slate-500 mb-4">Crea tu primera organización para comenzar</p>
            <Button onClick={() => setCreateDialogOpen(true)} className="bg-brand hover:bg-brand/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Organización
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm border-slate-200 overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Nombre</TableHead>
                  <TableHead className="font-semibold text-slate-700">Slug</TableHead>
                  <TableHead className="font-semibold text-slate-700">Tipo</TableHead>
                  <TableHead className="font-semibold text-slate-700">Creada</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand font-bold">
                                {org.name.charAt(0).toUpperCase()}
                            </div>
                            {org.name}
                        </div>
                    </TableCell>
                    <TableCell className="text-slate-500">{org.slug}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
                        {ORG_TYPES.find(t => t.value === org.type)?.label || org.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {org.created_at ? new Date(org.created_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/organizations/${org.id}`)}
                          className="h-8"
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Miembros
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
