'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { adminService } from '@/services/admin.service';
import { organizationService } from '@/services/organization.service';
import { ApiJourneyAdminRead, ApiJourneyUpdate, ApiStepAdminRead, ApiStepCreate, ApiStepUpdate, ApiStepType } from '@/types/api.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  Plus,
  Loader2,
  Trash2,
  Edit2,
  GripVertical,
  FileText,
  Video,
  Users,
  Star,
  MessageSquare,
  BookOpen,
  Globe,
  Archive,
  Check,
  X,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const STEP_TYPE_OPTIONS: { value: ApiStepType; label: string; icon: React.ElementType }[] = [
  { value: 'survey', label: 'Encuesta / Typeform', icon: FileText },
  { value: 'event_attendance', label: 'Taller / Evento', icon: Users },
  { value: 'content_view', label: 'Video / Contenido', icon: Video },
  { value: 'milestone', label: 'Hito / Desafío', icon: Star },
  { value: 'social_interaction', label: 'Interacción / Feedback', icon: MessageSquare },
  { value: 'resource_consumption', label: 'Artículo / Recurso', icon: BookOpen },
];

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;
  // YouTube
  let match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  // Vimeo
  match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (match) return `https://player.vimeo.com/video/${match[1]}`;
  return null;
}

function getTypeformEmbedUrl(url: string): string | null {
  if (!url) return null;
  // https://form.typeform.com/to/XXXXX or https://XXXXX.typeform.com/to/XXXXX
  const match = url.match(/typeform\.com\/to\/([a-zA-Z0-9]+)/);
  if (match) return url;
  return null;
}

function getStepIcon(type: ApiStepType) {
  const option = STEP_TYPE_OPTIONS.find(o => o.value === type);
  return option?.icon || FileText;
}

function getStepTypeLabel(type: ApiStepType) {
  const option = STEP_TYPE_OPTIONS.find(o => o.value === type);
  return option?.label || type;
}

