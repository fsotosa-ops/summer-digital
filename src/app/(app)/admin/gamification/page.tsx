'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { gamificationService } from '@/services/gamification.service';
import { journeyService } from '@/services/journey.service';
import { organizationService } from '@/services/organization.service';
import {
  ApiLevelRead,
  ApiLevelCreate,
  ApiLevelUpdate,
  ApiRewardRead,
  ApiRewardCreate,
  ApiRewardUpdate,
  ApiUnlockConditionItem,
  ApiJourneyAdminRead,
  ApiStepAdminRead,
  ApiOrganization,
  ApiGamificationConfigRead,
  ApiGamificationConfigCreate,
} from '@/types/api.types';
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
  Loader2,
  Trash2,
  Edit2,
  Plus,
  Trophy,
  Star,
  Award,
  TrendingUp,
  Settings,
  X,
  Zap,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'levels' | 'rewards' | 'config';

// --------------------------------------------------------------------------
// Condition helpers
// --------------------------------------------------------------------------

const CONDITION_LABELS: Record<string, string> = {
  profile_completion: 'Completar perfil',
  min_points:         'Puntos mínimos',
  journey_completed:  'Journey completado',
  step_completed:     'Step completado',
};

interface RewardFormState {
  name: string;
  type: string;
  description: string;
  icon_url: string;
  points: number;
  unlock_operator: 'AND' | 'OR';
  conditions: ApiUnlockConditionItem[];
}

const EMPTY_REWARD_FORM: RewardFormState = {
  name: '',
  type: '',
  description: '',
  icon_url: '',
  points: 0,
  unlock_operator: 'AND',
  conditions: [],
};

function formToPayload(form: RewardFormState): ApiRewardCreate {
  return {
    name: form.name,
    description: form.description || null,
    type: form.type,
    icon_url: form.icon_url || undefined,
    points: form.points,
    unlock_condition: { operator: form.unlock_operator, conditions: form.conditions },
  };
}

function rewardToForm(reward: ApiRewardRead): RewardFormState {
  const uc = reward.unlock_condition as { operator?: string; conditions?: ApiUnlockConditionItem[] };
  return {
    name: reward.name,
    type: reward.type,
    description: reward.description ?? '',
    icon_url: reward.icon_url ?? '',
    points: reward.points ?? 0,
    unlock_operator: (uc?.operator as 'AND' | 'OR') ?? 'AND',
    conditions: uc?.conditions ?? [],
  };
}

// --------------------------------------------------------------------------
// ConditionRow — fila individual del builder, carga steps dinámicamente
// --------------------------------------------------------------------------

