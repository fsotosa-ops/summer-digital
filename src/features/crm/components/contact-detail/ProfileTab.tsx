'use client';

import React from 'react';
import {
  ApiUser,
  ApiCrmContact,
  ApiFieldOption,
} from '@/types/api.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LocationSelector, getCountryName, getStateName } from '../LocationSelector';
import {
  Shield,
  ShieldOff,
  Pencil,
  Trash2,
  Loader2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Briefcase,
  User,
  Save,
  X,
  Clock,
} from 'lucide-react';
import { NONE, resolveLabel } from './constants';

function ProfileField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">{label}</p>
        <p className={`text-sm ${value ? 'text-slate-700' : 'text-slate-300 italic'}`}>
          {value || 'No especificado'}
        </p>
      </div>
    </div>
  );
}

interface ProfileTabProps {
  user: ApiUser;
  currentUser: { id: string; role: string } | null;
  isSuperAdmin: boolean;
  crmContact: ApiCrmContact | null;
  crmLoading: boolean;
  fieldOptions: Record<string, ApiFieldOption[]>;
  editingCrm: boolean;
  crmDraft: Partial<ApiCrmContact>;
  savingCrm: boolean;
  togglingAdmin: boolean;
  onStartCrmEdit: () => void;
  onCrmDraftChange: (draft: Partial<ApiCrmContact>) => void;
  onSelectOption: (field: string, value: string) => void;
  onSaveCrm: () => void;
  onCancelCrmEdit: () => void;
  onOpenEdit: () => void;
  onToggleAdmin: () => void;
  onOpenDelete: () => void;
}

export function ProfileTab({
  user,
  currentUser,
  isSuperAdmin,
  crmContact,
  crmLoading,
  fieldOptions,
  editingCrm,
  crmDraft,
  savingCrm,
  togglingAdmin,
  onStartCrmEdit,
  onCrmDraftChange,
  onSelectOption,
  onSaveCrm,
  onCancelCrmEdit,
  onOpenEdit,
  onToggleAdmin,
  onOpenDelete,
}: ProfileTabProps) {
  if (crmLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (editingCrm) {
    return (
      <div className="max-w-2xl space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Company */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 flex items-center gap-1">
              <Building2 className="h-3 w-3" /> Empresa
            </Label>
            <Input
              value={crmDraft.company || ''}
              onChange={(e) =>
                onCrmDraftChange({ ...crmDraft, company: e.target.value })
              }
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
              value={crmDraft.phone || ''}
              onChange={(e) =>
                onCrmDraftChange({ ...crmDraft, phone: e.target.value })
              }
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
              value={crmDraft.birth_date || ''}
              onChange={(e) =>
                onCrmDraftChange({ ...crmDraft, birth_date: e.target.value })
              }
              className="h-9"
            />
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Género</Label>
            <Select
              value={crmDraft.gender || NONE}
              onValueChange={(v) => onSelectOption('gender', v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>
                  <span className="text-slate-400">Sin especificar</span>
                </SelectItem>
                {(fieldOptions.gender || []).map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
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
              value={crmDraft.education_level || NONE}
              onValueChange={(v) => onSelectOption('education_level', v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>
                  <span className="text-slate-400">Sin especificar</span>
                </SelectItem>
                {(fieldOptions.education_level || []).map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
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
              value={crmDraft.occupation || NONE}
              onValueChange={(v) => onSelectOption('occupation', v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>
                  <span className="text-slate-400">Sin especificar</span>
                </SelectItem>
                {(fieldOptions.occupation || []).map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
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
              country: crmDraft.country || '',
              state: crmDraft.state || '',
              city: crmDraft.city || '',
            }}
            onChange={({ country, state, city }) =>
              onCrmDraftChange({ ...crmDraft, country, state, city })
            }
          />
        </div>

        {/* Save / cancel */}
        <div className="flex gap-2 pt-1">
          <Button
            onClick={onSaveCrm}
            disabled={savingCrm}
            className="bg-teal-600 hover:bg-teal-700 h-9"
          >
            {savingCrm ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar
          </Button>
          <Button
            variant="outline"
            onClick={onCancelCrmEdit}
            className="h-9"
          >
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // VIEW MODE
  return (
    <div className="max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        <ProfileField
          icon={<Building2 className="h-3.5 w-3.5" />}
          label="Empresa"
          value={crmContact?.company}
        />
        <ProfileField
          icon={<Phone className="h-3.5 w-3.5" />}
          label="Teléfono"
          value={crmContact?.phone}
        />
        <ProfileField
          icon={<MapPin className="h-3.5 w-3.5" />}
          label="Ubicación"
          value={
            [
              crmContact?.city,
              crmContact?.state
                ? getStateName(crmContact?.country || '', crmContact.state)
                : null,
              crmContact?.country ? getCountryName(crmContact.country) : null,
            ]
              .filter(Boolean)
              .join(', ') || null
          }
        />
        <ProfileField
          icon={<Calendar className="h-3.5 w-3.5" />}
          label="Fecha de nacimiento"
          value={
            crmContact?.birth_date
              ? new Date(crmContact.birth_date + 'T00:00:00').toLocaleDateString(
                  'es-CL',
                  { year: 'numeric', month: 'long', day: 'numeric' },
                )
              : null
          }
        />
        <ProfileField
          icon={<User className="h-3.5 w-3.5" />}
          label="Género"
          value={resolveLabel(crmContact?.gender, fieldOptions.gender)}
        />
        <ProfileField
          icon={<GraduationCap className="h-3.5 w-3.5" />}
          label="Nivel Educativo"
          value={resolveLabel(crmContact?.education_level, fieldOptions.education_level)}
        />
        <ProfileField
          icon={<Briefcase className="h-3.5 w-3.5" />}
          label="Ocupación"
          value={resolveLabel(crmContact?.occupation, fieldOptions.occupation)}
        />

        {/* Last seen */}
        {crmContact?.last_seen_at && (
          <ProfileField
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Última conexión"
            value={new Date(crmContact.last_seen_at).toLocaleDateString('es-CL', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          />
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onStartCrmEdit}
        className="mt-5"
      >
        <Pencil className="h-4 w-4 mr-2" />
        Editar Perfil CRM
      </Button>

      <Separator className="my-5" />

      {/* Account Actions */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Acciones de cuenta
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onOpenEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar cuenta
          </Button>
          {isSuperAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleAdmin}
              disabled={togglingAdmin || user.id === currentUser?.id}
              className={user.is_platform_admin ? 'border-purple-200 text-purple-700' : ''}
            >
              {togglingAdmin ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : user.is_platform_admin ? (
                <ShieldOff className="h-4 w-4 mr-2" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              {user.is_platform_admin ? 'Quitar Admin' : 'Hacer Admin'}
            </Button>
          )}
          {isSuperAdmin && user.id !== currentUser?.id && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={onOpenDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      <Separator className="my-5" />

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
        <div>
          <p className="font-medium text-slate-400 uppercase tracking-wider mb-0.5">
            Creado
          </p>
          <p>
            {user.created_at
              ? new Date(user.created_at).toLocaleDateString('es-CL', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : '—'}
          </p>
        </div>
        <div>
          <p className="font-medium text-slate-400 uppercase tracking-wider mb-0.5">
            Actualizado
          </p>
          <p>
            {user.updated_at
              ? new Date(user.updated_at).toLocaleDateString('es-CL', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
