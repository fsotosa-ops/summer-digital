'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LocationSelector } from '@/features/crm/components/LocationSelector';
import { crmService } from '@/services/crm.service';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/useAuthStore';
import { ApiCrmContact, ApiFieldOption } from '@/types/api.types';
import { User } from '@/types';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

const NONE = '__none__';

interface CompleteProfileModalProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompleteProfileModal({ user, open, onOpenChange }: CompleteProfileModalProps) {
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldOptions, setFieldOptions] = useState<Record<string, ApiFieldOption[]>>({});
  const [fullName, setFullName] = useState(user.name);
  const [draft, setDraft] = useState<Partial<ApiCrmContact>>({});

  useEffect(() => {
    if (!open) return;
    setFullName(user.name);
    setLoading(true);

    Promise.all([
      crmService.getContact(user.id).catch(() => null),
      crmService.listFieldOptions().catch(() => [] as ApiFieldOption[]),
    ]).then(([contact, options]) => {
      if (contact) {
        setDraft({
          company: contact.company || '',
          phone: contact.phone || '',
          birth_date: contact.birth_date || '',
          gender: contact.gender || '',
          education_level: contact.education_level || '',
          occupation: contact.occupation || '',
          country: contact.country || '',
          state: contact.state || '',
          city: contact.city || '',
        });
      }
      const grouped: Record<string, ApiFieldOption[]> = {};
      (options as ApiFieldOption[]).forEach((o) => {
        if (!grouped[o.field_name]) grouped[o.field_name] = [];
        grouped[o.field_name].push(o);
      });
      setFieldOptions(grouped);
    }).finally(() => setLoading(false));
  }, [open, user.id, user.name]);

  const setField = (field: keyof ApiCrmContact, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value === NONE ? '' : value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convertir cadenas vacías a null para que Pydantic no intente
      // parsear "" como date/string opcional en el backend
      const sanitized = Object.fromEntries(
        Object.entries(draft).map(([k, v]) => [k, v === '' ? null : v])
      ) as Partial<ApiCrmContact>;

      await crmService.updateMyContact(sanitized);

      if (fullName.trim() && fullName.trim() !== user.name) {
        await authService.updateMyProfile({ full_name: fullName.trim() });
      }

      const refreshed = await authService.getUserProfile();
      setUser(refreshed);

      toast.success('Perfil actualizado correctamente');
      onOpenChange(false);
    } catch {
      toast.error('Error al guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Completar perfil</DialogTitle>
          <DialogDescription>
            Completa tu información para personalizar tu experiencia en Oasis Digital.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Nombre completo */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Nombre completo</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Empresa */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Empresa</Label>
                <Input
                  value={draft.company || ''}
                  onChange={(e) => setField('company', e.target.value)}
                  placeholder="Nombre de la empresa"
                />
              </div>

              {/* Teléfono */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Teléfono</Label>
                <Input
                  value={draft.phone || ''}
                  onChange={(e) => setField('phone', e.target.value)}
                  placeholder="+56 9 1234 5678"
                />
              </div>

              {/* Fecha de nacimiento */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Fecha de nacimiento</Label>
                <Input
                  type="date"
                  value={draft.birth_date || ''}
                  onChange={(e) => setField('birth_date', e.target.value)}
                />
              </div>

              {/* Género */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Género</Label>
                <Select
                  value={draft.gender || NONE}
                  onValueChange={(v) => setField('gender', v)}
                >
                  <SelectTrigger>
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

              {/* Nivel Educativo */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Nivel Educativo</Label>
                <Select
                  value={draft.education_level || NONE}
                  onValueChange={(v) => setField('education_level', v)}
                >
                  <SelectTrigger>
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

              {/* Ocupación */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Ocupación</Label>
                <Select
                  value={draft.occupation || NONE}
                  onValueChange={(v) => setField('occupation', v)}
                >
                  <SelectTrigger>
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

            {/* Ubicación */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Ubicación</Label>
              <LocationSelector
                value={{
                  country: draft.country || '',
                  state: draft.state || '',
                  city: draft.city || '',
                }}
                onChange={({ country, state, city }) =>
                  setDraft((prev) => ({ ...prev, country, state, city }))
                }
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 text-white border-0 hover:from-fuchsia-500 hover:to-fuchsia-400"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar perfil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
