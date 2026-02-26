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
  X,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MultiSelect } from '@/components/ui/multi-select';
import { ResourceContentPreview } from '@/features/resources/ResourceContentPreview';
import { toast } from 'sonner';

/* ─── Type configuration ──────────────────────────────── */
const RESOURCE_TYPES: { value: ApiResourceType; label: string; icon: React.ElementType }[] = [
  { value: 'video',    label: 'Video',    icon: Video },
  { value: 'podcast',  label: 'Podcast',  icon: Headphones },
  { value: 'pdf',      label: 'PDF',      icon: FileText },
  { value: 'capsula',  label: 'Cápsula',  icon: Lightbulb },
  { value: 'actividad',label: 'Actividad',icon: Zap },
];

const TYPE_COLORS: Record<ApiResourceType, {
  bg: string; text: string; border: string;
  barFrom: string; barTo: string; iconCls: string;
}> = {
  video:    { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  barFrom: 'from-orange-400',  barTo: 'to-amber-500',   iconCls: 'text-orange-500' },
  podcast:  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  barFrom: 'from-violet-500',  barTo: 'to-purple-500',  iconCls: 'text-violet-500' },
  pdf:      { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     barFrom: 'from-red-400',     barTo: 'to-rose-500',    iconCls: 'text-red-500'    },
  capsula:  { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    barFrom: 'from-teal-400',    barTo: 'to-cyan-500',    iconCls: 'text-teal-500'   },
  actividad:{ bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', barFrom: 'from-emerald-400', barTo: 'to-green-500',   iconCls: 'text-emerald-500'},
};

const CONDITION_TYPES: { value: ApiConditionType; label: string }[] = [
  { value: 'points_threshold', label: 'Puntos mínimos' },
  { value: 'level_required',   label: 'Nivel requerido' },
  { value: 'reward_required',  label: 'Badge requerido' },
  { value: 'journey_completed',label: 'Journey completado' },
];

function getTypeIcon(type: ApiResourceType) {
  return RESOURCE_TYPES.find(t => t.value === type)?.icon || BookOpen;
}

