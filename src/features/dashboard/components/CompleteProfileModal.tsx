'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactConfetti from 'react-confetti';
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
import { gamificationService } from '@/services/gamification.service';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/useAuthStore';
import { ApiCrmContact, ApiFieldOption } from '@/types/api.types';
import { User } from '@/types';
import { Loader2, Save, PartyPopper, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const NONE = '__none__';

interface CompleteProfileModalProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormField = 'fullName' | 'company' | 'phone' | 'birth_date' | 'gender' | 'education_level' | 'occupation' | 'country';

const REQUIRED_FIELDS: { key: FormField; label: string }[] = [
  { key: 'fullName', label: 'Nombre completo' },
  { key: 'company', label: 'Empresa' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'birth_date', label: 'Fecha de nacimiento' },
  { key: 'gender', label: 'Género' },
  { key: 'education_level', label: 'Nivel Educativo' },
  { key: 'occupation', label: 'Ocupación' },
  { key: 'country', label: 'País' },
];

export function CompleteProfileModal({ user, open, onOpenChange }: CompleteProfileModalProps) {
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldOptions, setFieldOptions] = useState<Record<string, ApiFieldOption[]>>({});
  const [fullName, setFullName] = useState(user.name);
  const [draft, setDraft] = useState<Partial<ApiCrmContact>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [profileCompletionPoints, setProfileCompletionPoints] = useState(0);

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  useEffect(() => {
    if (!open) return;
    setFullName(user.name);
    setTouched(new Set());
    setShowCelebration(false);
    setLoading(true);

    Promise.all([
      crmService.getMyContact().catch(() => null),
      crmService.listFieldOptions().catch(() => [] as ApiFieldOption[]),
      gamificationService.getMyConfig(user.organizationId).catch(() => null),
    ]).then(([contact, options, config]) => {
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

      if (config) {
        setProfileCompletionPoints(config.profile_completion_points ?? 0);
      }
    }).finally(() => setLoading(false));
  }, [open, user.id, user.name, user.organizationId]);

  const setField = (field: keyof ApiCrmContact, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value === NONE ? '' : value }));
    setTouched((prev) => new Set(prev).add(field));
  };

  const getFieldValue = useCallback((key: FormField): string => {
    if (key === 'fullName') return fullName.trim();
    return ((draft as Record<string, string | null | undefined>)[key] || '').trim();
  }, [fullName, draft]);

  const isFieldEmpty = useCallback((key: FormField): boolean => {
    return !getFieldValue(key);
  }, [getFieldValue]);

  const isFieldInvalid = useCallback((key: FormField): boolean => {
    return touched.has(key === 'fullName' ? 'fullName' : key) && isFieldEmpty(key);
  }, [touched, isFieldEmpty]);

  const isFormValid = REQUIRED_FIELDS.every((f) => !isFieldEmpty(f.key));
  const emptyFieldCount = REQUIRED_FIELDS.filter((f) => isFieldEmpty(f.key)).length;

  const markAllTouched = () => {
    const all = new Set<string>();
    REQUIRED_FIELDS.forEach((f) => all.add(f.key === 'fullName' ? 'fullName' : f.key));
    setTouched(all);
  };

  const handleSave = async () => {
    markAllTouched();
    if (!isFormValid) {
      toast.error(`Debes completar todos los campos obligatorios (${emptyFieldCount} pendientes).`);
      return;
    }

    setSaving(true);
    try {
      const sanitized = Object.fromEntries(
        Object.entries(draft).map(([k, v]) => [k, v === '' ? null : v])
      ) as Partial<ApiCrmContact>;

      await crmService.updateMyContact(sanitized);

      if (fullName.trim() && fullName.trim() !== user.name) {
        await authService.updateMyProfile({ full_name: fullName.trim() });
      }

      const refreshed = await authService.getUserProfile();
      setUser(refreshed);

      // Show celebration instead of closing
      setShowCelebration(true);
    } catch {
      toast.error('Error al guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseCelebration = () => {
    setShowCelebration(false);
    onOpenChange(false);
  };

  return (
    <>
      {/* Confetti overlay - shown outside the dialog for full-screen effect */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-[100]">
          <ReactConfetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={400}
            gravity={0.15}
            colors={['#d946ef', '#06b6d4', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899']}
          />
        </div>
      )}

      <Dialog open={open} onOpenChange={showCelebration ? handleCloseCelebration : onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {showCelebration ? (
              /* Celebration view */
              <motion.div
                key="celebration"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="py-10 flex flex-col items-center text-center gap-5"
              >
                <motion.div
                  initial={{ rotate: -20, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.2 }}
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
                    <PartyPopper className="h-10 w-10 text-white" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-2"
                >
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    Felicitaciones
                    <Sparkles className="h-5 w-5 text-amber-500" />
                  </h2>
                  {profileCompletionPoints > 0 ? (
                    <p className="text-slate-600 text-lg">
                      Haz alcanzado tus primeros{' '}
                      <span className="font-bold text-fuchsia-600">{profileCompletionPoints} puntos</span>
                    </p>
                  ) : (
                    <p className="text-slate-600 text-lg">
                      Has completado tu perfil exitosamente
                    </p>
                  )}
                  <p className="text-slate-400 text-sm mt-2">
                    Tu perfil está completo. Ya puedes disfrutar la experiencia completa de Oasis Digital.
                  </p>
                </motion.div>

                {profileCompletionPoints > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.6 }}
                    className="px-6 py-3 bg-gradient-to-r from-fuchsia-50 to-purple-50 border border-fuchsia-200 rounded-2xl"
                  >
                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-purple-600">
                      +{profileCompletionPoints} pts
                    </p>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <Button
                    onClick={handleCloseCelebration}
                    className="bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white border-0 hover:from-fuchsia-500 hover:to-purple-500 px-8"
                  >
                    Continuar
                  </Button>
                </motion.div>
              </motion.div>
            ) : (
              /* Form view */
              <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-fuchsia-500" />
                    Completar perfil
                  </DialogTitle>
                  <DialogDescription>
                    Completa todos los campos para personalizar tu experiencia en Oasis Digital
                    {profileCompletionPoints > 0 && (
                      <span className="inline-flex items-center gap-1 ml-1 text-fuchsia-600 font-medium">
                        y ganar {profileCompletionPoints} puntos
                      </span>
                    )}
                    .
                  </DialogDescription>
                </DialogHeader>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="space-y-5 py-2">
                    {/* Progress indicator */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${((REQUIRED_FIELDS.length - emptyFieldCount) / REQUIRED_FIELDS.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {REQUIRED_FIELDS.length - emptyFieldCount}/{REQUIRED_FIELDS.length}
                      </span>
                    </div>

                    {/* Nombre completo */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">
                        Nombre completo <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        value={fullName}
                        onChange={(e) => { setFullName(e.target.value); setTouched((prev) => new Set(prev).add('fullName')); }}
                        placeholder="Tu nombre completo"
                        className={isFieldInvalid('fullName') ? 'border-red-300 focus-visible:ring-red-400' : ''}
                      />
                      {isFieldInvalid('fullName') && (
                        <p className="text-xs text-red-500">Este campo es obligatorio</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Empresa */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">
                          Empresa <span className="text-red-400">*</span>
                        </Label>
                        <Input
                          value={draft.company || ''}
                          onChange={(e) => setField('company', e.target.value)}
                          placeholder="Nombre de la empresa"
                          className={isFieldInvalid('company') ? 'border-red-300 focus-visible:ring-red-400' : ''}
                        />
                        {isFieldInvalid('company') && (
                          <p className="text-xs text-red-500">Este campo es obligatorio</p>
                        )}
                      </div>

                      {/* Teléfono */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">
                          Teléfono <span className="text-red-400">*</span>
                        </Label>
                        <Input
                          value={draft.phone || ''}
                          onChange={(e) => setField('phone', e.target.value)}
                          placeholder="+56 9 1234 5678"
                          className={isFieldInvalid('phone') ? 'border-red-300 focus-visible:ring-red-400' : ''}
                        />
                        {isFieldInvalid('phone') && (
                          <p className="text-xs text-red-500">Este campo es obligatorio</p>
                        )}
                      </div>

                      {/* Fecha de nacimiento */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">
                          Fecha de nacimiento <span className="text-red-400">*</span>
                        </Label>
                        <Input
                          type="date"
                          value={draft.birth_date || ''}
                          onChange={(e) => setField('birth_date', e.target.value)}
                          className={isFieldInvalid('birth_date') ? 'border-red-300 focus-visible:ring-red-400' : ''}
                        />
                        {isFieldInvalid('birth_date') && (
                          <p className="text-xs text-red-500">Este campo es obligatorio</p>
                        )}
                      </div>

                      {/* Género */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">
                          Género <span className="text-red-400">*</span>
                        </Label>
                        <Select
                          value={draft.gender || NONE}
                          onValueChange={(v) => setField('gender', v)}
                        >
                          <SelectTrigger className={isFieldInvalid('gender') ? 'border-red-300 focus-visible:ring-red-400' : ''}>
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
                        {isFieldInvalid('gender') && (
                          <p className="text-xs text-red-500">Este campo es obligatorio</p>
                        )}
                      </div>

                      {/* Nivel Educativo */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">
                          Nivel Educativo <span className="text-red-400">*</span>
                        </Label>
                        <Select
                          value={draft.education_level || NONE}
                          onValueChange={(v) => setField('education_level', v)}
                        >
                          <SelectTrigger className={isFieldInvalid('education_level') ? 'border-red-300 focus-visible:ring-red-400' : ''}>
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
                        {isFieldInvalid('education_level') && (
                          <p className="text-xs text-red-500">Este campo es obligatorio</p>
                        )}
                      </div>

                      {/* Ocupación */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">
                          Ocupación <span className="text-red-400">*</span>
                        </Label>
                        <Select
                          value={draft.occupation || NONE}
                          onValueChange={(v) => setField('occupation', v)}
                        >
                          <SelectTrigger className={isFieldInvalid('occupation') ? 'border-red-300 focus-visible:ring-red-400' : ''}>
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
                        {isFieldInvalid('occupation') && (
                          <p className="text-xs text-red-500">Este campo es obligatorio</p>
                        )}
                      </div>
                    </div>

                    {/* Ubicación */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">
                        Ubicación <span className="text-red-400">*</span>
                      </Label>
                      <LocationSelector
                        value={{
                          country: draft.country || '',
                          state: draft.state || '',
                          city: draft.city || '',
                        }}
                        onChange={({ country, state, city }) => {
                          setDraft((prev) => ({ ...prev, country, state, city }));
                          setTouched((prev) => new Set(prev).add('country'));
                        }}
                      />
                      {isFieldInvalid('country') && (
                        <p className="text-xs text-red-500">Debes seleccionar al menos un país</p>
                      )}
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
                    className="bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white border-0 hover:from-fuchsia-500 hover:to-purple-500"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Guardar perfil
                  </Button>
                </DialogFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}
