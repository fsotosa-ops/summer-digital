'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { resourceService } from '@/services/resource.service';
import { gamificationService } from '@/services/gamification.service';
import { organizationService } from '@/services/organization.service';
import { adminService } from '@/services/admin.service';
import {
  ApiResourceAdminRead,
  ApiResourceCreate,
  ApiResourceUpdate,
  ApiResourceType,
  ApiUnlockLogic,
  ApiUnlockConditionCreate,
  ApiConditionType,
  ApiOrganization,
  ApiLevelRead,
  ApiRewardRead,
  ApiJourneyAdminRead,
} from '@/types/api.types';
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
import {
  Plus,
  Loader2,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Building2,
  BookOpen,
  Video,
  FileText,
  Headphones,
  Lightbulb,
  Zap,
  Upload,
  X,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MultiSelect } from '@/components/ui/multi-select';
import { ResourceContentPreview } from '@/features/resources/ResourceContentPreview';
import { toast } from 'sonner';

const RESOURCE_TYPES: { value: ApiResourceType; label: string; icon: React.ElementType }[] = [
  { value: 'video', label: 'Video', icon: Video },
  { value: 'podcast', label: 'Podcast', icon: Headphones },
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'capsula', label: 'Capsula', icon: Lightbulb },
  { value: 'actividad', label: 'Actividad', icon: Zap },
];

const CONDITION_TYPES: { value: ApiConditionType; label: string }[] = [
  { value: 'points_threshold', label: 'Puntos minimos' },
  { value: 'level_required', label: 'Nivel requerido' },
  { value: 'reward_required', label: 'Badge requerido' },
  { value: 'journey_completed', label: 'Journey completado' },
];

function getTypeIcon(type: ApiResourceType) {
  const found = RESOURCE_TYPES.find(t => t.value === type);
  return found?.icon || BookOpen;
}