/* ─── Page ───────────────────────────────────────────── */
export default function AdminResourcesPage() {
  const { user } = useAuthStore();
  const [resources, setResources]           = useState<ApiResourceAdminRead[]>([]);
  const [organizations, setOrganizations]   = useState<ApiOrganization[]>([]);
  const [selectedOrgId, setSelectedOrgId]   = useState<string | null>(null);
  const [isLoading, setIsLoading]           = useState(true);
  const [isLoadingOrgs, setIsLoadingOrgs]   = useState(true);
  const [isSaving, setIsSaving]             = useState(false);
  const [dialogOpen, setDialogOpen]         = useState(false);
  const [editingResource, setEditingResource] = useState<ApiResourceAdminRead | null>(null);
  const [previewResource, setPreviewResource] = useState<ApiResourceAdminRead | null>(null);
  const [error, setError]                   = useState<string | null>(null);
  const [statusFilter, setStatusFilter]     = useState<'all' | 'published' | 'draft'>('all');

  // Reference data for unlock conditions
  const [levels, setLevels]   = useState<ApiLevelRead[]>([]);
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
  const [fileToUpload, setFileToUpload]   = useState<File | null>(null);
  const [accessOrgIds, setAccessOrgIds]   = useState<string[]>([]);
  const [originalOrgIds, setOriginalOrgIds] = useState<string[]>([]);  // track initial orgs for edit diff
  const [isLoadingResourceOrgs, setIsLoadingResourceOrgs] = useState(false);

  const isSuperAdmin = user?.role === 'SuperAdmin';
  const canEdit      = isSuperAdmin || user?.role === 'Admin';
  const orgId        = isSuperAdmin ? selectedOrgId : user?.organizationId;

  // Load organizations for SuperAdmin
  useEffect(() => {
    const loadOrgs = async () => {
      if (!isSuperAdmin) { setIsLoadingOrgs(false); return; }
      try {
        const orgs = await organizationService.listMyOrganizations();
        const sorted = [...orgs].sort((a, b) => {
          if (a.slug === 'fundacion-summer') return -1;
          if (b.slug === 'fundacion-summer') return 1;
          return 0;
        });
        setOrganizations(sorted);
        // No auto-select: start with "Todas las organizaciones" (null)
      } catch (err) {
        console.error('Error loading organizations:', err);
      } finally {
        setIsLoadingOrgs(false);
      }
    };
    loadOrgs();
  }, [isSuperAdmin, selectedOrgId]);

  // Load reference data (only when a specific org is selected)
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
    if (!isSuperAdmin && !orgId) return;
    setIsLoading(true);
    try {
      const isPublished = statusFilter === 'all' ? null : statusFilter === 'published';
      let data: ApiResourceAdminRead[];
      if (isSuperAdmin && !selectedOrgId) {
        // All orgs: fetch in parallel and merge
        if (organizations.length === 0) { data = []; }
        else {
          const results = await Promise.allSettled(
            organizations.map(org => resourceService.listResources(org.id, isPublished))
          );
          const merged = results
            .filter((r): r is PromiseFulfilledResult<ApiResourceAdminRead[]> => r.status === 'fulfilled')
            .flatMap(r => r.value);
          // Deduplicate: a resource shared across orgs appears once per org
          const seen = new Set<string>();
          data = merged.filter(r => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
          });
        }
      } else if (orgId) {
        data = await resourceService.listResources(orgId, isPublished);
      } else { return; }
      setResources(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar recursos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoadingOrgs) fetchResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrgId, isLoadingOrgs, statusFilter]);

  const openCreateDialog = () => {
    setEditingResource(null);
    setFormData({ title: '', description: '', type: 'video', content_url: '', thumbnail_url: '', points_on_completion: 0, unlock_logic: 'AND', unlock_conditions: [] });
    setContentSource('url');
    setFileToUpload(null);
    setAccessOrgIds([]);
    setDialogOpen(true);
  };

  const openEditDialog = async (resource: ApiResourceAdminRead) => {
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
    setAccessOrgIds([]);
    setOriginalOrgIds([]);
    setDialogOpen(true);

    // Load current org assignments for this resource
    if (isSuperAdmin) {
      setIsLoadingResourceOrgs(true);
      try {
        const resp = await resourceService.getResourceOrganizations(resource.id);
        const ids = resp.organizations.map(o => o.organization_id);
        setAccessOrgIds(ids);
        setOriginalOrgIds(ids);
      } catch (err) {
        console.error('Error loading resource orgs:', err);
      } finally {
        setIsLoadingResourceOrgs(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const saveOrgId = orgId || editingResource?.organization_id;
    if (!saveOrgId && editingResource) return;
    setIsSaving(true);
    setError(null);
    try {
      if (editingResource) {
        const editOrgId = orgId || editingResource.organization_id;
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
        await resourceService.updateResource(editOrgId, editingResource.id, updateData);
        if (fileToUpload) await resourceService.uploadFile(editOrgId, editingResource.id, fileToUpload);

        // Sync org assignments: add new, remove old
        if (isSuperAdmin) {
          const toAdd = accessOrgIds.filter(id => !originalOrgIds.includes(id));
          const toRemove = originalOrgIds.filter(id => !accessOrgIds.includes(id));
          if (toAdd.length > 0) await resourceService.assignResourceOrganizations(editingResource.id, toAdd);
          if (toRemove.length > 0) await resourceService.unassignResourceOrganizations(editingResource.id, toRemove);
        }
      } else {
        const effectiveOrgIds = isSuperAdmin ? accessOrgIds : (user?.organizationId ? [user.organizationId] : []);
        if (effectiveOrgIds.length === 0) return;
        const [ownerOrgId, ...extraOrgIds] = effectiveOrgIds;
        const newResource = await resourceService.createResource(ownerOrgId, formData);
        if (fileToUpload) await resourceService.uploadFile(ownerOrgId, newResource.id, fileToUpload);
        if (extraOrgIds.length > 0) await resourceService.assignResourceOrganizations(newResource.id, extraOrgIds);
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
    const rOrgId = orgId || resource.organization_id;
    if (!rOrgId) return;
    try {
      if (resource.is_published) {
        await resourceService.unpublishResource(rOrgId, resource.id);
      } else {
        await resourceService.publishResource(rOrgId, resource.id);
      }
      toast.success(resource.is_published ? 'Recurso despublicado' : 'Recurso publicado');
      await fetchResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  };

  const handleDelete = async (resourceId: string) => {
    const resource = resources.find(r => r.id === resourceId);
    const rOrgId = orgId || resource?.organization_id;
    if (!rOrgId) return;
    if (!confirm('¿Estás seguro de eliminar este recurso?')) return;
    try {
      await resourceService.deleteResource(rOrgId, resourceId);
      toast.success('Recurso eliminado');
      await fetchResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar recurso');
    }
  };

  const addCondition = () => {
    setFormData({ ...formData, unlock_conditions: [...(formData.unlock_conditions || []), { condition_type: 'points_threshold', reference_value: 0 }] });
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
        <p className="text-slate-500">No tienes permisos para acceder a esta página.</p>
      </div>
    );
  }

  /* ── Stats (computed) ─────────────────────────────── */
  const totalPublished = resources.filter(r => r.is_published).length;
  const totalDraft     = resources.filter(r => !r.is_published).length;
  const totalConsumptions = resources.reduce((sum, r) => sum + r.consumption_count, 0);

  const statCards = [
    { label: 'Total recursos',   value: resources.length,   icon: BookOpen,  from: 'from-teal-500',   to: 'to-sky-500',    bg: 'bg-teal-50',    text: 'text-teal-700'    },
    { label: 'Publicados',       value: totalPublished,      icon: Eye,        from: 'from-emerald-500',to: 'to-teal-500',   bg: 'bg-emerald-50', text: 'text-emerald-700' },
    { label: 'Borradores',       value: totalDraft,          icon: EyeOff,     from: 'from-slate-400',  to: 'to-slate-500',  bg: 'bg-slate-100',  text: 'text-slate-600'   },
    { label: 'Consumos totales', value: totalConsumptions,   icon: Zap,        from: 'from-amber-400',  to: 'to-orange-500', bg: 'bg-amber-50',   text: 'text-amber-700'   },
  ];

  const filterTabs = [
    { key: 'all'       as const, label: 'Todos',      count: resources.length },
    { key: 'published' as const, label: 'Publicados', count: totalPublished   },
    { key: 'draft'     as const, label: 'Borradores', count: totalDraft       },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-fuchsia-600" />
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600
                            flex items-center justify-center shadow-sm shrink-0">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Gestión de Recursos</h1>
              <p className="text-xs text-slate-400 mt-0.5">Crea y administra contenido educativo para participantes</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {isSuperAdmin && organizations.length > 0 && (
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-slate-400 shrink-0" />
                <Select
                  value={selectedOrgId || '__all__'}
                  onValueChange={(v) => setSelectedOrgId(v === '__all__' ? null : v)}
                >
                  <SelectTrigger className="w-[200px] border-slate-200 text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas las organizaciones</SelectItem>
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {canEdit && (
              <button
                onClick={openCreateDialog}
                className="flex items-center gap-2 px-4 py-2 rounded-xl
                           bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white
                           text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
              >
                <Plus size={15} />
                Nuevo Recurso
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────── */}
      {!isLoading && !isLoadingOrgs && (isSuperAdmin || orgId) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', s.bg)}>
                  <Icon size={18} className={s.text} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800 leading-tight tabular-nums">{s.value}</p>
                  <p className="text-xs text-slate-400">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Filter Tabs ─────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-white border border-slate-100 shadow-sm p-1 rounded-xl w-fit">
        {filterTabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              statusFilter === key
                ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            )}
          >
            {label}
            <span className={cn(
              'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
              statusFilter === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            )}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Error ──────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 flex items-center gap-2 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Content ────────────────────────────────────── */}
      {(isLoading || isLoadingOrgs) ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 animate-pulse">
              <div className="h-1 w-1 rounded-full bg-slate-100 shrink-0" />
              <div className="h-9 w-9 rounded-xl bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
              <div className="h-6 w-20 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      ) : (!orgId && !isSuperAdmin) ? null : resources.length === 0 ? (
        /* ── Empty state ── */
        <div className="flex flex-col items-center justify-center py-16 px-6 rounded-2xl
                        border border-dashed border-slate-200 bg-slate-50/60 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-fuchsia-100 to-purple-100
                          flex items-center justify-center mb-4">
            <BookOpen size={32} className="text-fuchsia-500" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">Sin recursos todavía</h3>
          <p className="text-sm text-slate-400 mb-6 max-w-xs">
            Crea tu primer recurso para compartir contenido educativo con los participantes.
          </p>
          {canEdit && (
            <button
              onClick={openCreateDialog}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                         bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white
                         text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
            >
              <Plus size={15} />
              Crear primer recurso
            </button>
          )}
        </div>
      ) : (
        /* ── Table ── */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Recurso</th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                  <th className="text-center py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Acceso</th>
                  <th className="text-center py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Puntos</th>
                  <th className="text-center py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Consumos</th>
                  {canEdit && <th className="py-3 px-4" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {resources.map(resource => {
                  const TypeIcon = getTypeIcon(resource.type);
                  const c = TYPE_COLORS[resource.type];
                  return (
                    <tr key={resource.id} className="group hover:bg-slate-50/60 transition-colors">

                      {/* Resource title + description */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {/* Colored bar */}
                          <div className={cn('h-8 w-1 rounded-full bg-gradient-to-b shrink-0', c.barFrom, c.barTo)} />
                          {/* Icon with colored bg */}
                          <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', c.bg)}>
                            <TypeIcon size={16} className={c.iconCls} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-sm leading-tight truncate max-w-[220px]">
                              {resource.title}
                            </p>
                            {resource.description && (
                              <p className="text-xs text-slate-400 truncate max-w-[220px] mt-0.5">
                                {resource.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type badge */}
                      <td className="py-3 px-4">
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border',
                          c.bg, c.text, c.border
                        )}>
                          <TypeIcon size={10} />
                          {resource.type}
                        </span>
                      </td>

                      {/* Status badge */}
                      <td className="py-3 px-4">
                        {resource.is_published ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest
                                           px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Eye size={10} /> Publicado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest
                                           px-2 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                            <EyeOff size={10} /> Borrador
                          </span>
                        )}
                      </td>

                      {/* Unlock conditions */}
                      <td className="py-3 px-4 text-center">
                        {resource.unlock_conditions.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold
                                           text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Lock size={10} />
                            {resource.unlock_conditions.length}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-emerald-500">Libre</span>
                        )}
                      </td>

                      {/* Points */}
                      <td className="py-3 px-4 text-center">
                        {resource.points_on_completion > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-xs font-bold
                                           text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Zap size={10} />
                            {resource.points_on_completion}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-300">—</span>
                        )}
                      </td>

                      {/* Consumption count */}
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm font-semibold text-slate-700 tabular-nums">
                          {resource.consumption_count}
                        </span>
                      </td>

                      {/* Hover actions */}
                      {canEdit && (
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {(resource.content_url || resource.storage_path) && (
                              <button
                                onClick={() => setPreviewResource(resource)}
                                title="Vista previa"
                                className="h-8 w-8 flex items-center justify-center rounded-lg
                                           text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                              >
                                <Eye size={15} />
                              </button>
                            )}
                            <button
                              onClick={() => openEditDialog(resource)}
                              title="Editar"
                              className="h-8 w-8 flex items-center justify-center rounded-lg
                                         text-slate-400 hover:text-fuchsia-600 hover:bg-fuchsia-50 transition-colors"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleTogglePublish(resource)}
                              title={resource.is_published ? 'Despublicar' : 'Publicar'}
                              className={cn(
                                'h-8 w-8 flex items-center justify-center rounded-lg transition-colors',
                                resource.is_published
                                  ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              )}
                            >
                              {resource.is_published ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                            <button
                              onClick={() => handleDelete(resource.id)}
                              title="Eliminar"
                              className="h-8 w-8 flex items-center justify-center rounded-lg
                                         text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create / Edit Dialog ──────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600
                              flex items-center justify-center shrink-0">
                <BookOpen size={16} className="text-white" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-800">
                {editingResource ? 'Editar Recurso' : 'Nuevo Recurso'}
              </DialogTitle>
            </div>
            <DialogDescription>
              {editingResource
                ? 'Actualiza los datos del recurso.'
                : 'Define el contenido y las condiciones de desbloqueo.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Título <span className="text-red-500">*</span></Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ej: Charla sobre Bienestar"
                required
                className="border-slate-200 focus:border-fuchsia-400"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Descripción</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe el recurso..."
                rows={2}
                className="border-slate-200 focus:border-fuchsia-400 resize-none"
              />
            </div>

            {/* Type selector */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Tipo</Label>
              <div className="flex flex-wrap gap-1.5">
                {RESOURCE_TYPES.map((rt) => {
                  const selected = formData.type === rt.value;
                  const c = TYPE_COLORS[rt.value];
                  return (
                    <button
                      key={rt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: rt.value })}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5',
                        selected
                          ? cn(c.bg, c.text, c.border, 'shadow-sm')
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <rt.icon size={12} />
                      {rt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content source */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Contenido</Label>
              <div className="flex gap-2 mb-2">
                {(['url', 'upload'] as const).map(src => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setContentSource(src)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                      contentSource === src
                        ? 'bg-fuchsia-500 text-white border-fuchsia-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    )}
                  >
                    {src === 'url' ? 'URL externa' : 'Subir archivo'}
                  </button>
                ))}
              </div>

              {contentSource === 'url' ? (
                <div className="space-y-3">
                  <Input
                    value={formData.content_url || ''}
                    onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=... o URL directa"
                    className="border-slate-200 focus:border-fuchsia-400"
                  />
                  {formData.content_url && formData.content_url.length > 8 && (
                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                      <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                        <Eye size={12} /> Vista previa
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
                    className="flex-1 border-slate-200"
                  />
                  {fileToUpload && (
                    <span className="text-xs text-slate-500">{fileToUpload.name}</span>
                  )}
                </div>
              )}
            </div>

            {/* Thumbnail */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">URL Thumbnail <span className="text-slate-400 font-normal">(opcional)</span></Label>
              <Input
                value={formData.thumbnail_url || ''}
                onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value || undefined })}
                placeholder="https://..."
                className="border-slate-200 focus:border-fuchsia-400"
              />
            </div>

            {/* Points + Unlock logic */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Puntos al completar</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.points_on_completion || 0}
                  onChange={(e) => setFormData({ ...formData, points_on_completion: parseInt(e.target.value) || 0 })}
                  className="border-slate-200 focus:border-fuchsia-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Lógica de desbloqueo</Label>
                <Select
                  value={formData.unlock_logic || 'AND'}
                  onValueChange={(v) => setFormData({ ...formData, unlock_logic: v as ApiUnlockLogic })}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">Todas las condiciones (AND)</SelectItem>
                    <SelectItem value="OR">Al menos una (OR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Unlock conditions builder */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-slate-700">Condiciones de desbloqueo</Label>
                <button
                  type="button"
                  onClick={addCondition}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200
                             text-xs font-medium text-slate-600 hover:border-teal-300 hover:text-teal-700
                             hover:bg-teal-50 transition-colors"
                >
                  <Plus size={12} /> Agregar
                </button>
              </div>

              {(formData.unlock_conditions || []).length === 0 && (
                <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100
                               px-3 py-2 rounded-lg">
                  Sin condiciones — recurso libre para todos
                </p>
              )}

              {(formData.unlock_conditions || []).map((cond, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Select
                    value={cond.condition_type}
                    onValueChange={(v) => updateCondition(idx, { condition_type: v as ApiConditionType, reference_id: undefined, reference_value: undefined })}
                  >
                    <SelectTrigger className="w-[180px] bg-white border-slate-200 text-sm">
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
                      type="number" min="0" placeholder="Puntos"
                      value={cond.reference_value || ''}
                      onChange={(e) => updateCondition(idx, { reference_value: parseInt(e.target.value) || 0 })}
                      className="w-24 bg-white border-slate-200"
                    />
                  )}
                  {cond.condition_type === 'level_required' && (
                    <Select value={cond.reference_id || ''} onValueChange={(v) => updateCondition(idx, { reference_id: v })}>
                      <SelectTrigger className="flex-1 bg-white border-slate-200">
                        <SelectValue placeholder="Seleccionar nivel" />
                      </SelectTrigger>
                      <SelectContent>
                        {levels.map(l => <SelectItem key={l.id} value={l.id}>{l.name} ({l.min_points} pts)</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {cond.condition_type === 'reward_required' && (
                    <Select value={cond.reference_id || ''} onValueChange={(v) => updateCondition(idx, { reference_id: v })}>
                      <SelectTrigger className="flex-1 bg-white border-slate-200">
                        <SelectValue placeholder="Seleccionar badge" />
                      </SelectTrigger>
                      <SelectContent>
                        {rewards.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {cond.condition_type === 'journey_completed' && (
                    <Select value={cond.reference_id || ''} onValueChange={(v) => updateCondition(idx, { reference_id: v })}>
                      <SelectTrigger className="flex-1 bg-white border-slate-200">
                        <SelectValue placeholder="Seleccionar journey" />
                      </SelectTrigger>
                      <SelectContent>
                        {journeys.map(j => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}

                  <button
                    type="button"
                    onClick={() => removeCondition(idx)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg
                               text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Organization access (SuperAdmin only) */}
            {isSuperAdmin && organizations.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  Organizaciones con acceso <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-slate-400">
                  {editingResource
                    ? 'Gestiona qué organizaciones tienen acceso a este recurso.'
                    : 'La primera organización seleccionada será la propietaria.'}
                </p>
                {isLoadingResourceOrgs ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-slate-400">
                    <Loader2 size={14} className="animate-spin" /> Cargando organizaciones…
                  </div>
                ) : (
                  <MultiSelect
                    options={organizations.map((o) => ({ value: o.id, label: o.name }))}
                    selected={accessOrgIds}
                    onChange={setAccessOrgIds}
                    placeholder="Seleccionar organizaciones..."
                  />
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSaving}
                className="border-slate-200 text-slate-600"
              >
                Cancelar
              </Button>
              <button
                type="submit"
                disabled={isSaving || !formData.title || (isSuperAdmin && accessOrgIds.length === 0)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg
                           bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white
                           text-sm font-semibold hover:opacity-90 transition-opacity
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                {editingResource ? 'Guardar cambios' : 'Crear Recurso'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Preview Dialog ────────────────────────────── */}
      <Dialog open={!!previewResource} onOpenChange={(open) => !open && setPreviewResource(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye size={18} className="text-sky-600" />
              {previewResource?.title}
            </DialogTitle>
            <DialogDescription>
              Así se verá el recurso para los participantes.
            </DialogDescription>
          </DialogHeader>
          {previewResource && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {(() => {
                  const c = TYPE_COLORS[previewResource.type];
                  const TypeIcon = getTypeIcon(previewResource.type);
                  return (
                    <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border', c.bg, c.text, c.border)}>
                      <TypeIcon size={10} /> {previewResource.type}
                    </span>
                  );
                })()}
                {previewResource.is_published ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Eye size={10} /> Publicado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                    <EyeOff size={10} /> Borrador
                  </span>
                )}
                {previewResource.points_on_completion > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                    <Zap size={11} /> +{previewResource.points_on_completion} pts
                  </span>
                )}
                {previewResource.unlock_conditions.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                    <Lock size={11} /> {previewResource.unlock_conditions.length} condición(es)
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                    Recurso libre
                  </span>
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