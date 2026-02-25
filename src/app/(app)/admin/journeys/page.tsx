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
import {
  Plus, Loader2, Archive, Trash2, Eye, Edit2, Building2,
  ChevronDown, ChevronUp, Map, Users, Play, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Category badge helper ──────────────────────────── */
function categoryBadgeClasses(cat: string): string {
  const key = cat.toLowerCase();
  const map: Record<string, string> = {
    liderazgo:  'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    bienestar:  'bg-teal-50    text-teal-700    border-teal-200',
    innovacion: 'bg-amber-50   text-amber-700   border-amber-200',
    comunidad:  'bg-sky-50     text-sky-700     border-sky-200',
  };
  return map[key] ?? 'bg-slate-100 text-slate-600 border-slate-200';
}

/* ─── Mini progress bar ──────────────────────────────── */
function MiniProgress({ pct }: { pct: number }) {
  const color = pct >= 60 ? 'bg-teal-500' : pct >= 30 ? 'bg-amber-400' : 'bg-slate-300';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 tabular-nums">{pct}%</span>
    </div>
  );
}

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
  });

  const [assignedOrgIds, setAssignedOrgIds] = useState<Set<string>>(new Set());
  const [orgsExpanded, setOrgsExpanded] = useState(false);

  const isSuperAdmin = user?.role === 'SuperAdmin';
  const canEdit      = isSuperAdmin || user?.role === 'Admin';
  const orgId        = isSuperAdmin ? selectedOrgId : user?.organizationId;

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
    setFormData({ ...formData, title, slug: generateSlug(title) });
  };

  const handleCreateJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    const ownerOrgId = isSuperAdmin ? selectedOrgId : user?.organizationId;
    if (!ownerOrgId) return;

    setIsCreating(true);
    try {
      const newJourney = await adminService.createJourney(ownerOrgId, formData);

      if (isSuperAdmin && organizations.length > 0) {
        if (assignedOrgIds.size === 0) {
          const allOrgIds = organizations.map(o => o.id).filter(id => id !== ownerOrgId);
          if (allOrgIds.length > 0) {
            await adminService.assignJourneyOrganizations(newJourney.id, allOrgIds);
          }
        } else {
          const extraOrgIds = [...assignedOrgIds].filter(id => id !== ownerOrgId);
          if (extraOrgIds.length > 0) {
            await adminService.assignJourneyOrganizations(newJourney.id, extraOrgIds);
          }
        }
      }

      setCreateDialogOpen(false);
      setFormData({ title: '', slug: '', description: '', category: '', is_active: false });
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

  // ── Derived stats ──────────────────────────────────────
  const totalJourneys   = journeys.length;
  const activeJourneys  = journeys.filter(j => j.is_active).length;
  const draftJourneys   = journeys.filter(j => !j.is_active).length;
  const totalEnrollments = journeys.reduce((s, j) => s + j.total_enrollments, 0);

  // Filter counts for tabs (always from full list regardless of tab filter state)
  const tabCounts = {
    all:    journeys.length,
    active: journeys.filter(j => j.is_active).length,
    draft:  journeys.filter(j => !j.is_active).length,
  };

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-fuchsia-500 via-purple-500 to-teal-400" />
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600
                            flex items-center justify-center shadow-sm shrink-0">
              <Map size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Gestión de Journeys</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {canEdit ? 'Crea y administra los viajes de aprendizaje' : 'Viajes de aprendizaje asignados a tu organización'}
              </p>
            </div>
          </div>
          {canEdit && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                                   bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white
                                   hover:opacity-90 transition-opacity shadow-sm shrink-0">
                  <Plus size={15} /> Nuevo Journey
                  <Sparkles size={12} className="opacity-70" />
                </button>
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

                  {/* Organizaciones habilitadas — solo SuperAdmin */}
                  {isSuperAdmin && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOrgsExpanded(v => !v)}
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
                        {orgsExpanded
                          ? <ChevronUp className="h-4 w-4 text-slate-400" />
                          : <ChevronDown className="h-4 w-4 text-slate-400" />
                        }
                      </button>

                      {orgsExpanded && (
                        <div className="border-t border-slate-200 px-3 py-2 space-y-1">
                          {organizations.length === 0 ? (
                            <p className="text-xs text-slate-400 py-1">No hay organizaciones disponibles.</p>
                          ) : (
                            <div className="max-h-44 overflow-y-auto space-y-1">
                              {organizations.map(org => {
                                const checked = assignedOrgIds.has(org.id);
                                return (
                                  <label
                                    key={org.id}
                                    className={cn(
                                      'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors select-none',
                                      checked
                                        ? 'bg-fuchsia-50 border border-fuchsia-200'
                                        : 'hover:bg-slate-50 border border-transparent'
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
                    <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isCreating}
                      className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:opacity-90 border-0">
                      {isCreating ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creando...</>
                      ) : 'Crear Journey'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* ── Stats cards ─────────────────────────────────── */}
      {!isLoading && !isLoadingOrgs && journeys.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total journeys', value: totalJourneys,    icon: <Map size={16} />,    color: 'fuchsia' },
            { label: 'Activos',        value: activeJourneys,   icon: <Play size={16} />,   color: 'teal'    },
            { label: 'Borradores',     value: draftJourneys,    icon: <Eye size={16} />,    color: 'slate'   },
            { label: 'Inscripciones',  value: totalEnrollments, icon: <Users size={16} />,  color: 'amber'   },
          ].map(({ label, value, icon, color }) => (
            <div key={label}
              className={cn(
                'bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-3',
                color === 'fuchsia' && 'border-fuchsia-100',
                color === 'teal'    && 'border-teal-100',
                color === 'slate'   && 'border-slate-100',
                color === 'amber'   && 'border-amber-100',
              )}
            >
              <span className={cn(
                'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                color === 'fuchsia' && 'bg-fuchsia-50 text-fuchsia-600',
                color === 'teal'    && 'bg-teal-50    text-teal-600',
                color === 'slate'   && 'bg-slate-100  text-slate-500',
                color === 'amber'   && 'bg-amber-50   text-amber-600',
              )}>
                {icon}
              </span>
              <div>
                <p className="text-xl font-bold text-slate-800 leading-none">{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter tabs ─────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-white border border-slate-100 shadow-sm p-1 rounded-xl w-fit">
        {([
          { key: 'all'    as const, label: 'Todos'      },
          { key: 'active' as const, label: 'Activos'    },
          { key: 'draft'  as const, label: 'Borradores' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
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
              {tabCounts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* ── No org message ───────────────────────────────── */}
      {isSuperAdmin && !orgId && organizations.length === 0 && !isLoadingOrgs && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>No hay organizaciones</CardTitle>
            <CardDescription>
              Primero debes crear una organización desde el menú Organizaciones.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* ── Error ────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────── */}
      {(isLoading || isLoadingOrgs) ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : !orgId ? null : journeys.length === 0 ? (

        /* ── Empty state ───────────────────────────────── */
        <div className="flex flex-col items-center justify-center py-16 px-6
                        bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600
                          flex items-center justify-center shadow-sm mb-4">
            <Map size={28} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">
            {canEdit ? 'Aún no hay journeys' : 'Sin journeys asignados'}
          </h2>
          <p className="text-sm text-slate-400 mb-6 max-w-xs">
            {canEdit
              ? 'Crea tu primer journey para empezar a diseñar experiencias de aprendizaje.'
              : 'No hay journeys asignados a tu organización.'}
          </p>
          {canEdit && (
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                         bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white
                         hover:opacity-90 transition-opacity shadow-sm"
            >
              <Plus size={15} /> Crear primer journey
            </button>
          )}
        </div>
      ) : (

        /* ── Table ─────────────────────────────────────── */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="pl-6">Título</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Steps</TableHead>
                <TableHead className="text-center">Inscritos</TableHead>
                <TableHead className="text-center">Completados</TableHead>
                {canEdit && <TableHead className="text-right pr-6">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {journeys.map(journey => {
                const completionPct = journey.total_enrollments > 0
                  ? Math.round(journey.completion_rate * 100)
                  : 0;
                return (
                  <TableRow
                    key={journey.id}
                    className="group cursor-pointer hover:bg-fuchsia-50/30 transition-colors"
                    onClick={() => router.push(`/admin/journeys/${journey.id}`)}
                  >
                    {/* Title with color bar */}
                    <TableCell className="pl-0">
                      <div className="flex items-center gap-0">
                        <div className={cn(
                          'w-1 self-stretch rounded-r-full mr-4 shrink-0',
                          journey.is_active ? 'bg-fuchsia-400' : 'bg-slate-200'
                        )} />
                        <div>
                          <p className="font-medium text-slate-800">{journey.title}</p>
                          <p className="text-xs text-slate-400">/{journey.slug}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      {journey.category ? (
                        <Badge variant="outline"
                          className={cn('text-xs', categoryBadgeClasses(journey.category))}>
                          {journey.category}
                        </Badge>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        'text-xs font-semibold',
                        journey.is_active
                          ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      )}>
                        {journey.is_active ? 'Activo' : 'Borrador'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center text-sm text-slate-600">
                      {journey.total_steps}
                    </TableCell>

                    <TableCell className="text-center text-sm text-slate-600">
                      {journey.total_enrollments}
                    </TableCell>

                    {/* Completados with mini progress */}
                    <TableCell>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm text-slate-600">{journey.completed_enrollments}</span>
                        {journey.total_enrollments > 0 && (
                          <MiniProgress pct={completionPct} />
                        )}
                      </div>
                    </TableCell>

                    {/* Actions — visible on row hover */}
                    {canEdit && (
                      <TableCell className="text-right pr-6">
                        <div
                          className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => router.push(`/admin/journeys/${journey.id}`)}
                            title="Editar"
                            className="h-8 w-8 flex items-center justify-center rounded-lg
                                       text-slate-400 hover:text-fuchsia-600 hover:bg-fuchsia-50 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleActive(journey)}
                            title={journey.is_active ? 'Archivar' : 'Publicar'}
                            className="h-8 w-8 flex items-center justify-center rounded-lg
                                       text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                          >
                            {journey.is_active ? <Archive size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            onClick={() => handleDelete(journey.id)}
                            title="Eliminar"
                            className="h-8 w-8 flex items-center justify-center rounded-lg
                                       text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
