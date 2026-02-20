'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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

const RANK_COLORS: Record<string, string> = {
  Semilla: 'bg-amber-100 text-amber-700',
  Brote: 'bg-green-100 text-green-700',
  Arbol: 'bg-emerald-100 text-emerald-700',
  Bosque: 'bg-teal-100 text-teal-700',
  Oasis: 'bg-cyan-100 text-cyan-700',
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
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="font-medium text-slate-900">{value || <span className="text-slate-400 italic text-sm">No especificado</span>}</p>
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
    // Auto-open edit mode from URL ?edit=true
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
      // Group field options dynamically
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
      // Append cache-buster so the browser refreshes the image
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
      // Reset input so re-selecting same file triggers onChange
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
      // Sanitize: convert empty strings to null
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

      // Re-fetch gamification data (profile completion may have awarded points)
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
      <div className="p-8 text-center text-slate-500">
        Cargando perfil...
      </div>
    );
  }

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const totalPoints = summary?.total_points ?? user.oasisScore;
  const currentLevelName = summary?.current_level?.name ?? user.rank ?? 'Sin nivel';
  const pointsToNext = summary?.points_to_next_level;
  const nextLevelMin = summary?.next_level?.min_points;
  const badges = summary?.rewards ?? [];
  const activities = summary?.recent_activities ?? [];

  let progressPercent = 0;
  if (summary?.current_level && summary?.next_level) {
    const currentMin = summary.current_level.min_points;
    const nextMin = summary.next_level.min_points;
    const range = nextMin - currentMin;
    progressPercent = range > 0 ? Math.round(((totalPoints - currentMin) / range) * 100) : 100;
  } else if (summary?.current_level && !summary?.next_level) {
    progressPercent = 100;
  }

  const locationDisplay = [
    crmContact?.city,
    crmContact?.state ? getStateName(crmContact.country || '', crmContact.state) : null,
    crmContact?.country ? getCountryName(crmContact.country) : null,
  ].filter(Boolean).join(', ') || null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mi Perfil</h1>
        <p className="text-slate-500">Gestiona tu información personal.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-slate-400" />
              Información Personal
            </CardTitle>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={handleStartEdit}>
                <Pencil size={14} className="mr-1" /> Editar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 size={14} className="mr-1 animate-spin" />
                  ) : (
                    <Save size={14} className="mr-1" />
                  )}
                  Guardar
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              {/* Clickable avatar with upload overlay */}
              <div className="relative group flex-shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="bg-teal-100 text-teal-700 text-lg font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Cambiar foto"
                >
                  {uploadingAvatar
                    ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                    : <Camera className="h-5 w-5 text-white" />
                  }
                </button>
              </div>
              <div>
                {isEditing ? (
                  <Input
                    value={draft.fullName ?? ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Tu nombre completo"
                    className="h-9 text-base font-semibold"
                  />
                ) : (
                  <p className="text-lg font-semibold text-slate-900">{user.name}</p>
                )}
                <Badge className={RANK_COLORS[currentLevelName] || 'bg-slate-100 text-slate-700'}>
                  {currentLevelName}
                </Badge>
              </div>
            </div>

            {/* Auth fields (read-only) */}
            <div className="space-y-4">
              <InfoRow
                icon={<Mail className="h-5 w-5" />}
                label="Email"
                value={user.email}
              />
              <InfoRow
                icon={<Shield className="h-5 w-5" />}
                label="Rol"
                value={ROLE_LABELS[user.role] || user.role}
              />
              {user.organizationId && (
                <InfoRow
                  icon={<Building2 className="h-5 w-5" />}
                  label="Organización"
                  value="Mi Organización"
                />
              )}
            </div>

            {/* CRM fields */}
            <div className="border-t pt-4 space-y-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
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
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}><span className="text-slate-400">Sin especificar</span></SelectItem>
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
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}><span className="text-slate-400">Sin especificar</span></SelectItem>
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
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}><span className="text-slate-400">Sin especificar</span></SelectItem>
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
                  <InfoRow
                    icon={<Building2 className="h-5 w-5" />}
                    label="Empresa"
                    value={crmContact?.company}
                  />
                  <InfoRow
                    icon={<Phone className="h-5 w-5" />}
                    label="Teléfono"
                    value={crmContact?.phone}
                  />
                  <InfoRow
                    icon={<Calendar className="h-5 w-5" />}
                    label="Fecha de nacimiento"
                    value={
                      crmContact?.birth_date
                        ? new Date(crmContact.birth_date + 'T00:00:00').toLocaleDateString('es-CL', {
                            year: 'numeric', month: 'long', day: 'numeric',
                          })
                        : null
                    }
                  />
                  <InfoRow
                    icon={<User className="h-5 w-5" />}
                    label="Género"
                    value={resolveLabel(crmContact?.gender, fieldOptions.gender || [])}
                  />
                  <InfoRow
                    icon={<GraduationCap className="h-5 w-5" />}
                    label="Nivel educativo"
                    value={resolveLabel(crmContact?.education_level, fieldOptions.education_level || [])}
                  />
                  <InfoRow
                    icon={<Briefcase className="h-5 w-5" />}
                    label="Ocupación"
                    value={resolveLabel(crmContact?.occupation, fieldOptions.occupation || [])}
                  />
                  <InfoRow
                    icon={<MapPin className="h-5 w-5" />}
                    label="Ubicación"
                    value={locationDisplay}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gamification Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-slate-400" />
              Progreso y Logros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingGamification ? (
              <div className="text-center text-slate-400 py-4">Cargando datos...</div>
            ) : (
              <>
                {gamificationError && (
                  <p className="text-sm text-slate-400 mb-2">
                    No se pudo cargar tu progreso. Intenta recargar la página.
                  </p>
                )}
                {/* Points & Level */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-slate-500">Puntos Totales</p>
                    <p className="text-2xl font-bold text-teal-600">{totalPoints}</p>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div
                      className="bg-teal-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                  </div>
                  {pointsToNext != null && nextLevelMin != null ? (
                    <p className="text-xs text-slate-400 mt-1">
                      {pointsToNext} puntos para {summary?.next_level?.name ?? 'el siguiente nivel'}
                    </p>
                  ) : summary?.current_level ? (
                    <p className="text-xs text-slate-400 mt-1">Nivel máximo alcanzado</p>
                  ) : totalPoints > 0 ? (
                    <p className="text-xs text-slate-400 mt-1">{totalPoints} punto{totalPoints !== 1 ? 's' : ''} acumulado{totalPoints !== 1 ? 's' : ''}</p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">Completa actividades para ganar tus primeros puntos</p>
                  )}
                </div>

                {/* Badges/Rewards */}
                <div>
                  <p className="text-sm text-slate-500 mb-3 flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    Insignias ({badges.length})
                  </p>
                  {badges.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {badges.map((userReward) => (
                        <div
                          key={userReward.id}
                          className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
                          title={userReward.reward?.description ?? ''}
                        >
                          {userReward.reward?.icon_url ? (
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
                    <p className="text-slate-400 text-sm">
                      Aún no tienes insignias. Completa actividades para ganarlas.
                    </p>
                  )}
                </div>

                {/* Recent Activities */}
                {activities.length > 0 && (
                  <div>
                    <p className="text-sm text-slate-500 mb-3 flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      Actividad Reciente
                    </p>
                    <div className="space-y-2">
                      {activities.slice(0, 5).map((activity) => (
                        <div
                          key={activity.id}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-slate-600">
                            {activity.type === 'step_completed' ? 'Paso completado' :
                             activity.type === 'journey_completed' ? 'Journey completado' :
                             activity.type === 'profile_completed' ? 'Perfil completado' :
                             activity.type}
                          </span>
                          <span className="text-teal-600 font-medium">
                            +{activity.points_awarded} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}