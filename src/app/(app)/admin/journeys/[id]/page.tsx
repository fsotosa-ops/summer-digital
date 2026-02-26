'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { adminService } from '@/services/admin.service';
import { organizationService } from '@/services/organization.service';
import { toast } from 'sonner';
import { ApiJourneyAdminRead, ApiJourneyUpdate, ApiStepAdminRead, ApiStepCreate, ApiStepUpdate, ApiStepType, ApiOrganization, ApiRewardRead, ApiUnlockCondition } from '@/types/api.types';
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
  FileDown,
  Presentation,
  Gamepad2,
  ExternalLink,
  Link,
  Building2,
  ChevronDown,
  ChevronUp,
  Trophy,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MultiSelect } from '@/components/ui/multi-select';
import { detectAndResolveUrl, getResourceLabel, type DetectedResource } from '@/lib/url-detection';
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
  { value: 'milestone', label: 'Desafío', icon: Gamepad2 },
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

function getStepIcon(type: ApiStepType, config?: Record<string, unknown>) {
  // Check config.resource.type for specific icons
  const resource = config?.resource as Record<string, unknown> | undefined;
  if (resource?.type) {
    switch (resource.type) {
      case 'pdf':
      case 'google_drive_pdf':
        return FileDown;
      case 'google_slides':
        return Presentation;
      case 'kahoot':
        return Gamepad2;
    }
  }
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

  const Icon = getStepIcon(step.type, step.config);

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

/** Extract the source URL from step config for display in the URL field (backward compatible) */
function getStepResourceUrl(config: Record<string, unknown> | undefined, stepType: 'content_view' | 'survey' | 'resource_consumption' | 'milestone'): string {
  if (!config) return '';
  const resource = config.resource as Record<string, unknown> | undefined;
  if (resource?.source_url) return resource.source_url as string;
  // Legacy fallback
  if (stepType === 'content_view') return (config.video_url as string) || '';
  if (stepType === 'survey') return (config.form_url as string) || '';
  if (stepType === 'resource_consumption') return (config.url as string) || '';
  if (stepType === 'milestone') return (config.url as string) || '';
  return '';
}

/** Reusable URL field with auto-detection, badge, and preview */
function StepUrlField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (url: string, detected: DetectedResource | null) => void;
}) {
  const [inputUrl, setInputUrl] = useState(value);
  const detected = inputUrl ? detectAndResolveUrl(inputUrl) : null;

  // Sync when parent value changes (e.g., opening edit dialog)
  useEffect(() => {
    setInputUrl(value);
  }, [value]);

  const handleChange = (newUrl: string) => {
    setInputUrl(newUrl);
    const result = detectAndResolveUrl(newUrl);
    onChange(newUrl, result);
  };

  const isEmbeddable = detected && detected.type !== 'kahoot' && detected.type !== 'generic_link';
  const isKahoot = detected?.type === 'kahoot';

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          value={inputUrl}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        {detected && (
          <Badge variant="secondary" className="whitespace-nowrap text-xs">
            {detected.type === 'pdf' || detected.type === 'google_drive_pdf' ? (
              <FileDown className="h-3 w-3 mr-1" />
            ) : detected.type === 'google_slides' ? (
              <Presentation className="h-3 w-3 mr-1" />
            ) : detected.type === 'kahoot' ? (
              <Gamepad2 className="h-3 w-3 mr-1" />
            ) : detected.type === 'youtube' || detected.type === 'vimeo' ? (
              <Video className="h-3 w-3 mr-1" />
            ) : detected.type === 'typeform' ? (
              <FileText className="h-3 w-3 mr-1" />
            ) : (
              <Link className="h-3 w-3 mr-1" />
            )}
            {detected.label}
          </Badge>
        )}
      </div>

      {/* Preview iframe for embeddable types */}
      {isEmbeddable && (
        <div className="rounded-lg overflow-hidden border border-slate-200">
          <iframe
            src={detected.embedUrl}
            className={cn(
              'w-full',
              detected.type === 'youtube' || detected.type === 'vimeo' || detected.type === 'google_slides'
                ? 'aspect-video'
                : detected.type === 'typeform'
                ? 'h-[300px]'
                : 'h-[400px]'
            )}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; camera; microphone"
            allowFullScreen
          />
        </div>
      )}

      {/* Kahoot: external link indicator */}
      {isKahoot && (
        <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
          <Gamepad2 className="h-4 w-4" />
          <span>Kahoot se abrirá en una nueva pestaña para los participantes.</span>
          <a href={detected.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-purple-600 hover:underline">
            Probar <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}

/* ─── Thumbnail URL card ─────────────────────────────── */
function ThumbnailCard({
  journey,
  orgId,
  onSaved,
}: {
  journey: ApiJourneyAdminRead | null;
  orgId: string | undefined;
  onSaved: (url: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [url, setUrl] = useState(journey?.thumbnail_url || '');
  const [saving, setSaving] = useState(false);

  // Keep in sync if journey changes from outside
  useEffect(() => { setUrl(journey?.thumbnail_url || ''); }, [journey?.thumbnail_url]);

  const handleSave = async () => {
    if (!orgId || !journey) return;
    setSaving(true);
    try {
      await adminService.updateJourney(orgId, journey.id, { thumbnail_url: url || null } as ApiJourneyUpdate);
      onSaved(url || null);
    } catch {
      // silencioso
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-100
                   hover:bg-slate-50 transition-colors cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-gradient-to-br from-fuchsia-400 to-purple-500
                          flex items-center justify-center shrink-0">
            <span className="text-white text-[9px] font-bold">IMG</span>
          </div>
          <span className="text-sm font-semibold text-slate-700">Imagen de portada</span>
          {journey?.thumbnail_url && (
            <span className="text-xs bg-teal-50 text-teal-700 border border-teal-100 px-1.5 py-0.5 rounded-full">
              Configurada
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-slate-400" />
          : <ChevronDown className="h-4 w-4 text-slate-400" />
        }
      </button>
      <p className="px-6 pb-3 text-xs text-slate-400 -mt-1">
        URL de imagen que reemplaza el gradiente de color en las tarjetas del journey.
      </p>

      {expanded && (
        <div className="px-6 pb-6 space-y-4">
          {/* Preview */}
          {url && (
            <div className="rounded-xl overflow-hidden h-32 border border-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 text-sm"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold
                         bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white
                         hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Guardar
            </button>
            {url && (
              <button
                onClick={() => { setUrl(''); }}
                className="px-3 py-2 rounded-lg text-sm text-slate-400 border border-slate-200
                           hover:bg-slate-50 transition-colors"
                title="Quitar imagen"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Usa una imagen de 16:9 (ej: 1280×720) para mejor resultado.
          </p>
        </div>
      )}
    </div>
  );
}

export default function JourneyEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const journeyId = params.id as string;

  const isSuperAdmin = user?.role === 'SuperAdmin';
  const canEdit = isSuperAdmin || user?.role === 'Admin';

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
  // In-session cache: preserves config per type when switching types in the dialog
  const [configsByType, setConfigsByType] = useState<Partial<Record<ApiStepType, Record<string, unknown>>>>({});

  // Rewards assignment
  const [rewards, setRewards] = useState<ApiRewardRead[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardsExpanded, setRewardsExpanded] = useState(false);
  const [savingReward, setSavingReward] = useState(false);

  // Onboarding journey config
  const [isSettingOnboarding, setIsSettingOnboarding] = useState(false);

  // Org assignment management (SuperAdmin only)
  const [allOrgs, setAllOrgs] = useState<ApiOrganization[]>([]);
  const [assignedOrgIds, setAssignedOrgIds] = useState<string[]>([]);
  const [initialOrgIds, setInitialOrgIds] = useState<string[]>([]);
  const [loadingOrgAssign, setLoadingOrgAssign] = useState(false);
  const [savingOrgs, setSavingOrgs] = useState(false);

  const orgsDirty = (() => {
    if (assignedOrgIds.length !== initialOrgIds.length) return true;
    const initialSet = new Set(initialOrgIds);
    return assignedOrgIds.some(id => !initialSet.has(id));
  })();

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

  // Load all orgs + current journey org assignments (SuperAdmin only)
  useEffect(() => {
    if (!isSuperAdmin || !journey) return;
    const load = async () => {
      setLoadingOrgAssign(true);
      try {
        const [orgs, resp] = await Promise.all([
          organizationService.listMyOrganizations(),
          adminService.getJourneyOrganizations(journeyId),
        ]);
        const sorted = [...orgs].sort((a, b) => {
          if (a.slug === 'fundacion-summer') return -1;
          if (b.slug === 'fundacion-summer') return 1;
          return 0;
        });
        setAllOrgs(sorted);
        const currentIds = resp.organizations.map((o) => o.organization_id);
        setAssignedOrgIds(currentIds);
        setInitialOrgIds([...currentIds]);
      } catch { /* silencioso */ }
      finally { setLoadingOrgAssign(false); }
    };
    load();
  }, [isSuperAdmin, journey, journeyId]);

  const handleSaveOrgs = async () => {
    setSavingOrgs(true);
    try {
      const initialSet = new Set(initialOrgIds);
      const assignedSet = new Set(assignedOrgIds);
      const toAssign = assignedOrgIds.filter((id) => !initialSet.has(id));
      const toUnassign = initialOrgIds.filter((id) => !assignedSet.has(id));
      if (toAssign.length > 0) await adminService.assignJourneyOrganizations(journeyId, toAssign);
      if (toUnassign.length > 0) await adminService.unassignJourneyOrganizations(journeyId, toUnassign);
      setInitialOrgIds([...assignedOrgIds]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar organizaciones');
    } finally {
      setSavingOrgs(false);
    }
  };

  // Load rewards catalog whenever the journey (and orgId) becomes available
  useEffect(() => {
    if (!journey || !orgId) return;
    const load = async () => {
      setRewardsLoading(true);
      try {
        const data = await adminService.listRewards(orgId);
        setRewards(data);
      } catch { /* silencioso — rewards son opcionales */ }
      finally { setRewardsLoading(false); }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey?.id, orgId]);

  // --- Reward helpers ---

  const getStepReward = (stepId: string): ApiRewardRead | undefined =>
    rewards.find((r) => {
      const uc = r.unlock_condition as ApiUnlockCondition | Record<string, unknown>;
      if ('conditions' in uc && Array.isArray((uc as ApiUnlockCondition).conditions)) {
        return (uc as ApiUnlockCondition).conditions.some(
          (c) => c.type === 'step_completed' && c.step_id === stepId
        );
      }
      return false;
    });

  const getJourneyCompletionReward = (): ApiRewardRead | undefined =>
    rewards.find((r) => {
      const uc = r.unlock_condition as ApiUnlockCondition | Record<string, unknown>;
      if ('conditions' in uc && Array.isArray((uc as ApiUnlockCondition).conditions)) {
        return (uc as ApiUnlockCondition).conditions.some(
          (c) =>
            c.type === 'journey_completed' &&
            (!c.journey_id || c.journey_id === journey?.id)
        );
      }
      return false;
    });

  const linkedRewardsCount = rewards.filter((r) => {
    const uc = r.unlock_condition as ApiUnlockCondition | Record<string, unknown>;
    if (!('conditions' in uc)) return false;
    const conditions = (uc as ApiUnlockCondition).conditions;
    return conditions.some(
      (c) =>
        (c.type === 'step_completed' && steps.some((s) => s.id === c.step_id)) ||
        (c.type === 'journey_completed' && (!c.journey_id || c.journey_id === journey?.id))
    );
  }).length;

  const handleLinkRewardToStep = async (stepId: string, rewardId: string | null) => {
    if (!orgId || savingReward) return;
    setSavingReward(true);
    try {
      const prev = getStepReward(stepId);
      if (prev) {
        await adminService.updateReward(orgId, prev.id, {
          unlock_condition: { operator: 'AND', conditions: [] },
        });
      }
      if (rewardId) {
        await adminService.updateReward(orgId, rewardId, {
          unlock_condition: { operator: 'AND', conditions: [{ type: 'step_completed', step_id: stepId }] },
        });
      }
      setRewards(await adminService.listRewards(orgId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar recompensa');
    } finally {
      setSavingReward(false);
    }
  };

  const handleLinkRewardToJourney = async (rewardId: string | null) => {
    if (!orgId || !journey || savingReward) return;
    setSavingReward(true);
    try {
      const prev = getJourneyCompletionReward();
      if (prev) {
        await adminService.updateReward(orgId, prev.id, {
          unlock_condition: { operator: 'AND', conditions: [] },
        });
      }
      if (rewardId) {
        await adminService.updateReward(orgId, rewardId, {
          unlock_condition: {
            operator: 'AND',
            conditions: [{ type: 'journey_completed', journey_id: journey.id }],
          },
        });
      }
      setRewards(await adminService.listRewards(orgId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar recompensa');
    } finally {
      setSavingReward(false);
    }
  };

  const openCreateDialog = () => {
    setEditingStep(null);
    setStepForm({
      title: '',
      type: 'content_view',
      config: {},
      gamification_rules: { base_points: 10 },
    });
    setConfigsByType({});
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
    setConfigsByType({ [step.type]: step.config || {} });
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

  const handleSetAsOnboarding = async () => {
    if (!orgId || !journey || isSettingOnboarding) return;
    setIsSettingOnboarding(true);
    try {
      await adminService.updateGamificationConfig(orgId, {
        profile_completion_journey_id: journey.id,
      });
      toast.success(`"${journey.title}" marcado como Journey de Onboarding`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar configuración');
    } finally {
      setIsSettingOnboarding(false);
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
      {/* ── Header card ────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Gradient hero / thumbnail */}
        {journey?.thumbnail_url ? (
          <div className="relative h-36 sm:h-44 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={journey.thumbnail_url} alt={journey.title}
              className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            {/* Back button */}
            <button onClick={() => router.push('/admin/journeys')}
              className="absolute top-3 left-3 h-8 w-8 rounded-lg bg-black/30 backdrop-blur-sm
                         text-white flex items-center justify-center hover:bg-black/50 transition-colors">
              <ChevronLeft size={16} />
            </button>
            {/* Status badge */}
            <div className="absolute top-3 right-3">
              <span className={cn(
                'text-xs font-bold px-2.5 py-1 rounded-full',
                journey.is_active
                  ? 'bg-fuchsia-500 text-white'
                  : 'bg-white/20 backdrop-blur-sm text-white border border-white/30'
              )}>
                {journey.is_active ? 'Activo' : 'Borrador'}
              </span>
            </div>
          </div>
        ) : (
          <div className="h-[3px] bg-gradient-to-r from-fuchsia-500 via-purple-500 to-teal-400" />
        )}

        <div className="p-4 sm:p-6">
          {/* Back + title row */}
          <div className="flex items-start gap-3">
            {!journey?.thumbnail_url && (
              <button onClick={() => router.push('/admin/journeys')}
                className="h-8 w-8 rounded-lg border border-slate-200 text-slate-500
                           flex items-center justify-center hover:bg-slate-50 transition-colors shrink-0 mt-0.5">
                <ChevronLeft size={16} />
              </button>
            )}
            <div className="flex-1 min-w-0">
              {/* Title (inline editable) */}
              {isEditingTitle ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    className="text-xl font-bold h-9 min-w-0 flex-1"
                    autoFocus
                  />
                  <button onClick={handleSaveTitle} disabled={isSaving}
                    className="h-8 w-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 transition-colors">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setIsEditingTitle(false)}
                    className="h-8 w-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <h1
                    className={cn(
                      'text-xl font-bold text-slate-900 truncate',
                      canEdit && 'cursor-pointer hover:text-fuchsia-600 transition-colors'
                    )}
                    onClick={canEdit ? () => { setEditTitle(journey?.title || ''); setIsEditingTitle(true); } : undefined}
                    title={canEdit ? 'Click para editar' : undefined}
                  >
                    {journey?.title}
                  </h1>
                  {!journey?.thumbnail_url && (
                    <Badge variant="outline" className={cn(
                      'text-xs font-semibold shrink-0',
                      journey?.is_active
                        ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    )}>
                      {journey?.is_active ? 'Activo' : 'Borrador'}
                    </Badge>
                  )}
                </div>
              )}
              <p className="text-sm text-slate-400 mt-1 truncate">
                {journey?.description || 'Sin descripción'} · /{journey?.slug}
              </p>
            </div>
          </div>

          {/* Actions row */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => router.push(`/admin/journeys/${journeyId}/preview`)}
              disabled={steps.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200
                         text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Eye size={14} /> Vista Previa
            </button>

            {canEdit && (
              <>
                <button
                  onClick={handleSetAsOnboarding}
                  disabled={isSettingOnboarding || !orgId}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200
                             text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors
                             disabled:opacity-40"
                >
                  {isSettingOnboarding
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Rocket size={14} />}
                  Onboarding
                </button>

                <button
                  onClick={handleToggleActive}
                  disabled={isSaving}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40',
                    journey?.is_active
                      ? 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:opacity-90'
                  )}
                >
                  {isSaving
                    ? <Loader2 size={14} className="animate-spin" />
                    : journey?.is_active
                    ? <Archive size={14} />
                    : <Globe size={14} />
                  }
                  {journey?.is_active ? 'Archivar' : 'Publicar'}
                </button>

                <button
                  onClick={openCreateDialog}
                  className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold
                             bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:opacity-90 transition-opacity"
                >
                  <Plus size={14} /> Agregar Step
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Roadmap Visual */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Roadmap del Journey</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {canEdit ? 'Arrastra para reordenar. Click en un nodo para editar.' : 'Vista de los steps del journey.'}
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            {steps.length} step{steps.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="p-4 sm:p-6">
          {steps.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p>No hay steps en este journey.</p>
              {canEdit && (
                <button onClick={openCreateDialog}
                  className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200
                             text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors mx-auto">
                  <Plus size={14} /> Crear primer step
                </button>
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
                  const Icon = getStepIcon(step.type, step.config);

                  return (
                    <div
                      key={step.id}
                      className={cn(
                        'absolute transform -translate-x-1/2 -translate-y-1/2 z-10 group',
                        canEdit && 'cursor-pointer'
                      )}
                      style={{ left: `${x}%`, top: '50%' }}
                      onClick={canEdit ? () => openEditDialog(step) : undefined}
                    >
                      {/* Node Circle */}
                      <div
                        className={cn(
                          'w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all',
                          'bg-white border-2 border-slate-300 text-slate-600',
                          canEdit && 'group-hover:border-teal-500 group-hover:shadow-teal-100 group-hover:scale-110'
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
                      {canEdit && (
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
                        readOnly={!canEdit}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recompensas del Journey */}
      {canEdit && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-100
                       hover:bg-slate-50 transition-colors cursor-pointer select-none"
            onClick={() => setRewardsExpanded((v) => !v)}
          >
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-semibold text-slate-700">Recompensas del Journey</span>
              {linkedRewardsCount > 0 && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  {linkedRewardsCount} asignada{linkedRewardsCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {rewardsExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
          <p className="px-6 pb-3 text-xs text-slate-400 -mt-1">
            Asigna badges o puntos extra que se otorgan al completar un step o el journey completo.
          </p>

          {rewardsExpanded && (
            <div className="px-6 pb-6 space-y-5">
              {rewardsLoading ? (
                <div className="flex items-center gap-2 py-3 text-slate-400 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando recompensas...
                </div>
              ) : rewards.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">
                  No hay recompensas en el catálogo de esta organización.{' '}
                  <span className="text-slate-500">Créalas primero en <strong>Gamificación → Recompensas</strong>.</span>
                </p>
              ) : (
                <>
                  {/* Journey completion reward */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      Al completar el Journey
                    </p>
                    <Select
                      value={getJourneyCompletionReward()?.id ?? '__none__'}
                      onValueChange={(val) =>
                        handleLinkRewardToJourney(val === '__none__' ? null : val)
                      }
                      disabled={savingReward}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sin recompensa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin recompensa</SelectItem>
                        {rewards.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                            {r.points > 0 ? ` (+${r.points} pts)` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="h-px bg-slate-100" />

                  {/* Per-step rewards */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      <Star className="h-4 w-4 text-slate-400" />
                      Por step completado
                    </p>
                    {steps.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Agrega steps al journey para asignarles recompensas.
                      </p>
                    ) : (
                      steps.map((step) => {
                        const Icon = getStepIcon(step.type, step.config);
                        return (
                          <div key={step.id} className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <Icon className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">
                              {step.title}
                            </span>
                            <div className="w-56 flex-shrink-0">
                              <Select
                                value={getStepReward(step.id)?.id ?? '__none__'}
                                onValueChange={(val) =>
                                  handleLinkRewardToStep(step.id, val === '__none__' ? null : val)
                                }
                                disabled={savingReward}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Sin recompensa" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Sin recompensa</SelectItem>
                                  {rewards.map((r) => (
                                    <SelectItem key={r.id} value={r.id}>
                                      {r.name}
                                      {r.points > 0 ? ` (+${r.points} pts)` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Organizaciones habilitadas — solo SuperAdmin */}
      {isSuperAdmin && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-5 w-5 text-fuchsia-500" />
              <span className="text-sm font-semibold text-slate-700">Organizaciones habilitadas</span>
              {assignedOrgIds.length > 0 && (
                <span className="text-xs bg-fuchsia-100 text-fuchsia-700 px-2 py-0.5 rounded-full">
                  {assignedOrgIds.length}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Selecciona las organizaciones que tienen acceso a este journey.
            </p>
          </div>

          <div className="px-6 py-4 space-y-3">
            {loadingOrgAssign ? (
              <div className="flex items-center gap-2 py-3 text-slate-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
              </div>
            ) : allOrgs.length === 0 ? (
              <p className="text-xs text-slate-400">No hay organizaciones disponibles.</p>
            ) : (
              <>
                <MultiSelect
                  options={allOrgs.map(o => ({ value: o.id, label: o.name }))}
                  selected={assignedOrgIds}
                  onChange={setAssignedOrgIds}
                  placeholder="Buscar y seleccionar organizaciones..."
                />

                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    {assignedOrgIds.length === 0
                      ? 'Sin selección = abierto para todas las organizaciones.'
                      : `${assignedOrgIds.length} organización(es) seleccionada(s).`}
                  </p>
                  <Button
                    size="sm"
                    onClick={handleSaveOrgs}
                    disabled={savingOrgs || !orgsDirty}
                  >
                    {savingOrgs ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Guardar organizaciones'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Thumbnail URL ── (collapsible card, canEdit only) */}
      {canEdit && (
        <ThumbnailCard
          journey={journey}
          orgId={orgId}
          onSaved={(url) => setJourney(j => j ? { ...j, thumbnail_url: url } : j)}
        />
      )}

      {/* Step Dialog */}
      <Dialog open={stepDialogOpen} onOpenChange={(open) => {
        setStepDialogOpen(open);
        if (!open) setConfigsByType({});
      }}>
        <DialogContent className="sm:max-w-[600px]">
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
                onValueChange={(value: ApiStepType) => {
                  const currentType = stepForm.type;
                  if (value === currentType) return;
                  // Save current config keyed by current type
                  const currentDescription = stepForm.config?.description;
                  setConfigsByType((prev) => ({ ...prev, [currentType]: stepForm.config || {} }));
                  // Restore cached config for new type, or start fresh
                  const restored = configsByType[value] || {};
                  // Carry over description if the restored config doesn't have one
                  if (currentDescription && !restored.description) {
                    restored.description = currentDescription;
                  }
                  setStepForm({ ...stepForm, type: value, config: restored });
                }}
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

            {/* URL field for content_view (videos only) */}
            {stepForm.type === 'content_view' && (
              <StepUrlField
                label="URL del video"
                placeholder="https://youtube.com/watch?v=... o https://vimeo.com/..."
                value={getStepResourceUrl(stepForm.config, 'content_view')}
                onChange={(_url, detected) => {
                  const newConfig: Record<string, unknown> = { ...stepForm.config, description: stepForm.config?.description };
                  delete newConfig.video_url;
                  if (detected) {
                    newConfig.resource = { type: detected.type, source_url: detected.sourceUrl, embed_url: detected.embedUrl };
                  } else {
                    delete newConfig.resource;
                  }
                  setStepForm({ ...stepForm, config: newConfig });
                }}
              />
            )}

            {/* URL field for resource_consumption (PDF, Google Slides, Google Drive) */}
            {stepForm.type === 'resource_consumption' && (
              <StepUrlField
                label="URL del recurso"
                placeholder="Google Slides, PDF, Google Drive..."
                value={getStepResourceUrl(stepForm.config, 'resource_consumption')}
                onChange={(_url, detected) => {
                  const newConfig: Record<string, unknown> = { ...stepForm.config, description: stepForm.config?.description };
                  delete newConfig.url;
                  if (detected) {
                    newConfig.resource = { type: detected.type, source_url: detected.sourceUrl, embed_url: detected.embedUrl };
                  } else {
                    delete newConfig.resource;
                  }
                  setStepForm({ ...stepForm, config: newConfig });
                }}
              />
            )}

            {/* URL field for survey */}
            {stepForm.type === 'survey' && (
              <StepUrlField
                label="URL del formulario"
                placeholder="https://form.typeform.com/to/..."
                value={getStepResourceUrl(stepForm.config, 'survey')}
                onChange={(_url, detected) => {
                  const newConfig: Record<string, unknown> = { ...stepForm.config, description: stepForm.config?.description };
                  delete newConfig.form_url;
                  if (detected) {
                    newConfig.resource = { type: detected.type, source_url: detected.sourceUrl, embed_url: detected.embedUrl };
                  } else {
                    delete newConfig.resource;
                  }
                  setStepForm({ ...stepForm, config: newConfig });
                }}
              />
            )}

            {/* URL field for milestone/desafío (optional — can be presencial) */}
            {stepForm.type === 'milestone' && (
              <StepUrlField
                label="URL del desafío (opcional)"
                placeholder="Kahoot, Quizizz, Genially... o dejar vacío si es presencial"
                value={getStepResourceUrl(stepForm.config, 'milestone')}
                onChange={(_url, detected) => {
                  const newConfig: Record<string, unknown> = { ...stepForm.config, description: stepForm.config?.description };
                  delete newConfig.url;
                  if (detected) {
                    newConfig.resource = { type: detected.type, source_url: detected.sourceUrl, embed_url: detected.embedUrl };
                  } else {
                    delete newConfig.resource;
                  }
                  setStepForm({ ...stepForm, config: newConfig });
                }}
              />
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