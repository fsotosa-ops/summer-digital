'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { gamificationService } from '@/services/gamification.service';
import {
  ApiLevelRead,
  ApiLevelCreate,
  ApiLevelUpdate,
  ApiRewardRead,
  ApiRewardCreate,
  ApiRewardUpdate,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'levels' | 'rewards' | 'config';

export default function GamificationAdminPage() {
  const { user } = useAuthStore();
  const orgId = user?.organizationId;

  const [activeTab, setActiveTab] = useState<Tab>('levels');

  // Levels state
  const [levels, setLevels] = useState<ApiLevelRead[]>([]);
  const [isLoadingLevels, setIsLoadingLevels] = useState(true);
  const [levelDialogOpen, setLevelDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<ApiLevelRead | null>(null);
  const [levelForm, setLevelForm] = useState<ApiLevelCreate>({ name: '', min_points: 0 });

  // Rewards state
  const [rewards, setRewards] = useState<ApiRewardRead[]>([]);
  const [isLoadingRewards, setIsLoadingRewards] = useState(true);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<ApiRewardRead | null>(null);
  const [rewardForm, setRewardForm] = useState<ApiRewardCreate>({
    name: '',
    type: '',
    description: '',
    unlock_condition: {},
  });

  // Config state
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

  // Fetch config
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
    } catch (err) {
      console.error('Error fetching config:', err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Fetch levels
  const fetchLevels = async () => {
    if (!orgId) return;
    setIsLoadingLevels(true);
    try {
      const data = await gamificationService.listLevels(orgId);
      setLevels(data);
    } catch (err) {
      console.error('Error fetching levels:', err);
    } finally {
      setIsLoadingLevels(false);
    }
  };

  // Fetch rewards
  const fetchRewards = async () => {
    if (!orgId) return;
    setIsLoadingRewards(true);
    try {
      const data = await gamificationService.listRewards(orgId);
      setRewards(data);
    } catch (err) {
      console.error('Error fetching rewards:', err);
    } finally {
      setIsLoadingRewards(false);
    }
  };

  useEffect(() => {
    fetchLevels();
    fetchRewards();
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // --- Level CRUD ---
  const openCreateLevel = () => {
    setEditingLevel(null);
    setLevelForm({ name: '', min_points: 0 });
    setLevelDialogOpen(true);
  };

  const openEditLevel = (level: ApiLevelRead) => {
    setEditingLevel(level);
    setLevelForm({
      name: level.name,
      min_points: level.min_points,
      icon_url: level.icon_url,
      benefits: level.benefits,
    });
    setLevelDialogOpen(true);
  };

  const handleSaveLevel = async () => {
    if (!orgId) return;
    setIsSaving(true);
    setError(null);
    try {
      if (editingLevel) {
        const update: ApiLevelUpdate = {
          name: levelForm.name,
          min_points: levelForm.min_points,
          icon_url: levelForm.icon_url,
        };
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
    if (!orgId || !confirm('Eliminar este nivel?')) return;
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
    setRewardForm({ name: '', type: '', description: '', unlock_condition: {} });
    setRewardDialogOpen(true);
  };

  const openEditReward = (reward: ApiRewardRead) => {
    setEditingReward(reward);
    setRewardForm({
      name: reward.name,
      type: reward.type as 'badge' | 'points',
      description: reward.description,
      icon_url: reward.icon_url,
      unlock_condition: reward.unlock_condition,
    });
    setRewardDialogOpen(true);
  };

  const handleSaveReward = async () => {
    if (!orgId) return;
    setIsSaving(true);
    setError(null);
    try {
      if (editingReward) {
        const update: ApiRewardUpdate = {
          name: rewardForm.name,
          description: rewardForm.description,
          type: rewardForm.type,
          icon_url: rewardForm.icon_url,
          unlock_condition: rewardForm.unlock_condition,
        };
        await gamificationService.updateReward(orgId, editingReward.id, update);
      } else {
        await gamificationService.createReward(orgId, rewardForm);
      }
      setRewardDialogOpen(false);
      await fetchRewards();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar reward');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!orgId || !confirm('Eliminar esta recompensa?')) return;
    try {
      await gamificationService.deleteReward(orgId, rewardId);
      await fetchRewards();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar reward');
    }
  };

  // --- Config Save ---
  const handleSaveConfig = async () => {
    if (!orgId) return;
    setIsSaving(true);
    setError(null);
    try {
      const saved = await gamificationService.upsertConfig(orgId, configForm);
      setConfig(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar configuracion');
    } finally {
      setIsSaving(false);
    }
  };

  // Unlock condition helpers
  const unlockType = (rewardForm.unlock_condition as Record<string, string>)?.type || 'manual';

  const setUnlockCondition = (field: string, value: string) => {
    setRewardForm({
      ...rewardForm,
      unlock_condition: { ...rewardForm.unlock_condition, [field]: value },
    });
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
        No se encontro una organizacion asociada a tu cuenta.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            Gamificacion
          </h1>
          <p className="text-slate-500">Configura niveles y recompensas para tu organizacion.</p>
        </div>
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
        <button
          onClick={() => setActiveTab('levels')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'levels'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <TrendingUp className="h-4 w-4 inline mr-1.5" />
          Niveles ({levels.length})
        </button>
        <button
          onClick={() => setActiveTab('rewards')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'rewards'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <Award className="h-4 w-4 inline mr-1.5" />
          Recompensas ({rewards.length})
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'config'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <Settings className="h-4 w-4 inline mr-1.5" />
          Configuracion
        </button>
      </div>

      {/* Levels Tab */}
      {activeTab === 'levels' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Niveles de Progresion</CardTitle>
              <CardDescription>
                Define los niveles que los usuarios alcanzan al acumular puntos.
              </CardDescription>
            </div>
            <Button onClick={openCreateLevel} className="bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Nivel
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingLevels ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : levels.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Star className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No hay niveles configurados.</p>
                <p className="text-sm mt-1">Crea el primer nivel para tu organizacion.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {levels.map((level) => (
                  <div
                    key={level.id}
                    className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      {level.icon_url ? (
                        <img src={level.icon_url} alt="" className="h-6 w-6" />
                      ) : (
                        <Star className="h-5 w-5 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">{level.name}</p>
                      <p className="text-sm text-slate-500">{level.min_points} puntos minimos</p>
                    </div>
                    <Badge variant="secondary">{level.min_points} pts</Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditLevel(level)} className="h-8 w-8">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteLevel(level.id)}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Catalogo de Recompensas</CardTitle>
              <CardDescription>
                Define insignias y recompensas que los usuarios pueden desbloquear.
              </CardDescription>
            </div>
            <Button onClick={openCreateReward} className="bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Recompensa
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingRewards ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : rewards.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Award className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No hay recompensas configuradas.</p>
                <p className="text-sm mt-1">Crea la primera insignia o recompensa.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="flex items-start gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      {reward.icon_url ? (
                        <img src={reward.icon_url} alt="" className="h-6 w-6" />
                      ) : (
                        <Award className="h-5 w-5 text-teal-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-slate-900">{reward.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {reward.type}
                        </Badge>
                      </div>
                      {reward.description && (
                        <p className="text-sm text-slate-500 line-clamp-2">{reward.description}</p>
                      )}
                      {reward.unlock_condition && Object.keys(reward.unlock_condition).length > 0 && (
                        <p className="text-xs text-slate-400 mt-1">
                          Desbloqueo: {(reward.unlock_condition as Record<string, string>).type || 'manual'}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEditReward(reward)} className="h-8 w-8">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteReward(reward.id)}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Config Tab */}
      {activeTab === 'config' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Configuracion de Gamificacion</CardTitle>
              <CardDescription>
                Ajusta las opciones de gamificacion para tu organizacion.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingConfig ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="space-y-6 max-w-lg">
                {/* Toggles */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">Puntos</p>
                      <p className="text-sm text-slate-500">Habilitar sistema de puntos</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={configForm.points_enabled}
                      onClick={() => setConfigForm({ ...configForm, points_enabled: !configForm.points_enabled })}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        configForm.points_enabled ? 'bg-teal-500' : 'bg-slate-200'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          configForm.points_enabled ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">Niveles</p>
                      <p className="text-sm text-slate-500">Habilitar sistema de niveles</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={configForm.levels_enabled}
                      onClick={() => setConfigForm({ ...configForm, levels_enabled: !configForm.levels_enabled })}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        configForm.levels_enabled ? 'bg-teal-500' : 'bg-slate-200'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          configForm.levels_enabled ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">Recompensas</p>
                      <p className="text-sm text-slate-500">Habilitar sistema de recompensas</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={configForm.rewards_enabled}
                      onClick={() => setConfigForm({ ...configForm, rewards_enabled: !configForm.rewards_enabled })}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        configForm.rewards_enabled ? 'bg-teal-500' : 'bg-slate-200'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          configForm.rewards_enabled ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                </div>

                {/* Numeric fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Multiplicador de puntos</Label>
                    <Input
                      type="number"
                      min="0.01"
                      max="99.99"
                      step="0.01"
                      value={configForm.points_multiplier}
                      onChange={(e) => setConfigForm({ ...configForm, points_multiplier: parseFloat(e.target.value) || 1 })}
                    />
                    <p className="text-xs text-slate-400">
                      1.0 = normal, 1.5 = 50% bonus, 2.0 = doble puntos
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Puntos por defecto por step</Label>
                    <Input
                      type="number"
                      min="0"
                      value={configForm.default_step_points}
                      onChange={(e) => setConfigForm({ ...configForm, default_step_points: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-slate-400">
                      Se usa cuando un step no tiene puntos configurados.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Puntos por completar perfil</Label>
                    <Input
                      type="number"
                      min="0"
                      value={configForm.profile_completion_points}
                      onChange={(e) => setConfigForm({ ...configForm, profile_completion_points: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-slate-400">
                      Puntos que recibe un usuario al completar toda su informacion de perfil por primera vez. 0 = sin puntos.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSaveConfig} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Guardar Configuracion
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Level Dialog */}
      <Dialog open={levelDialogOpen} onOpenChange={setLevelDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingLevel ? 'Editar Nivel' : 'Nuevo Nivel'}</DialogTitle>
            <DialogDescription>
              Configura el nombre y los puntos minimos para este nivel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={levelForm.name}
                onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })}
                placeholder="Ej: Semilla, Brote, Arbol..."
              />
            </div>
            <div className="space-y-2">
              <Label>Puntos minimos</Label>
              <Input
                type="number"
                min="0"
                value={levelForm.min_points}
                onChange={(e) => setLevelForm({ ...levelForm, min_points: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>URL del icono (opcional)</Label>
              <Input
                value={levelForm.icon_url || ''}
                onChange={(e) => setLevelForm({ ...levelForm, icon_url: e.target.value || undefined })}
                placeholder="https://..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setLevelDialogOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSaveLevel} disabled={isSaving || !levelForm.name}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {editingLevel ? 'Guardar cambios' : 'Crear Nivel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reward Dialog */}
      <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingReward ? 'Editar Recompensa' : 'Nueva Recompensa'}</DialogTitle>
            <DialogDescription>
              Configura la recompensa y su condicion de desbloqueo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={rewardForm.name}
                onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                placeholder="Ej: Primer Taller, Explorador..."
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Input
                value={rewardForm.type}
                onChange={(e) => setRewardForm({ ...rewardForm, type: e.target.value })}
                placeholder="Ej: badge, certificate, discount..."
              />
              <div className="flex flex-wrap gap-1.5">
                {['badge', 'points', 'certificate', 'discount', 'access', 'experience'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRewardForm({ ...rewardForm, type: preset })}
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
            <div className="space-y-2">
              <Label>Descripcion (opcional)</Label>
              <Textarea
                value={rewardForm.description || ''}
                onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                placeholder="Describe esta recompensa..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>URL del icono (opcional)</Label>
              <Input
                value={rewardForm.icon_url || ''}
                onChange={(e) => setRewardForm({ ...rewardForm, icon_url: e.target.value || undefined })}
                placeholder="https://..."
              />
            </div>

            {/* Unlock Condition */}
            <div className="space-y-2">
              <Label>Condicion de desbloqueo</Label>
              <Select
                value={unlockType}
                onValueChange={(value) =>
                  setRewardForm({
                    ...rewardForm,
                    unlock_condition: value === 'manual' ? {} : { type: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una condicion..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (sin condicion)</SelectItem>
                  <SelectItem value="step_completed">Al completar un step</SelectItem>
                  <SelectItem value="journey_completed">Al completar un journey</SelectItem>
                  <SelectItem value="points_threshold">Al alcanzar X puntos</SelectItem>
                </SelectContent>
              </Select>

              {unlockType === 'step_completed' && (
                <Input
                  placeholder="ID del step (UUID)"
                  value={(rewardForm.unlock_condition as Record<string, string>)?.step_id || ''}
                  onChange={(e) => setUnlockCondition('step_id', e.target.value)}
                />
              )}
              {unlockType === 'journey_completed' && (
                <Input
                  placeholder="ID del journey (UUID)"
                  value={(rewardForm.unlock_condition as Record<string, string>)?.journey_id || ''}
                  onChange={(e) => setUnlockCondition('journey_id', e.target.value)}
                />
              )}
              {unlockType === 'points_threshold' && (
                <Input
                  type="number"
                  min="0"
                  placeholder="Puntos minimos"
                  value={(rewardForm.unlock_condition as Record<string, string>)?.min_points || ''}
                  onChange={(e) => setUnlockCondition('min_points', e.target.value)}
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setRewardDialogOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSaveReward} disabled={isSaving || !rewardForm.name || !rewardForm.type}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {editingReward ? 'Guardar cambios' : 'Crear Recompensa'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
