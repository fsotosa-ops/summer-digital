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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Loader2, Archive, Trash2, Eye, Edit2, Building2, ChevronDown, ChevronUp, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');

  // Form state
  const [formData, setFormData] = useState<ApiJourneyCreate>({
    title: '',
    slug: '',
    description: '',
    category: '',
    is_active: false,
    is_onboarding: false,
  });

  // Orgs disponibles + orgs asignadas al journey en creación (patrón de recompensas)
  const [assignedOrgIds, setAssignedOrgIds] = useState<Set<string>>(new Set());
  const [orgsExpanded, setOrgsExpanded] = useState(false);

  const isSuperAdmin = user?.role === 'SuperAdmin';
  const canEdit = isSuperAdmin || user?.role === 'Admin';
  const orgId = isSuperAdmin ? selectedOrgId : user?.organizationId;

  const toggleOrgAssignment = (id: string) => {
    setAssignedOrgIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  // Load organizations for SuperAdmin
  useEffect(() => {
    const loadOrgs = async () => {
      if (!isSuperAdmin) {
        setIsLoadingOrgs(false);
        return;
      }
      try {
        const orgs = await organizationService.listMyOrganizations();
        // Prioritize fundacion-summer as parent org
        const sorted = [...orgs].sort((a, b) => {
          if (a.slug === 'fundacion-summer') return -1;
          if (b.slug === 'fundacion-summer') return 1;
          return 0;
        });
        setOrganizations(sorted);
        // Auto-select fundacion-summer (or first) — sin dropdown visible
        if (sorted.length > 0 && !selectedOrgId) {
          setSelectedOrgId(sorted[0].id);
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
      const isActive = statusFilter === 'all' ? null : statusFilter === 'active';
      const data = await adminService.listJourneys(orgId, isActive);
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
  }, [orgId, isLoadingOrgs, statusFilter]);

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

    // Admin usa su propia org; SuperAdmin usa la org por defecto (fundacion-summer)
    const ownerOrgId = isSuperAdmin ? selectedOrgId : user?.organizationId;
    if (!ownerOrgId) return;

    setIsCreating(true);
    try {
      const newJourney = await adminService.createJourney(ownerOrgId, formData);

      // Sincronizar asignación de orgs (solo SuperAdmin)
      if (isSuperAdmin && organizations.length > 0) {
        if (assignedOrgIds.size === 0) {
          // Sin selección = abierto para todas las organizaciones
          const allOrgIds = organizations
            .map((o) => o.id)
            .filter((id) => id !== ownerOrgId); // owner ya fue asignado por backend
          if (allOrgIds.length > 0) {
            await adminService.assignJourneyOrganizations(newJourney.id, allOrgIds);
          }
        } else {
          // Asignar solo las seleccionadas (owner ya fue asignado por backend)
          const extraOrgIds = [...assignedOrgIds].filter((id) => id !== ownerOrgId);
          if (extraOrgIds.length > 0) {
            await adminService.assignJourneyOrganizations(newJourney.id, extraOrgIds);
          }
        }
      }

      setCreateDialogOpen(false);
      setFormData({ title: '', slug: '', description: '', category: '', is_active: false, is_onboarding: false });
      setAssignedOrgIds(new Set());
      setOrgsExpanded(false);
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
          <p className="text-slate-500">
            {canEdit ? 'Crea y administra los viajes de aprendizaje' : 'Viajes de aprendizaje asignados a tu organizacion'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {canEdit && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Journey
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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

              {/* Onboarding toggle */}
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-fuchsia-500" />
                  <div>
                    <Label htmlFor="is_onboarding" className="text-sm font-medium cursor-pointer">
                      Journey de Onboarding
                    </Label>
                    <p className="text-xs text-slate-500">
                      Habilita preguntas de perfil y se muestra al ingresar por primera vez
                    </p>
                  </div>
                </div>
                <Switch
                  id="is_onboarding"
                  checked={formData.is_onboarding || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_onboarding: checked })}
                />
              </div>

              {/* Organizaciones habilitadas — sección desplegable, solo SuperAdmin */}
              {isSuperAdmin && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOrgsExpanded((v) => !v)}
                    className="flex items-center justify-between w-full px-3 py-2.5 hover:bg-slate-50 transition-colors"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <Building2 className="h-4 w-4 text-slate-500" />
                      Organizaciones habilitadas
                      {assignedOrgIds.size > 0 && (
                        <span className="ml-1.5 text-xs bg-fuchsia-100 text-fuchsia-700 px-1.5 py-0.5 rounded-full">
                          {assignedOrgIds.size}
                        </span>
                      )}
                    </span>
                    {orgsExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {orgsExpanded && (
                    <div className="border-t border-slate-200 px-3 py-2 space-y-1">
                      {organizations.length === 0 ? (
                        <p className="text-xs text-slate-400 py-1">No hay organizaciones disponibles.</p>
                      ) : (
                        <div className="max-h-44 overflow-y-auto space-y-1">
                          {organizations.map((org) => {
                            const checked = assignedOrgIds.has(org.id);
                            return (
                              <label
                                key={org.id}
                                className={cn(
                                  'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors select-none',
                                  checked ? 'bg-fuchsia-50 border border-fuchsia-200' : 'hover:bg-slate-50 border border-transparent'
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleOrgAssignment(org.id)}
                                  className="h-4 w-4 rounded accent-fuchsia-600"
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">{org.name}</p>
                                  {org.slug && <p className="text-xs text-slate-400">{org.slug}</p>}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-xs text-slate-400 pt-1">
                        Si no seleccionas ninguna, el journey estará disponible para todas las organizaciones.
                      </p>
                    </div>
                  )}
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
          )}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {([
          { key: 'all' as const, label: 'Todos' },
          { key: 'active' as const, label: 'Activos' },
          { key: 'draft' as const, label: 'Borradores' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              statusFilter === key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {label}
          </button>
        ))}
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
              {canEdit
                ? 'Crea tu primer journey para empezar a diseñar experiencias de aprendizaje.'
                : 'No hay journeys asignados a tu organizacion.'}
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
                {canEdit && <TableHead className="text-right">Acciones</TableHead>}
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
                    <div className="flex items-center gap-1.5">
                      <Badge variant={journey.is_active ? 'default' : 'outline'}>
                        {journey.is_active ? 'Activo' : 'Borrador'}
                      </Badge>
                      {journey.is_onboarding && (
                        <Badge className="bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200" variant="outline">
                          <Rocket className="h-3 w-3 mr-1" />
                          Onboarding
                        </Badge>
                      )}
                    </div>
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
                  {canEdit && (
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
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}