function ConditionRow({
  condition,
  onChange,
  onRemove,
  journeys,
  orgId,
}: {
  condition: ApiUnlockConditionItem;
  onChange: (updated: ApiUnlockConditionItem) => void;
  onRemove: () => void;
  journeys: ApiJourneyAdminRead[];
  orgId: string;
}) {
  const [steps, setSteps] = useState<ApiStepAdminRead[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);

  // Cuando cambia a step_completed + hay journey seleccionado, carga los steps
  useEffect(() => {
    if (condition.type === 'step_completed' && condition.journey_id) {
      setLoadingSteps(true);
      journeyService
        .listAdminSteps(orgId, condition.journey_id)
        .then(setSteps)
        .catch(() => setSteps([]))
        .finally(() => setLoadingSteps(false));
    } else {
      setSteps([]);
    }
  }, [condition.type, condition.journey_id, orgId]);

  return (
    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
      <div className="flex items-center gap-2">
        {/* Tipo de condición */}
        <Select
          value={condition.type}
          onValueChange={(v) => onChange({ type: v as ApiUnlockConditionItem['type'] })}
        >
          <SelectTrigger className="h-8 text-sm flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="profile_completion">Completar perfil</SelectItem>
            <SelectItem value="min_points">Puntos mínimos</SelectItem>
            <SelectItem value="journey_completed">Journey completado</SelectItem>
            <SelectItem value="step_completed">Step completado</SelectItem>
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* min_points: campo numérico */}
      {condition.type === 'min_points' && (
        <Input
          type="number"
          min={0}
          placeholder="Puntos mínimos requeridos, ej: 100"
          className="h-8 text-sm"
          value={condition.value ?? ''}
          onChange={(e) => onChange({ ...condition, value: parseInt(e.target.value) || 0 })}
        />
      )}

      {/* journey_completed: selector de journey */}
      {condition.type === 'journey_completed' && (
        <Select
          value={condition.journey_id ?? ''}
          onValueChange={(v) => onChange({ ...condition, journey_id: v })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Selecciona un journey..." />
          </SelectTrigger>
          <SelectContent>
            {journeys.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">Sin journeys disponibles</p>
            ) : (
              journeys.map((j) => (
                <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}

      {/* step_completed: selector de journey → luego selector de step */}
      {condition.type === 'step_completed' && (
        <>
          <Select
            value={condition.journey_id ?? ''}
            onValueChange={(v) =>
              onChange({ ...condition, journey_id: v, step_id: undefined })
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="1. Selecciona un journey..." />
            </SelectTrigger>
            <SelectContent>
              {journeys.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-400">Sin journeys disponibles</p>
              ) : (
                journeys.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {condition.journey_id && (
            <Select
              value={condition.step_id ?? ''}
              onValueChange={(v) => onChange({ ...condition, step_id: v })}
              disabled={loadingSteps}
            >
              <SelectTrigger className="h-8 text-sm">
                {loadingSteps
                  ? <span className="flex items-center gap-1.5 text-slate-400"><Loader2 className="h-3 w-3 animate-spin" />Cargando steps...</span>
                  : <SelectValue placeholder="2. Selecciona un step..." />
                }
              </SelectTrigger>
              <SelectContent>
                {steps.length === 0 && !loadingSteps ? (
                  <p className="px-3 py-2 text-xs text-slate-400">Sin steps disponibles</p>
                ) : (
                  steps
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.order_index + 1}. {s.title}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          )}
        </>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Condition pills — resumen en la tarjeta del catálogo
// --------------------------------------------------------------------------

function ConditionPills({
  reward,
  journeys,
}: {
  reward: ApiRewardRead;
  journeys: ApiJourneyAdminRead[];
}) {
  const uc = reward.unlock_condition as { operator?: string; conditions?: ApiUnlockConditionItem[] };
  const conditions = uc?.conditions ?? [];
  if (conditions.length === 0) return <span className="text-xs text-slate-400">Sin condición automática</span>;

  const journeyTitle = (id?: string) =>
    id ? (journeys.find((j) => j.id === id)?.title ?? id.slice(0, 8) + '…') : '';

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {conditions.map((c, i) => (
        <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
          {CONDITION_LABELS[c.type] ?? c.type}
          {c.type === 'min_points' && c.value != null ? ` ≥${c.value} pts` : ''}
          {c.type === 'journey_completed' && c.journey_id ? `: ${journeyTitle(c.journey_id)}` : ''}
          {c.type === 'step_completed' && c.journey_id ? `: ${journeyTitle(c.journey_id)}` : ''}
        </span>
      ))}
      {conditions.length > 1 && (
        <span className="text-xs font-semibold text-slate-400">{uc?.operator ?? 'AND'}</span>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------

export default function GamificationAdminPage() {
  const { user } = useAuthStore();
  const orgId = user?.organizationId;
  const searchParams = useSearchParams();
  const prefilledJourneyId = searchParams.get('journey_id');
  const didPrefill = useRef(false);

  const [activeTab, setActiveTab] = useState<Tab>(prefilledJourneyId ? 'rewards' : 'levels');

  // Journeys para los selects del builder de condiciones
  const [journeys, setJourneys] = useState<ApiJourneyAdminRead[]>([]);

  // Orgs disponibles + orgs asignadas a la recompensa en edición
  const [allOrgs, setAllOrgs] = useState<ApiOrganization[]>([]);
  const [assignedOrgIds, setAssignedOrgIds] = useState<Set<string>>(new Set());
  const [loadingOrgAssign, setLoadingOrgAssign] = useState(false);

  // Levels
  const [levels, setLevels] = useState<ApiLevelRead[]>([]);
  const [isLoadingLevels, setIsLoadingLevels] = useState(true);
  const [levelDialogOpen, setLevelDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<ApiLevelRead | null>(null);
  const [levelForm, setLevelForm] = useState<ApiLevelCreate>({ name: '', min_points: 0 });

  // Rewards
  const [rewards, setRewards] = useState<ApiRewardRead[]>([]);
  const [isLoadingRewards, setIsLoadingRewards] = useState(true);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<ApiRewardRead | null>(null);
  const [rewardForm, setRewardForm] = useState<RewardFormState>(EMPTY_REWARD_FORM);

  // Config
  const [config, setConfig] = useState<ApiGamificationConfigRead | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [configForm, setConfigForm] = useState<ApiGamificationConfigCreate>({
    points_enabled: true,
    levels_enabled: true,
    rewards_enabled: true,
    points_multiplier: 1.0,
    default_step_points: 10,
    profile_completion_points: 0,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pointsAutoCalculated, setPointsAutoCalculated] = useState(false);

  // Auto-calculate reward points from journey/step conditions
  const recalcPoints = async (conditions: ApiUnlockConditionItem[], type: string) => {
    if (!orgId || type !== 'points') return;
    const relevant = conditions.filter(
      (c) =>
        (c.type === 'journey_completed' && c.journey_id) ||
        (c.type === 'step_completed' && c.journey_id && c.step_id),
    );
    if (relevant.length === 0) return;

    let total = 0;
    for (const cond of relevant) {
      try {
        const steps = await journeyService.listAdminSteps(orgId, cond.journey_id!);
        if (cond.type === 'journey_completed') {
          total += steps.reduce((sum, s) => sum + (s.gamification_rules?.base_points ?? 0), 0);
        } else if (cond.type === 'step_completed' && cond.step_id) {
          const step = steps.find((s) => s.id === cond.step_id);
          if (step) total += step.gamification_rules?.base_points ?? 0;
        }
      } catch {
        /* ignore */
      }
    }
    if (total > 0) {
      setRewardForm((prev) => ({ ...prev, points: total }));
      setPointsAutoCalculated(true);
    }
  };

  const fetchConfig = async () => {
    if (!orgId) return;
    setIsLoadingConfig(true);
    try {
      const data = await gamificationService.getConfig(orgId);
      setConfig(data);
      if (data) {
        setConfigForm({
          points_enabled: data.points_enabled,
          levels_enabled: data.levels_enabled,
          rewards_enabled: data.rewards_enabled,
          points_multiplier: data.points_multiplier,
          default_step_points: data.default_step_points,
          profile_completion_points: data.profile_completion_points ?? 0,
        });
      }
    } catch { /* silencioso */ }
    finally { setIsLoadingConfig(false); }
  };

  const fetchLevels = async () => {
    if (!orgId) return;
    setIsLoadingLevels(true);
    try { setLevels(await gamificationService.listLevels(orgId)); }
    catch { /* silencioso */ }
    finally { setIsLoadingLevels(false); }
  };

  const fetchRewards = async () => {
    if (!orgId) return;
    setIsLoadingRewards(true);
    try { setRewards(await gamificationService.listRewards(orgId)); }
    catch { /* silencioso */ }
    finally { setIsLoadingRewards(false); }
  };

  const fetchJourneys = async () => {
    if (!orgId) return;
    try { setJourneys(await journeyService.listAdminJourneys(orgId)); }
    catch { /* silencioso */ }
  };

  const fetchAllOrgs = async () => {
    try { setAllOrgs(await organizationService.listMyOrganizations()); }
    catch { /* silencioso */ }
  };

  // Recalculate points state
  const [isRecalculating, setIsRecalculating] = useState(false);

  useEffect(() => {
    fetchLevels();
    fetchRewards();
    fetchConfig();
    fetchJourneys();
    fetchAllOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // Pre-fill reward form when arriving with ?journey_id
  useEffect(() => {
    if (!prefilledJourneyId || didPrefill.current || isLoadingRewards) return;
    didPrefill.current = true;
    setActiveTab('rewards');
    setEditingReward(null);
    setRewardForm({
      ...EMPTY_REWARD_FORM,
      conditions: [{ type: 'journey_completed', journey_id: prefilledJourneyId }],
    });
    setAssignedOrgIds(new Set(orgId ? [orgId] : []));
    setPointsAutoCalculated(false);
    setRewardDialogOpen(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledJourneyId, isLoadingRewards]);

  // Recalculate points handler
  const handleRecalculatePoints = async () => {
    if (!orgId || !confirm('¿Recalcular puntos de todos los step completions con los base_points actuales?')) return;
    setIsRecalculating(true);
    try {
      const resp = await gamificationService.recalculatePoints(orgId);
      alert(resp.message || `${resp.updated} registros actualizados.`);
    } catch {
      alert('Error al recalcular puntos.');
    } finally {
      setIsRecalculating(false);
    }
  };

  // --- Level CRUD ---
  const openCreateLevel = () => {
    setEditingLevel(null);
    setLevelForm({ name: '', min_points: 0 });
    setLevelDialogOpen(true);
  };

  const openEditLevel = (level: ApiLevelRead) => {
    setEditingLevel(level);
    setLevelForm({ name: level.name, min_points: level.min_points, icon_url: level.icon_url, benefits: level.benefits });
    setLevelDialogOpen(true);
  };

  const handleSaveLevel = async () => {
    if (!orgId) return;
    setIsSaving(true);
    setError(null);
    try {
      if (editingLevel) {
        const update: ApiLevelUpdate = { name: levelForm.name, min_points: levelForm.min_points, icon_url: levelForm.icon_url };
        await gamificationService.updateLevel(orgId, editingLevel.id, update);
      } else {
        await gamificationService.createLevel(orgId, levelForm);
      }
      setLevelDialogOpen(false);
      await fetchLevels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar nivel');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLevel = async (levelId: string) => {
    if (!orgId || !confirm('¿Eliminar este nivel?')) return;
    try {
      await gamificationService.deleteLevel(orgId, levelId);
      await fetchLevels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar nivel');
    }
  };

  // --- Reward CRUD ---
  const openCreateReward = () => {
    setEditingReward(null);
    setRewardForm(EMPTY_REWARD_FORM);
    setAssignedOrgIds(new Set(orgId ? [orgId] : []));
    setPointsAutoCalculated(false);
    setRewardDialogOpen(true);
  };

  const openEditReward = async (reward: ApiRewardRead) => {
    setEditingReward(reward);
    setRewardForm(rewardToForm(reward));
    setAssignedOrgIds(new Set());
    setPointsAutoCalculated(false);
    setRewardDialogOpen(true);
    // Cargar orgs asignadas en background
    setLoadingOrgAssign(true);
    try {
      const resp = await gamificationService.getRewardOrganizations(reward.id);
      setAssignedOrgIds(new Set(resp.organizations.map((o) => o.organization_id)));
    } catch { /* silencioso */ }
    finally { setLoadingOrgAssign(false); }
  };

  const toggleOrgAssignment = (orgId: string) => {
    setAssignedOrgIds((prev) => {
      const next = new Set(prev);
      if (next.has(orgId)) { next.delete(orgId); } else { next.add(orgId); }
      return next;
    });
  };

  const addCondition = () => {
    setRewardForm((prev) => ({
      ...prev,
      conditions: [...prev.conditions, { type: 'profile_completion' }],
    }));
  };

  const updateCondition = (index: number, updated: ApiUnlockConditionItem) => {
    const newConditions = [...rewardForm.conditions];
    newConditions[index] = updated;
    setRewardForm((prev) => ({ ...prev, conditions: newConditions }));
    // Auto-calc points when journey/step selection changes
    recalcPoints(newConditions, rewardForm.type);
  };

  const removeCondition = (index: number) => {
    const newConditions = rewardForm.conditions.filter((_, i) => i !== index);
    setRewardForm((prev) => ({ ...prev, conditions: newConditions }));
    // Recalc points after removing a condition
    recalcPoints(newConditions, rewardForm.type);
  };

  const handleSaveReward = async () => {
    if (!orgId) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload = formToPayload(rewardForm);
      let savedRewardId: string;

      if (editingReward) {
        const update: ApiRewardUpdate = {
          name: payload.name,
          description: payload.description,
          type: payload.type,
          icon_url: payload.icon_url,
          points: payload.points,
          unlock_condition: payload.unlock_condition,
        };
        await gamificationService.updateReward(orgId, editingReward.id, update);
        savedRewardId = editingReward.id;
      } else {
        const created = await gamificationService.createReward(orgId, payload);
        savedRewardId = created.id;
      }

      // Sincronizar asignación de orgs (solo SuperAdmin puede ver todas las orgs)
      if (user?.role === 'SuperAdmin' && allOrgs.length > 0) {
        const currentResp = await gamificationService.getRewardOrganizations(savedRewardId).catch(() => null);
        const currentIds = new Set(currentResp?.organizations.map((o) => o.organization_id) ?? []);

        const toAssign = [...assignedOrgIds].filter((id) => !currentIds.has(id));
        const toUnassign = [...currentIds].filter((id) => !assignedOrgIds.has(id));

        if (toAssign.length > 0) await gamificationService.assignRewardOrgs(savedRewardId, toAssign);
        if (toUnassign.length > 0) await gamificationService.unassignRewardOrgs(savedRewardId, toUnassign);
      }

      setRewardDialogOpen(false);
      await fetchRewards();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar recompensa');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!orgId || !confirm('¿Eliminar esta recompensa?')) return;
    try {
      await gamificationService.deleteReward(orgId, rewardId);
      await fetchRewards();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar recompensa');
    }
  };

  const handleSaveConfig = async () => {
    if (!orgId) return;
    setIsSaving(true);
    setError(null);
    try {
      const saved = await gamificationService.upsertConfig(orgId, configForm);
      setConfig(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar configuración');
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

  if (!orgId) {
    return (
      <div className="p-8 text-center text-slate-500">
        No se encontró una organización asociada a tu cuenta.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          Gamificación
        </h1>
        <p className="text-slate-500">Configura niveles y recompensas para tu organización.</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(['levels', 'rewards', 'config'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {tab === 'levels' && <><TrendingUp className="h-4 w-4 inline mr-1.5" />Niveles ({levels.length})</>}
            {tab === 'rewards' && <><Award className="h-4 w-4 inline mr-1.5" />Recompensas ({rewards.length})</>}
            {tab === 'config' && <><Settings className="h-4 w-4 inline mr-1.5" />Configuración</>}
          </button>
        ))}
      </div>

      {/* ---- Levels Tab ---- */}
      {activeTab === 'levels' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Niveles de Progresión</CardTitle>
              <CardDescription>Define los niveles que los usuarios alcanzan al acumular puntos.</CardDescription>
            </div>
            <Button onClick={openCreateLevel} className="bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4 mr-2" /> Nuevo Nivel
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingLevels ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : levels.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Star className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No hay niveles configurados.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {levels.map((level) => (
                  <div key={level.id} className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      {level.icon_url ? <img src={level.icon_url} alt="" className="h-6 w-6" /> : <Star className="h-5 w-5 text-amber-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">{level.name}</p>
                      <p className="text-sm text-slate-500">{level.min_points} puntos mínimos</p>
                    </div>
                    <Badge variant="secondary">{level.min_points} pts</Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditLevel(level)} className="h-8 w-8"><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteLevel(level.id)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---- Rewards Tab ---- */}
      {activeTab === 'rewards' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Catálogo de Recompensas</CardTitle>
              <CardDescription>Define insignias y recompensas que los usuarios pueden desbloquear.</CardDescription>
            </div>
            <Button onClick={openCreateReward} className="bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4 mr-2" /> Nueva Recompensa
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingRewards ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : rewards.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Award className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No hay recompensas configuradas.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rewards.map((reward) => (
                  <div key={reward.id} className="flex items-start gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      {reward.icon_url ? <img src={reward.icon_url} alt="" className="h-6 w-6" /> : <Award className="h-5 w-5 text-teal-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="font-medium text-slate-900">{reward.name}</p>
                        <Badge variant="outline" className="text-xs">{reward.type}</Badge>
                        {(reward.points ?? 0) > 0 && (
                          <Badge className="text-xs bg-fuchsia-100 text-fuchsia-700 border-0">
                            <Zap className="h-3 w-3 mr-1" />{reward.points} pts
                          </Badge>
                        )}
                      </div>
                      {reward.description && <p className="text-sm text-slate-500 line-clamp-1">{reward.description}</p>}
                      <ConditionPills reward={reward} journeys={journeys} />
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEditReward(reward)} className="h-8 w-8"><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteReward(reward.id)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---- Config Tab ---- */}
      {activeTab === 'config' && (
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Gamificación</CardTitle>
            <CardDescription>Ajusta las opciones de gamificación para tu organización.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingConfig ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : (
              <div className="space-y-6 max-w-lg">
                <div className="space-y-4">
                  {([
                    { key: 'points_enabled',  label: 'Puntos',      desc: 'Habilitar sistema de puntos' },
                    { key: 'levels_enabled',  label: 'Niveles',     desc: 'Habilitar sistema de niveles' },
                    { key: 'rewards_enabled', label: 'Recompensas', desc: 'Habilitar sistema de recompensas' },
                  ] as const).map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{label}</p>
                        <p className="text-sm text-slate-500">{desc}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!configForm[key]}
                        onClick={() => setConfigForm({ ...configForm, [key]: !configForm[key] })}
                        className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', configForm[key] ? 'bg-teal-500' : 'bg-slate-200')}
                      >
                        <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', configForm[key] ? 'translate-x-6' : 'translate-x-1')} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Multiplicador de puntos</Label>
                    <Input type="number" min="0.01" max="99.99" step="0.01" value={configForm.points_multiplier}
                      onChange={(e) => setConfigForm({ ...configForm, points_multiplier: parseFloat(e.target.value) || 1 })} />
                    <p className="text-xs text-slate-400">1.0 = normal · 1.5 = 50% bonus · 2.0 = doble puntos</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Puntos por defecto por step</Label>
                    <Input type="number" min="0" value={configForm.default_step_points}
                      onChange={(e) => setConfigForm({ ...configForm, default_step_points: parseInt(e.target.value) || 0 })} />
                    <p className="text-xs text-slate-400">Se usa cuando un step no tiene puntos configurados.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Puntos por completar perfil (fallback)</Label>
                    <Input type="number" min="0" value={configForm.profile_completion_points ?? 0}
                      onChange={(e) => setConfigForm({ ...configForm, profile_completion_points: parseInt(e.target.value) || 0 })} />
                    <p className="text-xs text-slate-400">
                      Solo aplica si no hay recompensa con condición "Completar perfil" configurada.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handleRecalculatePoints}
                    disabled={isRecalculating}
                    className="gap-2 text-sm"
                  >
                    {isRecalculating
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <RefreshCw className="h-4 w-4" />}
                    Recalcular puntos
                  </Button>
                  <Button onClick={handleSaveConfig} disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Guardar Configuración
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  Recalcular puntos actualiza los puntos ya otorgados usando los base_points actuales de cada step y el multiplicador vigente.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---- Level Dialog ---- */}
      <Dialog open={levelDialogOpen} onOpenChange={setLevelDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingLevel ? 'Editar Nivel' : 'Nuevo Nivel'}</DialogTitle>
            <DialogDescription>Configura el nombre y los puntos mínimos para este nivel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={levelForm.name} onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })} placeholder="Ej: Semilla, Brote, Árbol..." />
            </div>
            <div className="space-y-2">
              <Label>Puntos mínimos</Label>
              <Input type="number" min="0" value={levelForm.min_points} onChange={(e) => setLevelForm({ ...levelForm, min_points: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>URL del icono (opcional)</Label>
              <Input value={levelForm.icon_url || ''} onChange={(e) => setLevelForm({ ...levelForm, icon_url: e.target.value || undefined })} placeholder="https://..." />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setLevelDialogOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button onClick={handleSaveLevel} disabled={isSaving || !levelForm.name}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingLevel ? 'Guardar cambios' : 'Crear Nivel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Reward Dialog ---- */}
      <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReward ? 'Editar Recompensa' : 'Nueva Recompensa'}</DialogTitle>
            <DialogDescription>Configura la recompensa, sus puntos y las condiciones de desbloqueo.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Nombre */}
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={rewardForm.name} onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })} placeholder="Ej: Perfil Completo, Explorador..." />
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Input value={rewardForm.type} onChange={(e) => setRewardForm({ ...rewardForm, type: e.target.value })} placeholder="Ej: badge, certificate..." />
              <div className="flex flex-wrap gap-1.5">
                {['badge', 'points', 'certificate', 'discount', 'access', 'experience'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setRewardForm({ ...rewardForm, type: preset });
                      if (preset === 'points') recalcPoints(rewardForm.conditions, 'points');
                    }}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                      rewardForm.type === preset
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea value={rewardForm.description} onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })} placeholder="Describe esta recompensa..." rows={2} />
            </div>

            {/* Icono */}
            <div className="space-y-2">
              <Label>URL del icono (opcional)</Label>
              <Input value={rewardForm.icon_url} onChange={(e) => setRewardForm({ ...rewardForm, icon_url: e.target.value })} placeholder="https://..." />
            </div>

            {/* Puntos */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-fuchsia-500" />
                Puntos que otorga
              </Label>
              <Input type="number" min={0} value={rewardForm.points} onChange={(e) => { setRewardForm({ ...rewardForm, points: parseInt(e.target.value) || 0 }); setPointsAutoCalculated(false); }} placeholder="0" />
              {pointsAutoCalculated ? (
                <p className="text-xs text-fuchsia-500 flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Calculado automáticamente desde el journey/step asociado.
                </p>
              ) : (
                <p className="text-xs text-slate-400">Puntos acreditados al usuario cuando gana esta recompensa.</p>
              )}
            </div>

            {/* Condiciones */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Condiciones de desbloqueo</Label>
                {rewardForm.conditions.length > 1 && (
                  <Select value={rewardForm.unlock_operator} onValueChange={(v) => setRewardForm({ ...rewardForm, unlock_operator: v as 'AND' | 'OR' })}>
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">Todas (AND)</SelectItem>
                      <SelectItem value="OR">Alguna (OR)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                {rewardForm.conditions.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-3 border border-dashed border-slate-200 rounded-lg">
                    Sin condiciones — se otorga manualmente por el admin.
                  </p>
                )}
                {rewardForm.conditions.map((cond, i) => (
                  <ConditionRow
                    key={i}
                    condition={cond}
                    onChange={(updated) => updateCondition(i, updated)}
                    onRemove={() => removeCondition(i)}
                    journeys={journeys}
                    orgId={orgId}
                  />
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCondition}
                className="w-full border-dashed text-slate-500 hover:text-fuchsia-600 hover:border-fuchsia-300"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Agregar condición
              </Button>
            </div>

            {/* Organizaciones habilitadas — solo visible para SuperAdmin */}
            {user?.role === 'SuperAdmin' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  Organizaciones habilitadas
                </Label>

                {loadingOrgAssign ? (
                  <div className="flex items-center gap-2 py-3 text-slate-400 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
                  </div>
                ) : allOrgs.length === 0 ? (
                  <p className="text-xs text-slate-400">No hay organizaciones disponibles.</p>
                ) : (
                  <div className="max-h-44 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2">
                    {allOrgs.map((org) => {
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
                <p className="text-xs text-slate-400">
                  La recompensa solo será visible y otorgable en las organizaciones seleccionadas.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setRewardDialogOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button onClick={handleSaveReward} disabled={isSaving || !rewardForm.name || !rewardForm.type}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingReward ? 'Guardar cambios' : 'Crear Recompensa'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
