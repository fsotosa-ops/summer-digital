'use client';

import React, { useState } from 'react';
import {
  ApiUser,
  ApiCrmContact,
  ApiFieldOption,
} from '@/types/api.types';
import { crmService } from '@/services/crm.service';
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
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Briefcase,
  User,
  Check,
  X,
} from 'lucide-react';
import { NONE, resolveLabel } from './constants';
import { toast } from 'sonner';

const NONE_VAL = '__none__';

// ── Editable field component ─────────────────────────────────────────────────

interface EditableTextProps {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  fieldKey: keyof ApiCrmContact;
  contactId: string;
  onSaved: (updated: ApiCrmContact) => void;
  type?: 'text' | 'date' | 'tel';
}

function EditableText({ icon, label, value, fieldKey, contactId, onSaved, type = 'text' }: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const start = () => {
    setDraft(value ?? '');
    setEditing(true);
  };

  const cancel = () => setEditing(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await crmService.updateContact(contactId, {
        [fieldKey]: draft === '' ? null : draft,
      });
      onSaved(updated);
      setEditing(false);
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="group flex items-start gap-2.5">
      <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">{label}</p>
        {editing ? (
          <div className="flex items-center gap-1.5 mt-0.5">
            <Input
              type={type}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-7 text-sm py-0"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
            />
            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-50" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:bg-slate-100" onClick={cancel}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <p className={`text-sm ${value ? 'text-slate-700' : 'text-slate-300 italic'}`}>
              {value || 'No especificado'}
            </p>
            <button
              onClick={start}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-fuchsia-600"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface EditableSelectProps {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  fieldKey: keyof ApiCrmContact;
  options: ApiFieldOption[];
  contactId: string;
  onSaved: (updated: ApiCrmContact) => void;
}

function EditableSelect({ icon, label, value, fieldKey, options, contactId, onSaved }: EditableSelectProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const start = () => {
    setDraft(value ?? NONE_VAL);
    setEditing(true);
  };

  const save = async (val: string) => {
    setSaving(true);
    try {
      const updated = await crmService.updateContact(contactId, {
        [fieldKey]: val === NONE_VAL ? null : val,
      });
      onSaved(updated);
      setEditing(false);
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const displayLabel = resolveLabel(value, options);

  return (
    <div className="group flex items-start gap-2.5">
      <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">{label}</p>
        {editing ? (
          <div className="flex items-center gap-1.5 mt-0.5">
            <Select
              value={draft}
              onValueChange={(v) => { setDraft(v); save(v); }}
              disabled={saving}
            >
              <SelectTrigger className="h-7 text-sm w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VAL}><span className="text-slate-400">Sin especificar</span></SelectItem>
                {options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {saving && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:bg-slate-100" onClick={() => setEditing(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <p className={`text-sm ${displayLabel ? 'text-slate-700' : 'text-slate-300 italic'}`}>
              {displayLabel || 'No especificado'}
            </p>
            <button
              onClick={start}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-fuchsia-600"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface EditableLocationProps {
  contact: ApiCrmContact | null;
  contactId: string;
  onSaved: (updated: ApiCrmContact) => void;
}

function EditableLocation({ contact, contactId, onSaved }: EditableLocationProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ country: '', state: '', city: '' });
  const [saving, setSaving] = useState(false);

  const start = () => {
    setDraft({
      country: contact?.country ?? '',
      state: contact?.state ?? '',
      city: contact?.city ?? '',
    });
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await crmService.updateContact(contactId, {
        country: draft.country || null,
        state: draft.state || null,
        city: draft.city || null,
      });
      onSaved(updated);
      setEditing(false);
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const locationDisplay = [
    contact?.city,
    contact?.state ? getStateName(contact.country || '', contact.state) : null,
    contact?.country ? getCountryName(contact.country) : null,
  ].filter(Boolean).join(', ');

  return (
    <div className="group flex items-start gap-2.5">
      <span className="text-slate-400 mt-0.5 shrink-0"><MapPin className="h-3.5 w-3.5" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Ubicación</p>
        {editing ? (
          <div className="mt-1 space-y-2">
            <LocationSelector
              value={draft}
              onChange={setDraft}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={saving} className="h-7 text-xs bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white">
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                Guardar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 text-xs">
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <p className={`text-sm ${locationDisplay ? 'text-slate-700' : 'text-slate-300 italic'}`}>
              {locationDisplay || 'No especificado'}
            </p>
            <button
              onClick={start}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-fuchsia-600"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ProfileTab ────────────────────────────────────────────────────────────────

interface ProfileTabProps {
  user: ApiUser;
  currentUser: { id: string; role: string } | null;
  isSuperAdmin: boolean;
  crmContact: ApiCrmContact | null;
  crmLoading: boolean;
  fieldOptions: Record<string, ApiFieldOption[]>;
  onContactUpdated: (c: ApiCrmContact) => void;
  togglingAdmin: boolean;
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
  onContactUpdated,
  togglingAdmin,
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

  // If no CRM contact record yet, show a placeholder
  if (!crmContact) {
    return (
      <div className="max-w-2xl space-y-5">
        <p className="text-sm text-slate-400 italic py-4">
          Este contacto no tiene datos de perfil CRM aún.
        </p>
        <AccountActions
          user={user}
          currentUser={currentUser}
          isSuperAdmin={isSuperAdmin}
          togglingAdmin={togglingAdmin}
          onOpenEdit={onOpenEdit}
          onToggleAdmin={onToggleAdmin}
          onOpenDelete={onOpenDelete}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* CRM fields — all inline-editable */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        <EditableText
          icon={<Building2 className="h-3.5 w-3.5" />}
          label="Empresa"
          value={crmContact.company}
          fieldKey="company"
          contactId={user.id}
          onSaved={onContactUpdated}
        />
        <EditableText
          icon={<Phone className="h-3.5 w-3.5" />}
          label="Teléfono"
          value={crmContact.phone}
          fieldKey="phone"
          contactId={user.id}
          onSaved={onContactUpdated}
          type="tel"
        />
        <EditableText
          icon={<Calendar className="h-3.5 w-3.5" />}
          label="Fecha de nacimiento"
          value={
            crmContact.birth_date
              ? new Date(crmContact.birth_date + 'T00:00:00').toLocaleDateString('es-CL', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })
              : null
          }
          fieldKey="birth_date"
          contactId={user.id}
          onSaved={onContactUpdated}
          type="date"
        />
        <EditableSelect
          icon={<User className="h-3.5 w-3.5" />}
          label="Género"
          value={crmContact.gender}
          fieldKey="gender"
          options={fieldOptions.gender || []}
          contactId={user.id}
          onSaved={onContactUpdated}
        />
        <EditableSelect
          icon={<GraduationCap className="h-3.5 w-3.5" />}
          label="Nivel Educativo"
          value={crmContact.education_level}
          fieldKey="education_level"
          options={fieldOptions.education_level || []}
          contactId={user.id}
          onSaved={onContactUpdated}
        />
        <EditableSelect
          icon={<Briefcase className="h-3.5 w-3.5" />}
          label="Ocupación"
          value={crmContact.occupation}
          fieldKey="occupation"
          options={fieldOptions.occupation || []}
          contactId={user.id}
          onSaved={onContactUpdated}
        />
      </div>

      <EditableLocation
        contact={crmContact}
        contactId={user.id}
        onSaved={onContactUpdated}
      />

      <Separator />

      <AccountActions
        user={user}
        currentUser={currentUser}
        isSuperAdmin={isSuperAdmin}
        togglingAdmin={togglingAdmin}
        onOpenEdit={onOpenEdit}
        onToggleAdmin={onToggleAdmin}
        onOpenDelete={onOpenDelete}
      />

      <Separator />

      <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
        <div>
          <p className="font-medium text-slate-400 uppercase tracking-wider mb-0.5">Creado</p>
          <p>{user.created_at ? new Date(user.created_at).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</p>
        </div>
        <div>
          <p className="font-medium text-slate-400 uppercase tracking-wider mb-0.5">Actualizado</p>
          <p>{user.updated_at ? new Date(user.updated_at).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</p>
        </div>
      </div>
    </div>
  );
}

function AccountActions({
  user,
  currentUser,
  isSuperAdmin,
  togglingAdmin,
  onOpenEdit,
  onToggleAdmin,
  onOpenDelete,
}: {
  user: ApiUser;
  currentUser: { id: string; role: string } | null;
  isSuperAdmin: boolean;
  togglingAdmin: boolean;
  onOpenEdit: () => void;
  onToggleAdmin: () => void;
  onOpenDelete: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Acciones de cuenta</p>
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
  );
}
