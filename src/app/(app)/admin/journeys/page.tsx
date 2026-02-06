'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { adminService } from '@/services/admin.service';
import { organizationService } from '@/services/organization.service';
import { ApiJourneyAdminRead, ApiJourneyCreate, ApiOrganization } from '@/types/api.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Loader2, Archive, Trash2, Eye, Edit2, Building2 } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';

export default function AdminJourneysPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [journeys, setJourneys] = useState<ApiJourneyAdminRead[]>([]);
  const [organizations, setOrganizations] = useState<ApiOrganization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<ApiJourneyCreate>({
    title: '',
    slug: '',
    description: '',
    category: '',
    is_active: false,
  });
  const [accessOrgIds, setAccessOrgIds] = useState<string[]>([]);

  const isSuperAdmin = user?.role === 'SuperAdmin';
  const orgId = selectedOrgId || user?.organizationId;

  // Load organizations for SuperAdmin
  useEffect(() => {
    const loadOrgs = async () => {
      if (!isSuperAdmin) {
        setIsLoadingOrgs(false);
        return;
      }
      try {
        const orgs = await organizationService.listMyOrganizations();
        setOrganizations(orgs);
        // Auto-select first org if none selected
        if (orgs.length > 0 && !selectedOrgId) {
          setSelectedOrgId(orgs[0].id);
        }
      } catch (err) {
        console.error('Error loading organizations:', err);
      } finally {
        setIsLoadingOrgs(false);
      }
    };
    loadOrgs();
  }, [isSuperAdmin, selectedOrgId]);

  const fetchJourneys = async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const data = await adminService.listJourneys(orgId);
      setJourneys(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar journeys');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoadingOrgs) {
      fetchJourneys();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, isLoadingOrgs]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title),
    });
  };

  const handleCreateJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;

    setIsCreating(true);
    try {
      const newJourney = await adminService.createJourney(orgId, formData);
      // Assign additional organizations if selected
      if (accessOrgIds.length > 0) {
        await adminService.assignJourneyOrganizations(newJourney.id, accessOrgIds);
      }
      setCreateDialogOpen(false);
      setFormData({ title: '', slug: '', description: '', category: '', is_active: false });
      setAccessOrgIds([]);
      await fetchJourneys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear journey');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (journey: ApiJourneyAdminRead) => {
    if (!orgId) return;
    try {
      if (journey.is_active) {
        await adminService.archiveJourney(orgId, journey.id);
      } else {
        await adminService.publishJourney(orgId, journey.id);
      }
      await fetchJourneys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  };

  const handleDelete = async (journeyId: string) => {
    if (!orgId) return;
    if (!confirm('¿Estás seguro de eliminar este journey?')) return;

    try {
      await adminService.deleteJourney(orgId, journeyId);
      await fetchJourneys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar journey');
    }
  };

  if (!user || (user.role !== 'SuperAdmin' && user.role !== 'Admin')) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-red-600">Acceso denegado</h1>
        <p className="text-slate-500">No tienes permisos para acceder a esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion de Journeys</h1>
          <p className="text-slate-500">Crea y administra los viajes de aprendizaje</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Organization Selector for SuperAdmin */}
          {isSuperAdmin && organizations.length > 0 && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <Select value={selectedOrgId || ''} onValueChange={setSelectedOrgId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecciona organizacion" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Journey
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Crear nuevo Journey</DialogTitle>
              <DialogDescription>
                Define los detalles básicos del journey. Podrás agregar steps después.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateJourney} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Ej: Taller de Bienestar"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="taller-de-bienestar"
                  pattern="^[a-z0-9-]+$"
                  required
                />
                <p className="text-xs text-slate-500">Solo letras minúsculas, números y guiones</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el objetivo del journey..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Input
                  id="category"
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Ej: Talleres, Onboarding, Habilidades"
                />
              </div>

              {/* Organization access selector (only for SuperAdmin with multiple orgs) */}
              {isSuperAdmin && organizations.length > 1 && (
                <div className="space-y-2">
                  <Label>Organizaciones con acceso</Label>
                  <p className="text-xs text-slate-500">
                    La organizacion owner ya tiene acceso. Selecciona organizaciones adicionales.
                  </p>
                  <MultiSelect
                    options={organizations
                      .filter((o) => o.id !== selectedOrgId)
                      .map((o) => ({ value: o.id, label: o.name }))}
                    selected={accessOrgIds}
                    onChange={setAccessOrgIds}
                    placeholder="Seleccionar organizaciones..."
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Journey'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Show message if no org selected for SuperAdmin */}
      {isSuperAdmin && !orgId && organizations.length === 0 && !isLoadingOrgs && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>No hay organizaciones</CardTitle>
            <CardDescription>
              Primero debes crear una organizacion desde el menu Organizaciones.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {(isLoading || isLoadingOrgs) ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : !orgId ? null : journeys.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>No hay journeys</CardTitle>
            <CardDescription>
              Crea tu primer journey para empezar a diseñar experiencias de aprendizaje.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Steps</TableHead>
                <TableHead className="text-center">Inscritos</TableHead>
                <TableHead className="text-center">Completados</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journeys.map((journey) => (
                <TableRow
                  key={journey.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => router.push(`/admin/journeys/${journey.id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{journey.title}</p>
                      <p className="text-xs text-slate-500">/{journey.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {journey.category ? (
                      <Badge variant="secondary">{journey.category}</Badge>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={journey.is_active ? 'default' : 'outline'}>
                      {journey.is_active ? 'Activo' : 'Borrador'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{journey.total_steps}</TableCell>
                  <TableCell className="text-center">{journey.total_enrollments}</TableCell>
                  <TableCell className="text-center">
                    {journey.completed_enrollments}
                    {journey.total_enrollments > 0 && (
                      <span className="text-xs text-slate-500 ml-1">
                        ({Math.round(journey.completion_rate * 100)}%)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/admin/journeys/${journey.id}`)}
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(journey)}
                        title={journey.is_active ? 'Archivar' : 'Publicar'}
                      >
                        {journey.is_active ? (
                          <Archive className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(journey.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