export default function AdminResourcesPage() {
  const { user } = useAuthStore();
  const [resources, setResources] = useState<ApiResourceAdminRead[]>([]);
  const [organizations, setOrganizations] = useState<ApiOrganization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ApiResourceAdminRead | null>(null);
  const [previewResource, setPreviewResource] = useState<ApiResourceAdminRead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Reference data for unlock conditions
  const [levels, setLevels] = useState<ApiLevelRead[]>([]);
  const [rewards, setRewards] = useState<ApiRewardRead[]>([]);
  const [journeys, setJourneys] = useState<ApiJourneyAdminRead[]>([]);

  // Form state
  const [formData, setFormData] = useState<ApiResourceCreate>({
    title: '',
    description: '',
    type: 'video',
    content_url: '',
    thumbnail_url: '',
    points_on_completion: 0,
    unlock_logic: 'AND',
    unlock_conditions: [],
  });
  const [contentSource, setContentSource] = useState<'url' | 'upload'>('url');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [accessOrgIds, setAccessOrgIds] = useState<string[]>([]);

  const isSuperAdmin = user?.role === 'SuperAdmin';
  const canEdit = isSuperAdmin || user?.role === 'Admin';
  const orgId = isSuperAdmin ? selectedOrgId : user?.organizationId;

  // Load organizations for SuperAdmin
  useEffect(() => {
    const loadOrgs = async () => {
      if (!isSuperAdmin) {
        setIsLoadingOrgs(false);
        return;
      }
      try {
        const orgs = await organizationService.listMyOrganizations();
        const sorted = [...orgs].sort((a, b) => {
          if (a.slug === 'fundacion-summer') return -1;
          if (b.slug === 'fundacion-summer') return 1;
          return 0;
        });
        setOrganizations(sorted);
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

  // Load reference data when orgId changes
  useEffect(() => {
    if (!orgId) return;
    const loadRefs = async () => {
      try {
        const [lvls, rwds, jnys] = await Promise.all([
          gamificationService.listLevels(orgId),
          gamificationService.listRewards(orgId),
          adminService.listJourneys(orgId),
        ]);
        setLevels(lvls);
        setRewards(rwds);
        setJourneys(jnys);
      } catch (err) {
        console.error('Error loading reference data:', err);
      }
    };
    loadRefs();
  }, [orgId]);

  const fetchResources = async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const isPublished = statusFilter === 'all' ? null : statusFilter === 'published';
      const data = await resourceService.listResources(orgId, isPublished);
      setResources(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar recursos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoadingOrgs) {
      fetchResources();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, isLoadingOrgs, statusFilter]);

  const openCreateDialog = () => {
    setEditingResource(null);
    setFormData({
      title: '',
      description: '',
      type: 'video',
      content_url: '',
      thumbnail_url: '',
      points_on_completion: 0,
      unlock_logic: 'AND',
      unlock_conditions: [],
    });
    setContentSource('url');
    setFileToUpload(null);
    setAccessOrgIds([]);
    setDialogOpen(true);
  };

  const openEditDialog = (resource: ApiResourceAdminRead) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title,
      description: resource.description || '',
      type: resource.type,
      content_url: resource.content_url || '',
      thumbnail_url: resource.thumbnail_url || '',
      points_on_completion: resource.points_on_completion,
      unlock_logic: resource.unlock_logic,
      unlock_conditions: resource.unlock_conditions.map(c => ({
        condition_type: c.condition_type,
        reference_id: c.reference_id,
        reference_value: c.reference_value,
      })),
    });
    setContentSource(resource.storage_path ? 'upload' : 'url');
    setFileToUpload(null);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setIsSaving(true);
    setError(null);

    try {
      if (editingResource) {
        const updateData: ApiResourceUpdate = {
          title: formData.title,
          description: formData.description,
          type: formData.type,
          content_url: formData.content_url,
          thumbnail_url: formData.thumbnail_url,
          points_on_completion: formData.points_on_completion,
          unlock_logic: formData.unlock_logic,
          unlock_conditions: formData.unlock_conditions,
        };
        await resourceService.updateResource(orgId, editingResource.id, updateData);

        if (fileToUpload) {
          await resourceService.uploadFile(orgId, editingResource.id, fileToUpload);
        }
      } else {
        // Determine effective org for creation
        const effectiveOrgIds = isSuperAdmin ? accessOrgIds : (user?.organizationId ? [user.organizationId] : []);
        if (effectiveOrgIds.length === 0) return;

        const [ownerOrgId, ...extraOrgIds] = effectiveOrgIds;

        const newResource = await resourceService.createResource(ownerOrgId, formData);

        // Upload file if selected
        if (fileToUpload) {
          await resourceService.uploadFile(ownerOrgId, newResource.id, fileToUpload);
        }

        // Assign extra organizations
        if (extraOrgIds.length > 0) {
          await resourceService.assignResourceOrganizations(newResource.id, extraOrgIds);
        }
      }

      setDialogOpen(false);
      toast.success(editingResource ? 'Recurso actualizado' : 'Recurso creado');
      await fetchResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar recurso');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (resource: ApiResourceAdminRead) => {
    if (!orgId) return;
    try {
      if (resource.is_published) {
        await resourceService.unpublishResource(orgId, resource.id);
      } else {
        await resourceService.publishResource(orgId, resource.id);
      }
      toast.success(resource.is_published ? 'Recurso despublicado' : 'Recurso publicado');
      await fetchResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!orgId) return;
    if (!confirm('Estas seguro de eliminar este recurso?')) return;
    try {
      await resourceService.deleteResource(orgId, resourceId);
      toast.success('Recurso eliminado');
      await fetchResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar recurso');
    }
  };

  // Unlock conditions helpers
  const addCondition = () => {
    setFormData({
      ...formData,
      unlock_conditions: [
        ...(formData.unlock_conditions || []),
        { condition_type: 'points_threshold', reference_value: 0 },
      ],
    });
  };

  const updateCondition = (index: number, updates: Partial<ApiUnlockConditionCreate>) => {
    const conditions = [...(formData.unlock_conditions || [])];
    conditions[index] = { ...conditions[index], ...updates };
    setFormData({ ...formData, unlock_conditions: conditions });
  };

  const removeCondition = (index: number) => {
    const conditions = [...(formData.unlock_conditions || [])];
    conditions.splice(index, 1);
    setFormData({ ...formData, unlock_conditions: conditions });
  };

  if (!user || (user.role !== 'SuperAdmin' && user.role !== 'Admin')) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-red-600">Acceso denegado</h1>
        <p className="text-slate-500">No tienes permisos para acceder a esta pagina.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-teal-600" />
            Gestion de Recursos
          </h1>
          <p className="text-slate-500">Crea y administra contenido educativo para participantes.</p>
        </div>
        <div className="flex items-center gap-4">
          {isSuperAdmin && organizations.length > 0 && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <Select value={selectedOrgId || ''} onValueChange={setSelectedOrgId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecciona organizacion" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {canEdit && (
            <Button onClick={openCreateDialog} className="bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Recurso
            </Button>
          )}
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {([
          { key: 'all' as const, label: 'Todos' },
          { key: 'published' as const, label: 'Publicados' },
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
      ) : !orgId ? null : resources.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>No hay recursos</CardTitle>
            <CardDescription>
              Crea tu primer recurso para compartir contenido con los participantes.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titulo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Condiciones</TableHead>
                <TableHead className="text-center">Puntos</TableHead>
                <TableHead className="text-center">Consumos</TableHead>
                {canEdit && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((resource) => {
                const TypeIcon = getTypeIcon(resource.type);
                return (
                  <TableRow key={resource.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span className="font-medium">{resource.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {resource.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={resource.is_published ? 'default' : 'outline'}>
                        {resource.is_published ? 'Publicado' : 'Borrador'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {resource.unlock_conditions.length > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <Lock className="h-3 w-3 text-amber-500" />
                          <span className="text-sm">{resource.unlock_conditions.length}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {resource.points_on_completion > 0 ? (
                        <Badge variant="secondary">{resource.points_on_completion} pts</Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{resource.consumption_count}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {(resource.content_url || resource.storage_path) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPreviewResource(resource)}
                              title="Vista previa"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(resource)}
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTogglePublish(resource)}
                            title={resource.is_published ? 'Despublicar' : 'Publicar'}
                          >
                            {resource.is_published ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(resource.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingResource ? 'Editar Recurso' : 'Nuevo Recurso'}</DialogTitle>
            <DialogDescription>
              {editingResource
                ? 'Actualiza los datos del recurso.'
                : 'Define el contenido y las condiciones de desbloqueo.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Titulo</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ej: Charla sobre Bienestar"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe el recurso..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="flex flex-wrap gap-1.5">
                {RESOURCE_TYPES.map((rt) => (
                  <button
                    key={rt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: rt.value })}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5',
                      formData.type === rt.value
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    )}
                  >
                    <rt.icon className="h-3 w-3" />
                    {rt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Source */}
            <div className="space-y-2">
              <Label>Contenido</Label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setContentSource('url')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md border transition-colors',
                    contentSource === 'url'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200'
                  )}
                >
                  URL externa
                </button>
                <button
                  type="button"
                  onClick={() => setContentSource('upload')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md border transition-colors',
                    contentSource === 'upload'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200'
                  )}
                >
                  Subir archivo
                </button>
              </div>

              {contentSource === 'url' ? (
                <div className="space-y-3">
                  <Input
                    value={formData.content_url || ''}
                    onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=... o URL directa"
                  />
                  {/* Live preview */}
                  {formData.content_url && formData.content_url.length > 8 && (
                    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                      <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        Vista previa
                      </p>
                      <ResourceContentPreview contentUrl={formData.content_url} compact />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                    className="flex-1"
                  />
                  {fileToUpload && (
                    <span className="text-xs text-slate-500">{fileToUpload.name}</span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>URL Thumbnail (opcional)</Label>
              <Input
                value={formData.thumbnail_url || ''}
                onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value || undefined })}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Puntos al completar</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.points_on_completion || 0}
                  onChange={(e) => setFormData({ ...formData, points_on_completion: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Logica de desbloqueo</Label>
                <Select
                  value={formData.unlock_logic || 'AND'}
                  onValueChange={(v) => setFormData({ ...formData, unlock_logic: v as ApiUnlockLogic })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">Todas las condiciones (AND)</SelectItem>
                    <SelectItem value="OR">Al menos una (OR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Unlock Conditions Builder */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Condiciones de desbloqueo</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar
                </Button>
              </div>

              {(formData.unlock_conditions || []).length === 0 && (
                <p className="text-xs text-slate-400">Sin condiciones - recurso libre</p>
              )}

              {(formData.unlock_conditions || []).map((cond, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border">
                  <Select
                    value={cond.condition_type}
                    onValueChange={(v) => updateCondition(idx, {
                      condition_type: v as ApiConditionType,
                      reference_id: undefined,
                      reference_value: undefined,
                    })}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_TYPES.map(ct => (
                        <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {cond.condition_type === 'points_threshold' && (
                    <Input
                      type="number"
                      min="0"
                      placeholder="Puntos"
                      value={cond.reference_value || ''}
                      onChange={(e) => updateCondition(idx, { reference_value: parseInt(e.target.value) || 0 })}
                      className="w-24"
                    />
                  )}

                  {cond.condition_type === 'level_required' && (
                    <Select
                      value={cond.reference_id || ''}
                      onValueChange={(v) => updateCondition(idx, { reference_id: v })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleccionar nivel" />
                      </SelectTrigger>
                      <SelectContent>
                        {levels.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.name} ({l.min_points} pts)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {cond.condition_type === 'reward_required' && (
                    <Select
                      value={cond.reference_id || ''}
                      onValueChange={(v) => updateCondition(idx, { reference_id: v })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleccionar badge" />
                      </SelectTrigger>
                      <SelectContent>
                        {rewards.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {cond.condition_type === 'journey_completed' && (
                    <Select
                      value={cond.reference_id || ''}
                      onValueChange={(v) => updateCondition(idx, { reference_id: v })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleccionar journey" />
                      </SelectTrigger>
                      <SelectContent>
                        {journeys.map(j => (
                          <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                    onClick={() => removeCondition(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Organization access (SuperAdmin only, create mode) */}
            {isSuperAdmin && !editingResource && organizations.length > 0 && (
              <div className="space-y-2">
                <Label>Organizaciones con acceso <span className="text-red-500">*</span></Label>
                <p className="text-xs text-slate-500">
                  La primera organizacion seleccionada sera la propietaria.
                </p>
                <MultiSelect
                  options={organizations.map((o) => ({ value: o.id, label: o.name }))}
                  selected={accessOrgIds}
                  onChange={setAccessOrgIds}
                  placeholder="Seleccionar organizaciones..."
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !formData.title || (isSuperAdmin && !editingResource && accessOrgIds.length === 0)}
              >
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {editingResource ? 'Guardar cambios' : 'Crear Recurso'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewResource} onOpenChange={(open) => !open && setPreviewResource(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Vista previa: {previewResource?.title}
            </DialogTitle>
            <DialogDescription>
              Asi se vera el recurso para los participantes.
            </DialogDescription>
          </DialogHeader>
          {previewResource && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="capitalize">{previewResource.type}</Badge>
                <Badge variant={previewResource.is_published ? 'default' : 'outline'}>
                  {previewResource.is_published ? 'Publicado' : 'Borrador'}
                </Badge>
                {previewResource.points_on_completion > 0 && (
                  <Badge variant="secondary">+{previewResource.points_on_completion} pts</Badge>
                )}
                {previewResource.unlock_conditions.length > 0 && (
                  <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                    <Lock className="h-3 w-3 mr-1" />
                    {previewResource.unlock_conditions.length} condicion(es)
                  </Badge>
                )}
                {previewResource.unlock_conditions.length === 0 && (
                  <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                    Recurso libre
                  </Badge>
                )}
              </div>
              {previewResource.description && (
                <p className="text-sm text-slate-500">{previewResource.description}</p>
              )}
              <ResourceContentPreview
                contentUrl={previewResource.content_url}
                storagePath={previewResource.storage_path}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}