function SortableStepItem({
  step,
  onEdit,
  onDelete,
  readOnly = false,
}: {
  step: ApiStepAdminRead;
  onEdit: (step: ApiStepAdminRead) => void;
  onDelete: (stepId: string) => void;
  readOnly?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id, disabled: readOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = getStepIcon(step.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors',
        isDragging && 'opacity-50 shadow-lg border-teal-300 z-50'
      )}
    >
      {!readOnly && (
        <button
          type="button"
          className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
      )}

      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 truncate">{step.title}</p>
        <p className="text-xs text-slate-500">{getStepTypeLabel(step.type)}</p>
      </div>

      <div className="flex items-center gap-1">
        <Badge variant="secondary" className="text-xs">
          {step.gamification_rules?.base_points || 0} pts
        </Badge>

        {!readOnly && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(step)}
              className="h-8 w-8"
            >
              <Edit2 className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(step.id)}
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function JourneyEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const journeyId = params.id as string;

  const isSuperAdmin = user?.role === 'SuperAdmin';

  const [journey, setJourney] = useState<ApiJourneyAdminRead | null>(null);
  const [steps, setSteps] = useState<ApiStepAdminRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  // Derive orgId: for SuperAdmins without membership, use journey's org
  const orgId = user?.organizationId || journey?.organization_id;

  // Step dialog state
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<ApiStepAdminRead | null>(null);
  const [stepForm, setStepForm] = useState<ApiStepCreate>({
    title: '',
    type: 'content_view',
    config: {},
    gamification_rules: { base_points: 10 },
  });

  const fetchData = async (effectiveOrgId?: string) => {
    const oid = effectiveOrgId || orgId;
    if (!oid) return;
    setIsLoading(true);
    try {
      const [journeyData, stepsData] = await Promise.all([
        adminService.getJourney(oid, journeyId),
        adminService.listSteps(oid, journeyId),
      ]);
      setJourney(journeyData);
      setSteps(stepsData.sort((a, b) => a.order_index - b.order_index));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load: for SuperAdmin without orgId, first load journey to get org_id
  useEffect(() => {
    const init = async () => {
      if (user?.organizationId) {
        // Normal user with org membership
        await fetchData(user.organizationId);
      } else {
        // SuperAdmin without org membership - need to discover org from journey
        // Try loading with a temporary approach: list all orgs first
        try {
          const orgs = await organizationService.listMyOrganizations();
          if (orgs.length > 0) {
            // Try each org until we find the journey
            for (const org of orgs) {
              try {
                const journeyData = await adminService.getJourney(org.id, journeyId);
                setJourney(journeyData);
                const stepsData = await adminService.listSteps(org.id, journeyId);
                setSteps(stepsData.sort((a, b) => a.order_index - b.order_index));
                setIsLoading(false);
                break;
              } catch {
                continue;
              }
            }
          }
        } catch {
          setError('No se pudo cargar el journey');
          setIsLoading(false);
        }
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyId, user?.organizationId]);

  const openCreateDialog = () => {
    setEditingStep(null);
    setStepForm({
      title: '',
      type: 'content_view',
      config: {},
      gamification_rules: { base_points: 10 },
    });
    setStepDialogOpen(true);
  };

  const openEditDialog = (step: ApiStepAdminRead) => {
    setEditingStep(step);
    setStepForm({
      title: step.title,
      type: step.type,
      config: step.config || {},
      gamification_rules: step.gamification_rules || { base_points: 10 },
    });
    setStepDialogOpen(true);
  };

  const handleSaveStep = async () => {
    if (!orgId) return;
    setIsSaving(true);
    try {
      if (editingStep) {
        const updateData: ApiStepUpdate = {
          title: stepForm.title,
          type: stepForm.type,
          config: stepForm.config,
          gamification_rules: stepForm.gamification_rules,
        };
        await adminService.updateStep(orgId, journeyId, editingStep.id, updateData);
      } else {
        await adminService.createStep(orgId, journeyId, stepForm);
      }
      setStepDialogOpen(false);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar step');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!orgId) return;
    if (!confirm('¿Estás seguro de eliminar este step?')) return;

    try {
      await adminService.deleteStep(orgId, journeyId, stepId);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar step');
    }
  };

  // DnD sensors with activation constraint to avoid accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !orgId) return;

    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic update
    const newSteps = arrayMove([...steps], oldIndex, newIndex);
    setSteps(newSteps);

    // Build reorder request
    const reorderRequest = {
      steps: newSteps.map((s: ApiStepAdminRead, idx: number) => ({ step_id: s.id, new_index: idx })),
    };

    try {
      await adminService.reorderSteps(orgId, journeyId, reorderRequest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reordenar steps');
      await fetchData(); // Revert on error
    }
  };

  const handleSaveTitle = async () => {
    if (!orgId || !journey || !editTitle.trim() || editTitle === journey.title) {
      setIsEditingTitle(false);
      return;
    }
    setIsSaving(true);
    try {
      const newTitle = editTitle.trim();
      const newSlug = generateSlug(newTitle);
      await adminService.updateJourney(orgId, journeyId, { title: newTitle, slug: newSlug } as ApiJourneyUpdate);
      setJourney({ ...journey, title: newTitle, slug: newSlug });
      setIsEditingTitle(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar título');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!orgId || !journey) return;
    setIsSaving(true);
    try {
      if (journey.is_active) {
        await adminService.archiveJourney(orgId, journeyId);
      } else {
        await adminService.publishJourney(orgId, journeyId);
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar estado del journey');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || (user.role !== 'SuperAdmin' && user.role !== 'Admin')) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-red-600">Acceso denegado</h1>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/journeys')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                  className="text-2xl font-bold h-10 w-80"
                  autoFocus
                />
                <Button variant="ghost" size="icon" onClick={handleSaveTitle} disabled={isSaving} className="h-8 w-8">
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsEditingTitle(false)} className="h-8 w-8">
                  <X className="h-4 w-4 text-slate-400" />
                </Button>
              </div>
            ) : (
              <h1
                className={cn(
                  'text-2xl font-bold text-slate-900',
                  isSuperAdmin && 'cursor-pointer hover:text-slate-600 transition-colors'
                )}
                onClick={isSuperAdmin ? () => { setEditTitle(journey?.title || ''); setIsEditingTitle(true); } : undefined}
                title={isSuperAdmin ? 'Click para editar' : undefined}
              >
                {journey?.title}
              </h1>
            )}
            <Badge variant={journey?.is_active ? 'default' : 'outline'}>
              {journey?.is_active ? 'Activo' : 'Borrador'}
            </Badge>
          </div>
          <p className="text-slate-500">{journey?.description || 'Sin descripción'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/journeys/${journeyId}/preview`)}
            disabled={steps.length === 0}
          >
            <Eye className="h-4 w-4 mr-2" />
            Vista Previa
          </Button>
        {isSuperAdmin && (
        <>
          <Button
            variant={journey?.is_active ? 'outline' : 'default'}
            onClick={handleToggleActive}
            disabled={isSaving}
            className={journey?.is_active ? '' : 'bg-green-600 hover:bg-green-700'}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : journey?.is_active ? (
              <Archive className="h-4 w-4 mr-2" />
            ) : (
              <Globe className="h-4 w-4 mr-2" />
            )}
            {journey?.is_active ? 'Archivar' : 'Publicar'}
          </Button>
          <Button onClick={openCreateDialog} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Step
          </Button>
        </>
        )}
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Roadmap Visual */}
      <Card>
        <CardHeader>
          <CardTitle>Roadmap del Journey</CardTitle>
          <CardDescription>
            {isSuperAdmin ? 'Visualiza y edita los steps. Arrastra para reordenar.' : 'Visualiza los steps del journey.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p>No hay steps en este journey.</p>
              {isSuperAdmin && (
                <Button onClick={openCreateDialog} variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer step
                </Button>
              )}
            </div>
          ) : (
            <div className="relative">
              {/* Visual Roadmap */}
              <div className="relative bg-slate-50 rounded-xl p-8 min-h-[400px] overflow-hidden border border-slate-200">
                {/* Grid Background */}
                <div
                  className="absolute inset-0 opacity-5"
                  style={{
                    backgroundImage: 'radial-gradient(#0f172a 1px, transparent 1px)',
                    backgroundSize: '30px 30px',
                  }}
                />

                {/* SVG Connections */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {steps.map((step, index) => {
                    if (index === steps.length - 1) return null;
                    const x1 = 10 + (80 / (steps.length - 1 || 1)) * index;
                    const x2 = 10 + (80 / (steps.length - 1 || 1)) * (index + 1);
                    const y = 50;
                    return (
                      <line
                        key={`line-${step.id}`}
                        x1={`${x1}%`}
                        y1={`${y}%`}
                        x2={`${x2}%`}
                        y2={`${y}%`}
                        stroke="#cbd5e1"
                        strokeWidth="3"
                        strokeDasharray="8 4"
                      />
                    );
                  })}
                </svg>

                {/* Step Nodes */}
                {steps.map((step, index) => {
                  const x = steps.length === 1 ? 50 : 10 + (80 / (steps.length - 1)) * index;
                  const Icon = getStepIcon(step.type);

                  return (
                    <div
                      key={step.id}
                      className={cn(
                        'absolute transform -translate-x-1/2 -translate-y-1/2 z-10 group',
                        isSuperAdmin && 'cursor-pointer'
                      )}
                      style={{ left: `${x}%`, top: '50%' }}
                      onClick={isSuperAdmin ? () => openEditDialog(step) : undefined}
                    >
                      {/* Node Circle */}
                      <div
                        className={cn(
                          'w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all',
                          'bg-white border-2 border-slate-300 text-slate-600',
                          isSuperAdmin && 'group-hover:border-teal-500 group-hover:shadow-teal-100 group-hover:scale-110'
                        )}
                      >
                        <Icon className="h-6 w-6" />
                      </div>

                      {/* Order Badge */}
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </div>

                      {/* Label */}
                      <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-32 text-center">
                        <span className="text-xs font-medium text-slate-700 bg-white px-2 py-1 rounded shadow-sm">
                          {step.title}
                        </span>
                      </div>

                      {/* Hover Edit Icon */}
                      {isSuperAdmin && (
                      <div className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center">
                          <Edit2 className="h-3 w-3" />
                        </div>
                      </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Step List with Drag & Drop */}
              <div className="mt-6 space-y-2">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={steps.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {steps.map((step) => (
                      <SortableStepItem
                        key={step.id}
                        step={step}
                        onEdit={openEditDialog}
                        onDelete={handleDeleteStep}
                        readOnly={!isSuperAdmin}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step Dialog */}
      <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingStep ? 'Editar Step' : 'Nuevo Step'}</DialogTitle>
            <DialogDescription>
              Configura los detalles del step.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="step-title">Título</Label>
              <Input
                id="step-title"
                value={stepForm.title}
                onChange={(e) => setStepForm({ ...stepForm, title: e.target.value })}
                placeholder="Ej: Bienvenida al programa"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="step-type">Tipo de Step</Label>
              <Select
                value={stepForm.type}
                onValueChange={(value: ApiStepType) => setStepForm({ ...stepForm, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {STEP_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="step-points">Puntos base</Label>
              <Input
                id="step-points"
                type="number"
                min="0"
                value={stepForm.gamification_rules?.base_points || 0}
                onChange={(e) =>
                  setStepForm({
                    ...stepForm,
                    gamification_rules: {
                      ...stepForm.gamification_rules,
                      base_points: parseInt(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>

            {/* Config fields based on type */}
            {stepForm.type === 'survey' && (
              <div className="space-y-2">
                <Label htmlFor="step-url">URL del formulario (Typeform, etc)</Label>
                <Input
                  id="step-url"
                  value={(stepForm.config?.form_url as string) || ''}
                  onChange={(e) =>
                    setStepForm({
                      ...stepForm,
                      config: { ...stepForm.config, form_url: e.target.value },
                    })
                  }
                  placeholder="https://form.typeform.com/to/..."
                />
                {getTypeformEmbedUrl((stepForm.config?.form_url as string) || '') && (
                  <div className="rounded-lg overflow-hidden border border-slate-200">
                    <iframe
                      src={getTypeformEmbedUrl((stepForm.config?.form_url as string) || '') || ''}
                      className="w-full h-[300px]"
                      frameBorder="0"
                      allow="camera; microphone; autoplay; encrypted-media;"
                    />
                  </div>
                )}
              </div>
            )}

            {stepForm.type === 'content_view' && (
              <div className="space-y-2">
                <Label htmlFor="step-video">URL del video (YouTube, Vimeo)</Label>
                <Input
                  id="step-video"
                  value={(stepForm.config?.video_url as string) || ''}
                  onChange={(e) =>
                    setStepForm({
                      ...stepForm,
                      config: { ...stepForm.config, video_url: e.target.value },
                    })
                  }
                  placeholder="https://youtube.com/watch?v=... o https://vimeo.com/..."
                />
                {getVideoEmbedUrl((stepForm.config?.video_url as string) || '') && (
                  <div className="rounded-lg overflow-hidden border border-slate-200">
                    <iframe
                      src={getVideoEmbedUrl((stepForm.config?.video_url as string) || '') || ''}
                      className="w-full aspect-video"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="step-description">Descripción (opcional)</Label>
              <Textarea
                id="step-description"
                value={(stepForm.config?.description as string) || ''}
                onChange={(e) =>
                  setStepForm({
                    ...stepForm,
                    config: { ...stepForm.config, description: e.target.value },
                  })
                }
                placeholder="Describe qué debe hacer el participante..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setStepDialogOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSaveStep} disabled={isSaving || !stepForm.title}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : editingStep ? (
                  'Guardar cambios'
                ) : (
                  'Crear Step'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
