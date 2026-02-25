'use client';

import { useEffect, useState, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from "@/store/useAuthStore";
import { gamificationService } from "@/services/gamification.service";
import { crmService } from "@/services/crm.service";
import { authService } from "@/services/auth.service";
import { supabase } from "@/lib/supabase";
import { ApiUserPointsSummary, ApiCrmContact, ApiFieldOption } from "@/types/api.types";
import {
  User, Shield, Mail, Building2, Award, Calendar, TrendingUp, Star,
  Phone, MapPin, GraduationCap, Briefcase, Pencil, Save, Loader2, Camera,
} from "lucide-react";
import { LocationSelector, getCountryName, getStateName } from '@/features/crm/components/LocationSelector';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: 'Super Administrador',
  Admin: 'Administrador',
  Participant: 'Participante',
  Subscriber: 'Suscriptor',
};

const NONE = '__none__';

function resolveLabel(value: string | null | undefined, options: ApiFieldOption[]): string | null {
  if (!value) return null;
  const match = options.find((o) => o.value === value);
  return match ? match.label : value;
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{label}</p>
        <p className="font-medium text-slate-800 mt-0.5">
          {value || <span className="text-slate-300 italic text-sm font-normal">No especificado</span>}
        </p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [summary, setSummary] = useState<ApiUserPointsSummary | null>(null);
  const [isLoadingGamification, setIsLoadingGamification] = useState(true);
  const [crmContact, setCrmContact] = useState<ApiCrmContact | null>(null);
  const [fieldOptions, setFieldOptions] = useState<Record<string, ApiFieldOption[]>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<ApiCrmContact> & { fullName?: string }>({});
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [gamificationError, setGamificationError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('edit') === 'true') setIsEditing(true);
  }, []);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      gamificationService.getUserSummary().catch((err) => {
        console.error('[Profile] gamification summary error:', err);
        setGamificationError(true);
        return null;
      }),
      crmService.getMyContact().catch(() => null),
      crmService.listFieldOptions().catch(() => [] as ApiFieldOption[]),
    ]).then(([gamifData, contact, options]) => {
      setSummary(gamifData);
      setCrmContact(contact);
      const grouped: Record<string, ApiFieldOption[]> = {};
      (options || []).forEach((o) => {
        if (!grouped[o.field_name]) grouped[o.field_name] = [];
        grouped[o.field_name].push(o);
      });
      setFieldOptions(grouped);
    }).finally(() => {
      setIsLoadingGamification(false);
    });
  }, [user]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen debe pesar menos de 2 MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await authService.updateMyProfile({ avatar_url: avatarUrl });
      const refreshed = await authService.getUserProfile();
      setUser(refreshed);
      toast.success('Foto actualizada');
    } catch (err) {
      console.error(err);
      toast.error('Error al subir la imagen. Verifica que el bucket "avatars" exista en Supabase.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleStartEdit = () => {
    setDraft({
      fullName: user?.name ?? '',
      company: crmContact?.company ?? '',
      phone: crmContact?.phone ?? '',
      birth_date: crmContact?.birth_date ?? '',
      gender: crmContact?.gender ?? '',
      education_level: crmContact?.education_level ?? '',
      occupation: crmContact?.occupation ?? '',
      country: crmContact?.country ?? '',
      state: crmContact?.state ?? '',
      city: crmContact?.city ?? '',
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraft({});
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { fullName, ...crmFields } = draft;
      const sanitized: Partial<ApiCrmContact> = {};
      (Object.keys(crmFields) as (keyof typeof crmFields)[]).forEach((key) => {
        const val = crmFields[key];
        sanitized[key as keyof ApiCrmContact] = (val === '' || val === NONE ? null : val) as never;
      });

      const updated = await crmService.updateMyContact(sanitized);
      setCrmContact(updated);

      if (fullName && fullName !== user.name) {
        await authService.updateMyProfile({ full_name: fullName });
        const refreshed = await authService.getUserProfile();
        setUser(refreshed);
      }

      setIsEditing(false);
      setDraft({});
      toast.success('Perfil actualizado');

      gamificationService.getUserSummary().then((data) => {
        if (data) setSummary(data);
      }).catch(() => {});
    } catch (err) {
      console.error('Error saving profile:', err);
      toast.error('Error al guardar. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectOption = (field: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value === NONE ? '' : value,
    }));
  };

  if (!user) {
    return (
      <div className="p-8 text-center text-slate-500">Cargando perfil...</div>
    );
  }

  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const totalPoints      = summary?.total_points ?? user.oasisScore;
  const currentLevelName = summary?.current_level?.name ?? user.rank ?? '—';
  const pointsToNext     = summary?.points_to_next_level;
  const badges           = summary?.rewards ?? [];
  const activities       = summary?.recent_activities ?? [];

  let progressPercent = 0;
  if (summary?.current_level && summary?.next_level) {
    const currentMin = summary.current_level.min_points;
    const nextMin    = summary.next_level.min_points;
    const range      = nextMin - currentMin;
    progressPercent  = range > 0 ? Math.round(((totalPoints - currentMin) / range) * 100) : 100;
  } else if (summary?.current_level && !summary?.next_level) {
    progressPercent = 100;
  }

  const locationDisplay = [
    crmContact?.city,
    crmContact?.state ? getStateName(crmContact.country || '', crmContact.state) : null,
    crmContact?.country ? getCountryName(crmContact.country) : null,
  ].filter(Boolean).join(', ') || null;

  return (
    <div className="flex flex-col gap-6">

      {/* ══════════════════════════════════════════════════
          HERO BANNER
      ══════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-fuchsia-500 via-purple-600 to-violet-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">

            {/* Avatar with upload */}
            <div className="relative group flex-shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
              <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30
                              overflow-hidden flex items-center justify-center
                              text-white font-bold text-3xl">
                {uploadingAvatar ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center
                           opacity-0 group-hover:opacity-100 transition-opacity"
                title="Cambiar foto"
              >
                <Camera className="h-6 w-6 text-white" />
              </button>
            </div>

            {/* Name + role + score */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  value={draft.fullName ?? ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Tu nombre completo"
                  className="bg-white/20 border border-white/30 text-white placeholder:text-white/50
                             rounded-xl px-3 py-2 text-xl font-bold w-full
                             focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              ) : (
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                  {user.name}
                </h1>
              )}
              <p className="text-white/70 text-sm mt-1">{ROLE_LABELS[user.role] || user.role}</p>

              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm border border-white/30
                                 rounded-full text-sm font-semibold text-white">
                  {currentLevelName}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white tabular-nums">{totalPoints}</span>
                  <span className="text-white/60 text-sm">pts</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex-shrink-0 self-start">
              {!isEditing ? (
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30
                             border border-white/30 text-white text-sm font-semibold
                             px-4 py-2 rounded-xl transition-colors"
                >
                  <Pencil size={14} /> Editar perfil
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white
                               text-sm px-3 py-2 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 bg-white text-fuchsia-700 font-semibold
                               text-sm px-4 py-2 rounded-xl hover:bg-white/90 transition-colors"
                  >
                    {saving
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Save size={14} />}
                    Guardar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {!isLoadingGamification && (
            <div className="mt-6">
              <div className="flex justify-between text-xs text-white/60 mb-2">
                <span>Progreso de nivel</span>
                <span className="font-medium tabular-nums">{Math.min(progressPercent, 100)}%</span>
              </div>
              <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
              {pointsToNext != null && summary?.next_level ? (
                <p className="text-white/60 text-xs mt-1.5">
                  <span className="tabular-nums">{pointsToNext}</span> pts para alcanzar{' '}
                  <strong className="text-white">{summary.next_level.name}</strong>
                </p>
              ) : summary?.current_level && !summary?.next_level ? (
                <p className="text-white/80 text-xs font-semibold mt-1.5">
                  Nivel máximo alcanzado
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          CONTENT GRID
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Información Personal ─── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-700 border-b border-slate-100 pb-3 mb-5">
            Información Personal
          </h2>

          {/* Auth fields (read-only) */}
          <div className="space-y-4">
            <InfoRow icon={<Mail className="h-4 w-4" />} label="Email"  value={user.email} />
            <InfoRow icon={<Shield className="h-4 w-4" />} label="Rol" value={ROLE_LABELS[user.role] || user.role} />
            {user.organizationId && (
              <InfoRow icon={<Building2 className="h-4 w-4" />} label="Organización" value="Mi Organización" />
            )}
          </div>

          {/* CRM fields */}
          <div className="border-t border-slate-100 mt-5 pt-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Datos de perfil
            </p>

            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Company */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500 flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> Empresa
                    </Label>
                    <Input
                      value={draft.company ?? ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, company: e.target.value }))}
                      placeholder="Nombre de la empresa"
                      className="h-9"
                    />
                  </div>
                  {/* Phone */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Teléfono
                    </Label>
                    <Input
                      value={draft.phone ?? ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="+56 9 1234 5678"
                      className="h-9"
                    />
                  </div>
                  {/* Birth date */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Fecha de nacimiento
                    </Label>
                    <Input
                      type="date"
                      value={draft.birth_date ?? ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, birth_date: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                  {/* Gender */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Género</Label>
                    <Select
                      value={draft.gender || NONE}
                      onValueChange={(v) => handleSelectOption('gender', v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>
                          <span className="text-slate-400">Sin especificar</span>
                        </SelectItem>
                        {(fieldOptions.gender || []).map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Education */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500 flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" /> Nivel Educativo
                    </Label>
                    <Select
                      value={draft.education_level || NONE}
                      onValueChange={(v) => handleSelectOption('education_level', v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>
                          <span className="text-slate-400">Sin especificar</span>
                        </SelectItem>
                        {(fieldOptions.education_level || []).map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Occupation */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500 flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> Ocupación
                    </Label>
                    <Select
                      value={draft.occupation || NONE}
                      onValueChange={(v) => handleSelectOption('occupation', v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>
                          <span className="text-slate-400">Sin especificar</span>
                        </SelectItem>
                        {(fieldOptions.occupation || []).map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Location */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Ubicación
                  </Label>
                  <LocationSelector
                    value={{
                      country: draft.country ?? '',
                      state: draft.state ?? '',
                      city: draft.city ?? '',
                    }}
                    onChange={({ country, state, city }) =>
                      setDraft((prev) => ({ ...prev, country, state, city }))
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <InfoRow icon={<Building2 className="h-4 w-4" />} label="Empresa"          value={crmContact?.company} />
                <InfoRow icon={<Phone className="h-4 w-4" />}     label="Teléfono"         value={crmContact?.phone} />
                <InfoRow
                  icon={<Calendar className="h-4 w-4" />}
                  label="Fecha de nacimiento"
                  value={
                    crmContact?.birth_date
                      ? new Date(crmContact.birth_date + 'T00:00:00').toLocaleDateString('es-CL', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })
                      : null
                  }
                />
                <InfoRow icon={<User className="h-4 w-4" />}          label="Género"          value={resolveLabel(crmContact?.gender, fieldOptions.gender || [])} />
                <InfoRow icon={<GraduationCap className="h-4 w-4" />} label="Nivel educativo" value={resolveLabel(crmContact?.education_level, fieldOptions.education_level || [])} />
                <InfoRow icon={<Briefcase className="h-4 w-4" />}     label="Ocupación"       value={resolveLabel(crmContact?.occupation, fieldOptions.occupation || [])} />
                <InfoRow icon={<MapPin className="h-4 w-4" />}        label="Ubicación"       value={locationDisplay} />
              </div>
            )}
          </div>
        </div>

        {/* ── Progreso y Logros ─── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-700 border-b border-slate-100 pb-3 mb-5">
            Progreso y Logros
          </h2>

          {isLoadingGamification ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {gamificationError && (
                <p className="text-sm text-slate-400 bg-slate-50 rounded-xl p-3">
                  No se pudo cargar tu progreso. Intenta recargar la página.
                </p>
              )}

              {/* Points + level progress */}
              <div>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                      Puntos totales
                    </p>
                    <p className="text-3xl font-bold text-fuchsia-600 tabular-nums mt-0.5">
                      {totalPoints}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-fuchsia-50 text-fuchsia-700 text-xs font-semibold rounded-full border border-fuchsia-100">
                    {currentLevelName}
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-600 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                  />
                </div>
                {pointsToNext != null && summary?.next_level ? (
                  <p className="text-xs text-slate-400 mt-1.5">
                    <span className="tabular-nums">{pointsToNext}</span> pts para{' '}
                    <strong className="text-slate-600">{summary.next_level.name}</strong>
                  </p>
                ) : summary?.current_level && !summary?.next_level ? (
                  <p className="text-xs text-fuchsia-600 font-semibold mt-1.5">
                    Nivel máximo alcanzado
                  </p>
                ) : totalPoints > 0 ? (
                  <p className="text-xs text-slate-400 mt-1.5">
                    {totalPoints} punto{totalPoints !== 1 ? 's' : ''} acumulado{totalPoints !== 1 ? 's' : ''}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1.5">
                    Completa actividades para ganar tus primeros puntos
                  </p>
                )}
              </div>

              {/* Badges */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5" />
                  Insignias ({badges.length})
                </p>
                {badges.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {badges.map((userReward) => (
                      <div
                        key={userReward.id}
                        className="flex items-center gap-2 bg-amber-50 border border-amber-100
                                   rounded-xl px-3 py-2"
                        title={userReward.reward?.description ?? ''}
                      >
                        {userReward.reward?.icon_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={userReward.reward.icon_url} alt="" className="h-4 w-4" />
                        ) : (
                          <Award className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="text-sm font-medium text-amber-700">
                          {userReward.reward?.name ?? 'Insignia'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 bg-slate-50 rounded-xl p-3 text-center">
                    Aún no tienes insignias. Completa actividades para ganarlas.
                  </p>
                )}
              </div>

              {/* Recent activities */}
              {activities.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Actividad Reciente
                  </p>
                  <div className="space-y-2">
                    {activities.slice(0, 5).map((activity) => (
                      <div
                        key={activity.id}
                        className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0"
                      >
                        <span className="text-sm text-slate-600">
                          {activity.type === 'step_completed'     ? 'Paso completado'    :
                           activity.type === 'journey_completed'  ? 'Journey completado' :
                           activity.type === 'profile_completed'  ? 'Perfil completado'  :
                           activity.type}
                        </span>
                        <span className="text-sm font-bold text-fuchsia-600 tabular-nums">
                          +{activity.points_awarded} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
